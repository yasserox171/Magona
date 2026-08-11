"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import useSWR from "swr";
import { BookingStatus } from "@magona/shared";
import { api, ApiError } from "@/lib/api-client";
import { formatMoney } from "@/lib/currency-store";
import { useTrackingSocket } from "@/hooks/use-tracking-socket";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookingStatusBadge } from "@/components/booking/status-badge";

interface BookingDetail {
  id: string;
  reference: string;
  status: BookingStatus;
  pickupLabel: string;
  dropoffLabel: string;
  pickupDateTime: string;
  vehicleCategory: string;
  totalCents: number;
  currency: string;
  flightNumber?: string | null;
  driver?: { id: string; user: { firstName: string; lastName: string; phone?: string } } | null;
  vehicle?: { make: string; model: string; color: string; licensePlate: string } | null;
  statusEvents: { id: string; status: string; note?: string | null; createdAt: string }[];
  review?: { id: string } | null;
}

const ACTIVE_STATUSES = ["PENDING", "CONFIRMED", "DRIVER_ASSIGNED", "DRIVER_EN_ROUTE", "DRIVER_ARRIVED", "IN_PROGRESS"];

export default function BookingDetailPage() {
  const params = useParams<{ id: string }>();
  const t = useTranslations("booking");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const { data: booking, mutate } = useSWR<BookingDetail>(params.id ? `/bookings/${params.id}` : null, () =>
    api.get<BookingDetail>(`/bookings/${params.id}`),
  );

  const { status: liveStatus, location } = useTrackingSocket(booking?.id, booking?.status);

  useEffect(() => {
    if (liveStatus && liveStatus !== booking?.status) mutate();
  }, [liveStatus, booking?.status, mutate]);

  if (!booking) return <div className="px-4 py-16 text-center text-slate-500">…</div>;

  const currentStatus = liveStatus ?? booking.status;
  const canCancel = ACTIVE_STATUSES.includes(currentStatus) && currentStatus !== "IN_PROGRESS";

  async function handleCancel() {
    if (!confirm(t("cancelConfirm"))) return;
    await api.post(`/bookings/${booking!.id}/cancel`, {});
    mutate();
  }

  async function submitReview() {
    try {
      await api.post("/reviews", { bookingId: booking!.id, rating: reviewRating, comment: reviewComment });
      setReviewSubmitted(true);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Unable to submit review");
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 dark:text-white">{t("confirmedTitle")}</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {t("confirmedSubtitle", { reference: booking.reference })}
          </p>
        </div>
        <BookingStatusBadge status={currentStatus} />
      </div>

      <Card className="mt-6">
        <CardBody className="space-y-3">
          <Row label={t("yourTrip")} value={`${booking.pickupLabel} → ${booking.dropoffLabel}`} />
          <Row label="Date & time" value={new Date(booking.pickupDateTime).toLocaleString()} />
          <Row label="Vehicle" value={booking.vehicleCategory} />
          {booking.flightNumber && <Row label="Flight" value={booking.flightNumber} />}
          <Row label={t("total")} value={formatMoney(booking.totalCents, booking.currency as any)} />
        </CardBody>
      </Card>

      {booking.driver && (
        <Card className="mt-4">
          <CardBody className="space-y-2">
            <h2 className="font-semibold text-ink-900 dark:text-white">Your driver</h2>
            <p className="text-sm text-slate-700 dark:text-slate-200">
              {booking.driver.user.firstName} {booking.driver.user.lastName} · {booking.driver.user.phone}
            </p>
            {booking.vehicle && (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {booking.vehicle.color} {booking.vehicle.make} {booking.vehicle.model} · {booking.vehicle.licensePlate}
              </p>
            )}
            {location && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("trackRide")}: {location.lat.toFixed(4)}, {location.lng.toFixed(4)} (updated {new Date(location.timestamp).toLocaleTimeString()})
              </p>
            )}
          </CardBody>
        </Card>
      )}

      <Card className="mt-4">
        <CardBody>
          <h2 className="font-semibold text-ink-900 dark:text-white">Status history</h2>
          <ol className="mt-3 space-y-2 border-l border-slate-200 pl-4 dark:border-slate-700">
            {booking.statusEvents.map((event) => (
              <li key={event.id} className="text-sm">
                <p className="font-medium text-slate-800 dark:text-slate-100">{event.status.replace(/_/g, " ")}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(event.createdAt).toLocaleString()}</p>
              </li>
            ))}
          </ol>
        </CardBody>
      </Card>

      {currentStatus === "COMPLETED" && !booking.review && (
        <Card className="mt-4">
          <CardBody className="space-y-3">
            <h2 className="font-semibold text-ink-900 dark:text-white">{t("rateYourRide")}</h2>
            {reviewSubmitted ? (
              <p className="text-sm text-emerald-600">Thanks for your feedback!</p>
            ) : (
              <>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" onClick={() => setReviewRating(n)} className="text-2xl">
                      {n <= reviewRating ? "★" : "☆"}
                    </button>
                  ))}
                </div>
                <textarea
                  className="w-full rounded-xl border border-slate-300 p-3 text-sm dark:border-slate-700 dark:bg-slate-900"
                  rows={3}
                  placeholder="Optional comment"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                />
                <Button onClick={submitReview}>{t("leaveReview")}</Button>
              </>
            )}
          </CardBody>
        </Card>
      )}

      {canCancel && (
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={handleCancel}>
            {t("cancelBooking")}
          </Button>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="font-medium text-slate-800 dark:text-slate-100">{value}</span>
    </div>
  );
}
