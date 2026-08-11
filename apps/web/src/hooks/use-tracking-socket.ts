"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { BookingStatus } from "@magona/shared";
import { useAuthStore } from "@/lib/auth-store";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:4000";

interface DriverLocation {
  lat: number;
  lng: number;
  heading?: number;
  speedKmh?: number;
  timestamp: string;
}

export function useTrackingSocket(bookingId: string | undefined, initialStatus?: BookingStatus) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [status, setStatus] = useState<BookingStatus | undefined>(initialStatus);
  const [location, setLocation] = useState<DriverLocation | null>(null);

  useEffect(() => {
    if (!bookingId || !accessToken) return;

    const socket: Socket = io(`${WS_URL}/tracking`, { auth: { token: accessToken }, transports: ["websocket"] });

    socket.on("connect", () => {
      socket.emit("subscribeToBooking", bookingId);
    });

    socket.on("driverLocation", (event: { bookingId: string; point: { lat: number; lng: number }; heading?: number; speedKmh?: number; timestamp: string }) => {
      if (event.bookingId !== bookingId) return;
      setLocation({ lat: event.point.lat, lng: event.point.lng, heading: event.heading, speedKmh: event.speedKmh, timestamp: event.timestamp });
    });

    socket.on("bookingStatus", (event: { bookingId: string; status: BookingStatus }) => {
      if (event.bookingId !== bookingId) return;
      setStatus(event.status);
    });

    return () => {
      socket.disconnect();
    };
  }, [bookingId, accessToken]);

  return { status, location };
}
