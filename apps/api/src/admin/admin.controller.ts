import { Controller, Get, HttpCode, Ip, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  createReportSchema,
  moderationDecisionSchema,
  paginationSchema,
  resolveReportSchema,
  suspendUserSchema,
} from "@desiconnect/contracts";
import { z } from "zod";
import { CurrentUser, Roles } from "../auth/decorators";
import type { AuthUser } from "../auth/auth.types";
import { Paginated } from "../common/envelope";
import { ApiZodBody, ZodBody, ZodQuery } from "../common/zod";
import { AdminService } from "./admin.service";

type Decision = z.infer<typeof moderationDecisionSchema>;
const rejectSchema = z.object({ reason: z.string().trim().min(5, "Give a reason when rejecting").max(1000) });
const marketSchema = z.object({ isActive: z.boolean() });

@ApiTags("admin")
@ApiBearerAuth()
@Roles("ADMIN")
@Controller("admin")
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get("stats")
  @ApiOperation({ summary: "Platform and pilot readiness counters" })
  stats() {
    return this.admin.stats();
  }

  @Get("review-queue")
  @ApiOperation({ summary: "Pending listings, providers, credentials and reviews" })
  queue() {
    return this.admin.reviewQueue();
  }

  @Post("listings/:id/approve")
  @HttpCode(200)
  @ApiOperation({ summary: "Publish an approved listing" })
  approve(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string, @Ip() ip: string) {
    return this.admin.decideListing(user, id, { decision: "APPROVE", reason: undefined }, ip);
  }

  @Post("listings/:id/reject")
  @HttpCode(200)
  @ApiOperation({ summary: "Reject a listing with a reason shown to the owner" })
  @ApiZodBody(rejectSchema)
  reject(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string, @ZodBody(rejectSchema) body: z.infer<typeof rejectSchema>, @Ip() ip: string) {
    return this.admin.decideListing(user, id, { decision: "REJECT", reason: body.reason }, ip);
  }

  @Post("providers/:id/decision")
  @HttpCode(200)
  @ApiOperation({ summary: "Verify or reject a provider profile" })
  @ApiZodBody(moderationDecisionSchema)
  provider(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string, @ZodBody(moderationDecisionSchema) body: Decision, @Ip() ip: string) {
    return this.admin.decideProvider(user, id, body, ip);
  }

  @Post("credentials/:id/decision")
  @HttpCode(200)
  @ApiOperation({ summary: "Mark a submitted credential as verified or rejected (after checking the issuing authority)" })
  @ApiZodBody(moderationDecisionSchema)
  credential(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string, @ZodBody(moderationDecisionSchema) body: Decision, @Ip() ip: string) {
    return this.admin.decideCredential(user, id, body, ip);
  }

  @Post("reviews/:id/decision")
  @HttpCode(200)
  @ApiOperation({ summary: "Approve or reject a review" })
  @ApiZodBody(moderationDecisionSchema)
  review(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string, @ZodBody(moderationDecisionSchema) body: Decision) {
    return this.admin.decideReview(user, id, body);
  }

  @Get("reports")
  @ApiOperation({ summary: "User reports (default: open)" })
  reports(@Query("status") status?: "OPEN" | "RESOLVED" | "DISMISSED") {
    return this.admin.reports(status && ["OPEN", "RESOLVED", "DISMISSED"].includes(status) ? status : "OPEN");
  }

  @Post("reports/:id/resolve")
  @HttpCode(200)
  @ApiZodBody(resolveReportSchema)
  resolve(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string, @ZodBody(resolveReportSchema) body: z.infer<typeof resolveReportSchema>, @Ip() ip: string) {
    return this.admin.resolveReport(user, id, body, ip);
  }

  @Get("users")
  users(@Query("q") q?: string) {
    return this.admin.users(q?.slice(0, 100));
  }

  @Post("users/:id/suspend")
  @HttpCode(200)
  @ApiOperation({ summary: "Suspend or reinstate an account" })
  @ApiZodBody(suspendUserSchema)
  suspend(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string, @ZodBody(suspendUserSchema) body: z.infer<typeof suspendUserSchema>, @Ip() ip: string) {
    return this.admin.suspendUser(user, id, body, ip);
  }

  @Get("audit-logs")
  async auditLogs(@ZodQuery(paginationSchema) query: z.infer<typeof paginationSchema>) {
    const { items, total } = await this.admin.auditLogs(query.page, query.pageSize);
    return Paginated.of(items, total, query.page, query.pageSize);
  }

  @Get("markets")
  markets() {
    return this.admin.markets();
  }

  @Patch("markets/:slug")
  @ApiZodBody(marketSchema)
  market(@CurrentUser() user: AuthUser, @Param("slug") slug: string, @ZodBody(marketSchema) body: z.infer<typeof marketSchema>) {
    return this.admin.setMarketActive(user, slug, body.isActive);
  }
}

@ApiTags("reports")
@ApiBearerAuth()
@Controller("reports")
export class ReportsController {
  constructor(private readonly admin: AdminService) {}

  @Post()
  @ApiOperation({ summary: "Report a listing, provider or review" })
  @ApiZodBody(createReportSchema)
  create(@CurrentUser() user: AuthUser, @ZodBody(createReportSchema) body: z.infer<typeof createReportSchema>) {
    return this.admin.createReport(user, body);
  }
}
