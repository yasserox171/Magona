import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { DriverApprovalStatus, UserRole } from "@magona/shared";
import { DriversService } from "./drivers.service";
import { CreateDriverDto } from "./dto/create-driver.dto";
import { UpdateAvailabilityDto } from "./dto/update-availability.dto";
import { UpdateLocationDto } from "./dto/update-location.dto";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import { RequestUser } from "../auth/types/request-user";

@ApiTags("drivers")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller("drivers")
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Roles(UserRole.FLEET_ADMIN)
  @Post()
  register(@CurrentUser() user: RequestUser, @Body() dto: CreateDriverDto) {
    return this.driversService.registerDriverForFleet(user, dto);
  }

  @Roles(UserRole.FLEET_ADMIN)
  @Get("mine")
  findMine(@CurrentUser() user: RequestUser) {
    return this.driversService.findMine(user.id);
  }

  @Roles(UserRole.DRIVER)
  @Get("me")
  getMyProfile(@CurrentUser() user: RequestUser) {
    return this.driversService.getMyDriverProfile(user.id);
  }

  @Roles(UserRole.DRIVER)
  @Patch("me/availability")
  updateAvailability(@CurrentUser() user: RequestUser, @Body() dto: UpdateAvailabilityDto) {
    return this.driversService.updateAvailability(user.id, dto);
  }

  @Roles(UserRole.DRIVER)
  @Patch("me/location")
  updateLocation(@CurrentUser() user: RequestUser, @Body() dto: UpdateLocationDto) {
    return this.driversService.updateLocation(user.id, dto);
  }

  @Roles(UserRole.DRIVER)
  @Get("me/earnings")
  getEarnings(@CurrentUser() user: RequestUser) {
    return this.driversService.getEarnings(user.id);
  }

  // --- Admin ---

  @Roles(UserRole.ADMIN)
  @Get("admin/pending")
  listPending() {
    return this.driversService.listPendingApproval();
  }

  @Roles(UserRole.ADMIN)
  @Get("admin/all")
  listAll() {
    return this.driversService.listAllAdmin();
  }

  @Roles(UserRole.ADMIN)
  @Patch(":id/approval")
  setApproval(@Param("id") id: string, @Body("status") status: DriverApprovalStatus) {
    return this.driversService.setApprovalStatus(id, status);
  }
}
