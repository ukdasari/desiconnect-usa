import { timingSafeEqual } from "node:crypto";
import { Body, Controller, Delete, Get, Headers, HttpCode, Inject, Param, ParseUUIDPipe, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { createAlertSchema, notificationSettingsSchema, updateAlertSchema } from "@desiconnect/contracts";
import { z } from "zod";
import type { AuthUser } from "../auth/auth.types";
import { CurrentUser, Public } from "../auth/decorators";
import { badRequest, forbidden } from "../common/errors";
import { ApiZodBody, ZodBody } from "../common/zod";
import { APP_CONFIG, type AppConfig } from "../config/config.module";
import { EmailService } from "../notifications/email.service";
import { AlertsService } from "./alerts.service";

const unsubscribeSchema = z.object({ token: z.string().min(10).max(200) });

@ApiTags("alerts")
@Controller()
export class AlertsController {
  constructor(
    private readonly alerts: AlertsService,
    private readonly email: EmailService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  @ApiBearerAuth()
  @Get("me/alerts")
  @ApiOperation({ summary: "My alerts" })
  list(@CurrentUser() user: AuthUser) {
    return this.alerts.list(user);
  }

  @ApiBearerAuth()
  @Post("me/alerts")
  @ApiOperation({ summary: "Follow a topic near a place (instant alerts or a weekly digest)" })
  @ApiZodBody(createAlertSchema)
  create(@CurrentUser() user: AuthUser, @ZodBody(createAlertSchema) body: z.output<typeof createAlertSchema>) {
    return this.alerts.create(user, body);
  }

  @ApiBearerAuth()
  @Patch("me/alerts/:id")
  @ApiOperation({ summary: "Change how often an alert is sent" })
  @ApiZodBody(updateAlertSchema)
  update(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string, @ZodBody(updateAlertSchema) body: z.infer<typeof updateAlertSchema>) {
    return this.alerts.update(user, id, body.frequency);
  }

  @ApiBearerAuth()
  @Delete("me/alerts/:id")
  @HttpCode(200)
  @ApiOperation({ summary: "Remove an alert" })
  async remove(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    await this.alerts.remove(user, id);
    return { deleted: true };
  }

  @ApiBearerAuth()
  @Get("me/notification-settings")
  @ApiOperation({ summary: "Whether alerts are emailed and pushed" })
  settings(@CurrentUser() user: AuthUser) {
    return this.alerts.settings(user);
  }

  @ApiBearerAuth()
  @Patch("me/notification-settings")
  @ApiZodBody(notificationSettingsSchema)
  updateSettings(@CurrentUser() user: AuthUser, @ZodBody(notificationSettingsSchema) body: z.infer<typeof notificationSettingsSchema>) {
    return this.alerts.updateSettings(user, body);
  }

  @Public()
  @Post("alerts/unsubscribe")
  @HttpCode(200)
  @ApiOperation({ summary: "One-click unsubscribe from alert emails (token from the email link)" })
  @ApiZodBody(unsubscribeSchema)
  async unsubscribe(@ZodBody(unsubscribeSchema) body: z.infer<typeof unsubscribeSchema>) {
    const userId = this.email.verifyUnsubscribeToken(body.token);
    if (!userId) throw badRequest("This unsubscribe link isn't valid. Sign in and turn off alert emails in Notification settings.");
    await this.alerts.unsubscribe(userId);
    return { unsubscribed: true };
  }

  /** Called weekly by Cloud Scheduler with the x-internal-key header. */
  @Public()
  @Post("internal/alerts/digest")
  @HttpCode(200)
  @ApiOperation({ summary: "Send due weekly digests (scheduler only; needs x-internal-key)" })
  digest(@Headers("x-internal-key") key?: string, @Body() _body?: unknown) {
    const expected = this.config.INTERNAL_API_KEY;
    if (!expected || !key || key.length !== expected.length || !timingSafeEqual(Buffer.from(key), Buffer.from(expected))) throw forbidden();
    return this.alerts.sendDigests();
  }
}
