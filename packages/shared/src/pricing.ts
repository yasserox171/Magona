import { VehicleCategory, SupportedCurrency } from "./enums";

/**
 * Base pricing configuration, expressed in EUR minor units (cents).
 * Real deployments should source this from the `PricingRule` table
 * (see apps/api pricing module) so admins can tune it without a deploy;
 * these are the seed defaults / fallback when no DB rule matches.
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

export const SURGE_MULTIPLIER_CAP = 2.5;
export const NIGHT_SURCHARGE_MULTIPLIER = 1.15; // 22:00 - 06:00
export const NIGHT_SURCHARGE_START_HOUR = 22;
export const NIGHT_SURCHARGE_END_HOUR = 6;

export const DEFAULT_CURRENCY = SupportedCurrency.EUR;

/** Static fallback FX rates against EUR; production should call a live FX provider. */
export const FX_RATES_TO_EUR: Record<SupportedCurrency, number> = {
  [SupportedCurrency.EUR]: 1,
  [SupportedCurrency.USD]: 1.08,
  [SupportedCurrency.GBP]: 0.85,
  [SupportedCurrency.AED]: 3.97,
};

export function convertFromEurCents(amountEurCents: number, target: SupportedCurrency): number {
  const rate = FX_RATES_TO_EUR[target];
  return Math.round(amountEurCents * rate);
}

export const PLATFORM_COMMISSION_RATE_DEFAULT = 0.2; // 20% platform commission on fleet payouts
export const CORPORATE_DEFAULT_DISCOUNT_RATE = 0.1;
export const CANCELLATION_FREE_WINDOW_MINUTES = 60;
export const CANCELLATION_FEE_RATE = 0.5;
