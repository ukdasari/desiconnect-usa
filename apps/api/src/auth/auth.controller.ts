import { Controller, Headers, HttpCode, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { loginSchema, registerSchema, type LoginInput, type RegisterInput } from "@desiconnect/contracts";
import { unauthenticated } from "../common/errors";
import { ApiZodBody, ZodBody } from "../common/zod";
import { AuthService } from "./auth.service";
import { Public } from "./decorators";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

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
  session(@Headers("authorization") authorization?: string) {
    const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
    if (!token) throw unauthenticated("Send the identity token as a Bearer token");
    return this.auth.establishSession(token);
  }
}
