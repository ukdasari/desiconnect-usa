import "server-only";
import { notFound, redirect } from "next/navigation";
import { getMe } from "./session";

/** Admin pages: signed-out users go to sign-in; signed-in non-admins get a 404 (the API enforces this too). */
export async function requireAdmin(path: string) {
  const me = await getMe();
  if (!me) redirect(`/login?next=${encodeURIComponent(path)}`);
  if (!me.roles.includes("ADMIN")) notFound();
  return me;
}
