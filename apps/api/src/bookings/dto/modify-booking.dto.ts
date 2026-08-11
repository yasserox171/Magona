import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class ModifyBookingDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  pickupDateTime?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  flightNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8)
  passengers?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(8)
  luggage?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
