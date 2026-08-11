import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";

export class GeoPointDto {
  @ApiProperty()
  @IsNumber()
  lat!: number;

  @ApiProperty()
  @IsNumber()
  lng!: number;
}

export class PlaceInputDto {
  @ApiProperty()
  @IsString()
  label!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  placeId?: string;

  @ApiProperty({ required: false, type: GeoPointDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => GeoPointDto)
  point?: GeoPointDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  airportIataCode?: string;
}
