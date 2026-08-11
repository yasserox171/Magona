import { GeoPoint, VehicleCategory } from "../types";

/**
 * Mirrors packages/shared/src/pricing.ts (not imported directly — see the note
 * at the top of ../types.ts on why the mobile app keeps local copies).
 */
export interface VehicleCategoryPricing {
  category: VehicleCategory;
  label: string;
  description: string;
  maxPassengers: number;
  maxLuggage: number;
  baseFareCents: number;
  perKmCents: number;
  perMinuteCents: number;
  minimumFareCents: number;
}

export const VEHICLE_CATEGORY_PRICING: Record<VehicleCategory, VehicleCategoryPricing> = {
  [VehicleCategory.ECONOMY]: {
    category: VehicleCategory.ECONOMY,
    label: "Economy",
    description: "Comfortable sedan for up to 3 passengers",
    maxPassengers: 3,
    maxLuggage: 2,
    baseFareCents: 800,
    perKmCents: 150,
    perMinuteCents: 25,
    minimumFareCents: 1500,
  },
  [VehicleCategory.BUSINESS]: {
    category: VehicleCategory.BUSINESS,
    label: "Business",
    description: "Premium sedan with professional chauffeur",
    maxPassengers: 3,
    maxLuggage: 3,
    baseFareCents: 1400,
    perKmCents: 220,
    perMinuteCents: 35,
    minimumFareCents: 2500,
  },
  [VehicleCategory.PREMIUM]: {
    category: VehicleCategory.PREMIUM,
    label: "Premium",
    description: "Luxury vehicle for a first-class experience",
    maxPassengers: 3,
    maxLuggage: 3,
    baseFareCents: 2200,
    perKmCents: 320,
    perMinuteCents: 50,
    minimumFareCents: 4000,
  },
  [VehicleCategory.VAN]: {
    category: VehicleCategory.VAN,
    label: "Van",
    description: "Spacious van for groups and extra luggage",
    maxPassengers: 7,
    maxLuggage: 7,
    baseFareCents: 1800,
    perKmCents: 260,
    perMinuteCents: 40,
    minimumFareCents: 3500,
  },
};

export const NIGHT_SURCHARGE_MULTIPLIER = 1.15; // 22:00 - 06:00
export const NIGHT_SURCHARGE_START_HOUR = 22;
export const NIGHT_SURCHARGE_END_HOUR = 6;

const FX_RATES_TO_EUR: Record<string, number> = { EUR: 1, USD: 1.08, GBP: 0.85, AED: 3.97 };

export function convertFromEurCents(amountEurCents: number, currency: string): number {
  const rate = FX_RATES_TO_EUR[currency] ?? 1;
  return Math.round(amountEurCents * rate);
}

/** Great-circle distance in km, nudged up ~30% to approximate real road distance. */
export function estimateDistanceKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  const straightLineKm = R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  return Math.round(straightLineKm * 1.3 * 10) / 10;
}

export function estimateDurationMinutes(distanceKm: number): number {
  const avgSpeedKmh = distanceKm > 60 ? 75 : distanceKm > 20 ? 55 : 30;
  return Math.max(10, Math.round((distanceKm / avgSpeedKmh) * 60));
}

export function isNightTime(iso: string): boolean {
  const hour = new Date(iso).getHours();
  return hour >= NIGHT_SURCHARGE_START_HOUR || hour < NIGHT_SURCHARGE_END_HOUR;
}
