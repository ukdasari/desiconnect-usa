import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { Prisma, Role as DbRole } from "@desiconnect/database";
import type { CreateListing, ListingDetailDto, ListingKind, ListingStatus, Role } from "@desiconnect/contracts";
import type { z } from "zod";
import type { updateListingSchema, createReviewSchema } from "@desiconnect/contracts";
import { AuditService } from "../audit/audit.service";
import { type AuthUser, isAdmin } from "../auth/auth.types";
import { badRequest, conflict, forbidden, notFound } from "../common/errors";
import { PrismaService } from "../common/prisma.service";
import { isUuid, listingSlug } from "../common/slug";
import { GeoService } from "../search/geo.service";
import { listingDetailInclude, listingSummaryInclude, toListingDetail, toListingSummary } from "./listing.mapper";

type UpdateListing = z.infer<typeof updateListingSchema>;
type CreateReview = z.infer<typeof createReviewSchema>;

/** Role granted the first time a user publishes each kind of listing. */
const ROLE_FOR_KIND: Partial<Record<ListingKind, Role>> = { EVENT: "ORGANIZER", JOB: "EMPLOYER", PROPERTY: "ADVERTISER" };

@Injectable()
export class ListingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geo: GeoService,
    private readonly audit: AuditService,
  ) {}

  async findOne(idOrSlug: string, viewer: AuthUser | null): Promise<ListingDetailDto> {
    const listing = await this.prisma.listing.findFirst({
      where: { ...(isUuid(idOrSlug) ? { id: idOrSlug } : { slug: idOrSlug }), deletedAt: null },
      include: listingDetailInclude,
    });
    if (!listing) throw notFound("Listing");
    const canSeeUnpublished = viewer && (viewer.id === listing.ownerId || isAdmin(viewer));
    if (listing.status !== "PUBLISHED" && !canSeeUnpublished) throw notFound("Listing");
    const isFavorite = viewer
      ? !!(await this.prisma.favorite.findUnique({ where: { userId_listingId: { userId: viewer.id, listingId: listing.id } } }))
      : undefined;
    return toListingDetail(listing, { isFavorite });
  }

  async create(user: AuthUser, input: CreateListing): Promise<ListingDetailDto> {
    const category = await this.prisma.category.findFirst({ where: { slug: input.categorySlug, isActive: true }, include: { parent: true } });
    if (!category) throw badRequest("Unknown category", { categorySlug: ["Choose a valid category"] });
    const top = category.parent ?? category;
    const kind = top.kind as ListingKind;
    if (kind === "RESOURCE" && !isAdmin(user)) throw forbidden("Only administrators can publish emergency resources");

    this.assertKindDetails(kind, input);
    if (kind === "SERVICE" && !user.providerId) {
      throw forbidden("Create a business profile before publishing service listings");
    }

    const coords = await this.geo.resolve({ city: input.city, state: input.state, zip: input.zipCode });
    const id = randomUUID();
    const status: ListingStatus = input.saveAsDraft ? "DRAFT" : "PENDING_REVIEW";

    await this.prisma.$transaction(async (tx) => {
      const location = await tx.location.create({
        data: {
          addressLine: input.addressLine ?? (input.event?.venue || null),
          city: input.city,
          state: input.state,
          zipCode: input.zipCode ?? null,
          latitude: coords?.latitude ?? null,
          longitude: coords?.longitude ?? null,
          showExact: kind === "EVENT",
        },
      });
      await tx.listing.create({
        data: {
          id,
          slug: listingSlug(input.title, id),
          ownerId: user.id,
          providerId: kind === "SERVICE" ? user.providerId : null,
          categoryId: category.id,
          kind,
          title: input.title,
          description: input.description,
          locationId: location.id,
          languages: input.languages,
          contactEmail: input.contactEmail ?? user.email,
          contactPhone: input.contactPhone ?? null,
          website: input.website ?? null,
          priceText: input.priceText ?? this.defaultPriceText(input),
          priceValue: input.property?.price ?? input.job?.salaryMax ?? null,
          tags: input.tags,
          status,
          submittedAt: status === "PENDING_REVIEW" ? new Date() : null,
          source: "user",
          event: input.event && kind === "EVENT" ? { create: { ...input.event, endAt: input.event.endAt ?? null, ticketUrl: input.event.ticketUrl ?? null, capacity: input.event.capacity ?? null } } : undefined,
          job: input.job && kind === "JOB" ? { create: { ...input.job, salaryMin: input.job.salaryMin ?? null, salaryMax: input.job.salaryMax ?? null, salaryPeriod: input.job.salaryPeriod ?? null } } : undefined,
          property: input.property && kind === "PROPERTY" ? { create: { ...input.property, beds: input.property.beds ?? null, baths: input.property.baths ?? null, sqft: input.property.sqft ?? null, availableFrom: input.property.availableFrom ?? null } } : undefined,
        },
      });
      const grant = ROLE_FOR_KIND[kind];
      if (grant && !user.roles.includes(grant)) {
        await tx.userRole.upsert({
          where: { userId_role_scope: { userId: user.id, role: grant as DbRole, scope: "global" } },
          update: {},
          create: { userId: user.id, role: grant as DbRole },
        });
      }
      await this.audit.log({ actorId: user.id, action: "listing.create", resourceType: "listing", resourceId: id, metadata: { status, kind } }, tx);
    });
    return this.findOne(id, user);
  }

  async update(user: AuthUser, id: string, input: UpdateListing): Promise<ListingDetailDto> {
    const listing = await this.prisma.listing.findFirst({ where: { id, deletedAt: null }, include: { category: { include: { parent: true } } } });
    if (!listing) throw notFound("Listing");
    if (listing.ownerId !== user.id && !isAdmin(user)) throw forbidden("You can only edit your own listings");

    const { action, event, job, property, ...fields } = input;
    const contentChanged = Object.values(fields).some((v) => v !== undefined) || !!event || !!job || !!property;
    const kind = listing.kind as ListingKind;
    if ((event && kind !== "EVENT") || (job && kind !== "JOB") || (property && kind !== "PROPERTY")) {
      throw badRequest("These details don't match the listing type");
    }

    let status: ListingStatus = listing.status;
    if (action === "archive") status = "ARCHIVED";
    else if (action === "submit") {
      if (!["DRAFT", "REJECTED", "ARCHIVED"].includes(listing.status)) throw conflict("This listing is already submitted or published");
      status = "PENDING_REVIEW";
    } else if (contentChanged && listing.status === "PUBLISHED" && !isAdmin(user)) {
      // Edits to live listings are re-reviewed before they go public again.
      status = "PENDING_REVIEW";
    }

    let locationData: Prisma.LocationUpdateInput | undefined;
    if (fields.city || fields.state || fields.zipCode || fields.addressLine) {
      const current = await this.prisma.location.findUniqueOrThrow({ where: { id: listing.locationId } });
      const city = fields.city ?? current.city;
      const state = fields.state ?? current.state;
      const zip = fields.zipCode ?? current.zipCode;
      const coords = await this.geo.resolve({ city, state, zip });
      locationData = {
        city, state, zipCode: zip, addressLine: fields.addressLine ?? current.addressLine,
        latitude: coords?.latitude ?? null, longitude: coords?.longitude ?? null,
      };
    }

    await this.prisma.$transaction(async (tx) => {
      if (locationData) await tx.location.update({ where: { id: listing.locationId }, data: locationData });
      await tx.listing.update({
        where: { id },
        data: {
          title: fields.title,
          description: fields.description,
          languages: fields.languages,
          contactEmail: fields.contactEmail,
          contactPhone: fields.contactPhone,
          website: fields.website,
          priceText: fields.priceText,
          tags: fields.tags,
          priceValue: property?.price ?? job?.salaryMax ?? undefined,
          status,
          rejectionReason: status === "PENDING_REVIEW" ? null : undefined,
          submittedAt: status === "PENDING_REVIEW" && listing.status !== "PENDING_REVIEW" ? new Date() : undefined,
          archivedAt: status === "ARCHIVED" ? new Date() : undefined,
          event: event ? { update: { ...event, endAt: event.endAt ?? null, ticketUrl: event.ticketUrl ?? null } } : undefined,
          job: job ? { update: { ...job } } : undefined,
          property: property ? { update: { ...property } } : undefined,
        },
      });
      await this.audit.log(
        { actorId: user.id, action: action ? `listing.${action}` : "listing.update", resourceType: "listing", resourceId: id, metadata: { from: listing.status, to: status } },
        tx,
      );
    });
    return this.findOne(id, user);
  }

  async mine(user: AuthUser) {
    const rows = await this.prisma.listing.findMany({
      where: { ownerId: user.id, deletedAt: null },
      include: { ...listingSummaryInclude, _count: { select: { inquiries: true } } },
      orderBy: { updatedAt: "desc" },
    });
    return rows.map((r) => ({ ...toListingSummary(r), status: r.status, rejectionReason: r.rejectionReason, inquiryCount: r._count.inquiries }));
  }

  async addReview(user: AuthUser, listingId: string, input: CreateReview) {
    const listing = await this.prisma.listing.findFirst({ where: { id: listingId, status: "PUBLISHED", deletedAt: null } });
    if (!listing) throw notFound("Listing");
    if (listing.ownerId === user.id) throw forbidden("You cannot review your own listing");
    const review = await this.prisma.review.create({ data: { listingId, authorId: user.id, rating: input.rating, body: input.body } });
    return { id: review.id, moderationStatus: review.moderationStatus };
  }

  private assertKindDetails(kind: ListingKind, input: CreateListing) {
    const required: Partial<Record<ListingKind, keyof CreateListing>> = { EVENT: "event", JOB: "job", PROPERTY: "property" };
    const key = required[kind];
    if (key && !input[key]) throw badRequest(`${kind.toLowerCase()} details are required for this category`, { [key]: ["Required"] });
    for (const other of ["event", "job", "property"] as const) {
      if (other !== key && input[other]) throw badRequest(`${other} details don't belong in this category`, { [other]: ["Not allowed for this category"] });
    }
  }

  private defaultPriceText(input: CreateListing): string | null {
    if (input.event) return input.event.isFree ? "Free" : null;
    if (input.property) {
      const p = `$${input.property.price.toLocaleString("en-US")}`;
      return input.property.transactionType === "SALE" ? p : `${p} / month`;
    }
    if (input.job?.salaryMin && input.job.salaryMax && input.job.salaryPeriod) {
      return `$${input.job.salaryMin.toLocaleString("en-US")}–$${input.job.salaryMax.toLocaleString("en-US")} / ${input.job.salaryPeriod.toLowerCase()}`;
    }
    return null;
  }
}
