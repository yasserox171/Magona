"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import { QuoteRequest, QuoteResponse, RideType } from "@magona/shared";
import { api, ApiError } from "@/lib/api-client";
import { useBookingStore } from "@/lib/booking-store";
import { useCurrencyStore } from "@/lib/currency-store";
import { useRouter } from "@/i18n/navigation";
import { LocationAutocomplete } from "./location-autocomplete";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const TRIP_TYPES: { value: RideType; labelKey: string }[] = [
  { value: RideType.POINT_TO_POINT, labelKey: "pointToPoint" },
  { value: RideType.AIRPORT_PICKUP, labelKey: "airportPickup" },
  { value: RideType.AIRPORT_DROPOFF, labelKey: "airportDropoff" },
  { value: RideType.HOURLY, labelKey: "hourly" },
];

export function SearchForm() {
  const t = useTranslations("home");
  const tc = useTranslations("common");
  const router = useRouter();
  const currency = useCurrencyStore((s) => s.currency);
  const { search, setSearch, setQuote } = useBookingStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAirport = search.rideType === RideType.AIRPORT_PICKUP || search.rideType === RideType.AIRPORT_DROPOFF;
  const isHourly = search.rideType === RideType.HOURLY;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!search.pickup || (!isHourly && !search.dropoff)) {
      setError("Please choose a pickup" + (isHourly ? "" : " and destination") + " location.");
      return;
    }

    const request: QuoteRequest = {
      rideType: search.rideType,
      pickup: { label: search.pickup.label, point: { lat: search.pickup.lat, lng: search.pickup.lng }, airportIataCode: search.pickup.airportIataCode },
      dropoff: isHourly
        ? { label: search.pickup.label, point: { lat: search.pickup.lat, lng: search.pickup.lng } }
        : { label: search.dropoff!.label, point: { lat: search.dropoff!.lat, lng: search.dropoff!.lng }, airportIataCode: search.dropoff!.airportIataCode },
      pickupDateTime: new Date(search.pickupDateTime).toISOString(),
      passengers: search.passengers,
      luggage: search.luggage,
      hourlyDurationMinutes: isHourly ? (search.hourlyDurationMinutes ?? 120) : undefined,
      currency,
    };

    setIsLoading(true);
    try {
      const quote = await api.post<QuoteResponse>("/quotes", request, { auth: false });
      setQuote(quote);
      router.push("/select-vehicle");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong, please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full rounded-xl2 bg-white p-5 shadow-card sm:p-6 dark:bg-slate-900">
      <div className="mb-4 flex flex-wrap gap-2">
        {TRIP_TYPES.map((type) => (
          <button
            key={type.value}
            type="button"
            onClick={() => setSearch({ rideType: type.value })}
            className={clsx(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              search.rideType === type.value
                ? "bg-brand-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300",
            )}
          >
            {t(`tripType.${type.labelKey}`)}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <LocationAutocomplete
          label={t("pickup")}
          placeholder={t("pickupPlaceholder")}
          value={search.pickup}
          onChange={(place) => setSearch({ pickup: place })}
        />
        {!isHourly && (
          <LocationAutocomplete
            label={t("dropoff")}
            placeholder={t("dropoffPlaceholder")}
            value={search.dropoff}
            onChange={(place) => setSearch({ dropoff: place })}
          />
        )}

        <Input
          label={`${tc("date")} & ${tc("time")}`}
          type="datetime-local"
          value={search.pickupDateTime}
          onChange={(e) => setSearch({ pickupDateTime: e.target.value })}
          required
        />

        {isHourly ? (
          <Select
            label="Duration"
            value={search.hourlyDurationMinutes ?? 120}
            onChange={(e) => setSearch({ hourlyDurationMinutes: Number(e.target.value) })}
          >
            {[60, 120, 180, 240, 360, 480].map((m) => (
              <option key={m} value={m}>
                {m / 60} h
              </option>
            ))}
          </Select>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <Select label={t("passengers")} value={search.passengers} onChange={(e) => setSearch({ passengers: Number(e.target.value) })}>
              {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
            <Select label={t("luggage")} value={search.luggage} onChange={(e) => setSearch({ luggage: Number(e.target.value) })}>
              {Array.from({ length: 9 }, (_, i) => i).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </div>
        )}

        {isAirport && (
          <Input
            label={t("flightNumber")}
            placeholder="e.g. LH123"
            value={search.flightNumber ?? ""}
            onChange={(e) => setSearch({ flightNumber: e.target.value })}
            className="sm:col-span-2"
          />
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <Button type="submit" size="lg" className="mt-5 w-full sm:w-auto" isLoading={isLoading}>
        {t("searchCta")}
      </Button>
    </form>
  );
}
