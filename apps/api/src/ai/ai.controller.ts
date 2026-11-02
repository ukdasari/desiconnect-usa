import { Controller, Get, HttpCode, Module, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { aiChatSchema, stateCodeSchema } from "@desiconnect/contracts";
import { z } from "zod";
import { CurrentUser, Public } from "../auth/decorators";
import type { AuthUser } from "../auth/auth.types";
import { ApiZodBody, ApiZodQuery, ZodBody, ZodQuery } from "../common/zod";
import { AiService } from "./ai.service";

const interpretSchema = z.object({
  q: z.string().trim().min(1).max(200),
  city: z.string().trim().max(80).optional(),
  state: stateCodeSchema.optional(),
  zip: z.string().regex(/^\d{5}$/).optional(),
});

@ApiTags("ai")
@Controller("ai")
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Public()
  @Post("chat")
  @HttpCode(200)
  @Throttle({ default: { limit: 12, ttl: 60_000 } })
  @ApiOperation({
    summary: "Desi AI: natural-language search. Returns structured results from the database only; never sends inquiries on the user's behalf.",
  })
  @ApiZodBody(aiChatSchema)
  chat(@CurrentUser() user: AuthUser | null, @ZodBody(aiChatSchema) body: z.infer<typeof aiChatSchema>) {
    return this.ai.chat(user, body);
  }

  @Public()
  @Get("interpret")
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: "Convert free-text search into structured search filters (rule-based, no history kept)" })
  @ApiZodQuery(interpretSchema)
  interpret(@ZodQuery(interpretSchema) query: z.infer<typeof interpretSchema>) {
    return this.ai.interpret(query.q, { city: query.city, state: query.state, zip: query.zip });
  }
}

@Module({ controllers: [AiController], providers: [AiService] })
export class AiModule {}
