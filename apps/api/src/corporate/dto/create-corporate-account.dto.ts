import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString } from "class-validator";

export class CreateCorporateAccountDto {
  @ApiProperty()
  @IsString()
  companyName!: string;

  @ApiProperty()
  @IsEmail()
  billingEmail!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  vatNumber?: string;

  @ApiProperty({ description: "Email of the user who will administer this account" })
  @IsEmail()
  adminEmail!: string;
}
