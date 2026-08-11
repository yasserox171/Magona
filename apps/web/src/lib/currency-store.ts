"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SupportedCurrency } from "@magona/shared";

interface CurrencyState {
  currency: SupportedCurrency;
  setCurrency: (currency: SupportedCurrency) => void;
}

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set) => ({
      currency: SupportedCurrency.EUR,
      setCurrency: (currency) => set({ currency }),
    }),
    { name: "magona-currency" },
  ),
);

const CURRENCY_SYMBOLS: Record<SupportedCurrency, string> = {
  [SupportedCurrency.EUR]: "€",
  [SupportedCurrency.USD]: "$",
  [SupportedCurrency.GBP]: "£",
  [SupportedCurrency.AED]: "AED ",
};

export function formatMoney(amountCents: number, currency: SupportedCurrency): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? "";
  return `${symbol}${(amountCents / 100).toFixed(2)}`;
}
