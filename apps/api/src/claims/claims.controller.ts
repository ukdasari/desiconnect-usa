import { Controller, Get, HttpCode, Ip, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { createClaimSchema, moderationDecisionSchema, type CreateClaimInput } from "@desiconnect/contracts";
import type { z } from "zod";
import { CurrentUser, Roles } from "../auth/decorators";
import type { AuthUser } from "../auth/auth.types";
import { ApiZodBody, ZodBody } from "../common/zod";
import { ClaimsService } from "./claims.service";

@ApiTags("claims")
@ApiBearerAuth()
@Controller()
export class ClaimsController {
  constructor(private readonly claims: ClaimsService) {}

  @Post("listings/:id/claims")
  @ApiOperation({ summary: "Claim an unclaimed directory listing for your business (reviewed by an admin)" })
  @ApiZodBody(createClaimSchema)
  create(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string, @ZodBody(createClaimSchema) body: CreateClaimInput, @Ip() ip: string) {
    return this.claims.create(user, id, body, ip);
  }

  @Get("me/claims")
  @ApiOperation({ summary: "My listing claims" })
  mine(@CurrentUser() user: AuthUser) {
    return this.claims.mine(user);
  }

  @Post("me/claims/:id/withdraw")
  @HttpCode(200)
  @ApiOperation({ summary: "Withdraw a claim that is still waiting for review" })
  withdraw(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.claims.withdraw(user, id);
  }

  @Roles("ADMIN")
  @Post("admin/claims/:id/decision")
  @HttpCode(200)
  @ApiOperation({ summary: "Confirm or reject a listing claim. Approval moves the listing to the claimant's business." })
  @ApiZodBody(moderationDecisionSchema)
  decide(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string, @ZodBody(moderationDecisionSchema) body: z.infer<typeof moderationDecisionSchema>, @Ip() ip: string) {
    return this.claims.decide(user, id, body, ip);
  }
}
