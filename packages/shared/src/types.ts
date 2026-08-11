import {
  BookingStatus,
  DriverStatus,
  PaymentMethodType,
  PaymentStatus,
  RideType,
  SupportedCurrency,
  UserRole,
  VehicleCategory,
} from "./enums";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface PlaceInput {
  label: string; // free-text / formatted address
  placeId?: string; // Google Place ID or Mapbox feature id
  point?: GeoPoint;
  airportIataCode?: string; // set when the place is an airport
}

export interface QuoteRequest {
  rideType: RideType;
  pickup: PlaceInput;
  dropoff: PlaceInput;
  pickupDateTime: string; // ISO 8601
  passengers: number;
  luggage: number;
  hourlyDurationMinutes?: number; // for HOURLY rides
  promoCode?: string;
  currency?: SupportedCurrency;
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
  currency: SupportedCurrency;
  distanceKm: number;
  durationMinutes: number;
  lineItems: QuoteLineItem[];
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  eta?: number; // minutes until nearest available vehicle
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

export interface CreateBookingRequest {
  quoteId: string;
  vehicleCategory: VehicleCategory;
  passengerName: string;
  passengerEmail: string;
  passengerPhone: string;
  passengers: number;
  luggage: number;
  flightNumber?: string;
  meetAndGreet?: boolean;
  childSeatCount?: number;
  notes?: string;
  paymentMethodType: PaymentMethodType;
  paymentMethodId?: string; // Stripe payment method id
  corporateAccountId?: string;
  costCenter?: string;
}

export interface BookingSummary {
  id: string;
  reference: string;
  status: BookingStatus;
  rideType: RideType;
  vehicleCategory: VehicleCategory;
  pickup: PlaceInput;
  dropoff: PlaceInput;
  pickupDateTime: string;
  totalCents: number;
  currency: SupportedCurrency;
  flightNumber?: string;
  driver?: DriverPublicProfile;
  vehicle?: VehiclePublicProfile;
  createdAt: string;
}

export interface DriverPublicProfile {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl?: string;
  phone: string;
  rating: number;
  totalRides: number;
}

export interface VehiclePublicProfile {
  id: string;
  make: string;
  model: string;
  color: string;
  licensePlate: string;
  category: VehicleCategory;
}

export interface LiveLocationUpdate {
  bookingId: string;
  driverId: string;
  point: GeoPoint;
  heading?: number;
  speedKmh?: number;
  timestamp: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  locale: string;
  currency: SupportedCurrency;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
}
