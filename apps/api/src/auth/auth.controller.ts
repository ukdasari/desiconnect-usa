import { Body, Controller, Get, Headers, HttpCode, Inject, Ip, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { loginSchema, registerSchema, socialSignInSchema, type AuthConfigDto, type LoginInput, type RegisterInput, type SocialSignInInput } from "@desiconnect/contracts";
import { unauthenticated } from "../common/errors";
import { ApiZodBody, ZodBody } from "../common/zod";
import { APP_CONFIG, type AppConfig } from "../config/config.module";
import { AuthService } from "./auth.service";
import { Public } from "./decorators";
import { SocialAuthService } from "./social.service";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly social_: SocialAuthService,
    @Inject(APP_CONFIG) private readonly env: AppConfig,
  ) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("register")
  @ApiOperation({ summary: "Create an account (AUTH_MODE=local)" })
  @ApiZodBody(registerSchema)
  register(@ZodBody(registerSchema) body: RegisterInput) {
    return this.auth.register(body);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("login")
  @HttpCode(200)
  @ApiOperation({ summary: "Sign in with email and password (AUTH_MODE=local)" })
  @ApiZodBody(loginSchema)
  login(@ZodBody(loginSchema) body: LoginInput) {
    return this.auth.login(body);
  }

  @Public()
  @Post("session")
  @HttpCode(200)
  @ApiOperation({ summary: "Establish an authenticated session from a bearer token (creates the user on first OIDC sign-in)" })
  session(@Headers("authorization") authorization?: string, @Body() body?: { idToken?: unknown }) {
    const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
    if (!token) throw unauthenticated("Send the access token as a Bearer token");
    const idToken = typeof body?.idToken === "string" && body.idToken.length < 8192 ? body.idToken : undefined;
    return this.auth.establishSession(token, idToken);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("social")
  @HttpCode(200)
  @ApiOperation({ summary: "Finish a Google, Facebook or X sign-in: exchange the provider's code for a session" })
  @ApiZodBody(socialSignInSchema)
  social(@ZodBody(socialSignInSchema) body: SocialSignInInput, @Ip() ip: string) {
    return this.social_.signIn(body, ip);
  }

  @Public()
  @Get("config")
  @ApiOperation({ summary: "Which sign-in method this deployment uses (for clients)" })
  config() {
    return {
      mode: this.env.AUTH_MODE,
      issuer: this.env.AUTH_MODE === "oidc" ? this.env.OIDC_ISSUER : null,
      audience: this.env.AUTH_MODE === "oidc" ? this.env.OIDC_AUDIENCE || null : null,
      social: this.social_.enabled(),
    } satisfies AuthConfigDto;
  }
}
