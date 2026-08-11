import { Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { OnEvent } from "@nestjs/event-emitter";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { UserRole } from "@magona/shared";
import { PrismaService } from "../prisma/prisma.service";

interface DriverLocationEvent {
  bookingId: string;
  driverId: string;
  point: { lat: number; lng: number };
  heading?: number;
  speedKmh?: number;
  timestamp: string;
}

interface BookingStatusEvent {
  bookingId: string;
  status: string;
}

@WebSocketGateway({
  namespace: "tracking",
  cors: { origin: process.env.WEB_URL?.split(",") ?? "http://localhost:3000", credentials: true },
})
export class TrackingGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(TrackingGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token as string | undefined;
    if (!token) {
      client.disconnect();
      return;
    }
    try {
      const payload = await this.jwtService.verifyAsync(token, { secret: process.env.JWT_ACCESS_SECRET ?? "dev-access-secret" });
      client.data.user = { id: payload.sub, role: payload.role };
    } catch {
      client.disconnect();
    }
  }

  @SubscribeMessage("subscribeToBooking")
  async subscribeToBooking(@ConnectedSocket() client: Socket, @MessageBody() bookingId: string) {
    const user = client.data.user as { id: string; role: UserRole } | undefined;
    if (!user) return { error: "Not authenticated" };

    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return { error: "Booking not found" };

    const canView =
      user.role === UserRole.ADMIN ||
      booking.customerId === user.id ||
      (booking.driverId && (await this.prisma.driver.findUnique({ where: { userId: user.id } }))?.id === booking.driverId);

    if (!canView) return { error: "Forbidden" };

    client.join(this.roomFor(bookingId));
    return { joined: bookingId };
  }

  @OnEvent("driver.location.updated")
  handleDriverLocation(event: DriverLocationEvent) {
    this.server.to(this.roomFor(event.bookingId)).emit("driverLocation", event);
  }

  @OnEvent("booking.status.changed")
  handleBookingStatus(event: BookingStatusEvent) {
    this.server.to(this.roomFor(event.bookingId)).emit("bookingStatus", event);
  }

  private roomFor(bookingId: string): string {
    return `booking:${bookingId}`;
  }
}
