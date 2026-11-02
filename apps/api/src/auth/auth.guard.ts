import { type CanActivate, type ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Role } from "@desiconnect/contracts";
import type { Request } from "express";
import { forbidden, unauthenticated } from "../common/errors";
import { AuthService } from "./auth.service";
import type { AuthUser } from "./auth.types";
import { IS_PUBLIC, REQUIRED_ROLES } from "./decorators";

/**
 * Global guard. Every route requires a valid bearer token unless marked @Public().
 * Enforces @Roles() and blocks suspended accounts from any write.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const targets = [context.getHandler(), context.getClass()];
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets) ?? false;
    const roles = this.reflector.getAllAndOverride<Role[]>(REQUIRED_ROLES, targets) ?? [];

    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : null;
    if (token) {
      const user = await this.auth.authenticate(token);
      if (user) req.user = user;
      else if (!isPublic) throw unauthenticated("Your session has expired or the account isn't set up. Please sign in again.");
    }

    if (isPublic) return true;
    const user = req.user;
    if (!user) throw unauthenticated();

    if (user.suspended && req.method !== "GET") {
      throw forbidden("Your account is suspended. Contact support if you think this is a mistake.");
    }
    if (roles.length && !user.roles.includes("ADMIN") && !roles.some((r) => user.roles.includes(r))) {
      throw forbidden();
    }
    return true;
  }
}
