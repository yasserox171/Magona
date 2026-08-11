import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UpsertPricingRuleDto } from "./dto/upsert-pricing-rule.dto";

const ACTIVE_RIDE_STATUSES = ["DRIVER_ASSIGNED", "DRIVER_EN_ROUTE", "DRIVER_ARRIVED", "IN_PROGRESS"];

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardOverview() {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      customerCount,
      driverCount,
      fleetCount,
      corporateAccountCount,
      bookingsToday,
      activeRides,
      completedThisMonth,
      pendingDriverApprovals,
      pendingFleetApprovals,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: "CUSTOMER" } }),
      this.prisma.driver.count(),
      this.prisma.fleet.count(),
      this.prisma.corporateAccount.count(),
      this.prisma.booking.count({ where: { createdAt: { gte: startOfToday } } }),
      this.prisma.booking.count({ where: { status: { in: ACTIVE_RIDE_STATUSES as any } } }),
      this.prisma.booking.findMany({
        where: { status: "COMPLETED", completedAt: { gte: startOfMonth } },
        select: { totalCents: true },
      }),
      this.prisma.driver.count({ where: { approvalStatus: "PENDING_REVIEW" } }),
      this.prisma.fleet.count({ where: { status: "PENDING_APPROVAL" } }),
    ]);

    const revenueThisMonthCents = completedThisMonth.reduce((sum, b) => sum + b.totalCents, 0);

    return {
      customerCount,
      driverCount,
      fleetCount,
      corporateAccountCount,
      bookingsToday,
      activeRides,
      revenueThisMonthCents,
      completedRidesThisMonth: completedThisMonth.length,
      pendingDriverApprovals,
      pendingFleetApprovals,
    };
  }

  async getCommissionsSummary(from?: Date, to?: Date) {
    const payouts = await this.prisma.driverPayout.findMany({
      where: { createdAt: { gte: from, lte: to } },
      include: { driver: { include: { fleet: true } } },
    });

    const byFleet = new Map<string, { fleetName: string; grossCents: number; commissionCents: number; netCents: number; rides: number }>();
    for (const payout of payouts) {
      const key = payout.driver.fleetId ?? "unaffiliated";
      const entry = byFleet.get(key) ?? {
        fleetName: payout.driver.fleet?.name ?? "Unaffiliated",
        grossCents: 0,
        commissionCents: 0,
        netCents: 0,
        rides: 0,
      };
      entry.grossCents += payout.grossCents;
      entry.commissionCents += payout.commissionCents;
      entry.netCents += payout.netCents;
      entry.rides += 1;
      byFleet.set(key, entry);
    }

    return {
      totalCommissionCents: payouts.reduce((sum, p) => sum + p.commissionCents, 0),
      totalGrossCents: payouts.reduce((sum, p) => sum + p.grossCents, 0),
      byFleet: Array.from(byFleet.values()),
    };
  }

  listPricingRules() {
    return this.prisma.pricingRule.findMany({ orderBy: [{ vehicleCategory: "asc" }, { city: "asc" }] });
  }

  async upsertPricingRule(dto: UpsertPricingRuleDto) {
    const existing = await this.prisma.pricingRule.findFirst({
      where: { vehicleCategory: dto.vehicleCategory, city: dto.city ?? null },
    });
    if (existing) {
      return this.prisma.pricingRule.update({ where: { id: existing.id }, data: dto });
    }
    return this.prisma.pricingRule.create({ data: dto });
  }

  listCustomers() {
    return this.prisma.user.findMany({ where: { role: "CUSTOMER" }, orderBy: { createdAt: "desc" }, take: 200 });
  }
}
