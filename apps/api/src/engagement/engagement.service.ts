import { Injectable } from "@nestjs/common";
import type { Prisma } from "@desiconnect/database";
import {
  isUnclaimedListing,
  RESUME_MAX_BYTES,
  UNCLAIMED_REQUEST_MESSAGE,
  type ApplicationDto,
  type InquiryDto,
  type RegistrationDto,
} from "@desiconnect/contracts";
import { z } from "zod";
import type {
  createInquirySchema,
  eventRegistrationSchema,
  jobApplicationSchema,
  updateApplicationSchema,
  updateInquirySchema,
} from "@desiconnect/contracts";
import { AuditService } from "../audit/audit.service";
import { type AuthUser, isAdmin } from "../auth/auth.types";
import { badRequest, conflict, forbidden, notFound } from "../common/errors";
import { PrismaService } from "../common/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { sniffDocumentType, StorageService } from "../storage/storage.service";

const inquiryInclude = {
  listing: { select: { id: true, slug: true, title: true, ownerId: true, category: { select: { slug: true, parent: { select: { slug: true } } } } } },
  requester: { select: { name: true, email: true } },
} satisfies Prisma.InquiryInclude;

const applicationInclude = {
  job: { select: { listingId: true, company: true, listing: { select: { slug: true, title: true, ownerId: true } } } },
  applicant: { select: { name: true, email: true } },
} satisfies Prisma.JobApplicationInclude;

