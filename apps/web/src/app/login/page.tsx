import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth-forms";
import { getMe } from "@/lib/session";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getMe()) redirect(next?.startsWith("/") && !next.startsWith("//") ? next : "/account");
  return (
    <div className="container-page grid max-w-5xl gap-10 py-14 md:grid-cols-2">
      <div>
        <h1 className="text-3xl font-bold md:text-4xl">Welcome back</h1>
        <p className="mt-3 text-ink-2">Sign in to contact providers, RSVP to events, apply to jobs and keep track of everything in one place.</p>
        {process.env.NODE_ENV !== "production" ? (
          <div className="mt-6 rounded-2xl border border-dashed border-line p-4 text-sm text-ink-2">
            <p className="font-semibold text-ink">Demo accounts (development only)</p>
            <p className="mt-1">user@, provider@ or admin@desiconnect.example with password DemoPass123!</p>
          </div>
        ) : null}
      </div>
      <div className="rounded-3xl border border-line bg-surface p-6 md:p-8">
        <LoginForm next={typeof next === "string" ? next : undefined} />
      </div>
    </div>
  );
}
