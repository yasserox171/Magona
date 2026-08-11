import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InvoiceStatus, NotificationType } from "@magona/shared";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Runs on the 1st of every month at 02:00 server time and bills the previous calendar month. */
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async generateMonthlyInvoicesForAllAccounts() {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth(), 1);

    const accounts = await this.prisma.corporateAccount.findMany({ where: { monthlyInvoicing: true, status: "ACTIVE" } });
    for (const account of accounts) {
      try {
        await this.generateInvoiceForAccount(account.id, periodStart, periodEnd);
      } catch (err) {
        this.logger.error(`Failed to generate invoice for corporate account ${account.id}`, err as Error);
      }
    }
  }

  async generateInvoiceForAccount(corporateAccountId: string, periodStart: Date, periodEnd: Date) {
    const account = await this.prisma.corporateAccount.findUnique({ where: { id: corporateAccountId } });
    if (!account) throw new NotFoundException("Corporate account not found");

    const bookings = await this.prisma.booking.findMany({
      where: {
        corporateAccountId,
        status: "COMPLETED",
        pickupDateTime: { gte: periodStart, lt: periodEnd },
      },
    });
    if (bookings.length === 0) return null;

    const amountCents = bookings.reduce((sum, b) => sum + b.totalCents, 0);
    const number = `INV-${periodStart.getFullYear()}${String(periodStart.getMonth() + 1).padStart(2, "0")}-${account.id.slice(0, 6).toUpperCase()}`;

    const invoice = await this.prisma.invoice.create({
      data: {
        number,
        corporateAccountId,
        periodStart,
        periodEnd,
        amountCents,
        currency: bookings[0].currency,
        status: InvoiceStatus.ISSUED,
        issuedAt: new Date(),
        dueAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    const admins = await this.prisma.user.findMany({ where: { corporateAdminOf: { some: { id: corporateAccountId } } } });
    for (const admin of admins) {
      await this.notifications.notifyBookingEvent(
        admin.id,
        NotificationType.INVOICE_ISSUED,
        {
          subject: `New invoice ${number} for ${account.companyName}`,
          html: `<p>A new invoice for ${bookings.length} completed rides (${(amountCents / 100).toFixed(2)} ${invoice.currency}) is available in your corporate dashboard.</p>`,
        },
        admin.email,
      );
    }

    return invoice;
  }

  listForAccount(corporateAccountId: string) {
    return this.prisma.invoice.findMany({ where: { corporateAccountId }, orderBy: { createdAt: "desc" } });
  }

  listAllAdmin() {
    return this.prisma.invoice.findMany({ include: { corporateAccount: true }, orderBy: { createdAt: "desc" } });
  }

  async markPaid(invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundException("Invoice not found");
    return this.prisma.invoice.update({ where: { id: invoiceId }, data: { status: InvoiceStatus.PAID } });
  }
}
