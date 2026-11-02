import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  RESUME_MAX_BYTES,
  createInquirySchema,
  eventRegistrationSchema,
  jobApplicationSchema,
  updateApplicationSchema,
  updateInquirySchema,
} from "@desiconnect/contracts";
import type { Response } from "express";
import type { z } from "zod";
import { CurrentUser } from "../auth/decorators";
import type { AuthUser } from "../auth/auth.types";
import { ApiZodBody, ZodBody } from "../common/zod";
import { EngagementService } from "./engagement.service";

@ApiTags("inquiries")
@ApiBearerAuth()
@Controller()
export class InquiriesController {
  constructor(private readonly engagement: EngagementService) {}

  @Post("inquiries")
  @ApiOperation({ summary: "Request a service / contact a listing owner. Requires explicit consent to share contact details." })
  @ApiZodBody(createInquirySchema)
  create(@CurrentUser() user: AuthUser, @ZodBody(createInquirySchema) body: z.infer<typeof createInquirySchema>) {
    return this.engagement.createInquiry(user, body);
  }

  @Patch("inquiries/:id")
  @ApiOperation({ summary: "Listing owner responds / changes status; requester may close" })
  @ApiZodBody(updateInquirySchema)
  update(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string, @ZodBody(updateInquirySchema) body: z.infer<typeof updateInquirySchema>) {
    return this.engagement.updateInquiry(user, id, body);
  }

  @Get("provider/inquiries")
  @ApiOperation({ summary: "Inquiries received on listings I own (lead management)" })
  received(@CurrentUser() user: AuthUser, @Query("listingId") listingId?: string) {
    return this.engagement.receivedInquiries(user, listingId);
  }
}

@ApiTags("events")
@ApiBearerAuth()
@Controller("events")
export class EventRegistrationsController {
  constructor(private readonly engagement: EngagementService) {}

  @Post(":id/registrations")
  @ApiOperation({ summary: "Register (RSVP) for an event; waitlisted when full" })
  @ApiZodBody(eventRegistrationSchema)
  register(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string, @ZodBody(eventRegistrationSchema) body: z.infer<typeof eventRegistrationSchema>) {
    return this.engagement.register(user, id, body);
  }

  @Delete(":id/registrations")
  @ApiOperation({ summary: "Cancel my registration" })
  cancel(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.engagement.cancelRegistration(user, id);
  }

  @Get(":id/registrations")
  @ApiOperation({ summary: "Attendee list (event organizer only)" })
  list(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.engagement.eventRegistrations(user, id);
  }
}

@ApiTags("jobs")
@ApiBearerAuth()
@Controller()
export class JobApplicationsController {
  constructor(private readonly engagement: EngagementService) {}

  @Post("jobs/:id/applications")
  @ApiOperation({ summary: "Apply to a job. Multipart form: resume (PDF/DOCX ≤ 5 MB), coverLetter, phone, consentToShare=true" })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("resume", { limits: { fileSize: RESUME_MAX_BYTES, files: 1 } }))
  apply(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @ZodBody(jobApplicationSchema) body: z.infer<typeof jobApplicationSchema>,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.engagement.apply(user, id, body, file);
  }

  @Get("jobs/:id/applications")
  @ApiOperation({ summary: "Applications for a job (employer only)" })
  list(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.engagement.jobApplications(user, id);
  }

  @Patch("applications/:id")
  @ApiOperation({ summary: "Employer updates status; applicant may withdraw" })
  @ApiZodBody(updateApplicationSchema)
  update(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string, @ZodBody(updateApplicationSchema) body: z.infer<typeof updateApplicationSchema>) {
    return this.engagement.updateApplication(user, id, body);
  }

  @Get("applications/:id/resume")
  @ApiOperation({ summary: "Download the resume (applicant, employer or admin; audited)" })
  async resume(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string, @Res() res: Response) {
    const file = await this.engagement.resume(user, id);
    res.setHeader("Content-Type", file.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${file.fileName.replace(/"/g, "")}"`);
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.send(file.buffer);
  }
}

@ApiTags("me")
@ApiBearerAuth()
@Controller("me/favorites")
export class FavoritesController {
  constructor(private readonly engagement: EngagementService) {}

  @Post(":listingId")
  @HttpCode(200)
  @ApiOperation({ summary: "Save a listing" })
  add(@CurrentUser() user: AuthUser, @Param("listingId", ParseUUIDPipe) listingId: string) {
    return this.engagement.setFavorite(user, listingId, true);
  }

  @Delete(":listingId")
  @ApiOperation({ summary: "Remove a saved listing" })
  remove(@CurrentUser() user: AuthUser, @Param("listingId", ParseUUIDPipe) listingId: string) {
    return this.engagement.setFavorite(user, listingId, false);
  }
}
