import { Controller, Get, Param, ParseUUIDPipe, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  createListingSchema,
  createReviewSchema,
  updateListingSchema,
  type CreateListing,
} from "@desiconnect/contracts";
import type { z } from "zod";
import { CurrentUser, Public } from "../auth/decorators";
import type { AuthUser } from "../auth/auth.types";
import { ApiZodBody, ZodBody } from "../common/zod";
import { ListingsService } from "./listings.service";

@ApiTags("listings")
@ApiBearerAuth()
@Controller("listings")
export class ListingsController {
  constructor(private readonly listings: ListingsService) {}

  @Public()
  @Get(":idOrSlug")
  @ApiOperation({ summary: "Listing details (published listings; owners and admins also see drafts)" })
  get(@Param("idOrSlug") idOrSlug: string, @CurrentUser() user: AuthUser | null) {
    return this.listings.findOne(idOrSlug, user);
  }

  @Post()
  @ApiOperation({ summary: "Create a listing. It is saved as a draft or submitted for moderation." })
  @ApiZodBody(createListingSchema)
  create(@CurrentUser() user: AuthUser, @ZodBody(createListingSchema) body: CreateListing) {
    return this.listings.create(user, body);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update an owned listing, submit it for review, or archive it" })
  @ApiZodBody(updateListingSchema)
  update(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @ZodBody(updateListingSchema) body: z.infer<typeof updateListingSchema>,
  ) {
    return this.listings.update(user, id, body);
  }

  @Post(":id/reviews")
  @ApiOperation({ summary: "Leave a review (held for moderation)" })
  @ApiZodBody(createReviewSchema)
  review(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @ZodBody(createReviewSchema) body: z.infer<typeof createReviewSchema>,
  ) {
    return this.listings.addReview(user, id, body);
  }
}
