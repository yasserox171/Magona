import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsEnum, IsOptional, IsString } from "class-validator";
import { SupportedCurrency, SupportedLocale } from "@magona/shared";

export class UpdateProfileDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false, enum: SupportedLocale })
  @IsOptional()
  @IsEnum(SupportedLocale)
  locale?: SupportedLocale;

  @ApiProperty({ required: false, enum: SupportedCurrency })
  @IsOptional()
  @IsEnum(SupportedCurrency)
  currency?: SupportedCurrency;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  marketingOptIn?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  photoUrl?: string;
}
