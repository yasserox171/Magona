"use client";

import { useEffect, useRef, useState } from "react";
import { PlaceInput } from "@magona/shared";
import { searchPlaces } from "@/lib/places";
import { Input } from "@/components/ui/input";

interface LocationAutocompleteProps {
  label: string;
  placeholder?: string;
  value: { label: string; lat: number; lng: number; airportIataCode?: string } | null;
  onChange: (place: { label: string; lat: number; lng: number; airportIataCode?: string }) => void;
}

export function LocationAutocomplete({ label, placeholder, value, onChange }: LocationAutocompleteProps) {
  const [query, setQuery] = useState(value?.label ?? "");
  const [results, setResults] = useState<PlaceInput[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value?.label ?? "");
  }, [value?.label]);

  useEffect(() => {
    const handle = setTimeout(async () => {
      if (!open) return;
      const res = await searchPlaces(query);
      setResults(res);
    }, 200);
    return () => clearTimeout(handle);
  }, [query, open]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <Input
        label={label}
        placeholder={placeholder}
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        autoComplete="off"
      />
      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {results.map((place) => (
            <li key={place.placeId ?? place.label}>
              <button
                type="button"
                className="block w-full px-3.5 py-2.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                onClick={() => {
                  if (!place.point) return;
                  onChange({ label: place.label, lat: place.point.lat, lng: place.point.lng, airportIataCode: place.airportIataCode });
                  setQuery(place.label);
                  setOpen(false);
                }}
              >
                {place.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
