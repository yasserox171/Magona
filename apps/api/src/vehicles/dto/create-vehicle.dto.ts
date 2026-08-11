import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { VehicleCategory } from "@magona/shared";

export class CreateVehicleDto {
  @ApiProperty({ enum: VehicleCategory })
  category!: VehicleCategory;

  @ApiProperty()
  @IsString()
  make!: string;

  @ApiProperty()
  @IsString()
  model!: string;

  @ApiProperty()
  @IsInt()
  @Min(1990)
  @Max(2100)
  year!: number;

  @ApiProperty()
  @IsString()
  color!: string;

  @ApiProperty()
  @IsString()
  licensePlate!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  capacity!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  luggageCapacity!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @ApiProperty({ required: false, description: "Admin-only: assign to a specific fleet" })
  @IsOptional()
  @IsString()
  fleetId?: string;
}
