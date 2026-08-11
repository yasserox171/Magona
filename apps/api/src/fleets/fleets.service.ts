import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { FleetStatus, UserRole } from "@magona/shared";
import { PrismaService } from "../prisma/prisma.service";
import { CreateFleetDto } from "./dto/create-fleet.dto";

@Injectable()
export class FleetsService {
  constructor(private readonly prisma: PrismaService) {}

  async registerFleet(ownerUserId: string, dto: CreateFleetDto) {
    const existing = await this.prisma.fleet.findUnique({ where: { ownerUserId } });
    if (existing) throw new BadRequestException("This account already owns a fleet");

    const fleet = await this.prisma.fleet.create({
      data: { ...dto, ownerUserId, status: FleetStatus.PENDING_APPROVAL },
    });
    await this.prisma.user.update({ where: { id: ownerUserId }, data: { role: UserRole.FLEET_ADMIN } });
    return fleet;
  }

  async getMyFleet(ownerUserId: string) {
    const fleet = await this.prisma.fleet.findUnique({
      where: { ownerUserId },
      include: { vehicles: true, drivers: { include: { user: true } } },
    });
    if (!fleet) throw new NotFoundException("No fleet found for this account");
    return fleet;
  }

  async assertOwnsFleet(fleetId: string, ownerUserId: string) {
    const fleet = await this.prisma.fleet.findUnique({ where: { id: fleetId } });
    if (!fleet) throw new NotFoundException("Fleet not found");
    if (fleet.ownerUserId !== ownerUserId) throw new ForbiddenException("You do not manage this fleet");
    return fleet;
  }

  listAll(status?: FleetStatus) {
    return this.prisma.fleet.findMany({
      where: status ? { status } : undefined,
      include: { _count: { select: { vehicles: true, drivers: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async setStatus(fleetId: string, status: FleetStatus) {
    const fleet = await this.prisma.fleet.findUnique({ where: { id: fleetId } });
    if (!fleet) throw new NotFoundException("Fleet not found");
    return this.prisma.fleet.update({ where: { id: fleetId }, data: { status } });
  }

  async getPerformance(fleetId: string) {
    const [vehicleCount, driverCount, bookings, avgRating] = await Promise.all([
      this.prisma.vehicle.count({ where: { fleetId } }),
      this.prisma.driver.count({ where: { fleetId } }),
      this.prisma.booking.findMany({
        where: { driver: { fleetId } },
        select: { totalCents: true, status: true, currency: true },
      }),
      this.prisma.driver.aggregate({ where: { fleetId }, _avg: { rating: true } }),
    ]);

    const completed = bookings.filter((b) => b.status === "COMPLETED");
    const grossRevenueCents = completed.reduce((sum, b) => sum + b.totalCents, 0);

    return {
      vehicleCount,
      driverCount,
      totalBookings: bookings.length,
      completedBookings: completed.length,
      grossRevenueCents,
      averageDriverRating: avgRating._avg.rating ?? null,
    };
  }
}
