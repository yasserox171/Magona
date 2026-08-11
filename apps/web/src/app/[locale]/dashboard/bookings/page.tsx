"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import useSWR from "swr";
import { BookingSummary } from "@magona/shared";
import { api } from "@/lib/api-client";
import { formatMoney } from "@/lib/currency-store";
import { Link } from "@/i18n/navigation";
import { Card, CardBody } from "@/components/ui/card";
import { BookingStatusBadge } from "@/components/booking/status-badge";

export default function BookingsPage() {
  const t = useTranslations("dashboard");
  const [scope, setScope] = useState<"upcoming" | "past">("upcoming");
  const { data: bookings } = useSWR<BookingSummary[]>(`/bookings/mine?scope=${scope}`, () => api.get<BookingSummary[]>(`/bookings/mine?scope=${scope}`));

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {(["upcoming", "past"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setScope(s)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              scope === s ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            {t(s)}
          </button>
        ))}
      </div>

      {bookings?.length === 0 && <p className="text-sm text-slate-500">{t("noUpcoming")}</p>}

      <div className="space-y-3">
        {bookings?.map((booking: any) => (
          <Link key={booking.id} href={`/booking/${booking.id}`}>
            <Card className="transition-shadow hover:shadow-lg">
              <CardBody className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-ink-900 dark:text-white">
                    {booking.pickupLabel} → {booking.dropoffLabel}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {new Date(booking.pickupDateTime).toLocaleString()} · {booking.reference}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <BookingStatusBadge status={booking.status} />
                  <span className="text-sm font-semibold text-ink-900 dark:text-white">
                    {formatMoney(booking.totalCents, booking.currency)}
                  </span>
                </div>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
