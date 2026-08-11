import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsEmail, IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { PaymentMethodType, VehicleCategory } from "@magona/shared";

export class CreateBookingDto {
  @ApiProperty()
  @IsString()
  quoteId!: string;

  @ApiProperty({ enum: VehicleCategory })
  @IsEnum(VehicleCategory)
  vehicleCategory!: VehicleCategory;

  @ApiProperty()
  @IsString()
  passengerName!: string;

  @ApiProperty()
  @IsEmail()
  passengerEmail!: string;

  @ApiProperty()
  @IsString()
  passengerPhone!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(8)
  passengers!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(8)
  luggage!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  flightNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  meetAndGreet?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(4)
  childSeatCount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ enum: PaymentMethodType })
  @IsEnum(PaymentMethodType)
  paymentMethodType!: PaymentMethodType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  paymentMethodId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  corporateAccountId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  costCenter?: string;
}
