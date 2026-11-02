import { Injectable } from "@nestjs/common";
import type { ProviderDashboardDto, ProviderDto } from "@desiconnect/contracts";
import { getCategory } from "@desiconnect/contracts";
import type { z } from "zod";
import type { credentialSubmissionSchema, providerOnboardingSchema, updateProviderSchema } from "@desiconnect/contracts";
import { AuditService } from "../audit/audit.service";
import type { AuthUser } from "../auth/auth.types";
import { badRequest, conflict, forbidden, notFound } from "../common/errors";
import { PrismaService } from "../common/prisma.service";
import { listingSummaryInclude, providerInclude, toListingSummary, toProviderDto } from "../listings/listing.mapper";
import { ListingsService } from "../listings/listings.service";
import { GeoService } from "../search/geo.service";

@Injectable()
export class ProvidersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geo: GeoService,
    private readonly audit: AuditService,
    private readonly listings: ListingsService,
  ) {}

  async onboard(user: AuthUser, input: z.infer<typeof providerOnboardingSchema>): Promise<ProviderDto> {
    if (user.providerId) throw conflict("You already have a business profile");
    const slugs = [...new Set(input.categorySlugs)];
    const categories = await this.prisma.category.findMany({ where: { slug: { in: slugs }, parentId: null, isActive: true } });
    if (categories.length !== slugs.length) throw badRequest("Unknown category", { categorySlugs: ["Choose from the listed categories"] });
    if (categories.some((c) => c.kind !== "SERVICE")) {
      throw badRequest("Business profiles are for service categories", { categorySlugs: ["Events, jobs and real estate are posted as listings, not business categories"] });
    }
    const coords = await this.geo.resolve({ city: input.city, state: input.state, zip: input.zipCode });

    const provider = await this.prisma.$transaction(async (tx) => {
      const location = await tx.location.create({
        data: {
          addressLine: input.addressLine ?? null, city: input.city, state: input.state, zipCode: input.zipCode ?? null,
          latitude: coords?.latitude ?? null, longitude: coords?.longitude ?? null,
        },
      });
      const created = await tx.provider.create({
        data: {
          ownerId: user.id,
          businessName: input.businessName,
          description: input.description,
          email: input.email,
          phone: input.phone,
          website: input.website ?? null,
          languages: input.languages,
          verification: "PENDING",
          categories: { create: categories.map((c) => ({ categoryId: c.id })) },
          locations: { create: [{ locationId: location.id, serviceRadiusMiles: input.serviceRadiusMiles, isPrimary: true }] },
        },
        include: providerInclude,
      });
      await tx.userRole.upsert({
        where: { userId_role_scope: { userId: user.id, role: "PROVIDER", scope: "global" } },
        update: {},
        create: { userId: user.id, role: "PROVIDER" },
      });
      await this.audit.log({ actorId: user.id, action: "provider.onboard", resourceType: "provider", resourceId: created.id }, tx);
      return created;
    });
    return toProviderDto(provider);
  }

  async update(user: AuthUser, input: z.infer<typeof updateProviderSchema>): Promise<ProviderDto> {
    if (!user.providerId) throw notFound("Business profile");
    const { categorySlugs, city, state, zipCode, addressLine, serviceRadiusMiles, ...fields } = input;
    await this.prisma.$transaction(async (tx) => {
      // Renaming a verified business sends it back for verification.
      const current = await tx.provider.findUniqueOrThrow({ where: { id: user.providerId! } });
      const renamed = fields.businessName && fields.businessName !== current.businessName;
      await tx.provider.update({
        where: { id: current.id },
        data: { ...fields, website: fields.website ?? undefined, verification: renamed && current.verification === "VERIFIED" ? "PENDING" : undefined },
      });
      if (categorySlugs) {
        const cats = await tx.category.findMany({ where: { slug: { in: categorySlugs }, parentId: null, kind: "SERVICE" } });
        await tx.providerCategory.deleteMany({ where: { providerId: current.id } });
        await tx.providerCategory.createMany({ data: cats.map((c) => ({ providerId: current.id, categoryId: c.id })) });
      }
      if (city || state || zipCode || addressLine || serviceRadiusMiles !== undefined) {
        const primary = await tx.providerLocation.findFirst({ where: { providerId: current.id, isPrimary: true }, include: { location: true } });
        if (primary) {
          const nextCity = city ?? primary.location.city;
          const nextState = state ?? primary.location.state;
          const nextZip = zipCode ?? primary.location.zipCode;
          const coords = await this.geo.resolve({ city: nextCity, state: nextState, zip: nextZip });
          await tx.location.update({
            where: { id: primary.locationId },
            data: { city: nextCity, state: nextState, zipCode: nextZip, addressLine: addressLine ?? primary.location.addressLine, latitude: coords?.latitude ?? null, longitude: coords?.longitude ?? null },
          });
          if (serviceRadiusMiles !== undefined) await tx.providerLocation.update({ where: { id: primary.id }, data: { serviceRadiusMiles } });
        }
      }
      await this.audit.log({ actorId: user.id, action: "provider.update", resourceType: "provider", resourceId: current.id }, tx);
    });
    return this.get(user.providerId);
  }

  async get(id: string): Promise<ProviderDto> {
    const provider = await this.prisma.provider.findFirst({ where: { id, deletedAt: null }, include: providerInclude });
    if (!provider) throw notFound("Provider");
    return toProviderDto(provider);
  }

  async publicProfile(id: string) {
    const provider = await this.get(id);
    const listings = await this.prisma.listing.findMany({
      where: { providerId: id, status: "PUBLISHED", deletedAt: null },
      include: listingSummaryInclude,
      orderBy: { publishedAt: "desc" },
    });
    // Never expose rejected credentials publicly.
    return { ...provider, credentials: provider.credentials.filter((c) => c.reviewStatus !== "REJECTED"), listings: listings.map((l) => toListingSummary(l)) };
  }

  async submitCredential(user: AuthUser, input: z.infer<typeof credentialSubmissionSchema>) {
    if (!user.providerId) throw forbidden("Create a business profile first");
    const credential = await this.prisma.$transaction(async (tx) => {
      const created = await tx.providerCredential.create({
        data: {
          providerId: user.providerId!, type: input.type, jurisdiction: input.jurisdiction, licenseNumber: input.licenseNumber,
          issuingAuthority: input.issuingAuthority ?? null, expiresAt: input.expiresAt ?? null, reviewStatus: "PENDING",
        },
      });
      await tx.provider.updateMany({ where: { id: user.providerId!, verification: { in: ["UNVERIFIED", "REJECTED"] } }, data: { verification: "PENDING" } });
      await this.audit.log({ actorId: user.id, action: "credential.submit", resourceType: "credential", resourceId: created.id }, tx);
      return created;
    });
    return { id: credential.id, reviewStatus: credential.reviewStatus };
  }

  async dashboard(user: AuthUser): Promise<ProviderDashboardDto | { provider: null; listings: ProviderDashboardDto["listings"]; stats: ProviderDashboardDto["stats"] }> {
    const listings = await this.listings.mine(user);
    const [newInquiries, totalInquiries] = await Promise.all([
      this.prisma.inquiry.count({ where: { listing: { ownerId: user.id }, status: "NEW" } }),
      this.prisma.inquiry.count({ where: { listing: { ownerId: user.id } } }),
    ]);
    const stats = {
      activeListings: listings.filter((l) => l.status === "PUBLISHED").length,
      pendingListings: listings.filter((l) => l.status === "PENDING_REVIEW").length,
      newInquiries,
      totalInquiries,
    };
    return { provider: user.providerId ? await this.get(user.providerId) : null, listings, stats } as ProviderDashboardDto;
  }

  /** Helper for the web: which credential types a category expects. */
  expectedCredentials(slugs: string[]) {
    return [...new Set(slugs.flatMap((s) => getCategory(s)?.expectedCredentials ?? []))];
  }
}
