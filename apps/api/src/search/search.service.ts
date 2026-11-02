import { Injectable } from "@nestjs/common";
import { METERS_PER_MILE, Prisma } from "@desiconnect/database";
import { getCategory, type ListingSummaryDto, type SearchQuery } from "@desiconnect/contracts";
import { PrismaService } from "../common/prisma.service";
import { listingSummaryInclude, toListingSummary } from "../listings/listing.mapper";
import { GeoService, type GeoPoint } from "./geo.service";

export interface SearchResult {
  items: ListingSummaryDto[];
  total: number;
  center: GeoPoint | null;
  /** Explains how the location filter was applied, for display ("Within 25 miles of Frisco, TX"). */
  locationNote: string | null;
}

/**
 * Listing search: PostgreSQL full-text search (generated tsvector) + PostGIS radius filtering.
 * Only PUBLISHED, non-deleted listings are ever returned. Filtering, ordering and pagination run
 * in SQL; matching rows are then hydrated through Prisma so every response uses the same mapper.
 */
@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geo: GeoService,
  ) {}

  async search(query: SearchQuery, viewerId?: string | null): Promise<SearchResult> {
    const where: Prisma.Sql[] = [Prisma.sql`l.status = 'PUBLISHED'`, Prisma.sql`l."deletedAt" IS NULL`];

    // ---- category (a top-level slug includes all of its subcategories)
    let kind = query.kind ?? null;
    if (query.category) {
      where.push(Prisma.sql`(c.slug = ${query.category} OR pc.slug = ${query.category})`);
      kind ??= getCategory(query.category)?.kind ?? null;
    }
    if (kind) where.push(Prisma.sql`l.kind = ${kind}::"ListingKind"`);

    // ---- keywords
    const q = query.q?.trim() || null;
    if (q) {
      const like = `%${q.replace(/[%_\\]/g, (m) => `\\${m}`)}%`;
      where.push(Prisma.sql`(
        l."searchVector" @@ websearch_to_tsquery('english', ${q})
        OR l.title ILIKE ${like}
        OR EXISTS (SELECT 1 FROM unnest(l.tags) t WHERE t ILIKE ${like})
        OR p."businessName" ILIKE ${like}
        OR j.company ILIKE ${like}
      )`);
    }

    // ---- location
    const center = await this.geo.resolve({ city: query.city, state: query.state, zip: query.zip });
    let locationNote: string | null = null;
    let centerSql: Prisma.Sql | null = null;
    if (center) {
      centerSql = Prisma.sql`ST_SetSRID(ST_MakePoint(${center.longitude}, ${center.latitude}), 4326)::geography`;
      const meters = query.radiusMiles * METERS_PER_MILE;
      // Remote jobs are visible from anywhere.
      where.push(Prisma.sql`(ST_DWithin(loc.geog, ${centerSql}, ${meters}) OR j."workArrangement" = 'REMOTE')`);
      locationNote = `Within ${query.radiusMiles} miles of ${center.label}`;
    } else if (query.city) {
      where.push(Prisma.sql`lower(loc.city) = lower(${query.city})`);
      if (query.state) where.push(Prisma.sql`loc.state = ${query.state}`);
      locationNote = `In ${query.city}${query.state ? `, ${query.state}` : ""}`;
    } else if (query.state) {
      where.push(Prisma.sql`(loc.state = ${query.state} OR j."workArrangement" = 'REMOTE')`);
      locationNote = `In ${query.state}`;
    }

    // ---- filters
    if (query.language) {
      where.push(Prisma.sql`(${query.language} = ANY(l.languages) OR ${query.language} = ANY(p.languages))`);
    }
    if (query.verifiedOnly) where.push(Prisma.sql`p.verification = 'VERIFIED'`);

    if (kind === "EVENT" || query.from || query.to) {
      // Upcoming events only unless an explicit window is given.
      where.push(Prisma.sql`e."startAt" >= ${query.from ?? new Date(Date.now() - 6 * 3600_000)}`);
      if (query.to) where.push(Prisma.sql`e."startAt" <= ${query.to}`);
    }
    if (query.employmentType) where.push(Prisma.sql`j."employmentType" = ${query.employmentType}::"EmploymentType"`);
    if (query.workArrangement) where.push(Prisma.sql`j."workArrangement" = ${query.workArrangement}::"WorkArrangement"`);
    if (query.transactionType) where.push(Prisma.sql`pr."transactionType" = ${query.transactionType}::"TransactionType"`);
    if (query.propertyType) where.push(Prisma.sql`pr."propertyType" = ${query.propertyType}::"PropertyType"`);
    if (query.minPrice !== undefined) where.push(Prisma.sql`COALESCE(pr.price, l."priceValue") >= ${query.minPrice}`);
    if (query.maxPrice !== undefined) where.push(Prisma.sql`COALESCE(pr.price, l."priceValue") <= ${query.maxPrice}`);
    if (query.minBeds !== undefined) where.push(Prisma.sql`pr.beds >= ${query.minBeds}`);

    // ---- ordering
    const distanceExpr = centerSql ? Prisma.sql`ST_Distance(loc.geog, ${centerSql}) / ${METERS_PER_MILE}` : Prisma.sql`NULL::float8`;
    const rankExpr = q ? Prisma.sql`ts_rank(l."searchVector", websearch_to_tsquery('english', ${q}))` : Prisma.sql`0::float4`;
    let sort = query.sort;
    if (sort === "relevance" && kind === "EVENT") sort = "start_date";
    const orderBy = (() => {
      switch (sort) {
        case "newest":
          return Prisma.sql`l."publishedAt" DESC NULLS LAST`;
        case "distance":
          return centerSql ? Prisma.sql`distance ASC NULLS LAST, l."publishedAt" DESC` : Prisma.sql`l."publishedAt" DESC NULLS LAST`;
        case "price_asc":
          return Prisma.sql`COALESCE(pr.price, l."priceValue") ASC NULLS LAST`;
        case "price_desc":
          return Prisma.sql`COALESCE(pr.price, l."priceValue") DESC NULLS LAST`;
        case "start_date":
          return Prisma.sql`e."startAt" ASC NULLS LAST`;
        default:
          // Relevance: keyword rank, then verified providers, then proximity, then recency.
          return Prisma.sql`rank DESC, (p.verification = 'VERIFIED') DESC NULLS LAST, distance ASC NULLS LAST, l."publishedAt" DESC NULLS LAST`;
      }
    })();

    const offset = (query.page - 1) * query.pageSize;
    const rows = await this.prisma.$queryRaw<{ id: string; distance: number | null; total: bigint }[]>`
      SELECT l.id, ${distanceExpr} AS distance, ${rankExpr} AS rank, COUNT(*) OVER() AS total
      FROM listings l
      JOIN locations loc ON loc.id = l."locationId"
      JOIN categories c ON c.id = l."categoryId"
      LEFT JOIN categories pc ON pc.id = c."parentId"
      LEFT JOIN provider_profiles p ON p.id = l."providerId" AND p."deletedAt" IS NULL
      LEFT JOIN events e ON e."listingId" = l.id
      LEFT JOIN jobs j ON j."listingId" = l.id
      LEFT JOIN properties pr ON pr."listingId" = l.id
      WHERE ${Prisma.join(where, " AND ")}
      ORDER BY ${orderBy}, l.id
      LIMIT ${query.pageSize} OFFSET ${offset}`;

    const total = rows.length ? Number(rows[0]!.total) : 0;
    const items = await this.hydrate(rows, viewerId);
    return { items, total, center, locationNote };
  }

  /** Loads full listing rows for ids in the given order. */
  async hydrate(rows: { id: string; distance?: number | null }[], viewerId?: string | null): Promise<ListingSummaryDto[]> {
    if (!rows.length) return [];
    const ids = rows.map((r) => r.id);
    const [listings, favorites] = await Promise.all([
      this.prisma.listing.findMany({ where: { id: { in: ids } }, include: listingSummaryInclude }),
      viewerId ? this.prisma.favorite.findMany({ where: { userId: viewerId, listingId: { in: ids } }, select: { listingId: true } }) : [],
    ]);
    const favSet = new Set(favorites.map((f) => f.listingId));
    const byId = new Map(listings.map((l) => [l.id, l]));
    return rows.flatMap((r) => {
      const l = byId.get(r.id);
      return l ? [toListingSummary(l, { distanceMiles: r.distance ?? null, isFavorite: viewerId ? favSet.has(l.id) : undefined })] : [];
    });
  }
}
