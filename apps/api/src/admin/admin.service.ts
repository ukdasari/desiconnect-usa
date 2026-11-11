import { Injectable } from "@nestjs/common";
import type { Prisma } from "@desiconnect/database";
import type {
  AdminReviewQueueDto,
  AdminStatsDto,
  AuditLogDto,
  ReportDto,
} from "@desiconnect/contracts";
import type { z } from "zod";
import type { createReportSchema, moderationDecisionSchema, resolveReportSchema, suspendUserSchema } from "@desiconnect/contracts";
import { AuditService } from "../audit/audit.service";
import type { AuthUser } from "../auth/auth.types";
import { badRequest, conflict, notFound } from "../common/errors";
import { PrismaService } from "../common/prisma.service";
import { listingSummaryInclude, providerInclude, toCredentialDto, toListingSummary, toProviderDto } from "../listings/listing.mapper";
import { AlertsService } from "../alerts/alerts.service";
import { ClaimsService } from "../claims/claims.service";
import { NotificationsService } from "../notifications/notifications.service";

type Decision = z.infer<typeof moderationDecisionSchema>;

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly claims: ClaimsService,
    private readonly alerts: AlertsService,
  ) {}

  async stats(): Promise<AdminStatsDto> {
    const weekAgo = new Date(Date.now() - 7 * 86_400_000);
    const [users, providers, verified, pendingProviders, published, pending, rejected, demo, inquiries, recent, openReports] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null, isDemo: false } }),
      this.prisma.provider.count({ where: { deletedAt: null } }),
      this.prisma.provider.count({ where: { deletedAt: null, verification: "VERIFIED" } }),
      this.prisma.provider.count({ where: { deletedAt: null, verification: "PENDING" } }),
      this.prisma.listing.count({ where: { status: "PUBLISHED", deletedAt: null } }),
      this.prisma.listing.count({ where: { status: "PENDING_REVIEW", deletedAt: null } }),
      this.prisma.listing.count({ where: { status: "REJECTED", deletedAt: null } }),
      this.prisma.listing.count({ where: { isDemo: true, deletedAt: null } }),
      this.prisma.inquiry.count(),
      this.prisma.inquiry.count({ where: { createdAt: { gte: weekAgo } } }),
      this.prisma.report.count({ where: { status: "OPEN" } }),
    ]);
    return {
      users,
      providers: { total: providers, verified, pending: pendingProviders },
      listings: { published, pending, rejected, demo },
      inquiries: { total: inquiries, last7Days: recent },
      openReports,
    };
  }

  async reviewQueue(): Promise<AdminReviewQueueDto> {
    const [listings, providers, credentials, reviews, claims] = await Promise.all([
      this.prisma.listing.findMany({
        where: { status: "PENDING_REVIEW", deletedAt: null },
        include: { ...listingSummaryInclude, owner: { select: { email: true } } },
        orderBy: { submittedAt: "asc" },
        take: 100,
      }),
      this.prisma.provider.findMany({
        where: { verification: "PENDING", deletedAt: null },
        include: { ...providerInclude, owner: { select: { email: true } } },
        orderBy: { createdAt: "asc" },
        take: 100,
      }),
      this.prisma.providerCredential.findMany({
        where: { reviewStatus: "PENDING" },
        include: { provider: { select: { id: true, businessName: true } } },
        orderBy: { createdAt: "asc" },
        take: 100,
      }),
      this.prisma.review.findMany({
        where: { moderationStatus: "PENDING" },
        include: { author: { select: { name: true } }, listing: { select: { id: true, title: true } } },
        orderBy: { createdAt: "asc" },
        take: 100,
      }),
      this.claims.pending(),
    ]);
    return {
      claims,
      listings: listings.map((l) => ({
        ...toListingSummary(l),
        ownerEmail: l.owner.email,
        submittedAt: (l.submittedAt ?? l.updatedAt).toISOString(),
        regulated: (l.category.parent ?? l.category).regulated,
      })),
      providers: providers.map((p) => ({ ...toProviderDto(p), ownerEmail: p.owner.email })),
      credentials: credentials.map((c) => ({ ...toCredentialDto(c), providerId: c.provider.id, businessName: c.provider.businessName })),
      reviews: reviews.map((r) => ({
        id: r.id, rating: r.rating, body: r.body, authorName: r.author.name ?? "Member", createdAt: r.createdAt.toISOString(),
        listingId: r.listing.id, listingTitle: r.listing.title,
      })),
    };
  }

  async decideListing(admin: AuthUser, id: string, decision: Decision, ip?: string) {
    const listing = await this.prisma.listing.findFirst({ where: { id, deletedAt: null } });
    if (!listing) throw notFound("Listing");
    if (listing.status !== "PENDING_REVIEW") throw conflict(`Listing is ${listing.status.toLowerCase().replace("_", " ")}, not awaiting review`);
    const approve = decision.decision === "APPROVE";
    await this.prisma.$transaction(async (tx) => {
      await tx.listing.update({
        where: { id },
        data: approve
          ? { status: "PUBLISHED", publishedAt: listing.publishedAt ?? new Date(), rejectionReason: null }
          : { status: "REJECTED", rejectionReason: decision.reason ?? null },
      });
      await this.audit.log(
        { actorId: admin.id, action: approve ? "listing.approve" : "listing.reject", resourceType: "listing", resourceId: id, metadata: { reason: decision.reason ?? null }, ipAddress: ip },
        tx,
      );
    });
    await this.notifications.notify({
      userId: listing.ownerId,
      eventType: approve ? "listing.approved" : "listing.rejected",
      title: approve ? `“${listing.title}” is live` : `“${listing.title}” needs changes`,
      body: approve ? "Your listing was approved and is now visible to the community." : `Reason: ${decision.reason}`,
      payload: { listingId: id },
    });
    // First publication only: re-approving an edited listing doesn't alert followers again.
    if (approve && !listing.publishedAt) await this.alerts.onListingPublished(id);
    return { id, status: approve ? "PUBLISHED" : "REJECTED" };
  }

  async decideProvider(admin: AuthUser, id: string, decision: Decision, ip?: string) {
    const provider = await this.prisma.provider.findFirst({ where: { id, deletedAt: null } });
    if (!provider) throw notFound("Provider");
    const approve = decision.decision === "APPROVE";
    await this.prisma.$transaction(async (tx) => {
      await tx.provider.update({
        where: { id },
        data: { verification: approve ? "VERIFIED" : "REJECTED", verifiedAt: approve ? new Date() : null, verificationNote: decision.reason ?? null },
      });
      await this.audit.log(
        { actorId: admin.id, action: approve ? "provider.verify" : "provider.reject", resourceType: "provider", resourceId: id, metadata: { reason: decision.reason ?? null }, ipAddress: ip },
        tx,
      );
    });
    await this.notifications.notify({
      userId: provider.ownerId,
      eventType: approve ? "provider.verified" : "provider.rejected",
      title: approve ? "Your business is verified" : "Verification needs attention",
      body: approve ? `${provider.businessName} now shows a verified badge.` : `Reason: ${decision.reason}`,
    });
    return { id, verification: approve ? "VERIFIED" : "REJECTED" };
  }

  async decideCredential(admin: AuthUser, id: string, decision: Decision, ip?: string) {
    const credential = await this.prisma.providerCredential.findUnique({ where: { id } });
    if (!credential) throw notFound("Credential");
    const approve = decision.decision === "APPROVE";
    await this.prisma.$transaction(async (tx) => {
      await tx.providerCredential.update({
        where: { id },
        data: { reviewStatus: approve ? "VERIFIED" : "REJECTED", reviewNote: decision.reason ?? null, reviewedAt: new Date(), reviewedById: admin.id },
      });
      await this.audit.log(
        { actorId: admin.id, action: approve ? "credential.verify" : "credential.reject", resourceType: "credential", resourceId: id, metadata: { reason: decision.reason ?? null }, ipAddress: ip },
        tx,
      );
    });
    return { id, reviewStatus: approve ? "VERIFIED" : "REJECTED" };
  }

  async decideReview(admin: AuthUser, id: string, decision: Decision) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw notFound("Review");
    const status = decision.decision === "APPROVE" ? "APPROVED" : "REJECTED";
    await this.prisma.$transaction(async (tx) => {
      await tx.review.update({ where: { id }, data: { moderationStatus: status } });
      await this.audit.log({ actorId: admin.id, action: `review.${status.toLowerCase()}`, resourceType: "review", resourceId: id }, tx);
    });
    return { id, moderationStatus: status };
  }

  // ---------------------------------------------------------------- reports

  async createReport(user: AuthUser, input: z.infer<typeof createReportSchema>) {
    const exists =
      input.targetType === "LISTING"
        ? await this.prisma.listing.count({ where: { id: input.targetId } })
        : input.targetType === "PROVIDER"
          ? await this.prisma.provider.count({ where: { id: input.targetId } })
          : await this.prisma.review.count({ where: { id: input.targetId } });
    if (!exists) throw notFound("Reported item");
    const report = await this.prisma.report.create({
      data: { reporterId: user.id, targetType: input.targetType, targetId: input.targetId, reason: input.reason, details: input.details ?? null },
    });
    return { id: report.id, status: report.status };
  }

  async reports(status: "OPEN" | "RESOLVED" | "DISMISSED" = "OPEN"): Promise<ReportDto[]> {
    const rows = await this.prisma.report.findMany({ where: { status }, include: { reporter: { select: { email: true } } }, orderBy: { createdAt: "desc" }, take: 200 });
    const listingIds = rows.filter((r) => r.targetType === "LISTING").map((r) => r.targetId);
    const providerIds = rows.filter((r) => r.targetType === "PROVIDER").map((r) => r.targetId);
    const [listings, providers] = await Promise.all([
      this.prisma.listing.findMany({ where: { id: { in: listingIds } }, select: { id: true, title: true } }),
      this.prisma.provider.findMany({ where: { id: { in: providerIds } }, select: { id: true, businessName: true } }),
    ]);
    const titles = new Map<string, string>([...listings.map((l) => [l.id, l.title] as const), ...providers.map((p) => [p.id, p.businessName] as const)]);
    return rows.map((r) => ({
      id: r.id, targetType: r.targetType, targetId: r.targetId, targetTitle: titles.get(r.targetId) ?? null, reason: r.reason,
      details: r.details, status: r.status, createdAt: r.createdAt.toISOString(), reporterEmail: r.reporter.email,
    }));
  }

  async resolveReport(admin: AuthUser, id: string, input: z.infer<typeof resolveReportSchema>, ip?: string) {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw notFound("Report");
    if (report.status !== "OPEN") throw conflict("Report is already closed");
    if (input.archiveTarget && report.targetType !== "LISTING") throw badRequest("Only listings can be archived from a report");
    await this.prisma.$transaction(async (tx) => {
      await tx.report.update({
        where: { id },
        data: { status: input.status, resolutionNote: input.resolutionNote ?? null, resolvedById: admin.id, resolvedAt: new Date() },
      });
      if (input.archiveTarget) {
        await tx.listing.update({ where: { id: report.targetId }, data: { status: "ARCHIVED", archivedAt: new Date() } });
      }
      await this.audit.log(
        { actorId: admin.id, action: `report.${input.status.toLowerCase()}`, resourceType: "report", resourceId: id, metadata: { archivedTarget: input.archiveTarget }, ipAddress: ip },
        tx,
      );
    });
    return { id, status: input.status };
  }

  // ---------------------------------------------------------------- users & audit

  async users(q?: string) {
    const where: Prisma.UserWhereInput = q
      ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] }
      : {};
    const rows = await this.prisma.user.findMany({ where, include: { roles: true }, orderBy: { createdAt: "desc" }, take: 100 });
    return rows.map((u) => ({
      id: u.id, email: u.email, name: u.name, roles: [...new Set(u.roles.map((r) => r.role))], status: u.status,
      isDemo: u.isDemo, createdAt: u.createdAt.toISOString(),
    }));
  }

  async suspendUser(admin: AuthUser, id: string, input: z.infer<typeof suspendUserSchema>, ip?: string) {
    if (id === admin.id) throw badRequest("You cannot suspend your own account");
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: { status: input.suspended ? "SUSPENDED" : "ACTIVE", suspendedReason: input.suspended ? (input.reason ?? null) : null } });
      await this.audit.log(
        { actorId: admin.id, action: input.suspended ? "user.suspend" : "user.reinstate", resourceType: "user", resourceId: id, metadata: { reason: input.reason ?? null }, ipAddress: ip },
        tx,
      );
    });
    return { id, status: input.suspended ? "SUSPENDED" : "ACTIVE" };
  }

  async auditLogs(page: number, pageSize: number): Promise<{ items: AuditLogDto[]; total: number }> {
    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({ include: { actor: { select: { email: true } } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.auditLog.count(),
    ]);
    return {
      total,
      items: rows.map((r) => ({
        id: r.id, action: r.action, resourceType: r.resourceType, resourceId: r.resourceId, actorEmail: r.actor?.email ?? null,
        metadata: (r.metadata as Record<string, unknown> | null) ?? null, createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  async markets() {
    return this.prisma.market.findMany({ orderBy: [{ isActive: "desc" }, { name: "asc" }] });
  }

  async setMarketActive(admin: AuthUser, slug: string, isActive: boolean) {
    const market = await this.prisma.market.update({ where: { slug }, data: { isActive, launchedAt: isActive ? new Date() : undefined } });
    await this.audit.log({ actorId: admin.id, action: isActive ? "market.activate" : "market.deactivate", resourceType: "market", resourceId: market.id });
    return market;
  }
}
