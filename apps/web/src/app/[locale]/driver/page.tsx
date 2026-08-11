"use client";

import { useTranslations } from "next-intl";
import useSWR from "swr";
import { DriverStatus, UserRole } from "@magona/shared";
import { api, ApiError } from "@/lib/api-client";
import { formatMoney } from "@/lib/currency-store";
import { RoleGuard } from "@/components/layout/role-guard";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookingStatusBadge } from "@/components/booking/status-badge";

const NEXT_ACTION: Record<string, { action: string; labelKey: string } | null> = {
  DRIVER_ASSIGNED: { action: "en-route", labelKey: "markEnRoute" },
  DRIVER_EN_ROUTE: { action: "arrived", labelKey: "markArrived" },
  DRIVER_ARRIVED: { action: "start", labelKey: "startRide" },
  IN_PROGRESS: { action: "complete", labelKey: "completeRide" },
};

export default function DriverPortalPage() {
  return (
    <RoleGuard roles={[UserRole.DRIVER]}>
      <DriverPortalContent />
    </RoleGuard>
  );
}

function DriverPortalContent() {
  const t = useTranslations("driver");
  const { data: profile, mutate: mutateProfile } = useSWR("/drivers/me", () => api.get<any>("/drivers/me"));
  const { data: bookings, mutate: mutateBookings } = useSWR("/bookings/driver/mine", () => api.get<any[]>("/bookings/driver/mine"));
  const { data: earnings } = useSWR("/drivers/me/earnings", () => api.get<any>("/drivers/me/earnings"));

  async function toggleAvailability() {
    const nextStatus = profile?.status === DriverStatus.AVAILABLE ? DriverStatus.OFFLINE : DriverStatus.AVAILABLE;
    try {
      await api.patch("/drivers/me/availability", { status: nextStatus });
      mutateProfile();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Unable to update availability");
    }
  }

  async function performAction(bookingId: string, action: string) {
    await api.post(`/bookings/${bookingId}/${action}`, {});
    mutateBookings();
  }

  const isOnline = profile?.status === DriverStatus.AVAILABLE;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink-900 dark:text-white">{t("title")}</h1>
        <Button variant={isOnline ? "danger" : "primary"} onClick={toggleAvailability}>
          {isOnline ? t("goOffline") : t("goOnline")}
        </Button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardBody>
            <p className="text-sm text-slate-500">{t("totalEarned")}</p>
            <p className="mt-1 text-2xl font-bold text-ink-900 dark:text-white">
              {earnings ? formatMoney(earnings.totalNetCents, "EUR" as any) : "—"}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm text-slate-500">{t("pending")}</p>
            <p className="mt-1 text-2xl font-bold text-ink-900 dark:text-white">
              {earnings ? formatMoney(earnings.pendingNetCents, "EUR" as any) : "—"}
            </p>
          </CardBody>
        </Card>
      </div>

      <h2 className="mt-8 text-lg font-semibold text-ink-900 dark:text-white">{t("assignedRides")}</h2>
      <div className="mt-3 space-y-3">
        {bookings?.map((booking) => {
          const next = NEXT_ACTION[booking.status];
          return (
            <Card key={booking.id}>
              <CardBody className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-ink-900 dark:text-white">
                    {booking.pickupLabel} → {booking.dropoffLabel}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {new Date(booking.pickupDateTime).toLocaleString()} · {booking.passengerName} · {booking.passengerPhone}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <BookingStatusBadge status={booking.status} />
                  {next && <Button size="sm" onClick={() => performAction(booking.id, next.action)}>{t(next.labelKey)}</Button>}
                </div>
              </CardBody>
            </Card>
          );
        })}
        {bookings?.length === 0 && <p className="text-sm text-slate-500">No rides assigned yet.</p>}
      </div>
    </div>
  );
}
