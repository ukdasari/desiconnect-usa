import { Global, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AuthController } from "./auth.controller";
import { AuthGuard } from "./auth.guard";
import { AuthService } from "./auth.service";
import { SocialAuthService } from "./social.service";
import { TokenService } from "./token.service";

@Global()
@Module({
  controllers: [AuthController],
  providers: [TokenService, AuthService, SocialAuthService, { provide: APP_GUARD, useClass: AuthGuard }],
  exports: [AuthService, TokenService],
})
export class AuthModule {}
