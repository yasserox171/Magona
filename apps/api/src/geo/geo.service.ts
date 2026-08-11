import { Injectable, Logger } from "@nestjs/common";
import { GeoPoint, PlaceInput } from "@magona/shared";

export interface RouteResult {
  distanceKm: number;
  durationMinutes: number;
}

const EARTH_RADIUS_KM = 6371;
/** Dev-mode fallback average speed used to derive an ETA from the great-circle distance. */
const FALLBACK_AVERAGE_SPEED_KMH = 45;

/**
 * Wraps the configured maps provider (Mapbox Directions or Google Distance
 * Matrix) for route distance/duration. Falls back to a haversine-distance
 * estimate when no provider API key is configured, so booking flows keep
 * working in local/dev environments without external credentials.
 */
@Injectable()
export class GeoService {
  private readonly logger = new Logger(GeoService.name);

  async computeRoute(pickup: PlaceInput, dropoff: PlaceInput): Promise<RouteResult> {
    if (!pickup.point || !dropoff.point) {
      throw new Error("Both pickup and dropoff must include resolved coordinates");
    }

    const provider = process.env.MAPS_PROVIDER ?? "fallback";
    try {
      if (provider === "mapbox" && process.env.MAPBOX_ACCESS_TOKEN) {
        return await this.viaMapbox(pickup.point, dropoff.point);
      }
      if (provider === "google" && process.env.GOOGLE_MAPS_API_KEY) {
        return await this.viaGoogle(pickup.point, dropoff.point);
      }
    } catch (err) {
      this.logger.warn(`Maps provider "${provider}" failed, falling back to estimate: ${(err as Error).message}`);
    }
    return this.viaHaversineEstimate(pickup.point, dropoff.point);
  }

  private async viaMapbox(pickup: GeoPoint, dropoff: GeoPoint): Promise<RouteResult> {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}?access_token=${process.env.MAPBOX_ACCESS_TOKEN}`;
    const res = await fetch(url);
    const data: any = await res.json();
    const route = data?.routes?.[0];
    if (!route) throw new Error("No route returned by Mapbox");
    return { distanceKm: route.distance / 1000, durationMinutes: route.duration / 60 };
  }

  private async viaGoogle(pickup: GeoPoint, dropoff: GeoPoint): Promise<RouteResult> {
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${pickup.lat},${pickup.lng}&destinations=${dropoff.lat},${dropoff.lng}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
    const res = await fetch(url);
    const data: any = await res.json();
    const element = data?.rows?.[0]?.elements?.[0];
    if (!element || element.status !== "OK") throw new Error("No route returned by Google Distance Matrix");
    return { distanceKm: element.distance.value / 1000, durationMinutes: element.duration.value / 60 };
  }

  private viaHaversineEstimate(pickup: GeoPoint, dropoff: GeoPoint): RouteResult {
    const dLat = this.toRad(dropoff.lat - pickup.lat);
    const dLng = this.toRad(dropoff.lng - pickup.lng);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(this.toRad(pickup.lat)) * Math.cos(this.toRad(dropoff.lat)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    // +12% to roughly approximate road distance vs. straight-line distance.
    const distanceKm = EARTH_RADIUS_KM * c * 1.12;
    const durationMinutes = (distanceKm / FALLBACK_AVERAGE_SPEED_KMH) * 60;
    return { distanceKm, durationMinutes };
  }

  private toRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }
}
