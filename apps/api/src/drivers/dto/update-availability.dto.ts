import { ApiProperty } from "@nestjs/swagger";
import { IsEnum } from "class-validator";
import { DriverStatus } from "@magona/shared";

export class UpdateAvailabilityDto {
  @ApiProperty({ enum: DriverStatus })
  @IsEnum(DriverStatus)
  status!: DriverStatus;
}
