import { PlaceInput } from "./types";

/** Curated demo location list (mirrors apps/web/src/lib/places.ts) — no Maps API key needed. */
export const CURATED_PLACES: PlaceInput[] = [
  { label: "London Heathrow Airport (LHR)", point: { lat: 51.47, lng: -0.4543 }, airportIataCode: "LHR" },
  { label: "London City Centre", point: { lat: 51.5072, lng: -0.1276 } },
  { label: "Paris Charles de Gaulle Airport (CDG)", point: { lat: 49.0097, lng: 2.5479 }, airportIataCode: "CDG" },
  { label: "Paris City Centre", point: { lat: 48.8566, lng: 2.3522 } },
  { label: "Frankfurt Airport (FRA)", point: { lat: 50.0379, lng: 8.5622 }, airportIataCode: "FRA" },
  { label: "Frankfurt City Centre", point: { lat: 50.1109, lng: 8.6821 } },
  { label: "Berlin Brandenburg Airport (BER)", point: { lat: 52.3667, lng: 13.5033 }, airportIataCode: "BER" },
  { label: "Berlin City Centre", point: { lat: 52.52, lng: 13.405 } },
  { label: "New York JFK Airport (JFK)", point: { lat: 40.6413, lng: -73.7781 }, airportIataCode: "JFK" },
  { label: "Manhattan, New York", point: { lat: 40.7831, lng: -73.9712 } },
  { label: "Dubai International Airport (DXB)", point: { lat: 25.2532, lng: 55.3657 }, airportIataCode: "DXB" },
  { label: "Dubai Downtown", point: { lat: 25.1972, lng: 55.2744 } },
];
