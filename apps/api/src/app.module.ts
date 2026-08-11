import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ScheduleModule } from "@nestjs/schedule";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";

import { PrismaModule } from "./prisma/prisma.module";
import { HealthController } from "./health/health.controller";

import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { FleetsModule } from "./fleets/fleets.module";
import { VehiclesModule } from "./vehicles/vehicles.module";
import { DriversModule } from "./drivers/drivers.module";
import { GeoModule } from "./geo/geo.module";
import { PricingModule } from "./pricing/pricing.module";
import { BookingsModule } from "./bookings/bookings.module";
import { PaymentsModule } from "./payments/payments.module";
import { InvoicesModule } from "./invoices/invoices.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { ReviewsModule } from "./reviews/reviews.module";
import { CorporateModule } from "./corporate/corporate.module";
import { TrackingModule } from "./tracking/tracking.module";
import { AdminModule } from "./admin/admin.module";

import { JwtAuthGuard } from "./auth/guards/jwt-auth.guard";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: Number(process.env.THROTTLE_TTL ?? 60) * 1000,
        limit: Number(process.env.THROTTLE_LIMIT ?? 100),
      },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    FleetsModule,
    VehiclesModule,
    DriversModule,
    GeoModule,
    PricingModule,
    BookingsModule,
    PaymentsModule,
    InvoicesModule,
    NotificationsModule,
    ReviewsModule,
    CorporateModule,
    TrackingModule,
    AdminModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
