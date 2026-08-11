import { Injectable, Logger } from "@nestjs/common";
import * as nodemailer from "nodemailer";
import { NotificationChannel, NotificationType } from "@magona/shared";
import { PrismaService } from "../prisma/prisma.service";

interface EmailPayload {
  subject: string;
  html: string;
}

/**
 * Thin abstraction over email + push delivery. In development (no SMTP
 * configured) emails are logged instead of sent so the booking flow works
 * out of the box without external credentials.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly prisma: PrismaService) {
    if (process.env.SMTP_HOST) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      });
    }
  }

  async notifyWelcome(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;
    await this.dispatch(
      userId,
      NotificationType.ACCOUNT_WELCOME,
      {
        subject: `Welcome to Magona, ${user.firstName}!`,
        html: `<p>Hi ${user.firstName},</p><p>Thanks for creating your Magona account. You're ready to book airport transfers, private cars and corporate rides worldwide.</p>`,
      },
      user.email,
    );
  }

  async notifyBookingEvent(
    userId: string,
    type: NotificationType,
    payload: EmailPayload,
    email: string,
  ) {
    await this.dispatch(userId, type, payload, email);
  }

  private async dispatch(userId: string, type: NotificationType, email: EmailPayload, toAddress: string) {
    await this.prisma.notification.create({
      data: {
        userId,
        type,
        channel: NotificationChannel.EMAIL,
        payload: { subject: email.subject, html: email.html },
        sentAt: new Date(),
      },
    });

    if (!this.transporter) {
      this.logger.log(`[email:dev-mode] to=${toAddress} subject="${email.subject}"`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM ?? "Magona <no-reply@magona.com>",
        to: toAddress,
        subject: email.subject,
        html: email.html,
      });
    } catch (err) {
      this.logger.error(`Failed to send email to ${toAddress}`, err as Error);
    }
  }

  async sendPush(userId: string, type: NotificationType, title: string, body: string) {
    await this.prisma.notification.create({
      data: {
        userId,
        type,
        channel: NotificationChannel.PUSH,
        payload: { title, body },
        sentAt: new Date(),
      },
    });
    // FCM/APNs integration point — wire FCM_SERVER_KEY here for production push delivery.
    this.logger.log(`[push:dev-mode] user=${userId} title="${title}"`);
  }
}
