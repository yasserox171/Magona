import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  BookingStatus,
  CANCELLATION_FEE_RATE,
  CANCELLATION_FREE_WINDOW_MINUTES,
  NotificationType,
  PLATFORM_COMMISSION_RATE_DEFAULT,
  UserRole,
} from "@magona/shared";
import { PrismaService } from "../prisma/prisma.service";
import { PricingService } from "../pricing/pricing.service";
import { PaymentsService } from "../payments/payments.service";
import { NotificationsService } from "../notifications/notifications.service";
import { CreateBookingDto } from "./dto/create-booking.dto";
import { ModifyBookingDto } from "./dto/modify-booking.dto";
import { AssignDriverDto } from "./dto/assign-driver.dto";
import { RequestUser } from "../auth/types/request-user";

const ACTIVE_STATUSES: BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
  BookingStatus.DRIVER_ASSIGNED,
  BookingStatus.DRIVER_EN_ROUTE,
  BookingStatus.DRIVER_ARRIVED,
  BookingStatus.IN_PROGRESS,
];

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
    private readonly payments: PaymentsService,
    private readonly notifications: NotificationsService,
    private readonly events: EventEmitter2,
  ) {}

  async create(customerId: string, dto: CreateBookingDto) {
    const quote = await this.pricing.redeemQuote(dto.quoteId);
    const vehicleQuote = quote.vehicles.find((v) => v.category === dto.vehicleCategory);
    if (!vehicleQuote) throw new BadRequestException("Selected vehicle category is not available for this quote");
    if (dto.passengers > vehicleQuote.maxPassengers) {
      throw new BadRequestException(`This vehicle category seats up to ${vehicleQuote.maxPassengers} passengers`);
    }
    if (!quote.pickup.point || !quote.dropoff.point) {
      throw new BadRequestException("Quote is missing resolved coordinates");
    }

    let corporateAccount = null;
    let subtotalCents = vehicleQuote.subtotalCents;
    let discountCents = vehicleQuote.discountCents;
    let totalCents = vehicleQuote.totalCents;

    if (dto.corporateAccountId) {
      const employee = await this.prisma.corporateEmployee.findFirst({
        where: { userId: customerId, corporateAccountId: dto.corporateAccountId, isActive: true },
        include: { corporateAccount: true },
      });
      if (!employee) throw new ForbiddenException("You are not an active employee of this corporate account");
      corporateAccount = employee.corporateAccount;
      const applied = this.pricing.applyCorporateDiscount(subtotalCents - discountCents, corporateAccount.discountRate);
      discountCents += applied.discountCents;
      totalCents = applied.totalCents;
    }

    const reference = await this.generateReference();

    const booking = await this.prisma.booking.create({
      data: {
        reference,
        customerId,
        corporateAccountId: corporateAccount?.id,
        costCenter: dto.costCenter,
        rideType: quote.rideType,
        status: BookingStatus.CONFIRMED,
        pickupLabel: quote.pickup.label,
        pickupLat: quote.pickup.point.lat,
        pickupLng: quote.pickup.point.lng,
        pickupAirportIata: quote.pickup.airportIataCode,
        dropoffLabel: quote.dropoff.label,
        dropoffLat: quote.dropoff.point.lat,
        dropoffLng: quote.dropoff.point.lng,
        dropoffAirportIata: quote.dropoff.airportIataCode,
        pickupDateTime: new Date(quote.pickupDateTime),
        distanceKm: quote.distanceKm,
        durationMinutes: quote.durationMinutes,
        vehicleCategory: dto.vehicleCategory,
        passengers: dto.passengers,
        luggage: dto.luggage,
        meetAndGreet: dto.meetAndGreet ?? false,
        childSeatCount: dto.childSeatCount ?? 0,
        notes: dto.notes,
        flightNumber: dto.flightNumber,
        subtotalCents,
        discountCents,
        totalCents,
        currency: vehicleQuote.currency,
        passengerName: dto.passengerName,
        passengerEmail: dto.passengerEmail,
        passengerPhone: dto.passengerPhone,
        statusEvents: { create: { status: BookingStatus.CONFIRMED, note: "Booking confirmed" } },
      },
    });

    await this.pricing.markQuoteRedeemed(dto.quoteId);

    const { payment, clientSecret } = await this.payments.createPaymentForBooking(
      booking.id,
      totalCents,
      vehicleQuote.currency,
      dto.paymentMethodType,
    );

    await this.notifications.notifyBookingEvent(
      customerId,
      NotificationType.BOOKING_CONFIRMED,
      {
        subject: `Booking confirmed — ${reference}`,
        html: `<p>Hi ${dto.passengerName},</p><p>Your ride from <strong>${quote.pickup.label}</strong> to <strong>${quote.dropoff.label}</strong> on ${new Date(quote.pickupDateTime).toLocaleString()} is confirmed.</p><p>Reference: ${reference}</p>`,
      },
      dto.passengerEmail,
    );

    return { booking, payment, clientSecret };
  }

  private async generateReference(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = `MG-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const existing = await this.prisma.booking.findUnique({ where: { reference: candidate } });
      if (!existing) return candidate;
    }
    throw new Error("Failed to generate a unique booking reference");
  }

  async findMine(customerId: string, scope: "upcoming" | "past" | "all" = "all") {
    const now = new Date();
    const where: any = { customerId };
    if (scope === "upcoming") where.pickupDateTime = { gte: now };
    if (scope === "past") where.pickupDateTime = { lt: now };
    return this.prisma.booking.findMany({
      where,
      include: { driver: { include: { user: true } }, vehicle: true, review: true },
      orderBy: { pickupDateTime: scope === "past" ? "desc" : "asc" },
    });
  }

  async findOne(id: string, actor: RequestUser) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { driver: { include: { user: true } }, vehicle: true, statusEvents: { orderBy: { createdAt: "asc" } }, payments: true, review: true },
    });
    if (!booking) throw new NotFoundException("Booking not found");
    await this.assertCanView(booking, actor);
    return booking;
  }

  private async assertCanView(booking: { customerId: string; driverId: string | null }, actor: RequestUser) {
    if (actor.role === UserRole.ADMIN) return;
    if (actor.role === UserRole.CUSTOMER && booking.customerId === actor.id) return;
    if (actor.role === UserRole.DRIVER) {
      const driver = await this.prisma.driver.findUnique({ where: { userId: actor.id } });
      if (driver && driver.id === booking.driverId) return;
    }
    if (actor.role === UserRole.FLEET_ADMIN) {
      const fleet = await this.prisma.fleet.findUnique({ where: { ownerUserId: actor.id } });
      const driver = booking.driverId ? await this.prisma.driver.findUnique({ where: { id: booking.driverId } }) : null;
      if (fleet && driver && driver.fleetId === fleet.id) return;
    }
    throw new ForbiddenException("You do not have access to this booking");
  }

  async modify(id: string, actor: RequestUser, dto: ModifyBookingDto) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException("Booking not found");
    if (booking.customerId !== actor.id && actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException("You cannot modify this booking");
    }
    if (!ACTIVE_STATUSES.includes(booking.status as BookingStatus) || booking.status === BookingStatus.IN_PROGRESS) {
      throw new BadRequestException("This booking can no longer be modified");
    }

    const updated = await this.prisma.booking.update({
      where: { id },
      data: {
        pickupDateTime: dto.pickupDateTime ? new Date(dto.pickupDateTime) : undefined,
        flightNumber: dto.flightNumber,
        passengers: dto.passengers,
        luggage: dto.luggage,
        notes: dto.notes,
        statusEvents: { create: { status: booking.status as BookingStatus, note: "Booking details modified by customer" } },
      },
    });

    await this.notifications.notifyBookingEvent(
      booking.customerId,
      NotificationType.BOOKING_MODIFIED,
      {
        subject: `Booking updated — ${booking.reference}`,
        html: `<p>Your booking ${booking.reference} has been updated.</p>`,
      },
      booking.passengerEmail,
    );

    return updated;
  }

  async cancel(id: string, actor: RequestUser, reason?: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException("Booking not found");
    if (booking.customerId !== actor.id && actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException("You cannot cancel this booking");
    }
    if (!ACTIVE_STATUSES.includes(booking.status as BookingStatus)) {
      throw new BadRequestException("This booking cannot be cancelled");
    }

    const minutesUntilPickup = (booking.pickupDateTime.getTime() - Date.now()) / 60000;
    const withinFreeWindow = minutesUntilPickup >= CANCELLATION_FREE_WINDOW_MINUTES;
    const refundCents = withinFreeWindow ? booking.totalCents : Math.round(booking.totalCents * (1 - CANCELLATION_FEE_RATE));

    const updated = await this.prisma.booking.update({
      where: { id },
      data: {
        status: BookingStatus.CANCELLED,
        cancellationReason: reason,
        cancelledAt: new Date(),
        statusEvents: { create: { status: BookingStatus.CANCELLED, note: reason ?? "Cancelled by customer" } },
      },
    });

    if (refundCents > 0) {
      await this.payments.refund(id, refundCents);
    }

    await this.notifications.notifyBookingEvent(
      booking.customerId,
      NotificationType.BOOKING_CANCELLED,
      {
        subject: `Booking cancelled — ${booking.reference}`,
        html: `<p>Your booking ${booking.reference} has been cancelled.${withinFreeWindow ? " You have been fully refunded." : ` A cancellation fee applies as this was cancelled within ${CANCELLATION_FREE_WINDOW_MINUTES} minutes of pickup.`}</p>`,
      },
      booking.passengerEmail,
    );

    return updated;
  }

  async assignDriver(id: string, actor: RequestUser, dto: AssignDriverDto) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException("Booking not found");

    const driver = await this.prisma.driver.findUnique({ where: { id: dto.driverId } });
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: dto.vehicleId } });
    if (!driver || !vehicle) throw new NotFoundException("Driver or vehicle not found");

    if (actor.role === UserRole.FLEET_ADMIN) {
      const fleet = await this.prisma.fleet.findUnique({ where: { ownerUserId: actor.id } });
      if (!fleet || driver.fleetId !== fleet.id || vehicle.fleetId !== fleet.id) {
        throw new ForbiddenException("You can only assign your own fleet's drivers and vehicles");
      }
    } else if (actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException("You cannot assign drivers");
    }

    const updated = await this.prisma.booking.update({
      where: { id },
      data: {
        driverId: driver.id,
        vehicleId: vehicle.id,
        status: BookingStatus.DRIVER_ASSIGNED,
        statusEvents: { create: { status: BookingStatus.DRIVER_ASSIGNED, note: `Assigned to driver ${driver.id}` } },
      },
    });

    await this.notifications.notifyBookingEvent(
      booking.customerId,
      NotificationType.DRIVER_ASSIGNED,
      { subject: `Your driver is assigned — ${booking.reference}`, html: `<p>A driver has been assigned to your upcoming ride ${booking.reference}.</p>` },
      booking.passengerEmail,
    );
    this.events.emit("booking.status.changed", { bookingId: id, status: BookingStatus.DRIVER_ASSIGNED });

    return updated;
  }

  private static readonly DRIVER_TRANSITIONS: Record<string, BookingStatus> = {
    en_route: BookingStatus.DRIVER_EN_ROUTE,
    arrived: BookingStatus.DRIVER_ARRIVED,
    start: BookingStatus.IN_PROGRESS,
    complete: BookingStatus.COMPLETED,
    no_show: BookingStatus.NO_SHOW,
  };

  async updateStatusByDriver(id: string, actor: RequestUser, action: keyof typeof BookingsService.DRIVER_TRANSITIONS) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException("Booking not found");
    const driver = await this.prisma.driver.findUnique({ where: { userId: actor.id } });
    if (!driver || booking.driverId !== driver.id) {
      throw new ForbiddenException("You are not the assigned driver for this booking");
    }

    const nextStatus = BookingsService.DRIVER_TRANSITIONS[action];
    if (!nextStatus) throw new BadRequestException("Unknown status transition");

    const updated = await this.prisma.booking.update({
      where: { id },
      data: {
        status: nextStatus,
        completedAt: nextStatus === BookingStatus.COMPLETED ? new Date() : undefined,
        statusEvents: { create: { status: nextStatus } },
      },
    });

    if (nextStatus === BookingStatus.COMPLETED) {
      await this.settleDriverPayout(booking.id, driver.id, booking.totalCents, booking.currency as any);
      await this.prisma.driver.update({ where: { id: driver.id }, data: { totalRides: { increment: 1 } } });
      await this.notifications.notifyBookingEvent(
        booking.customerId,
        NotificationType.RIDE_COMPLETED,
        { subject: `Ride completed — ${booking.reference}`, html: `<p>Thanks for riding with Magona! We hope you enjoyed your trip. You can rate your driver from your dashboard.</p>` },
        booking.passengerEmail,
      );
    }

    const notifTypeByStatus: Partial<Record<BookingStatus, NotificationType>> = {
      [BookingStatus.DRIVER_EN_ROUTE]: NotificationType.DRIVER_EN_ROUTE,
      [BookingStatus.DRIVER_ARRIVED]: NotificationType.DRIVER_ARRIVED,
      [BookingStatus.IN_PROGRESS]: NotificationType.RIDE_STARTED,
    };
    const notifType = notifTypeByStatus[nextStatus];
    if (notifType) {
      await this.notifications.notifyBookingEvent(
        booking.customerId,
        notifType,
        { subject: `Ride update — ${booking.reference}`, html: `<p>Status update for your ride ${booking.reference}: ${nextStatus.replace(/_/g, " ").toLowerCase()}.</p>` },
        booking.passengerEmail,
      );
    }

    this.events.emit("booking.status.changed", { bookingId: id, status: nextStatus });
    return updated;
  }

  private async settleDriverPayout(bookingId: string, driverId: string, grossCents: number, currency: string) {
    const driver = await this.prisma.driver.findUnique({ where: { id: driverId }, include: { fleet: true } });
    const commissionRate = driver?.fleet?.commissionRate ?? PLATFORM_COMMISSION_RATE_DEFAULT;
    const commissionCents = Math.round(grossCents * commissionRate);
    const netCents = grossCents - commissionCents;
    await this.prisma.driverPayout.create({
      data: { bookingId, driverId, grossCents, commissionCents, netCents, currency: currency as any },
    });
  }

  async findForDriver(userId: string) {
    const driver = await this.prisma.driver.findUnique({ where: { userId } });
    if (!driver) throw new NotFoundException("Driver profile not found");
    return this.prisma.booking.findMany({
      where: { driverId: driver.id, status: { in: [...ACTIVE_STATUSES, BookingStatus.COMPLETED] } },
      orderBy: { pickupDateTime: "asc" },
      take: 50,
    });
  }

  async findUnassignedForFleet(fleetOwnerId: string) {
    const fleet = await this.prisma.fleet.findUnique({ where: { ownerUserId: fleetOwnerId } });
    if (!fleet) throw new ForbiddenException("You do not manage a fleet");
    return this.prisma.booking.findMany({
      where: { status: BookingStatus.CONFIRMED, driverId: null },
      orderBy: { pickupDateTime: "asc" },
    });
  }

  async listAdmin(params: { status?: BookingStatus; page?: number; pageSize?: number }) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const where = params.status ? { status: params.status } : {};
    const [items, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: { customer: true, driver: { include: { user: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.booking.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }
}
