"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { VehicleQuote } from "@magona/shared";
import { useRouter } from "@/i18n/navigation";
import { useBookingStore } from "@/lib/booking-store";
import { formatMoney } from "@/lib/currency-store";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const VEHICLE_IMAGES: Record<string, string> = {
  ECONOMY: "🚗",
  BUSINESS: "🚙",
  PREMIUM: "🚘",
  VAN: "🚐",
};

export default function SelectVehiclePage() {
  const t = useTranslations("vehicles");
  const tb = useTranslations("home");
  const router = useRouter();
  const { quote, setSelectedCategory } = useBookingStore();

  useEffect(() => {
    if (!quote) router.replace("/");
  }, [quote, router]);

  if (!quote) return null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-ink-900 dark:text-white">{tb("heroTitle")}</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        {quote.pickup.label} → {quote.dropoff.label} · {quote.distanceKm} km · {quote.durationMinutes} min
      </p>

      <div className="mt-6 space-y-4">
        {quote.vehicles.map((vehicle: VehicleQuote) => (
          <Card key={vehicle.category}>
            <CardBody className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-4">
                <span className="text-4xl" aria-hidden>
                  {VEHICLE_IMAGES[vehicle.category] ?? "🚗"}
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-ink-900 dark:text-white">{t(vehicle.category)}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{vehicle.description}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {t("seats", { count: vehicle.maxPassengers })} · {t("bags", { count: vehicle.maxLuggage })}
                    {vehicle.eta ? ` · ${t("etaMinutes", { minutes: vehicle.eta })}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex w-full flex-col items-end gap-2 sm:w-auto">
                <span className="text-xl font-bold text-ink-900 dark:text-white">
                  {formatMoney(vehicle.totalCents, vehicle.currency)}
                </span>
                <Button
                  onClick={() => {
                    setSelectedCategory(vehicle.category);
                    router.push("/checkout");
                  }}
                >
                  {t("selectVehicle")}
                </Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
