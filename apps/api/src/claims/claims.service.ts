import { Injectable } from "@nestjs/common";
import type { Prisma } from "@desiconnect/database";
import { isUnclaimedListing, type ClaimDto, type CreateClaimInput } from "@desiconnect/contracts";
import { AuditService } from "../audit/audit.service";
import type { AuthUser } from "../auth/auth.types";
import { badRequest, conflict, notFound } from "../common/errors";
import { PrismaService } from "../common/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

type Decision = { decision: "APPROVE" | "REJECT"; reason?: string };

export const claimInclude = {
  listing: { select: { id: true, slug: true, title: true, location: { select: { city: true } } } },
} satisfies Prisma.ListingClaimInclude;

type ClaimRow = Prisma.ListingClaimGetPayload<{ include: typeof claimInclude }>;

export function toClaimDto(c: ClaimRow): ClaimDto {
  return {
    id: c.id,
    status: c.status,
    role: c.role,
    phone: c.phone,
    verification: c.verification,
    reviewNote: c.reviewNote,
    createdAt: c.createdAt.toISOString(),
    reviewedAt: c.reviewedAt?.toISOString() ?? null,
    listing: { id: c.listing.id, slug: c.listing.slug, title: c.listing.title, city: c.listing.location?.city ?? null },
  };
}

/**
 * Business owners claim directory listings (imported restaurants and other
 * unclaimed SERVICE listings). An admin confirms the claim — typically by
 * calling the business — and approval transfers the listing to the claimant's
 * business profile so it can receive requests.
 */
@Injectable()
export class ClaimsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(user: AuthUser, listingId: string, input: CreateClaimInput, ip?: string): Promise<ClaimDto> {
    const listing = await this.prisma.listing.findFirst({ where: { id: listingId, deletedAt: null, status: "PUBLISHED" } });
    if (!listing) throw notFound("Listing");
    if (!isUnclaimedListing({ kind: listing.kind, provider: listing.providerId })) throw conflict("This listing is already managed by a business");
    if (!user.providerId) throw badRequest("Create your business profile first, then claim the listing");
    const provider = await this.prisma.provider.findFirst({ where: { id: user.providerId, ownerId: user.id, deletedAt: null } });
    if (!provider) throw badRequest("Create your business profile first, then claim the listing");
    const existing = await this.prisma.listingClaim.findFirst({ where: { listingId, claimantId: user.id, status: "PENDING" } });
    if (existing) throw conflict("You already have a claim waiting for review on this listing");

    const claim = await this.prisma.$transaction(async (tx) => {
      const created = await tx.listingClaim.create({
        data: {
          listingId,
          claimantId: user.id,
          providerId: provider.id,
          role: input.role.trim(),
          phone: input.phone.trim(),
          verification: input.verification?.trim() || null,
        },
        include: claimInclude,
      });
      await this.audit.log({ actorId: user.id, action: "claim.create", resourceType: "listing_claim", resourceId: created.id, metadata: { listingId }, ipAddress: ip }, tx);
      return created;
    });

    const admins = await this.prisma.userRole.findMany({ where: { role: "ADMIN", user: { deletedAt: null } }, select: { userId: true } });
    await Promise.all(
      admins.map((a) =>
        this.notifications.notify({
          userId: a.userId,
          eventType: "claim.submitted",
          title: `Claim request for “${listing.title}”`,
          body: `${provider.businessName} says they run this business. Review it in the moderation queue.`,
          payload: { claimId: claim.id, listingId },
        }),
      ),
    );
    return toClaimDto(claim);
  }

  async mine(user: AuthUser): Promise<ClaimDto[]> {
    const rows = await this.prisma.listingClaim.findMany({ where: { claimantId: user.id }, include: claimInclude, orderBy: { createdAt: "desc" }, take: 100 });
    return rows.map(toClaimDto);
  }

  async withdraw(user: AuthUser, id: string): Promise<ClaimDto> {
    const claim = await this.prisma.listingClaim.findFirst({ where: { id, claimantId: user.id } });
    if (!claim) throw notFound("Claim");
    if (claim.status !== "PENDING") throw conflict("Only a claim waiting for review can be withdrawn");
    const updated = await this.prisma.listingClaim.update({ where: { id }, data: { status: "WITHDRAWN" }, include: claimInclude });
    return toClaimDto(updated);
  }

  async decide(admin: AuthUser, id: string, decision: Decision, ip?: string) {
    const claim = await this.prisma.listingClaim.findUnique({ where: { id }, include: { listing: true, provider: true } });
    if (!claim) throw notFound("Claim");
    if (claim.status !== "PENDING") throw conflict(`Claim is ${claim.status.toLowerCase()}, not awaiting review`);
    const approve = decision.decision === "APPROVE";
    const now = new Date();
    let otherClaimants: string[] = [];

    await this.prisma.$transaction(async (tx) => {
      if (approve) {
        const listing = await tx.listing.findFirst({ where: { id: claim.listingId, deletedAt: null } });
        if (!listing || listing.providerId) throw conflict("This listing has already been claimed");
        if (claim.provider.deletedAt) throw conflict("The claimant's business profile no longer exists");
        await tx.listing.update({ where: { id: listing.id }, data: { ownerId: claim.claimantId, providerId: claim.providerId } });
        const others = await tx.listingClaim.findMany({ where: { listingId: claim.listingId, status: "PENDING", id: { not: id } }, select: { id: true, claimantId: true } });
        otherClaimants = others.map((o) => o.claimantId);
        if (others.length) {
          await tx.listingClaim.updateMany({
            where: { id: { in: others.map((o) => o.id) } },
            data: { status: "REJECTED", reviewNote: "Another claim for this listing was confirmed.", reviewedById: admin.id, reviewedAt: now },
          });
        }
      }
      await tx.listingClaim.update({
        where: { id },
        data: { status: approve ? "APPROVED" : "REJECTED", reviewNote: decision.reason ?? null, reviewedById: admin.id, reviewedAt: now },
      });
      await this.audit.log(
        { actorId: admin.id, action: approve ? "claim.approve" : "claim.reject", resourceType: "listing_claim", resourceId: id, metadata: { listingId: claim.listingId, reason: decision.reason ?? null }, ipAddress: ip },
        tx,
      );
    });

    const title = claim.listing.title;
    await this.notifications.notify({
      userId: claim.claimantId,
      eventType: approve ? "claim.approved" : "claim.rejected",
      title: approve ? `You now manage “${title}”` : `Your claim for “${title}” wasn't confirmed`,
      body: approve
        ? "The listing is linked to your business profile and can receive requests. Check the details are right."
        : `Reason: ${decision.reason}`,
      payload: { claimId: id, listingId: claim.listingId },
    });
    await Promise.all(
      otherClaimants.map((userId) =>
        this.notifications.notify({
          userId,
          eventType: "claim.rejected",
          title: `Your claim for “${title}” wasn't confirmed`,
          body: "Another claim for this listing was confirmed.",
          payload: { listingId: claim.listingId },
        }),
      ),
    );
    return { id, status: approve ? "APPROVED" : "REJECTED" };
  }

  async pending() {
    const rows = await this.prisma.listingClaim.findMany({
      where: { status: "PENDING" },
      include: {
        ...claimInclude,
        claimant: { select: { email: true, name: true } },
        provider: { select: { businessName: true, verification: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    });
    return rows.map((c) => ({
      ...toClaimDto(c),
      claimantEmail: c.claimant.email,
      claimantName: c.claimant.name,
      businessName: c.provider.businessName,
      businessVerification: c.provider.verification,
    }));
  }
}
