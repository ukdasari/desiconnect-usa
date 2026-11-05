import { Controller, Delete, Get, HttpCode, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { deleteAccountSchema, registerDeviceSchema, updateProfileSchema, type UpdateProfileInput } from "@desiconnect/contracts";
import type { z } from "zod";
import { AuditService } from "../audit/audit.service";
import { AuthService } from "../auth/auth.service";
import { CurrentUser } from "../auth/decorators";
import type { AuthUser } from "../auth/auth.types";
import { PrismaService } from "../common/prisma.service";
import { ApiZodBody, ZodBody } from "../common/zod";
import { EngagementService } from "../engagement/engagement.service";
import { listingSummaryInclude, toListingSummary } from "../listings/listing.mapper";
import { ListingsService } from "../listings/listings.service";
import { AccountService } from "./account.service";

@ApiTags("me")
@ApiBearerAuth()
@Controller("me")
export class MeController {
  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
    private readonly engagement: EngagementService,
    private readonly listings: ListingsService,
    private readonly audit: AuditService,
    private readonly account: AccountService,
  ) {}

  @Delete()
  @HttpCode(200)
  @ApiOperation({ summary: "Delete my account and personal data (body: { confirm: \"DELETE\" })" })
  @ApiZodBody(deleteAccountSchema)
  deleteAccount(@CurrentUser() user: AuthUser, @ZodBody(deleteAccountSchema) _body: z.infer<typeof deleteAccountSchema>) {
    return this.account.deleteAccount(user);
  }

  @Get()
  @ApiOperation({ summary: "Current user" })
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }

  @Patch()
  @ApiOperation({ summary: "Update my profile" })
  @ApiZodBody(updateProfileSchema)
  async update(@CurrentUser() user: AuthUser, @ZodBody(updateProfileSchema) body: z.output<typeof updateProfileSchema> & UpdateProfileInput) {
    await this.prisma.user.update({
      where: { id: user.id },
      data: { name: body.name, phone: body.phone, city: body.city, state: body.state, zipCode: body.zipCode, preferredLanguages: body.preferredLanguages },
    });
    return this.auth.me(user.id);
  }

  @Get("inquiries")
  @ApiOperation({ summary: "Requests I have sent" })
  inquiries(@CurrentUser() user: AuthUser) {
    return this.engagement.myInquiries(user);
  }

  @Get("applications")
  @ApiOperation({ summary: "Jobs I have applied to" })
  applications(@CurrentUser() user: AuthUser) {
    return this.engagement.myApplications(user);
  }

  @Get("registrations")
  @ApiOperation({ summary: "Events I have registered for" })
  registrations(@CurrentUser() user: AuthUser) {
    return this.engagement.myRegistrations(user);
  }

  @Get("listings")
  @ApiOperation({ summary: "Listings I own, in every status" })
  myListings(@CurrentUser() user: AuthUser) {
    return this.listings.mine(user);
  }

  @Get("favorites")
  @ApiOperation({ summary: "Saved listings" })
  async favorites(@CurrentUser() user: AuthUser) {
    const rows = await this.prisma.favorite.findMany({
      where: { userId: user.id, listing: { status: "PUBLISHED", deletedAt: null } },
      include: { listing: { include: listingSummaryInclude } },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => toListingSummary(r.listing, { isFavorite: true }));
  }

  @Get("notifications")
  @ApiOperation({ summary: "In-app notifications (latest 50)" })
  async notifications(@CurrentUser() user: AuthUser) {
    const rows = await this.prisma.notification.findMany({ where: { userId: user.id, channel: "IN_APP" }, orderBy: { createdAt: "desc" }, take: 50 });
    return rows.map((n) => ({ id: n.id, eventType: n.eventType, title: n.title, body: n.body, read: !!n.readAt, createdAt: n.createdAt.toISOString() }));
  }

  @Post("notifications/read-all")
  @HttpCode(200)
  async readAll(@CurrentUser() user: AuthUser) {
    const { count } = await this.prisma.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date(), status: "READ" } });
    return { updated: count };
  }

  @Post("devices")
  @HttpCode(200)
  @ApiOperation({ summary: "Register this device's Expo push token" })
  @ApiZodBody(registerDeviceSchema)
  async registerDevice(@CurrentUser() user: AuthUser, @ZodBody(registerDeviceSchema) body: z.infer<typeof registerDeviceSchema>) {
    // A token belongs to one device; if another account used it before, move it to this user.
    await this.prisma.deviceToken.upsert({
      where: { token: body.token },
      update: { userId: user.id, platform: body.platform, lastSeenAt: new Date() },
      create: { userId: user.id, token: body.token, platform: body.platform },
    });
    return { registered: true };
  }

  @Delete("devices/:token")
  @ApiOperation({ summary: "Unregister a push token (on sign-out)" })
  async removeDevice(@CurrentUser() user: AuthUser, @Param("token") token: string) {
    const { count } = await this.prisma.deviceToken.deleteMany({ where: { token, userId: user.id } });
    return { removed: count };
  }

  @Delete("ai-history")
  @ApiOperation({ summary: "Delete all of my Desi AI conversation history" })
  async deleteAiHistory(@CurrentUser() user: AuthUser) {
    const { count } = await this.prisma.aiConversation.deleteMany({ where: { userId: user.id } });
    await this.audit.log({ actorId: user.id, action: "ai.history.delete", resourceType: "user", resourceId: user.id, metadata: { conversations: count } });
    return { deletedConversations: count };
  }
}
