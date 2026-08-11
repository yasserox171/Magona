import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class AssignDriverDto {
  @ApiProperty()
  @IsString()
  driverId!: string;

  @ApiProperty()
  @IsString()
  vehicleId!: string;
}
