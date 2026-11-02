import type { Role } from "@desiconnect/contracts";

/** The authenticated principal attached to each request by AuthGuard. */
export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  roles: Role[];
  providerId: string | null;
  suspended: boolean;
}

export function hasRole(user: AuthUser | null | undefined, ...roles: Role[]): boolean {
  return !!user && roles.some((r) => user.roles.includes(r));
}

export function isAdmin(user: AuthUser | null | undefined): boolean {
  return hasRole(user, "ADMIN");
}
