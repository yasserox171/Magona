import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsOptional } from "class-validator";

export class UpdateLocationDto {
  @ApiProperty()
  @IsNumber()
  lat!: number;

  @ApiProperty()
  @IsNumber()
  lng!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  heading?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  speedKmh?: number;
}
