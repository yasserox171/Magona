import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from "class-validator";
import { VehicleCategory } from "@magona/shared";

export class UpsertPricingRuleDto {
  @ApiProperty({ enum: VehicleCategory })
  @IsEnum(VehicleCategory)
  vehicleCategory!: VehicleCategory;

  @ApiProperty({ required: false, description: "Leave empty for a global default rule" })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  baseFareCents!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  perKmCents!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  perMinuteCents!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  minimumFareCents!: number;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
