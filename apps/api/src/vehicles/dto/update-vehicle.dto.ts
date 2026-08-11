import { PartialType } from "@nestjs/swagger";
import { CreateVehicleDto } from "./create-vehicle.dto";
import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsOptional } from "class-validator";
import { VehicleStatus } from "@magona/shared";

export class UpdateVehicleDto extends PartialType(CreateVehicleDto) {
  @ApiProperty({ required: false, enum: VehicleStatus })
  @IsOptional()
  @IsEnum(VehicleStatus)
  status?: VehicleStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  primaryDriverId?: string;
}
