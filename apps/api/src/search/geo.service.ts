import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";

export interface GeoPoint {
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  label: string;
}

/**
 * Resolves ZIP codes and city names to coordinates using the offline `geo_places` gazetteer.
 * Swap in a geocoding provider here when expanding beyond the seeded coverage.
 */
@Injectable()
export class GeoService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(input: { city?: string | null; state?: string | null; zip?: string | null }): Promise<GeoPoint | null> {
    if (input.zip) {
      const byZip = await this.prisma.geoPlace.findFirst({ where: { zipCode: input.zip } });
      if (byZip) return this.point(byZip, `${byZip.city}, ${byZip.state} ${input.zip}`);
    }
    if (input.city) {
      const place = await this.prisma.geoPlace.findFirst({
        where: {
          city: { equals: input.city.trim(), mode: "insensitive" },
          zipCode: null,
          ...(input.state ? { state: input.state } : {}),
        },
      });
      if (place) return this.point(place, `${place.city}, ${place.state}`);
    }
    return null;
  }

  /** Known city names, longest first — used by the AI intent parser to spot locations in free text. */
  async knownCities(): Promise<{ city: string; state: string }[]> {
    const rows = await this.prisma.geoPlace.findMany({ where: { zipCode: null }, select: { city: true, state: true } });
    return rows.sort((a, b) => b.city.length - a.city.length);
  }

  private point(p: { latitude: number; longitude: number; city: string; state: string }, label: string): GeoPoint {
    return { latitude: p.latitude, longitude: p.longitude, city: p.city, state: p.state, label };
  }
}