@Injectable()
export class EngagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
  ) {}

  // ---------------------------------------------------------------- inquiries

  async createInquiry(user: AuthUser, input: z.infer<typeof createInquirySchema>): Promise<InquiryDto> {
    const listing = await this.prisma.listing.findFirst({ where: { id: input.listingId, status: "PUBLISHED", deletedAt: null } });
    if (!listing) throw notFound("Listing");
    if (listing.ownerId === user.id) throw badRequest("You cannot send an inquiry to your own listing");
    if (isUnclaimedListing({ kind: listing.kind, provider: listing.providerId })) throw badRequest(UNCLAIMED_REQUEST_MESSAGE);
    const recent = await this.prisma.inquiry.findFirst({
      where: { listingId: listing.id, requesterId: user.id, status: "NEW", createdAt: { gte: new Date(Date.now() - 86_400_000) } },
    });
    if (recent) throw conflict("You already sent this provider a request in the last 24 hours. They will get back to you soon.");

    const inquiry = await this.prisma.$transaction(async (tx) => {
      const created = await tx.inquiry.create({
        data: { listingId: listing.id, requesterId: user.id, message: input.message, phone: input.phone ?? null, preferredContact: input.preferredContact },
        include: inquiryInclude,
      });
      await tx.consentRecord.create({ data: { userId: user.id, type: "CONTACT_SHARING", granted: true, context: `inquiry:${created.id}` } });
      return created;
    });
    await this.notifications.notify({
      userId: listing.ownerId,
      eventType: "inquiry.created",
      title: `New request for “${listing.title}”`,
      body: input.message.slice(0, 200),
      payload: { inquiryId: inquiry.id, listingId: listing.id },
    });
    return this.toInquiryDto(inquiry, false);
  }

  async updateInquiry(user: AuthUser, id: string, input: z.infer<typeof updateInquirySchema>): Promise<InquiryDto> {
    const inquiry = await this.prisma.inquiry.findUnique({ where: { id }, include: inquiryInclude });
    if (!inquiry) throw notFound("Inquiry");
    const isOwner = inquiry.listing.ownerId === user.id || isAdmin(user);
    const isRequester = inquiry.requesterId === user.id;
    if (!isOwner && !isRequester) throw notFound("Inquiry");
    if (!isOwner && (input.providerResponse || (input.status && input.status !== "CLOSED"))) {
      throw forbidden("You can only close your own request");
    }
    const responding = isOwner && !!input.providerResponse;
    const updated = await this.prisma.inquiry.update({
      where: { id },
      data: {
        status: responding ? "RESPONDED" : input.status,
        providerResponse: responding ? input.providerResponse : undefined,
        respondedAt: responding ? new Date() : undefined,
      },
      include: inquiryInclude,
    });
    if (responding) {
      await this.notifications.notify({
        userId: inquiry.requesterId,
        eventType: "inquiry.responded",
        title: `Reply about “${inquiry.listing.title}”`,
        body: input.providerResponse!.slice(0, 200),
        payload: { inquiryId: id },
      });
    }
    return this.toInquiryDto(updated, isOwner);
  }

  async myInquiries(user: AuthUser): Promise<InquiryDto[]> {
    const rows = await this.prisma.inquiry.findMany({ where: { requesterId: user.id }, include: inquiryInclude, orderBy: { createdAt: "desc" } });
    return rows.map((r) => this.toInquiryDto(r, false));
  }

  /** Inquiries received on listings the user owns. Marks NEW ones as VIEWED. */
  async receivedInquiries(user: AuthUser, listingId?: string): Promise<InquiryDto[]> {
    const where: Prisma.InquiryWhereInput = { listing: { ownerId: user.id }, ...(listingId ? { listingId } : {}) };
    const rows = await this.prisma.inquiry.findMany({ where, include: inquiryInclude, orderBy: { createdAt: "desc" } });
    const unseen = rows.filter((r) => r.status === "NEW").map((r) => r.id);
    if (unseen.length) await this.prisma.inquiry.updateMany({ where: { id: { in: unseen } }, data: { status: "VIEWED" } });
    return rows.map((r) => this.toInquiryDto(r, true));
  }

  private toInquiryDto(r: Prisma.InquiryGetPayload<{ include: typeof inquiryInclude }>, includeRequester: boolean): InquiryDto {
    return {
      id: r.id,
      status: r.status,
      message: r.message,
      phone: r.phone,
      preferredContact: r.preferredContact,
      providerResponse: r.providerResponse,
      respondedAt: r.respondedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      listing: { id: r.listing.id, slug: r.listing.slug, title: r.listing.title, categorySlug: r.listing.category.parent?.slug ?? r.listing.category.slug },
      requester: includeRequester ? { name: r.requester.name, email: r.requester.email } : undefined,
    };
  }

  // ---------------------------------------------------------------- events

  async register(user: AuthUser, listingId: string, input: z.infer<typeof eventRegistrationSchema>): Promise<RegistrationDto> {
    const event = await this.prisma.event.findFirst({
      where: { listingId, listing: { status: "PUBLISHED", deletedAt: null } },
      include: { listing: true },
    });
    if (!event) throw notFound("Event");
    if (event.startAt.getTime() < Date.now() - 3600_000) throw badRequest("This event has already started");

    const registration = await this.prisma.$transaction(async (tx) => {
      const taken = await tx.eventRegistration.aggregate({
        where: { eventId: listingId, status: "REGISTERED", NOT: { userId: user.id } },
        _sum: { guests: true },
      });
      const full = event.capacity !== null && (taken._sum.guests ?? 0) + input.guests > event.capacity;
      return tx.eventRegistration.upsert({
        where: { eventId_userId: { eventId: listingId, userId: user.id } },
        update: { guests: input.guests, status: full ? "WAITLISTED" : "REGISTERED" },
        create: { eventId: listingId, userId: user.id, guests: input.guests, status: full ? "WAITLISTED" : "REGISTERED" },
      });
    });
    await this.notifications.notify({
      userId: event.listing.ownerId,
      eventType: "event.registered",
      title: `New RSVP for “${event.listing.title}”`,
      body: `${user.name ?? "A member"} registered with ${input.guests} guest(s).`,
      payload: { listingId },
    });
    return {
      id: registration.id,
      status: registration.status,
      guests: registration.guests,
      createdAt: registration.createdAt.toISOString(),
      event: { listingId, slug: event.listing.slug, title: event.listing.title, startAt: event.startAt.toISOString(), venue: event.venue },
    };
  }

  async cancelRegistration(user: AuthUser, listingId: string) {
    const reg = await this.prisma.eventRegistration.findUnique({ where: { eventId_userId: { eventId: listingId, userId: user.id } } });
    if (!reg) throw notFound("Registration");
    await this.prisma.eventRegistration.update({ where: { id: reg.id }, data: { status: "CANCELLED" } });
    return { id: reg.id, status: "CANCELLED" as const };
  }

  async myRegistrations(user: AuthUser): Promise<RegistrationDto[]> {
    const rows = await this.prisma.eventRegistration.findMany({
      where: { userId: user.id },
      include: { event: { include: { listing: { select: { slug: true, title: true } } } } },
      orderBy: { event: { startAt: "asc" } },
    });
    return rows.map((r) => ({
      id: r.id, status: r.status, guests: r.guests, createdAt: r.createdAt.toISOString(),
      event: { listingId: r.eventId, slug: r.event.listing.slug, title: r.event.listing.title, startAt: r.event.startAt.toISOString(), venue: r.event.venue },
    }));
  }

  async eventRegistrations(user: AuthUser, listingId: string) {
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing || (listing.ownerId !== user.id && !isAdmin(user))) throw notFound("Event");
    const rows = await this.prisma.eventRegistration.findMany({
      where: { eventId: listingId },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((r) => ({ id: r.id, status: r.status, guests: r.guests, createdAt: r.createdAt.toISOString(), attendee: r.user }));
  }

  // ---------------------------------------------------------------- jobs

  async apply(
    user: AuthUser,
    listingId: string,
    input: z.infer<typeof jobApplicationSchema>,
    file: Express.Multer.File | undefined,
  ): Promise<ApplicationDto> {
    const job = await this.prisma.job.findFirst({ where: { listingId, listing: { status: "PUBLISHED", deletedAt: null } }, include: { listing: true } });
    if (!job) throw notFound("Job");
    if (job.listing.ownerId === user.id) throw badRequest("You cannot apply to your own job posting");
    const existing = await this.prisma.jobApplication.findUnique({ where: { jobId_applicantId: { jobId: listingId, applicantId: user.id } } });
    if (existing && existing.status !== "WITHDRAWN") throw conflict("You have already applied to this job");

    let resumeId: string | null = null;
    if (file) {
      if (file.size > RESUME_MAX_BYTES) throw badRequest("Resume must be 5 MB or smaller", { resume: ["File too large"] });
      const type = sniffDocumentType(file.buffer);
      if (!type) throw badRequest("Upload your resume as a PDF or Word (.docx) file", { resume: ["Unsupported file type"] });
      const key = await this.storage.put(`resumes/${user.id}`, file.buffer, type.mime, type.extension);
      const attachment = await this.prisma.attachment.create({
        data: {
          ownerId: user.id, storageKey: key, mimeType: type.mime, sizeBytes: file.size, purpose: "RESUME",
          fileName: (file.originalname || `resume${type.extension}`).replace(/[^\w.\- ]+/g, "_").slice(0, 120),
        },
      });
      resumeId = attachment.id;
    }

    const application = await this.prisma.$transaction(async (tx) => {
      const data = { coverLetter: input.coverLetter ?? null, phone: input.phone ?? null, resumeId, status: "SUBMITTED" as const };
      const app = existing
        ? await tx.jobApplication.update({ where: { id: existing.id }, data, include: applicationInclude })
        : await tx.jobApplication.create({ data: { ...data, jobId: listingId, applicantId: user.id }, include: applicationInclude });
      await tx.consentRecord.create({ data: { userId: user.id, type: "APPLICATION_SHARING", granted: true, context: `application:${app.id}` } });
      return app;
    });
    await this.notifications.notify({
      userId: job.listing.ownerId,
      eventType: "application.submitted",
      title: `New application: ${job.listing.title}`,
      body: `${user.name ?? "A candidate"} applied${resumeId ? " with a resume" : ""}.`,
      payload: { applicationId: application.id },
    });
    return this.toApplicationDto(application, false);
  }

  async myApplications(user: AuthUser): Promise<ApplicationDto[]> {
    const rows = await this.prisma.jobApplication.findMany({ where: { applicantId: user.id }, include: applicationInclude, orderBy: { createdAt: "desc" } });
    return rows.map((r) => this.toApplicationDto(r, false));
  }

  async jobApplications(user: AuthUser, listingId: string): Promise<ApplicationDto[]> {
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing || (listing.ownerId !== user.id && !isAdmin(user))) throw notFound("Job");
    const rows = await this.prisma.jobApplication.findMany({ where: { jobId: listingId }, include: applicationInclude, orderBy: { createdAt: "desc" } });
    return rows.map((r) => this.toApplicationDto(r, true));
  }

  async updateApplication(user: AuthUser, id: string, input: z.infer<typeof updateApplicationSchema>): Promise<ApplicationDto> {
    const app = await this.prisma.jobApplication.findUnique({ where: { id }, include: applicationInclude });
    if (!app) throw notFound("Application");
    const isEmployer = app.job.listing.ownerId === user.id || isAdmin(user);
    const isApplicant = app.applicantId === user.id;
    if (!isEmployer && !isApplicant) throw notFound("Application");
    if (isApplicant && !isEmployer && input.status !== "WITHDRAWN") throw forbidden("You can only withdraw your application");
    if (isEmployer && !isApplicant && input.status === "WITHDRAWN") throw forbidden("Only the applicant can withdraw");
    const updated = await this.prisma.jobApplication.update({ where: { id }, data: { status: input.status }, include: applicationInclude });
    if (isEmployer && !isApplicant) {
      await this.notifications.notify({
        userId: app.applicantId,
        eventType: "application.status_changed",
        title: `Update on your application: ${app.job.listing.title}`,
        body: `Status changed to ${input.status.toLowerCase()}.`,
        payload: { applicationId: id },
      });
    }
    return this.toApplicationDto(updated, isEmployer);
  }

  /** Streams a resume to the applicant, the employer, or an admin. Every access is audited. */
  async resume(user: AuthUser, applicationId: string): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> {
    const app = await this.prisma.jobApplication.findUnique({ where: { id: applicationId }, include: { resume: true, job: { include: { listing: true } } } });
    if (!app || !app.resume) throw notFound("Resume");
    const allowed = app.applicantId === user.id || app.job.listing.ownerId === user.id || isAdmin(user);
    if (!allowed) throw notFound("Resume");
    await this.audit.log({ actorId: user.id, action: "resume.download", resourceType: "attachment", resourceId: app.resume.id });
    return { buffer: await this.storage.get(app.resume.storageKey), mimeType: app.resume.mimeType, fileName: app.resume.fileName };
  }

  private toApplicationDto(r: Prisma.JobApplicationGetPayload<{ include: typeof applicationInclude }>, includeApplicant: boolean): ApplicationDto {
    return {
      id: r.id,
      status: r.status,
      coverLetter: r.coverLetter,
      phone: r.phone,
      hasResume: !!r.resumeId,
      createdAt: r.createdAt.toISOString(),
      job: { listingId: r.job.listingId, slug: r.job.listing.slug, title: r.job.listing.title, company: r.job.company },
      applicant: includeApplicant ? { name: r.applicant.name, email: r.applicant.email } : undefined,
    };
  }

  // ---------------------------------------------------------------- favorites

  async setFavorite(user: AuthUser, listingId: string, on: boolean) {
    if (on) {
      const listing = await this.prisma.listing.findFirst({ where: { id: listingId, status: "PUBLISHED", deletedAt: null } });
      if (!listing) throw notFound("Listing");
      await this.prisma.favorite.upsert({ where: { userId_listingId: { userId: user.id, listingId } }, update: {}, create: { userId: user.id, listingId } });
    } else {
      await this.prisma.favorite.deleteMany({ where: { userId: user.id, listingId } });
    }
    return { listingId, isFavorite: on };
  }
}
