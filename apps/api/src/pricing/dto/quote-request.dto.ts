import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from "class-validator";
import { RideType, SupportedCurrency } from "@magona/shared";
import { PlaceInputDto } from "./place-input.dto";

export class QuoteRequestDto {
  @ApiProperty({ enum: RideType })
  @IsEnum(RideType)
  rideType!: RideType;

  @ApiProperty({ type: PlaceInputDto })
  @ValidateNested()
  @Type(() => PlaceInputDto)
  pickup!: PlaceInputDto;

  @ApiProperty({ type: PlaceInputDto })
  @ValidateNested()
  @Type(() => PlaceInputDto)
  dropoff!: PlaceInputDto;

  @ApiProperty()
  @IsDateString()
  pickupDateTime!: string;

  @ApiProperty({ minimum: 1, maximum: 8 })
  @IsInt()
  @Min(1)
  @Max(8)
  passengers!: number;

  @ApiProperty({ minimum: 0, maximum: 8 })
  @IsInt()
  @Min(0)
  @Max(8)
  luggage!: number;

  @ApiProperty({ required: false, description: "Required for HOURLY ride type" })
  @IsOptional()
  @IsInt()
  @Min(60)
  hourlyDurationMinutes?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  promoCode?: string;

  @ApiProperty({ required: false, enum: SupportedCurrency })
  @IsOptional()
  @IsEnum(SupportedCurrency)
  currency?: SupportedCurrency;
}
