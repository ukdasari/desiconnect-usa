import { Controller, Get, Param, ParseUUIDPipe, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { credentialSubmissionSchema, providerOnboardingSchema, updateProviderSchema } from "@desiconnect/contracts";
import type { z } from "zod";
import { CurrentUser, Public, Roles } from "../auth/decorators";
import type { AuthUser } from "../auth/auth.types";
import { ApiZodBody, ZodBody } from "../common/zod";
import { ProvidersService } from "./providers.service";

@ApiTags("providers")
@ApiBearerAuth()
@Controller()
export class ProvidersController {
  constructor(private readonly providers: ProvidersService) {}

  @Post("providers")
  @ApiOperation({ summary: "Provider onboarding: create my business profile (enters verification review)" })
  @ApiZodBody(providerOnboardingSchema)
  onboard(@CurrentUser() user: AuthUser, @ZodBody(providerOnboardingSchema) body: z.infer<typeof providerOnboardingSchema>) {
    return this.providers.onboard(user, body);
  }

  @Patch("providers/me")
  @Roles("PROVIDER")
  @ApiOperation({ summary: "Update my business profile" })
  @ApiZodBody(updateProviderSchema)
  update(@CurrentUser() user: AuthUser, @ZodBody(updateProviderSchema) body: z.infer<typeof updateProviderSchema>) {
    return this.providers.update(user, body);
  }

  @Post("providers/me/credentials")
  @Roles("PROVIDER")
  @ApiOperation({ summary: "Submit a license or credential for verification" })
  @ApiZodBody(credentialSubmissionSchema)
  credential(@CurrentUser() user: AuthUser, @ZodBody(credentialSubmissionSchema) body: z.infer<typeof credentialSubmissionSchema>) {
    return this.providers.submitCredential(user, body);
  }

  @Get("provider/dashboard")
  @ApiOperation({ summary: "My listings, lead stats and business profile" })
  dashboard(@CurrentUser() user: AuthUser) {
    return this.providers.dashboard(user);
  }

  @Public()
  @Get("providers/:id")
  @ApiOperation({ summary: "Public provider profile with published listings" })
  get(@Param("id", ParseUUIDPipe) id: string) {
    return this.providers.publicProfile(id);
  }
}
