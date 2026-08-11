import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { BookingStatus } from "@magona/shared";
import { PrismaService } from "../prisma/prisma.service";
import { CreateReviewDto } from "./dto/create-review.dto";

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(customerId: string, dto: CreateReviewDto) {
    const booking = await this.prisma.booking.findUnique({ where: { id: dto.bookingId } });
    if (!booking) throw new NotFoundException("Booking not found");
    if (booking.customerId !== customerId) throw new ForbiddenException("You can only review your own bookings");
    if (booking.status !== BookingStatus.COMPLETED) throw new BadRequestException("You can only review completed rides");
    if (!booking.driverId) throw new BadRequestException("This booking has no assigned driver");

    const existing = await this.prisma.review.findUnique({ where: { bookingId: dto.bookingId } });
    if (existing) throw new BadRequestException("You have already reviewed this ride");

    const review = await this.prisma.review.create({
      data: {
        bookingId: dto.bookingId,
        customerId,
        driverId: booking.driverId,
        rating: dto.rating,
        comment: dto.comment,
      },
    });

    const agg = await this.prisma.review.aggregate({ where: { driverId: booking.driverId }, _avg: { rating: true } });
    await this.prisma.driver.update({ where: { id: booking.driverId }, data: { rating: agg._avg.rating ?? dto.rating } });

    return review;
  }

  listForDriver(driverId: string) {
    return this.prisma.review.findMany({ where: { driverId }, include: { customer: true }, orderBy: { createdAt: "desc" } });
  }
}
