"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  BookingSummary,
  CreateBookingRequest,
  PaymentMethodType,
} from "@magona/shared";
import { api, ApiError } from "@/lib/api-client";
import { useBookingStore } from "@/lib/booking-store";
import { useSession } from "@/hooks/use-session";
import { formatMoney } from "@/lib/currency-store";
import { isStripeConfigured } from "@/lib/stripe";
import { useRouter } from "@/i18n/navigation";
import { Card, CardBody } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StripePaymentForm } from "@/components/booking/stripe-payment-form";

interface BookingResponse {
  booking: BookingSummary & { id: string };
  payment: { id: string } | null;
  clientSecret: string | null;
}

export default function CheckoutPage() {
  const t = useTranslations("booking");
  const tc = useTranslations("common");
  const th = useTranslations("home");
  const router = useRouter();
  const { quote, selectedCategory, search } = useBookingStore();
  const { user, isAuthenticated } = useSession();

  const [form, setForm] = useState({
    passengerName: "",
    passengerEmail: "",
    passengerPhone: "",
    meetAndGreet: false,
    childSeatCount: 0,
    notes: "",
  });
  const [paymentMethodType, setPaymentMethodType] = useState<PaymentMethodType>(PaymentMethodType.CARD);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingBooking, setPendingBooking] = useState<BookingResponse | null>(null);

  useEffect(() => {
    if (!quote || !selectedCategory) router.replace("/");
  }, [quote, selectedCategory, router]);

  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        passengerName: f.passengerName || `${user.firstName} ${user.lastName}`,
        passengerEmail: f.passengerEmail || user.email,
      }));
    }
  }, [user]);

  if (!quote || !selectedCategory) return null;

  const vehicle = quote.vehicles.find((v) => v.category === selectedCategory)!;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isAuthenticated) {
      router.push("/login?redirect=/checkout");
      return;
    }
    setError(null);
    setIsLoading(true);

    const payload: CreateBookingRequest = {
      quoteId: quote!.quoteId,
      vehicleCategory: selectedCategory!,
      passengers: search.passengers,
      luggage: search.luggage,
      ...form,
      paymentMethodType,
    };

    try {
      const result = await api.post<BookingResponse>("/bookings", payload);
      if (paymentMethodType === PaymentMethodType.CARD && result.clientSecret && !result.clientSecret.includes("_dev")) {
        setPendingBooking(result);
      } else if (result.payment) {
        // Dev mode (no Stripe key configured) — auto-confirm the mock PaymentIntent.
        await api.post(`/payments/${result.payment.id}/dev-confirm`);
        router.push(`/booking/${result.booking.id}`);
      } else {
        router.push(`/booking/${result.booking.id}`);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to complete your booking");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-4xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <h1 className="text-2xl font-bold text-ink-900 dark:text-white">{t("reviewTitle")}</h1>

        {pendingBooking?.clientSecret ? (
          <Card className="mt-6">
            <CardBody>
              <StripePaymentForm
                clientSecret={pendingBooking.clientSecret}
                onSuccess={() => router.push(`/booking/${pendingBooking.booking.id}`)}
              />
            </CardBody>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            <Card>
              <CardBody className="space-y-4">
                <h2 className="font-semibold text-ink-900 dark:text-white">{t("passengerDetails")}</h2>
                <Input label={tc("firstName") + " " + tc("lastName")} required value={form.passengerName} onChange={(e) => setForm({ ...form, passengerName: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <Input label={tc("email")} type="email" required value={form.passengerEmail} onChange={(e) => setForm({ ...form, passengerEmail: e.target.value })} />
                  <Input label={tc("phone")} required value={form.passengerPhone} onChange={(e) => setForm({ ...form, passengerPhone: e.target.value })} />
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                  <input type="checkbox" checked={form.meetAndGreet} onChange={(e) => setForm({ ...form, meetAndGreet: e.target.checked })} />
                  {t("meetAndGreet")}
                </label>
                <Input
                  label={t("childSeat")}
                  type="number"
                  min={0}
                  max={4}
                  value={form.childSeatCount}
                  onChange={(e) => setForm({ ...form, childSeatCount: Number(e.target.value) })}
                />
                <Input label={t("notes")} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </CardBody>
            </Card>

            <Card>
              <CardBody className="space-y-3">
                <h2 className="font-semibold text-ink-900 dark:text-white">{t("paymentMethod")}</h2>
                <PaymentOption
                  label={isStripeConfigured() ? t("card") : `${t("card")} (test mode)`}
                  selected={paymentMethodType === PaymentMethodType.CARD}
                  onSelect={() => setPaymentMethodType(PaymentMethodType.CARD)}
                />
                <PaymentOption
                  label={t("invoice")}
                  selected={paymentMethodType === PaymentMethodType.INVOICE}
                  onSelect={() => setPaymentMethodType(PaymentMethodType.INVOICE)}
                />
              </CardBody>
            </Card>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {!isAuthenticated && <p className="text-sm text-amber-600">You'll be asked to sign in before we confirm your booking.</p>}

            <Button type="submit" size="lg" className="w-full" isLoading={isLoading}>
              {t("confirmAndPay")}
            </Button>
          </form>
        )}
      </div>

      <div>
        <Card>
          <CardBody className="space-y-3">
            <h2 className="font-semibold text-ink-900 dark:text-white">{t("yourTrip")}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">{quote.pickup.label}</p>
            <p className="text-sm text-slate-600 dark:text-slate-300">→ {quote.dropoff.label}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(quote.pickupDateTime).toLocaleString()}</p>

            <div className="border-t border-slate-200 pt-3 dark:border-slate-700">
              <h3 className="font-semibold text-ink-900 dark:text-white">{t("priceBreakdown")}</h3>
              {vehicle.lineItems.map((li) => (
                <div key={li.label} className="mt-1 flex justify-between text-sm text-slate-600 dark:text-slate-300">
                  <span>{li.label}</span>
                  <span>{formatMoney(li.amountCents, vehicle.currency)}</span>
                </div>
              ))}
              {vehicle.discountCents > 0 && (
                <div className="mt-1 flex justify-between text-sm text-emerald-600">
                  <span>{t("discount")}</span>
                  <span>-{formatMoney(vehicle.discountCents, vehicle.currency)}</span>
                </div>
              )}
              <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-ink-900 dark:border-slate-700 dark:text-white">
                <span>{t("total")}</span>
                <span>{formatMoney(vehicle.totalCents, vehicle.currency)}</span>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function PaymentOption({ label, selected, onSelect }: { label: string; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors ${
        selected ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-900/30" : "border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200"
      }`}
    >
      <span
        className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${selected ? "border-brand-600" : "border-slate-300"}`}
      >
        {selected && <span className="h-2 w-2 rounded-full bg-brand-600" />}
      </span>
      {label}
    </button>
  );
}
