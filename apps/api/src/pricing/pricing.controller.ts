import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PricingService } from "./pricing.service";
import { QuoteRequestDto } from "./dto/quote-request.dto";
import { Public } from "../common/decorators/public.decorator";

@ApiTags("pricing")
@Controller("quotes")
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Public()
  @Post()
  create(@Body() dto: QuoteRequestDto) {
    return this.pricingService.createQuote(dto as any);
  }

  @Public()
  @Get(":id")
  get(@Param("id") id: string) {
    return this.pricingService.redeemQuote(id);
  }
}
