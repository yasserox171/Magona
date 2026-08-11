import { Test } from "@nestjs/testing";
import { RideType, SupportedCurrency, VehicleCategory } from "@magona/shared";
import { PricingService } from "./pricing.service";
import { PrismaService } from "../prisma/prisma.service";
import { GeoService } from "../geo/geo.service";

describe("PricingService", () => {
  let pricingService: PricingService;
  let prisma: { pricingRule: any; promoCode: any; driver: any; quote: any };
  let geo: { computeRoute: jest.Mock };

  beforeEach(async () => {
    prisma = {
      pricingRule: { findFirst: jest.fn().mockResolvedValue(null) },
      promoCode: { findUnique: jest.fn().mockResolvedValue(null) },
      driver: { count: jest.fn().mockResolvedValue(0) },
      quote: { create: jest.fn().mockResolvedValue(undefined), findUnique: jest.fn() },
    };
    geo = { computeRoute: jest.fn().mockResolvedValue({ distanceKm: 20, durationMinutes: 30 }) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        PricingService,
        { provide: PrismaService, useValue: prisma },
        { provide: GeoService, useValue: geo },
      ],
    }).compile();

    pricingService = moduleRef.get(PricingService);
  });

  it("excludes vehicle categories that cannot fit the requested passenger count", async () => {
    const quote = await pricingService.createQuote({
      rideType: RideType.POINT_TO_POINT,
      pickup: { label: "A", point: { lat: 0, lng: 0 } },
      dropoff: { label: "B", point: { lat: 0, lng: 0.2 } },
      pickupDateTime: new Date(Date.now() + 3600_000).toISOString(),
      passengers: 6,
      luggage: 2,
      currency: SupportedCurrency.EUR,
    });

    const categories = quote.vehicles.map((v) => v.category);
    expect(categories).not.toContain(VehicleCategory.ECONOMY);
    expect(categories).not.toContain(VehicleCategory.BUSINESS);
    expect(categories).toContain(VehicleCategory.VAN);
  });

  it("applies the minimum fare floor for very short trips", async () => {
    geo.computeRoute.mockResolvedValueOnce({ distanceKm: 0.5, durationMinutes: 2 });

    const quote = await pricingService.createQuote({
      rideType: RideType.POINT_TO_POINT,
      pickup: { label: "A", point: { lat: 0, lng: 0 } },
      dropoff: { label: "B", point: { lat: 0, lng: 0.01 } },
      pickupDateTime: new Date(Date.now() + 3600_000).toISOString(),
      passengers: 1,
      luggage: 0,
      currency: SupportedCurrency.EUR,
    });

    const economy = quote.vehicles.find((v) => v.category === VehicleCategory.ECONOMY)!;
    expect(economy.totalCents).toBeGreaterThanOrEqual(1500);
  });

  it("applies a percentage promo code discount", async () => {
    prisma.promoCode.findUnique.mockResolvedValueOnce({
      code: "WELCOME10",
      discountType: "PERCENTAGE",
      discountValue: 10,
      active: true,
      expiresAt: null,
      maxRedemptions: null,
      timesRedeemed: 0,
    });

    const quote = await pricingService.createQuote({
      rideType: RideType.POINT_TO_POINT,
      pickup: { label: "A", point: { lat: 0, lng: 0 } },
      dropoff: { label: "B", point: { lat: 0, lng: 0.2 } },
      pickupDateTime: new Date(Date.now() + 3600_000).toISOString(),
      passengers: 1,
      luggage: 0,
      promoCode: "WELCOME10",
      currency: SupportedCurrency.EUR,
    });

    const economy = quote.vehicles.find((v) => v.category === VehicleCategory.ECONOMY)!;
    expect(economy.discountCents).toBeGreaterThan(0);
    expect(economy.totalCents).toBe(economy.subtotalCents - economy.discountCents);
  });
});
