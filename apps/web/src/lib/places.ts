import { PlaceInput } from "@magona/shared";

/**
 * Curated fallback location list used when no Mapbox/Google Places API key is
 * configured (NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN / NEXT_PUBLIC_GOOGLE_MAPS_API_KEY),
 * so the booking flow works end-to-end in local development without external
 * credentials. In production, configure a maps provider key and searchPlaces()
 * below will call its live autocomplete API instead.
 */
export const CURATED_PLACES: PlaceInput[] = [
  { label: "London Heathrow Airport (LHR)", point: { lat: 51.4700, lng: -0.4543 }, airportIataCode: "LHR" },
  { label: "London City Centre", point: { lat: 51.5072, lng: -0.1276 } },
  { label: "Paris Charles de Gaulle Airport (CDG)", point: { lat: 49.0097, lng: 2.5479 }, airportIataCode: "CDG" },
  { label: "Paris City Centre", point: { lat: 48.8566, lng: 2.3522 } },
  { label: "Frankfurt Airport (FRA)", point: { lat: 50.0379, lng: 8.5622 }, airportIataCode: "FRA" },
  { label: "Frankfurt City Centre", point: { lat: 50.1109, lng: 8.6821 } },
  { label: "Berlin Brandenburg Airport (BER)", point: { lat: 52.3667, lng: 13.5033 }, airportIataCode: "BER" },
  { label: "Berlin City Centre", point: { lat: 52.5200, lng: 13.4050 } },
  { label: "Amsterdam Schiphol Airport (AMS)", point: { lat: 52.3105, lng: 4.7683 }, airportIataCode: "AMS" },
  { label: "Amsterdam City Centre", point: { lat: 52.3676, lng: 4.9041 } },
  { label: "New York JFK Airport (JFK)", point: { lat: 40.6413, lng: -73.7781 }, airportIataCode: "JFK" },
  { label: "Manhattan, New York", point: { lat: 40.7831, lng: -73.9712 } },
  { label: "Dubai International Airport (DXB)", point: { lat: 25.2532, lng: 55.3657 }, airportIataCode: "DXB" },
  { label: "Dubai Downtown", point: { lat: 25.1972, lng: 55.2744 } },
  { label: "Madrid Barajas Airport (MAD)", point: { lat: 40.4983, lng: -3.5676 }, airportIataCode: "MAD" },
  { label: "Madrid City Centre", point: { lat: 40.4168, lng: -3.7038 } },
  { label: "Rome Fiumicino Airport (FCO)", point: { lat: 41.8003, lng: 12.2389 }, airportIataCode: "FCO" },
  { label: "Rome City Centre", point: { lat: 41.9028, lng: 12.4964 } },
  { label: "Zurich Airport (ZRH)", point: { lat: 47.4647, lng: 8.5492 }, airportIataCode: "ZRH" },
  { label: "Zurich City Centre", point: { lat: 47.3769, lng: 8.5417 } },
];

export async function searchPlaces(query: string): Promise<PlaceInput[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  if (mapboxToken) {
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(trimmed)}.json?access_token=${mapboxToken}&limit=6`,
      );
      const data = await res.json();
      return (data.features ?? []).map((f: any) => ({
        label: f.place_name as string,
        placeId: f.id as string,
        point: { lat: f.center[1], lng: f.center[0] },
      }));
    } catch {
      // fall through to curated list on network error
    }
  }

  const lower = trimmed.toLowerCase();
  return CURATED_PLACES.filter((p) => p.label.toLowerCase().includes(lower)).slice(0, 6);
}
