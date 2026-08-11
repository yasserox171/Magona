"use client";

import { SupportedCurrency } from "@magona/shared";
import { useCurrencyStore } from "@/lib/currency-store";

export function CurrencySwitcher() {
  const currency = useCurrencyStore((s) => s.currency);
  const setCurrency = useCurrencyStore((s) => s.setCurrency);

  return (
    <select
      aria-label="Currency"
      value={currency}
      onChange={(e) => setCurrency(e.target.value as SupportedCurrency)}
      className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
    >
      {Object.values(SupportedCurrency).map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  );
}
