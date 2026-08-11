import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsEmail, IsOptional, IsString, MinLength } from "class-validator";

export class RegisterDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty()
  @IsString()
  firstName!: string;

  @ApiProperty()
  @IsString()
  lastName!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  marketingOptIn?: boolean;

  @ApiProperty({ description: "Must be true — required to accept the privacy policy / GDPR data processing terms" })
  @IsBoolean()
  gdprConsent!: boolean;
}
