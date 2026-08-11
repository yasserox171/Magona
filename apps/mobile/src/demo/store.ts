import AsyncStorage from "@react-native-async-storage/async-storage";
import { VehicleCategory } from "../types";

const USERS_KEY = "magona.demo.users";
const BOOKINGS_KEY = "magona.demo.bookings";
const SEEDED_KEY = "magona.demo.seeded";

export interface DemoUser {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
}

export interface StoredBooking {
  id: string;
  reference: string;
  userId: string;
  pickupLabel: string;
  dropoffLabel: string;
  pickupDateTime: string;
  vehicleCategory: VehicleCategory;
  totalCents: number;
  currency: string;
  flightNumber: string | null;
  createdAtMs: number;
  isCancelled: boolean;
  cancelledAtMs: number | null;
}

export function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function genReference(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "MG-";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

async function readUsers(): Promise<DemoUser[]> {
  const raw = await AsyncStorage.getItem(USERS_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function writeUsers(users: DemoUser[]): Promise<void> {
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
}

async function readBookings(): Promise<StoredBooking[]> {
  const raw = await AsyncStorage.getItem(BOOKINGS_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function writeBookings(bookings: StoredBooking[]): Promise<void> {
  await AsyncStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
}

async function ensureSeeded(): Promise<void> {
  const seeded = await AsyncStorage.getItem(SEEDED_KEY);
  if (seeded) return;

  const demoUser: DemoUser = {
    id: "user_demo_customer",
    email: "customer@magona.com",
    password: "Password123!",
    firstName: "Alex",
    lastName: "Morgan",
    phone: "+44 7700 900123",
    role: "CUSTOMER",
  };
  await writeUsers([demoUser]);

  const now = Date.now();
  const seededBookings: StoredBooking[] = [
    {
      id: "booking_demo_completed",
      reference: "MG-DEMO01",
      userId: demoUser.id,
      pickupLabel: "London Heathrow Airport (LHR)",
      dropoffLabel: "London City Centre",
      pickupDateTime: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
      vehicleCategory: VehicleCategory.BUSINESS,
      totalCents: 6800,
      currency: "EUR",
      flightNumber: null,
      createdAtMs: now - 3 * 24 * 60 * 60 * 1000,
      isCancelled: false,
      cancelledAtMs: null,
    },
    {
      id: "booking_demo_cancelled",
      reference: "MG-DEMO02",
      userId: demoUser.id,
      pickupLabel: "Paris Charles de Gaulle Airport (CDG)",
      dropoffLabel: "Paris City Centre",
      pickupDateTime: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
      vehicleCategory: VehicleCategory.ECONOMY,
      totalCents: 4200,
      currency: "EUR",
      flightNumber: null,
      createdAtMs: now - 1 * 24 * 60 * 60 * 1000,
      isCancelled: true,
      cancelledAtMs: now - 1 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000,
    },
  ];
  await writeBookings(seededBookings);
  await AsyncStorage.setItem(SEEDED_KEY, "1");
}

export async function findUserByEmail(email: string): Promise<DemoUser | null> {
  await ensureSeeded();
  const users = await readUsers();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export async function findUserById(id: string): Promise<DemoUser | null> {
  await ensureSeeded();
  const users = await readUsers();
  return users.find((u) => u.id === id) ?? null;
}

export async function createUser(user: Omit<DemoUser, "id">): Promise<DemoUser> {
  await ensureSeeded();
  const users = await readUsers();
  const created: DemoUser = { ...user, id: genId("user") };
  users.push(created);
  await writeUsers(users);
  return created;
}

export async function listBookingsForUser(userId: string): Promise<StoredBooking[]> {
  await ensureSeeded();
  const bookings = await readBookings();
  return bookings.filter((b) => b.userId === userId).sort((a, b) => b.createdAtMs - a.createdAtMs);
}

export async function findBooking(id: string, userId: string): Promise<StoredBooking | null> {
  await ensureSeeded();
  const bookings = await readBookings();
  return bookings.find((b) => b.id === id && b.userId === userId) ?? null;
}

export async function createBooking(booking: StoredBooking): Promise<void> {
  await ensureSeeded();
  const bookings = await readBookings();
  bookings.push(booking);
  await writeBookings(bookings);
}

export async function cancelBooking(id: string, userId: string): Promise<void> {
  const bookings = await readBookings();
  const idx = bookings.findIndex((b) => b.id === id && b.userId === userId);
  if (idx === -1) return;
  bookings[idx] = { ...bookings[idx], isCancelled: true, cancelledAtMs: Date.now() };
  await writeBookings(bookings);
}

export { genReference };

// --- Live status simulation ---
// Rather than running background timers, each booking's status/history is derived
// on demand from how much time has elapsed since it was created — simple, and
// survives app restarts without any scheduling.

export interface DemoDriver {
  firstName: string;
  lastName: string;
  phone: string;
  vehicle: { make: string; model: string; color: string; licensePlate: string };
}

const DEMO_DRIVERS: DemoDriver[] = [
  {
    firstName: "Marco",
    lastName: "Rossi",
    phone: "+39 345 123 4567",
    vehicle: { make: "Mercedes-Benz", model: "E-Class", color: "Black", licensePlate: "RM 482 XY" },
  },
  {
    firstName: "Fatima",
    lastName: "Haddad",
    phone: "+971 50 123 4567",
    vehicle: { make: "BMW", model: "5 Series", color: "White", licensePlate: "DXB A 55210" },
  },
  {
    firstName: "James",
    lastName: "Whitfield",
    phone: "+44 7700 900456",
    vehicle: { make: "Audi", model: "A6", color: "Grey", licensePlate: "LD19 KPX" },
  },
  {
    firstName: "Sophie",
    lastName: "Laurent",
    phone: "+33 6 12 34 56 78",
    vehicle: { make: "Volkswagen", model: "Passat", color: "Silver", licensePlate: "AB-123-CD" },
  },
];

function pickDemoDriver(bookingId: string): DemoDriver {
  let hash = 0;
  for (let i = 0; i < bookingId.length; i++) hash = (hash * 31 + bookingId.charCodeAt(i)) >>> 0;
  return DEMO_DRIVERS[hash % DEMO_DRIVERS.length];
}

const STAGES: { status: string; offsetMs: number }[] = [
  { status: "CONFIRMED", offsetMs: 0 },
  { status: "DRIVER_ASSIGNED", offsetMs: 20_000 },
  { status: "DRIVER_EN_ROUTE", offsetMs: 60_000 },
  { status: "DRIVER_ARRIVED", offsetMs: 150_000 },
  { status: "IN_PROGRESS", offsetMs: 200_000 },
  { status: "COMPLETED", offsetMs: 260_000 },
];

export interface ComputedBookingStatus {
  status: string;
  statusEvents: { id: string; status: string; createdAt: string }[];
  driver: { user: { firstName: string; lastName: string; phone: string } } | null;
  vehicle: { make: string; model: string; color: string; licensePlate: string } | null;
}

export function computeBookingStatus(booking: StoredBooking, nowMs: number = Date.now()): ComputedBookingStatus {
  const effectiveNow = booking.isCancelled ? (booking.cancelledAtMs ?? nowMs) : nowMs;
  const elapsed = effectiveNow - booking.createdAtMs;
  const reached = STAGES.filter((s) => s.offsetMs <= elapsed);

  const statusEvents = reached.map((s) => ({
    id: `${booking.id}-${s.status}`,
    status: s.status,
    createdAt: new Date(booking.createdAtMs + s.offsetMs).toISOString(),
  }));

  let status = reached[reached.length - 1]?.status ?? "PENDING";

  if (booking.isCancelled) {
    statusEvents.push({
      id: `${booking.id}-CANCELLED`,
      status: "CANCELLED",
      createdAt: new Date(booking.cancelledAtMs ?? nowMs).toISOString(),
    });
    status = "CANCELLED";
  }

  const driverAssigned = reached.some((s) => s.status === "DRIVER_ASSIGNED");
  const demoDriver = driverAssigned ? pickDemoDriver(booking.id) : null;

  return {
    status,
    statusEvents,
    driver: demoDriver ? { user: { firstName: demoDriver.firstName, lastName: demoDriver.lastName, phone: demoDriver.phone } } : null,
    vehicle: demoDriver ? demoDriver.vehicle : null,
  };
}
