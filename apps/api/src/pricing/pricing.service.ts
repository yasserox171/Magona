import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import {
  convertFromEurCents,
  DEFAULT_CURRENCY,
  NIGHT_SURCHARGE_END_HOUR,
  NIGHT_SURCHARGE_MULTIPLIER,
  NIGHT_SURCHARGE_START_HOUR,
  QuoteRequest,
  QuoteResponse,
  RideType,
  SupportedCurrency,
  VEHICLE_CATEGORY_PRICING,
  VehicleCategory,
  VehicleQuote,
} from "@magona/shared";
import { PrismaService } from "../prisma/prisma.service";
import { GeoService } from "../geo/geo.service";

const QUOTE_TTL_MINUTES = 15;
/** Included distance assumption for HOURLY charters, in km per booked minute — used only to size the route estimate shown to the customer. */
const HOURLY_KM_PER_MINUTE = 0.5;

@Injectable()
export class PricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geo: GeoService,
  ) {}

  async createQuote(request: QuoteRequest): Promise<QuoteResponse> {
    const currency = request.currency ?? DEFAULT_CURRENCY;
    const pickupDate = new Date(request.pickupDateTime);
    if (Number.isNaN(pickupDate.getTime())) {
      throw new BadRequestException("Invalid pickupDateTime");
    }

    let distanceKm: number;
    let durationMinutes: number;
    if (request.rideType === RideType.HOURLY) {
      if (!request.hourlyDurationMinutes) {
        throw new BadRequestException("hourlyDurationMinutes is required for HOURLY bookings");
      }
      durationMinutes = request.hourlyDurationMinutes;
      distanceKm = durationMinutes * HOURLY_KM_PER_MINUTE;
    } else {
      const route = await this.geo.computeRoute(request.pickup, request.dropoff);
      distanceKm = route.distanceKm;
      durationMinutes = route.durationMinutes;
    }

    const promo = request.promoCode ? await this.validatePromoCode(request.promoCode) : null;
    const isNight = this.isNightTime(pickupDate);

    const categories = Object.values(VehicleCategory);
    const vehicles: VehicleQuote[] = [];
    for (const category of categories) {
      const rule = await this.resolvePricingRule(category);
      if (request.passengers > rule.maxPassengers) continue;

      const baseFareCents = rule.baseFareCents;
      const distanceCents = Math.round(rule.perKmCents * distanceKm);
      const timeCents = Math.round(rule.perMinuteCents * durationMinutes);
      let subtotalCents = Math.max(baseFareCents + distanceCents + timeCents, rule.minimumFareCents);

      const lineItems = [
        { label: "Base fare", amountCents: baseFareCents },
        { label: `Distance (${distanceKm.toFixed(1)} km)`, amountCents: distanceCents },
        { label: `Duration (${Math.round(durationMinutes)} min)`, amountCents: timeCents },
      ];

      if (isNight) {
        const surchargeCents = Math.round(subtotalCents * (NIGHT_SURCHARGE_MULTIPLIER - 1));
        lineItems.push({ label: "Night surcharge (22:00–06:00)", amountCents: surchargeCents });
        subtotalCents += surchargeCents;
      }

      let discountCents = 0;
      if (promo) {
        discountCents =
          promo.discountType === "PERCENTAGE"
            ? Math.round(subtotalCents * (promo.discountValue / 100))
            : promo.discountValue;
        discountCents = Math.min(discountCents, subtotalCents);
      }

      const totalCentsEur = subtotalCents - discountCents;

      vehicles.push({
        category,
        label: rule.label,
        description: rule.description,
        maxPassengers: rule.maxPassengers,
        maxLuggage: rule.maxLuggage,
        currency,
        distanceKm: Math.round(distanceKm * 10) / 10,
        durationMinutes: Math.round(durationMinutes),
        lineItems: lineItems.map((li) => ({ ...li, amountCents: convertFromEurCents(li.amountCents, currency) })),
        subtotalCents: convertFromEurCents(subtotalCents, currency),
        discountCents: convertFromEurCents(discountCents, currency),
        totalCents: convertFromEurCents(totalCentsEur, currency),
        eta: await this.estimateEta(category),
      });
    }

    if (vehicles.length === 0) {
      throw new BadRequestException("No vehicle category can accommodate this many passengers");
    }

    const quoteId = randomUUID();
    const expiresAt = new Date(Date.now() + QUOTE_TTL_MINUTES * 60 * 1000);
    const payload: QuoteResponse = {
      quoteId,
      expiresAt: expiresAt.toISOString(),
      rideType: request.rideType,
      pickup: request.pickup,
      dropoff: request.dropoff,
      pickupDateTime: request.pickupDateTime,
      distanceKm: Math.round(distanceKm * 10) / 10,
      durationMinutes: Math.round(durationMinutes),
      vehicles,
    };

    await this.prisma.quote.create({ data: { id: quoteId, payload: payload as any, expiresAt } });
    return payload;
  }

  async redeemQuote(quoteId: string): Promise<QuoteResponse> {
    const quote = await this.prisma.quote.findUnique({ where: { id: quoteId } });
    if (!quote || quote.redeemed || quote.expiresAt < new Date()) {
      throw new NotFoundException("This quote has expired — please search again");
    }
    return quote.payload as unknown as QuoteResponse;
  }

  async markQuoteRedeemed(quoteId: string) {
    await this.prisma.quote.update({ where: { id: quoteId }, data: { redeemed: true } });
  }

  private async resolvePricingRule(category: VehicleCategory, city?: string) {
    const dbRule = await this.prisma.pricingRule.findFirst({
      where: { vehicleCategory: category, active: true, city: city ?? null },
    });
    const fallback = VEHICLE_CATEGORY_PRICING[category];
    return {
      label: fallback.label,
      description: fallback.description,
      maxPassengers: fallback.maxPassengers,
      maxLuggage: fallback.maxLuggage,
      baseFareCents: dbRule?.baseFareCents ?? fallback.baseFareCents,
      perKmCents: dbRule?.perKmCents ?? fallback.perKmCents,
      perMinuteCents: dbRule?.perMinuteCents ?? fallback.perMinuteCents,
      minimumFareCents: dbRule?.minimumFareCents ?? fallback.minimumFareCents,
    };
  }

  private isNightTime(date: Date): boolean {
    const hour = date.getHours();
    return hour >= NIGHT_SURCHARGE_START_HOUR || hour < NIGHT_SURCHARGE_END_HOUR;
  }

  private async validatePromoCode(code: string) {
    const promo = await this.prisma.promoCode.findUnique({ where: { code: code.toUpperCase() } });
    if (!promo || !promo.active) return null;
    if (promo.expiresAt && promo.expiresAt < new Date()) return null;
    if (promo.maxRedemptions && promo.timesRedeemed >= promo.maxRedemptions) return null;
    return promo;
  }

  private async estimateEta(category: VehicleCategory): Promise<number> {
    const availableCount = await this.prisma.driver.count({
      where: { status: "AVAILABLE", approvalStatus: "APPROVED", vehicles: { some: { category, status: "ACTIVE" } } },
    });
    if (availableCount === 0) return 20;
    if (availableCount <= 3) return 12;
    return 6;
  }

  applyCorporateDiscount(totalCents: number, discountRate: number): { discountCents: number; totalCents: number } {
    const discountCents = Math.round(totalCents * discountRate);
    return { discountCents, totalCents: totalCents - discountCents };
  }
}
