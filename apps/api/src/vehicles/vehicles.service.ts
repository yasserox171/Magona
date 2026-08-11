import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { UserRole, VehicleCategory } from "@magona/shared";
import { PrismaService } from "../prisma/prisma.service";
import { CreateVehicleDto } from "./dto/create-vehicle.dto";
import { UpdateVehicleDto } from "./dto/update-vehicle.dto";
import { RequestUser } from "../auth/types/request-user";

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveFleetIdForActor(actor: RequestUser, requestedFleetId?: string): Promise<string> {
    if (actor.role === UserRole.ADMIN) {
      if (!requestedFleetId) throw new BadRequestException("fleetId is required for admin-created vehicles");
      return requestedFleetId;
    }
    const fleet = await this.prisma.fleet.findUnique({ where: { ownerUserId: actor.id } });
    if (!fleet) throw new ForbiddenException("You do not manage a fleet");
    return fleet.id;
  }

  async create(actor: RequestUser, dto: CreateVehicleDto) {
    const fleetId = await this.resolveFleetIdForActor(actor, dto.fleetId);
    const { fleetId: _ignored, ...rest } = dto;
    return this.prisma.vehicle.create({ data: { ...rest, fleetId } });
  }

  async findMine(actor: RequestUser) {
    const fleet = await this.prisma.fleet.findUnique({ where: { ownerUserId: actor.id } });
    if (!fleet) throw new ForbiddenException("You do not manage a fleet");
    return this.prisma.vehicle.findMany({ where: { fleetId: fleet.id }, include: { primaryDriver: { include: { user: true } } } });
  }

  async update(actor: RequestUser, vehicleId: string, dto: UpdateVehicleDto) {
    const vehicle = await this.assertAccess(actor, vehicleId);
    const { fleetId, ...rest } = dto;
    return this.prisma.vehicle.update({ where: { id: vehicle.id }, data: rest });
  }

  async remove(actor: RequestUser, vehicleId: string) {
    await this.assertAccess(actor, vehicleId);
    await this.prisma.vehicle.delete({ where: { id: vehicleId } });
    return { success: true };
  }

  private async assertAccess(actor: RequestUser, vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw new NotFoundException("Vehicle not found");
    if (actor.role === UserRole.ADMIN) return vehicle;
    const fleet = await this.prisma.fleet.findUnique({ where: { ownerUserId: actor.id } });
    if (!fleet || fleet.id !== vehicle.fleetId) throw new ForbiddenException("You do not manage this vehicle");
    return vehicle;
  }

  listByCategory(category?: VehicleCategory) {
    return this.prisma.vehicle.findMany({ where: category ? { category, status: "ACTIVE" } : { status: "ACTIVE" } });
  }

  listAllAdmin() {
    return this.prisma.vehicle.findMany({ include: { fleet: true }, orderBy: { createdAt: "desc" } });
  }
}
