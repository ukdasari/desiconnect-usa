import type { Prisma } from "@desiconnect/database";
import type {
  CredentialDto,
  ListingDetailDto,
  ListingSummaryDto,
  LocationDto,
  ProviderDto,
} from "@desiconnect/contracts";

export const listingSummaryInclude = {
  category: { include: { parent: true } },
  location: true,
  provider: { select: { id: true, businessName: true, verification: true, languages: true } },
  event: { include: { _count: { select: { registrations: { where: { status: "REGISTERED" } } } } } },
  job: true,
  property: true,
} satisfies Prisma.ListingInclude;

export const listingDetailInclude = {
  ...listingSummaryInclude,
  provider: { include: { credentials: true } },
  reviews: { where: { moderationStatus: "APPROVED" }, include: { author: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 20 },
} satisfies Prisma.ListingInclude;

type SummaryRow = Prisma.ListingGetPayload<{ include: typeof listingSummaryInclude }>;
type DetailRow = Prisma.ListingGetPayload<{ include: typeof listingDetailInclude }>;
type LocationRow = SummaryRow["location"];

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

/** Public location: exact coordinates and street address only when the owner allowed it (or for event venues). */
export function toLocationDto(loc: LocationRow, opts: { exact?: boolean } = {}): LocationDto {
  const exact = opts.exact || loc.showExact;
  const round = (n: number | null) => (n === null ? null : exact ? n : Math.round(n * 100) / 100);
  return {
    addressLine: exact ? loc.addressLine : null,
    city: loc.city,
    state: loc.state,
    zipCode: loc.zipCode,
    latitude: round(loc.latitude),
    longitude: round(loc.longitude),
  };
}

export function toCredentialDto(c: {
  id: string; type: CredentialDto["type"]; jurisdiction: string; licenseNumber: string; issuingAuthority: string | null;
  expiresAt: Date | null; reviewStatus: CredentialDto["reviewStatus"]; reviewedAt: Date | null;
}): CredentialDto {
  return {
    id: c.id,
    type: c.type,
    jurisdiction: c.jurisdiction,
    licenseNumber: c.licenseNumber,
    issuingAuthority: c.issuingAuthority,
    expiresAt: iso(c.expiresAt),
    reviewStatus: c.reviewStatus,
    reviewedAt: iso(c.reviewedAt),
  };
}

export function toListingSummary(row: SummaryRow, extra: { distanceMiles?: number | null; isFavorite?: boolean } = {}): ListingSummaryDto {
  const top = row.category.parent ?? row.category;
  const sub = row.category.parent ? row.category : null;
  return {
    id: row.id,
    slug: row.slug,
    kind: row.kind,
    title: row.title,
    excerpt: row.description.length > 180 ? `${row.description.slice(0, 177).trimEnd()}…` : row.description,
    category: { slug: top.slug, name: top.name, icon: top.icon },
    subcategory: sub ? { slug: sub.slug, name: sub.name } : null,
    location: toLocationDto(row.location, { exact: row.kind === "EVENT" }),
    languages: row.languages.length ? row.languages : (row.provider?.languages ?? []),
    priceText: row.priceText,
    provider: row.provider
      ? { id: row.provider.id, businessName: row.provider.businessName, verification: row.provider.verification, languages: row.provider.languages }
      : null,
    isDemo: row.isDemo,
    tags: row.tags,
    distanceMiles: extra.distanceMiles === undefined || extra.distanceMiles === null ? null : Math.round(extra.distanceMiles * 10) / 10,
    event: row.event
      ? {
          startAt: row.event.startAt.toISOString(),
          endAt: iso(row.event.endAt),
          venue: row.event.venue,
          capacity: row.event.capacity,
          isFree: row.event.isFree,
          ticketUrl: row.event.ticketUrl,
          registeredCount: row.event._count.registrations,
        }
      : null,
    job: row.job
      ? {
          company: row.job.company,
          employmentType: row.job.employmentType,
          workArrangement: row.job.workArrangement,
          salaryMin: row.job.salaryMin,
          salaryMax: row.job.salaryMax,
          salaryPeriod: row.job.salaryPeriod,
          skills: row.job.skills,
        }
      : null,
    property: row.property
      ? {
          transactionType: row.property.transactionType,
          propertyType: row.property.propertyType,
          price: row.property.price,
          beds: row.property.beds,
          baths: row.property.baths,
          sqft: row.property.sqft,
          availableFrom: iso(row.property.availableFrom),
        }
      : null,
    isFavorite: extra.isFavorite,
    publishedAt: iso(row.publishedAt),
  };
}

export function toListingDetail(row: DetailRow, extra: { isFavorite?: boolean } = {}): ListingDetailDto {
  const summary = toListingSummary(row as unknown as SummaryRow, extra);
  const ratings = row.reviews.map((r) => r.rating);
  const top = row.category.parent ?? row.category;
  return {
    ...summary,
    description: row.description,
    contactEmail: row.contactEmail,
    contactPhone: row.contactPhone,
    website: row.website,
    tags: row.tags,
    status: row.status,
    regulated: top.regulated,
    credentials: row.provider?.credentials.filter((c) => c.reviewStatus !== "REJECTED").map(toCredentialDto) ?? [],
    reviews: row.reviews.map((r) => ({ id: r.id, rating: r.rating, body: r.body, authorName: r.author.name ?? "Member", createdAt: r.createdAt.toISOString() })),
    ratingAverage: ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null,
    ratingCount: ratings.length,
    ownerId: row.ownerId,
    rejectionReason: row.rejectionReason,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const providerInclude = {
  categories: { include: { category: true } },
  locations: { where: { isPrimary: true }, include: { location: true }, take: 1 },
  credentials: { orderBy: { createdAt: "desc" } },
} satisfies Prisma.ProviderInclude;

export function toProviderDto(p: Prisma.ProviderGetPayload<{ include: typeof providerInclude }>): ProviderDto {
  const primary = p.locations[0];
  return {
    id: p.id,
    businessName: p.businessName,
    description: p.description,
    email: p.email,
    phone: p.phone,
    website: p.website,
    verification: p.verification,
    languages: p.languages,
    categories: p.categories.map((c) => ({ slug: c.category.slug, name: c.category.name })),
    location: primary ? toLocationDto(primary.location) : null,
    serviceRadiusMiles: primary?.serviceRadiusMiles ?? null,
    credentials: p.credentials.map(toCredentialDto),
    isDemo: p.isDemo,
    createdAt: p.createdAt.toISOString(),
  };
}
