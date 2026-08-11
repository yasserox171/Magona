import { Controller, Get, Headers, HttpCode, HttpStatus, Param, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { UserRole } from "@magona/shared";
import { PaymentsService } from "./payments.service";
import { Public } from "../common/decorators/public.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";

@ApiTags("payments")
@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Public()
  @Post("webhook/stripe")
  @HttpCode(HttpStatus.OK)
  async stripeWebhook(@Req() req: Request, @Headers("stripe-signature") signature: string) {
    await this.paymentsService.handleStripeWebhookEvent((req as any).rawBody, signature);
    return { received: true };
  }

  @ApiBearerAuth()
  @Post(":paymentId/dev-confirm")
  @HttpCode(HttpStatus.OK)
  devConfirm(@Param("paymentId") paymentId: string) {
    // Only meaningful when Stripe isn't configured (see PaymentsService); lets the
    // checkout flow complete end-to-end in local development without real webhooks.
    return this.paymentsService.devConfirmPayment(paymentId);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get("booking/:bookingId")
  listForBooking(@Param("bookingId") bookingId: string) {
    return this.paymentsService.listForBooking(bookingId);
  }
}
