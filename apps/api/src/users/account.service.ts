import { Injectable, Logger } from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import type { AuthUser } from "../auth/auth.types";
import { badRequest } from "../common/errors";
import { PrismaService } from "../common/prisma.service";
import { StorageService } from "../storage/storage.service";

/**
 * Account deletion (required by the App Store and Google Play for apps with sign-up).
 *
 * - Personal data is deleted: requests, job applications and resumes, RSVPs, appointments, saved listings,
 *   notifications, Desi AI history, push tokens, password and roles.
 * - The user row is kept but scrubbed (no name, email, phone or location; sign-in identity released), so records
 *   that other people depend on stay consistent: reviews show "Former member", moderation reports and the audit
 *   log keep their history without personal details.
 * - A business profile and its listings are taken down.
 * - With OIDC, the account at the identity provider is separate; the person can delete it there.
 */
@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
  ) {}

  async deleteAccount(user: AuthUser): Promise<{ deleted: true }> {
    if (user.roles.includes("ADMIN")) {
      const otherAdmins = await this.prisma.userRole.count({ where: { role: "ADMIN", userId: { not: user.id }, user: { deletedAt: null } } });
      if (otherAdmins === 0) throw badRequest("You're the only admin. Make someone else an admin before deleting your account.");
    }

    const attachments = await this.prisma.attachment.findMany({ where: { ownerId: user.id }, select: { id: true, storageKey: true } });
    const providers = await this.prisma.provider.findMany({ where: { ownerId: user.id }, select: { id: true } });
    const providerIds = providers.map((p) => p.id);
    const now = new Date();

    await this.prisma.$transaction([
      // personal activity
      this.prisma.inquiry.deleteMany({ where: { requesterId: user.id } }),
      this.prisma.jobApplication.deleteMany({ where: { applicantId: user.id } }),
      this.prisma.eventRegistration.deleteMany({ where: { userId: user.id } }),
      this.prisma.appointment.deleteMany({ where: { requesterId: user.id } }),
      this.prisma.favorite.deleteMany({ where: { userId: user.id } }),
      this.prisma.notification.deleteMany({ where: { userId: user.id } }),
      this.prisma.aiConversation.deleteMany({ where: { userId: user.id } }),
      this.prisma.aiUsage.deleteMany({ where: { userId: user.id } }),
      this.prisma.deviceToken.deleteMany({ where: { userId: user.id } }),
      this.prisma.localCredential.deleteMany({ where: { userId: user.id } }),
      this.prisma.listingClaim.deleteMany({ where: { claimantId: user.id } }),
      this.prisma.userRole.deleteMany({ where: { userId: user.id } }),
      // files: detach from license records first, then delete the records
      this.prisma.providerCredential.updateMany({ where: { evidenceId: { in: attachments.map((a) => a.id) } }, data: { evidenceId: null } }),
      this.prisma.attachment.deleteMany({ where: { ownerId: user.id } }),
      // business: take the profile and its listings down
      this.prisma.listing.updateMany({ where: { ownerId: user.id, deletedAt: null }, data: { status: "ARCHIVED", deletedAt: now } }),
      this.prisma.provider.updateMany({ where: { id: { in: providerIds } }, data: { deletedAt: now } }),
      // scrub the account itself
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          email: `deleted+${user.id}@deleted.invalid`,
          authSubject: `deleted:${user.id}`,
          name: null,
          phone: null,
          city: null,
          state: null,
          zipCode: null,
          preferredLanguages: [],
          deletedAt: now,
        },
      }),
    ]);

    // Stored files go after the database commit; a failure here leaves an orphaned private file, not personal data in the app.
    for (const a of attachments) {
      await this.storage.remove(a.storageKey).catch((err) => this.logger.warn({ err, key: a.storageKey }, "Could not delete stored file"));
    }
    await this.audit.log({ actorId: user.id, action: "user.delete", resourceType: "user", resourceId: user.id, metadata: { files: attachments.length, businesses: providerIds.length } });
    return { deleted: true };
  }
}
