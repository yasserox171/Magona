import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import * as bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { DriverApprovalStatus, UserRole } from "@magona/shared";
import { PrismaService } from "../prisma/prisma.service";
import { CreateDriverDto } from "./dto/create-driver.dto";
import { UpdateAvailabilityDto } from "./dto/update-availability.dto";
import { UpdateLocationDto } from "./dto/update-location.dto";
import { RequestUser } from "../auth/types/request-user";

@Injectable()
export class DriversService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  async registerDriverForFleet(actor: RequestUser, dto: CreateDriverDto) {
    const fleet = await this.prisma.fleet.findUnique({ where: { ownerUserId: actor.id } });
    if (!fleet) throw new ForbiddenException("You do not manage a fleet");

    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existingUser) throw new BadRequestException("A user with this email already exists");

    const password = dto.temporaryPassword ?? randomBytes(9).toString("base64url");
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: UserRole.DRIVER,
        gdprConsentAt: new Date(),
        driver: {
          create: {
            fleetId: fleet.id,
            licenseNumber: dto.licenseNumber,
            licenseExpiry: new Date(dto.licenseExpiry),
          },
        },
      },
      include: { driver: true },
    });

    return { user: { id: user.id, email: user.email }, driver: user.driver, temporaryPassword: dto.temporaryPassword ? undefined : password };
  }

  async findMine(fleetOwnerId: string) {
    const fleet = await this.prisma.fleet.findUnique({ where: { ownerUserId: fleetOwnerId } });
    if (!fleet) throw new ForbiddenException("You do not manage a fleet");
    return this.prisma.driver.findMany({ where: { fleetId: fleet.id }, include: { user: true, vehicles: true } });
  }

  async getMyDriverProfile(userId: string) {
    const driver = await this.prisma.driver.findUnique({ where: { userId }, include: { vehicles: true, fleet: true } });
    if (!driver) throw new NotFoundException("Driver profile not found");
    return driver;
  }

  async updateAvailability(userId: string, dto: UpdateAvailabilityDto) {
    const driver = await this.prisma.driver.findUnique({ where: { userId } });
    if (!driver) throw new NotFoundException("Driver profile not found");
    if (driver.approvalStatus !== DriverApprovalStatus.APPROVED) {
      throw new ForbiddenException("Your account is not yet approved to go online");
    }
    return this.prisma.driver.update({ where: { userId }, data: { status: dto.status } });
  }

  async updateLocation(userId: string, dto: UpdateLocationDto) {
    const driver = await this.prisma.driver.findUnique({ where: { userId } });
    if (!driver) throw new NotFoundException("Driver profile not found");
    const updated = await this.prisma.driver.update({
      where: { userId },
      data: { currentLat: dto.lat, currentLng: dto.lng, locationUpdatedAt: new Date() },
    });

    const activeBooking = await this.prisma.booking.findFirst({
      where: { driverId: driver.id, status: { in: ["DRIVER_ASSIGNED", "DRIVER_EN_ROUTE", "DRIVER_ARRIVED", "IN_PROGRESS"] } },
    });
    if (activeBooking) {
      this.events.emit("driver.location.updated", {
        bookingId: activeBooking.id,
        driverId: driver.id,
        point: { lat: dto.lat, lng: dto.lng },
        heading: dto.heading,
        speedKmh: dto.speedKmh,
        timestamp: new Date().toISOString(),
      });
    }
    return updated;
  }

  listPendingApproval() {
    return this.prisma.driver.findMany({ where: { approvalStatus: DriverApprovalStatus.PENDING_REVIEW }, include: { user: true, fleet: true } });
  }

  listAllAdmin() {
    return this.prisma.driver.findMany({ include: { user: true, fleet: true }, orderBy: { createdAt: "desc" } });
  }

  async setApprovalStatus(driverId: string, status: DriverApprovalStatus) {
    const driver = await this.prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) throw new NotFoundException("Driver not found");
    return this.prisma.driver.update({ where: { id: driverId }, data: { approvalStatus: status } });
  }

  async getEarnings(userId: string) {
    const driver = await this.prisma.driver.findUnique({ where: { userId } });
    if (!driver) throw new NotFoundException("Driver profile not found");
    const payouts = await this.prisma.driverPayout.findMany({
      where: { driverId: driver.id },
      include: { booking: { select: { reference: true, pickupDateTime: true } } },
      orderBy: { createdAt: "desc" },
    });
    const totalNetCents = payouts.reduce((sum, p) => sum + p.netCents, 0);
    const pendingNetCents = payouts.filter((p) => !p.paidOut).reduce((sum, p) => sum + p.netCents, 0);
    return { totalNetCents, pendingNetCents, payouts };
  }
}
