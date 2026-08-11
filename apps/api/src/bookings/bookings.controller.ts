import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { BookingStatus, UserRole } from "@magona/shared";
import { BookingsService } from "./bookings.service";
import { CreateBookingDto } from "./dto/create-booking.dto";
import { ModifyBookingDto } from "./dto/modify-booking.dto";
import { CancelBookingDto } from "./dto/cancel-booking.dto";
import { AssignDriverDto } from "./dto/assign-driver.dto";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import { RequestUser } from "../auth/types/request-user";

@ApiTags("bookings")
@ApiBearerAuth()
@Controller("bookings")
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @UseGuards(RolesGuard)
  @Roles(UserRole.CUSTOMER, UserRole.CORPORATE_ADMIN)
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateBookingDto) {
    return this.bookingsService.create(user.id, dto);
  }

  @Get("mine")
  findMine(@CurrentUser() user: RequestUser, @Query("scope") scope?: "upcoming" | "past" | "all") {
    return this.bookingsService.findMine(user.id, scope);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.DRIVER)
  @Get("driver/mine")
  findForDriver(@CurrentUser() user: RequestUser) {
    return this.bookingsService.findForDriver(user.id);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.FLEET_ADMIN)
  @Get("fleet/unassigned")
  findUnassigned(@CurrentUser() user: RequestUser) {
    return this.bookingsService.findUnassignedForFleet(user.id);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get("admin")
  listAdmin(@Query("status") status?: BookingStatus, @Query("page") page?: number, @Query("pageSize") pageSize?: number) {
    return this.bookingsService.listAdmin({ status, page: page ? Number(page) : undefined, pageSize: pageSize ? Number(pageSize) : undefined });
  }

  @Get(":id")
  findOne(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.bookingsService.findOne(id, user);
  }

  @Patch(":id")
  modify(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: ModifyBookingDto) {
    return this.bookingsService.modify(id, user, dto);
  }

  @Post(":id/cancel")
  cancel(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: CancelBookingDto) {
    return this.bookingsService.cancel(id, user, dto.reason);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.FLEET_ADMIN, UserRole.ADMIN)
  @Post(":id/assign")
  assignDriver(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: AssignDriverDto) {
    return this.bookingsService.assignDriver(id, user, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.DRIVER)
  @Post(":id/en-route")
  markEnRoute(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.bookingsService.updateStatusByDriver(id, user, "en_route");
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.DRIVER)
  @Post(":id/arrived")
  markArrived(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.bookingsService.updateStatusByDriver(id, user, "arrived");
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.DRIVER)
  @Post(":id/start")
  start(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.bookingsService.updateStatusByDriver(id, user, "start");
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.DRIVER)
  @Post(":id/complete")
  complete(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.bookingsService.updateStatusByDriver(id, user, "complete");
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.DRIVER)
  @Post(":id/no-show")
  noShow(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.bookingsService.updateStatusByDriver(id, user, "no_show");
  }
}
