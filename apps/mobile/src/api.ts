import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthTokens, PlaceInput, QuoteLineItem, QuoteResponse, RideType, VehicleCategory, VehicleQuote } from "./types";
import {
  cancelBooking as cancelStoredBooking,
  computeBookingStatus,
  createBooking as createStoredBooking,
  createUser,
  findBooking,
  findUserByEmail,
  findUserById,
  genId,
  genReference,
  listBookingsForUser,
  StoredBooking,
} from "./demo/store";
import {
  convertFromEurCents,
  estimateDistanceKm,
  estimateDurationMinutes,
  isNightTime,
  NIGHT_SURCHARGE_MULTIPLIER,
  VEHICLE_CATEGORY_PRICING,
} from "./demo/pricing";

/**
 * This app runs against a fully local, on-device mock backend — no server needed.
 * `api.get/post/patch` below keep the same signatures a real HTTP client would have
 * (so every screen is unchanged), but requests are routed to handlers in this file
 * and ./demo/* instead of going over the network.
 */

const TOKENS_KEY = "magona.tokens";
const ACCESS_PREFIX = "demo-token:";
const REFRESH_PREFIX = "demo-refresh:";
const ACTIVE_STATUSES = ["PENDING", "CONFIRMED", "DRIVER_ASSIGNED", "DRIVER_EN_ROUTE", "DRIVER_ARRIVED"];
const QUOTE_TTL_MS = 15 * 60 * 1000;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function getStoredTokens(): Promise<AuthTokens | null> {
  const raw = await AsyncStorage.getItem(TOKENS_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function storeTokens(tokens: AuthTokens | null) {
  if (tokens) {
    await AsyncStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
  } else {
    await AsyncStorage.removeItem(TOKENS_KEY);
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function issueTokens(userId: string): AuthTokens {
  return { accessToken: `${ACCESS_PREFIX}${userId}`, refreshToken: `${REFRESH_PREFIX}${userId}`, expiresIn: 3600 };
}

async function resolveUser(tokens: AuthTokens | null) {
  if (!tokens?.accessToken?.startsWith(ACCESS_PREFIX)) return null;
  const userId = tokens.accessToken.slice(ACCESS_PREFIX.length);
  return findUserById(userId);
}

// In-memory quote cache: quotes are short-lived (15 min), so there's no need to
// persist them across app restarts — matches the "quotes are computed server-side
// and re-used at booking time" design of the real API.
const quoteCache = new Map<string, QuoteResponse>();

async function handleLogin(body: any): Promise<AuthTokens> {
  const email = String(body?.email ?? "");
  const password = String(body?.password ?? "");
  const user = await findUserByEmail(email);
  if (!user || user.password !== password) {
    throw new ApiError(401, "Invalid email or password");
  }
  return issueTokens(user.id);
}

async function handleRegister(body: any): Promise<AuthTokens> {
  const { firstName, lastName, email, password, phone } = body ?? {};
  if (!firstName || !lastName || !email || !password) {
    throw new ApiError(400, "Please fill in all required fields");
  }
  if (String(password).length < 6) {
    throw new ApiError(400, "Password must be at least 6 characters");
  }
  const existing = await findUserByEmail(email);
  if (existing) {
    throw new ApiError(409, "An account with this email already exists");
  }
  const user = await createUser({ firstName, lastName, email, password, phone: phone ?? "", role: "CUSTOMER" });
  return issueTokens(user.id);
}

async function handleMe(tokens: AuthTokens | null) {
  const user = await resolveUser(tokens);
  if (!user) throw new ApiError(401, "Unauthorized");
  return { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role };
}

function fitsVehicle(category: VehicleCategory, passengers: number, luggage: number) {
  const pricing = VEHICLE_CATEGORY_PRICING[category];
  return pricing.maxPassengers >= passengers && pricing.maxLuggage >= luggage;
}

function handleCreateQuote(body: any): QuoteResponse {
  const rideType: RideType = body.rideType;
  const pickup: PlaceInput = body.pickup;
  const dropoff: PlaceInput = body.dropoff;
  const pickupDateTime: string = body.pickupDateTime;
  const passengers: number = body.passengers ?? 1;
  const luggage: number = body.luggage ?? 0;
  const currency: string = body.currency ?? "EUR";
  const isHourly = rideType === RideType.HOURLY;
  const hourlyDurationMinutes: number = body.hourlyDurationMinutes ?? 120;

  if (!pickup?.point || (!isHourly && !dropoff?.point)) {
    throw new ApiError(400, "Pickup and destination locations are required");
  }

  const distanceKm = isHourly
    ? Math.round(((hourlyDurationMinutes / 60) * 20 * 10)) / 10
    : estimateDistanceKm(pickup.point, dropoff.point!);
  const durationMinutes = isHourly ? hourlyDurationMinutes : estimateDurationMinutes(distanceKm);
  const night = isNightTime(pickupDateTime);

  let categories = (Object.keys(VEHICLE_CATEGORY_PRICING) as VehicleCategory[]).filter((c) =>
    fitsVehicle(c, passengers, luggage),
  );
  if (categories.length === 0) {
    categories = [VehicleCategory.VAN];
  }

  const vehicles: VehicleQuote[] = categories.map((category, index) => {
    const pricing = VEHICLE_CATEGORY_PRICING[category];
    const baseFareEur = pricing.baseFareCents;
    const distanceEur = isHourly ? 0 : Math.round(pricing.perKmCents * distanceKm);
    const timeEur = Math.round(pricing.perMinuteCents * durationMinutes);
    const subtotalBeforeSurchargeEur = baseFareEur + distanceEur + timeEur;
    const nightSurchargeEur = night ? Math.round(subtotalBeforeSurchargeEur * (NIGHT_SURCHARGE_MULTIPLIER - 1)) : 0;
    const subtotalEur = subtotalBeforeSurchargeEur + nightSurchargeEur;
    const totalEur = Math.max(subtotalEur, pricing.minimumFareCents);

    const lineItems: QuoteLineItem[] = [
      { label: "Base fare", amountCents: convertFromEurCents(baseFareEur, currency) },
      ...(isHourly
        ? [{ label: `Hourly rate (${(hourlyDurationMinutes / 60).toFixed(1)}h)`, amountCents: convertFromEurCents(timeEur, currency) }]
        : [
            { label: `Distance (${distanceKm} km)`, amountCents: convertFromEurCents(distanceEur, currency) },
            { label: "Time", amountCents: convertFromEurCents(timeEur, currency) },
          ]),
      ...(nightSurchargeEur > 0 ? [{ label: "Night surcharge", amountCents: convertFromEurCents(nightSurchargeEur, currency) }] : []),
    ];

    return {
      category,
      label: pricing.label,
      description: pricing.description,
      maxPassengers: pricing.maxPassengers,
      maxLuggage: pricing.maxLuggage,
      currency,
      distanceKm,
      durationMinutes,
      lineItems,
      subtotalCents: convertFromEurCents(subtotalEur, currency),
      discountCents: 0,
      totalCents: convertFromEurCents(totalEur, currency),
      eta: 3 + index * 2 + (durationMinutes % 5),
    };
  });

  vehicles.sort((a, b) => a.totalCents - b.totalCents);

  const quoteId = genId("quote");
  const quote: QuoteResponse = {
    quoteId,
    expiresAt: new Date(Date.now() + QUOTE_TTL_MS).toISOString(),
    rideType,
    pickup,
    dropoff: isHourly ? pickup : dropoff,
    pickupDateTime,
    distanceKm,
    durationMinutes,
    vehicles,
  };
  quoteCache.set(quoteId, quote);
  return quote;
}

async function handleCreateBooking(body: any, tokens: AuthTokens | null) {
  const user = await resolveUser(tokens);
  if (!user) throw new ApiError(401, "Unauthorized");

  const quote = quoteCache.get(body?.quoteId);
  if (!quote || Date.now() > new Date(quote.expiresAt).getTime()) {
    throw new ApiError(410, "This quote has expired — please search again.");
  }
  const vehicle = quote.vehicles.find((v) => v.category === body?.vehicleCategory);
  if (!vehicle) {
    throw new ApiError(400, "Selected vehicle is no longer available for this quote");
  }

  const booking: StoredBooking = {
    id: genId("booking"),
    reference: genReference(),
    userId: user.id,
    pickupLabel: quote.pickup.label,
    dropoffLabel: quote.dropoff.label,
    pickupDateTime: quote.pickupDateTime,
    vehicleCategory: vehicle.category,
    totalCents: vehicle.totalCents,
    currency: vehicle.currency,
    flightNumber: null,
    createdAtMs: Date.now(),
    isCancelled: false,
    cancelledAtMs: null,
  };
  await createStoredBooking(booking);

  return { booking: { id: booking.id }, payment: null, clientSecret: null };
}

async function handleListMyBookings(tokens: AuthTokens | null) {
  const user = await resolveUser(tokens);
  if (!user) throw new ApiError(401, "Unauthorized");
  const bookings = await listBookingsForUser(user.id);
  return bookings.map((b) => {
    const { status } = computeBookingStatus(b);
    return {
      id: b.id,
      reference: b.reference,
      status,
      pickupLabel: b.pickupLabel,
      dropoffLabel: b.dropoffLabel,
      pickupDateTime: b.pickupDateTime,
      vehicleCategory: b.vehicleCategory,
      totalCents: b.totalCents,
      currency: b.currency,
      flightNumber: b.flightNumber,
    };
  });
}

async function handleGetBooking(id: string, tokens: AuthTokens | null) {
  const user = await resolveUser(tokens);
  if (!user) throw new ApiError(401, "Unauthorized");
  const booking = await findBooking(id, user.id);
  if (!booking) throw new ApiError(404, "Booking not found");
  const { status, statusEvents, driver, vehicle } = computeBookingStatus(booking);
  return {
    id: booking.id,
    reference: booking.reference,
    status,
    pickupLabel: booking.pickupLabel,
    dropoffLabel: booking.dropoffLabel,
    pickupDateTime: booking.pickupDateTime,
    vehicleCategory: booking.vehicleCategory,
    totalCents: booking.totalCents,
    currency: booking.currency,
    driver,
    vehicle,
    statusEvents,
  };
}

async function handleCancelBooking(id: string, tokens: AuthTokens | null) {
  const user = await resolveUser(tokens);
  if (!user) throw new ApiError(401, "Unauthorized");
  const booking = await findBooking(id, user.id);
  if (!booking) throw new ApiError(404, "Booking not found");
  const { status } = computeBookingStatus(booking);
  if (booking.isCancelled || !ACTIVE_STATUSES.includes(status)) {
    throw new ApiError(400, "This booking can no longer be cancelled");
  }
  await cancelStoredBooking(id, user.id);
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean;
}

async function route(path: string, options: RequestOptions, tokens: AuthTokens | null): Promise<unknown> {
  const { method = "GET", body } = options;
  const [rawPath, query] = path.split("?");
  const segments = rawPath.split("/").filter(Boolean);

  if (method === "POST" && segments.join("/") === "auth/login") return handleLogin(body);
  if (method === "POST" && segments.join("/") === "auth/register") return handleRegister(body);
  if (method === "GET" && segments.join("/") === "auth/me") return handleMe(tokens);
  if (method === "POST" && segments.join("/") === "auth/refresh") {
    const refreshToken = String((body as any)?.refreshToken ?? "");
    if (!refreshToken.startsWith(REFRESH_PREFIX)) throw new ApiError(401, "Invalid refresh token");
    const userId = refreshToken.slice(REFRESH_PREFIX.length);
    const user = await findUserById(userId);
    if (!user) throw new ApiError(401, "Invalid refresh token");
    return issueTokens(user.id);
  }
  if (method === "POST" && segments.join("/") === "quotes") return handleCreateQuote(body);
  if (method === "POST" && segments.length === 1 && segments[0] === "bookings") return handleCreateBooking(body, tokens);
  if (method === "GET" && segments.length === 2 && segments[0] === "bookings" && segments[1] === "mine") {
    void query;
    return handleListMyBookings(tokens);
  }
  if (method === "GET" && segments.length === 2 && segments[0] === "bookings") return handleGetBooking(segments[1], tokens);
  if (method === "POST" && segments.length === 3 && segments[0] === "bookings" && segments[2] === "cancel") {
    return handleCancelBooking(segments[1], tokens);
  }

  throw new ApiError(404, `No demo handler for ${method} ${path}`);
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = true } = options;
  const tokens = auth ? await getStoredTokens() : null;
  await delay(200 + Math.random() * 300); // small artificial latency so loading states are visible
  const result = await route(path, options, tokens);
  return result as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PATCH", body }),
};

export const API_URL = "demo://on-device";
