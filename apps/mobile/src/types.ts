// Minimal local copies of the types shared with apps/web (packages/shared).
// Duplicated here (rather than importing @magona/shared) so Metro doesn't have
// to resolve pnpm workspace symlinks — keeps the mobile app buildable standalone.

export enum RideType {
  AIRPORT_PICKUP = "AIRPORT_PICKUP",
  AIRPORT_DROPOFF = "AIRPORT_DROPOFF",
  POINT_TO_POINT = "POINT_TO_POINT",
  HOURLY = "HOURLY",
}

export enum VehicleCategory {
  ECONOMY = "ECONOMY",
  BUSINESS = "BUSINESS",
  PREMIUM = "PREMIUM",
  VAN = "VAN",
}

export enum PaymentMethodType {
  CARD = "CARD",
  INVOICE = "INVOICE",
  CORPORATE_ACCOUNT = "CORPORATE_ACCOUNT",
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface PlaceInput {
  label: string;
  point?: GeoPoint;
  airportIataCode?: string;
}

export interface QuoteLineItem {
  label: string;
  amountCents: number;
}

export interface VehicleQuote {
  category: VehicleCategory;
  label: string;
  description: string;
  maxPassengers: number;
  maxLuggage: number;
  currency: string;
  distanceKm: number;
  durationMinutes: number;
  lineItems: QuoteLineItem[];
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  eta?: number;
}

export interface QuoteResponse {
  quoteId: string;
  expiresAt: string;
  rideType: RideType;
  pickup: PlaceInput;
  dropoff: PlaceInput;
  pickupDateTime: string;
  distanceKm: number;
  durationMinutes: number;
  vehicles: VehicleQuote[];
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface BookingSummary {
  id: string;
  reference: string;
  status: string;
  pickupLabel: string;
  dropoffLabel: string;
  pickupDateTime: string;
  vehicleCategory: VehicleCategory;
  totalCents: number;
  currency: string;
  flightNumber?: string | null;
}
