import { createParamDecorator, type ExecutionContext, SetMetadata } from "@nestjs/common";
import type { Role } from "@desiconnect/contracts";
import type { AuthUser } from "./auth.types";

export const IS_PUBLIC = "auth:isPublic";
export const REQUIRED_ROLES = "auth:roles";

/** Route is reachable without a token. If a valid token is sent, the user is still attached. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** User must hold at least one of these roles (ADMIN always passes). */
export const Roles = (...roles: Role[]) => SetMetadata(REQUIRED_ROLES, roles);

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser | null => {
  const req = ctx.switchToHttp().getRequest<{ user?: AuthUser }>();
  return req.user ?? null;
});
