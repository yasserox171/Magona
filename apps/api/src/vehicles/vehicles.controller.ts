import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@magona/shared";
import { VehiclesService } from "./vehicles.service";
import { CreateVehicleDto } from "./dto/create-vehicle.dto";
import { UpdateVehicleDto } from "./dto/update-vehicle.dto";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Public } from "../common/decorators/public.decorator";
import { RequestUser } from "../auth/types/request-user";

@ApiTags("vehicles")
@Controller("vehicles")
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Public()
  @Get()
  list() {
    return this.vehiclesService.listByCategory();
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(UserRole.FLEET_ADMIN)
  @Get("mine")
  findMine(@CurrentUser() user: RequestUser) {
    return this.vehiclesService.findMine(user);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(UserRole.FLEET_ADMIN, UserRole.ADMIN)
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateVehicleDto) {
    return this.vehiclesService.create(user, dto);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(UserRole.FLEET_ADMIN, UserRole.ADMIN)
  @Patch(":id")
  update(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: UpdateVehicleDto) {
    return this.vehiclesService.update(user, id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(UserRole.FLEET_ADMIN, UserRole.ADMIN)
  @Delete(":id")
  remove(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.vehiclesService.remove(user, id);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get("admin/all")
  listAllAdmin() {
    return this.vehiclesService.listAllAdmin();
  }
}
