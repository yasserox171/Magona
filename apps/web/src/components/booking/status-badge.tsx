"use client";

import { useTranslations } from "next-intl";
import { Badge, BOOKING_STATUS_TONE } from "@/components/ui/badge";

export function BookingStatusBadge({ status }: { status: string }) {
  const t = useTranslations("booking.statusLabels");
  return <Badge tone={BOOKING_STATUS_TONE[status] ?? "neutral"}>{t(status as any)}</Badge>;
}
