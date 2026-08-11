import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import Stripe from "stripe";
import { randomUUID } from "crypto";
import { PaymentMethodType, PaymentStatus, SupportedCurrency } from "@magona/shared";
import { PrismaService } from "../prisma/prisma.service";

const isStripeConfigured = () =>
  Boolean(process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes("placeholder"));

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly stripe: Stripe | null;

  constructor(private readonly prisma: PrismaService) {
    this.stripe = isStripeConfigured()
      ? new Stripe(process.env.STRIPE_SECRET_KEY as string, { apiVersion: "2024-06-20" })
      : null;
  }

  /**
   * Creates the Payment record for a booking and, for card payments, a Stripe
   * PaymentIntent. When Stripe is not configured (local/dev without keys) a
   * mock client secret is returned so the checkout UI still completes.
   */
  async createPaymentForBooking(
    bookingId: string,
    amountCents: number,
    currency: SupportedCurrency,
    methodType: PaymentMethodType,
  ) {
    if (methodType !== PaymentMethodType.CARD) {
      const payment = await this.prisma.payment.create({
        data: {
          bookingId,
          amountCents,
          currency,
          methodType,
          status: PaymentStatus.PAID,
          paidAt: new Date(),
        },
      });
      return { payment, clientSecret: null };
    }

    let stripePaymentIntentId: string | null = null;
    let clientSecret: string | null = null;

    if (this.stripe) {
      const intent = await this.stripe.paymentIntents.create({
        amount: amountCents,
        currency: currency.toLowerCase(),
        automatic_payment_methods: { enabled: true },
        metadata: { bookingId },
      });
      stripePaymentIntentId = intent.id;
      clientSecret = intent.client_secret;
    } else {
      stripePaymentIntentId = `pi_dev_${randomUUID()}`;
      clientSecret = `${stripePaymentIntentId}_secret_dev`;
      this.logger.warn("STRIPE_SECRET_KEY not configured — issuing a mock PaymentIntent for local development");
    }

    const payment = await this.prisma.payment.create({
      data: {
        bookingId,
        amountCents,
        currency,
        methodType,
        status: PaymentStatus.PENDING,
        stripePaymentIntentId,
      },
    });

    return { payment, clientSecret };
  }

  async handleStripeWebhookEvent(rawBody: Buffer, signature: string) {
    if (!this.stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
      this.logger.warn("Stripe webhook received but Stripe is not configured — ignoring");
      return;
    }
    const event = this.stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);

    if (event.type === "payment_intent.succeeded") {
      const intent = event.data.object as Stripe.PaymentIntent;
      await this.markPaidByIntentId(intent.id);
    } else if (event.type === "payment_intent.payment_failed") {
      const intent = event.data.object as Stripe.PaymentIntent;
      await this.prisma.payment.updateMany({
        where: { stripePaymentIntentId: intent.id },
        data: { status: PaymentStatus.FAILED },
      });
    }
  }

  async markPaidByIntentId(stripePaymentIntentId: string) {
    await this.prisma.payment.updateMany({
      where: { stripePaymentIntentId },
      data: { status: PaymentStatus.PAID, paidAt: new Date() },
    });
  }

  /** Dev-mode helper — confirms a mock PaymentIntent without a real Stripe webhook. */
  async devConfirmPayment(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException("Payment not found");
    return this.prisma.payment.update({ where: { id: paymentId }, data: { status: PaymentStatus.PAID, paidAt: new Date() } });
  }

  async refund(bookingId: string, amountCents?: number) {
    const payment = await this.prisma.payment.findFirst({ where: { bookingId, status: PaymentStatus.PAID } });
    if (!payment) return null;

    const refundAmount = amountCents ?? payment.amountCents;
    if (this.stripe && payment.stripePaymentIntentId?.startsWith("pi_") && !payment.stripePaymentIntentId.includes("dev_")) {
      await this.stripe.refunds.create({ payment_intent: payment.stripePaymentIntentId, amount: refundAmount });
    }

    const fullyRefunded = refundAmount >= payment.amountCents;
    return this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: fullyRefunded ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED,
        refundedAmountCents: { increment: refundAmount },
      },
    });
  }

  listForBooking(bookingId: string) {
    return this.prisma.payment.findMany({ where: { bookingId }, orderBy: { createdAt: "desc" } });
  }
}
