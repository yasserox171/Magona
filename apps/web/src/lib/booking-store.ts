"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { QuoteResponse, RideType, VehicleCategory } from "@magona/shared";

interface SearchParams {
  rideType: RideType;
  pickup: { label: string; lat: number; lng: number; airportIataCode?: string } | null;
  dropoff: { label: string; lat: number; lng: number; airportIataCode?: string } | null;
  pickupDateTime: string;
  passengers: number;
  luggage: number;
  hourlyDurationMinutes?: number;
  flightNumber?: string;
}

interface BookingState {
  search: SearchParams;
  setSearch: (partial: Partial<SearchParams>) => void;
  quote: QuoteResponse | null;
  setQuote: (quote: QuoteResponse | null) => void;
  selectedCategory: VehicleCategory | null;
  setSelectedCategory: (category: VehicleCategory | null) => void;
}

const defaultPickupDateTime = () => {
  const d = new Date(Date.now() + 2 * 60 * 60 * 1000);
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
  return d.toISOString().slice(0, 16);
};

export const useBookingStore = create<BookingState>()(
  persist(
    (set) => ({
      search: {
        rideType: RideType.POINT_TO_POINT,
        pickup: null,
        dropoff: null,
        pickupDateTime: defaultPickupDateTime(),
        passengers: 1,
        luggage: 1,
      },
      setSearch: (partial) => set((s) => ({ search: { ...s.search, ...partial } })),
      quote: null,
      setQuote: (quote) => set({ quote }),
      selectedCategory: null,
      setSelectedCategory: (category) => set({ selectedCategory: category }),
    }),
    {
      name: "magona-booking",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
