import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsEmail, IsOptional, IsString } from "class-validator";

export class CreateDriverDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  firstName!: string;

  @ApiProperty()
  @IsString()
  lastName!: string;

  @ApiProperty()
  @IsString()
  phone!: string;

  @ApiProperty()
  @IsString()
  licenseNumber!: string;

  @ApiProperty()
  @IsDateString()
  licenseExpiry!: string;

  @ApiProperty({ required: false, description: "Temporary password; the driver should reset it on first login" })
  @IsOptional()
  @IsString()
  temporaryPassword?: string;
}
