import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { FleetStatus, UserRole } from "@magona/shared";
import { FleetsService } from "./fleets.service";
import { CreateFleetDto } from "./dto/create-fleet.dto";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import { RequestUser } from "../auth/types/request-user";

@ApiTags("fleets")
@ApiBearerAuth()
@Controller("fleets")
export class FleetsController {
  constructor(private readonly fleetsService: FleetsService) {}

  @Post("register")
  registerFleet(@CurrentUser() user: RequestUser, @Body() dto: CreateFleetDto) {
    return this.fleetsService.registerFleet(user.id, dto);
  }

  @Get("me")
  @UseGuards(RolesGuard)
  @Roles(UserRole.FLEET_ADMIN)
  getMyFleet(@CurrentUser() user: RequestUser) {
    return this.fleetsService.getMyFleet(user.id);
  }

  @Get("me/performance")
  @UseGuards(RolesGuard)
  @Roles(UserRole.FLEET_ADMIN)
  async getMyPerformance(@CurrentUser() user: RequestUser) {
    const fleet = await this.fleetsService.getMyFleet(user.id);
    return this.fleetsService.getPerformance(fleet.id);
  }

  // --- Admin ---

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  listAll(@Query("status") status?: FleetStatus) {
    return this.fleetsService.listAll(status);
  }

  @Patch(":id/status")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  setStatus(@Param("id") id: string, @Body("status") status: FleetStatus) {
    return this.fleetsService.setStatus(id, status);
  }

  @Get(":id/performance")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  getPerformance(@Param("id") id: string) {
    return this.fleetsService.getPerformance(id);
  }
}
