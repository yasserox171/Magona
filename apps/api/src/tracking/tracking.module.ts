import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { TrackingGateway } from "./tracking.gateway";

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET ?? "dev-access-secret",
    }),
  ],
  providers: [TrackingGateway],
})
export class TrackingModule {}
