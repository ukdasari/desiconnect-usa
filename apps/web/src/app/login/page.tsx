import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth-forms";
import { OidcSignIn } from "@/components/oidc-sign-in";
import { SOCIAL_ERRORS, SocialButtons } from "@/components/social-buttons";
import { Alert } from "@/components/ui";
import { socialProviders } from "@/lib/social";
import { AUTH_MODE } from "@/lib/oidc";
import { getMe } from "@/lib/session";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; message?: string }> }) {
  const { next, error, message } = await searchParams;
  const social = (await socialProviders()).map((s) => s.provider);
  const socialError = typeof error === "string" ? (error === "social_refused" ? message : SOCIAL_ERRORS[error]) : undefined;
  if (await getMe()) redirect(next?.startsWith("/") && !next.startsWith("//") ? next : "/account");
  return (
    <div className="container-page grid max-w-5xl gap-10 py-14 md:grid-cols-2">
      <div>
        <h1 className="text-3xl font-bold md:text-4xl">Welcome back</h1>
        <p className="mt-3 text-ink-2">Sign in to contact providers, RSVP to events, apply to jobs and keep track of everything in one place.</p>
        {process.env.NODE_ENV !== "production" && AUTH_MODE === "local" ? (
          <div className="mt-6 rounded-2xl border border-dashed border-line p-4 text-sm text-ink-2">
            <p className="font-semibold text-ink">Demo accounts (development only)</p>
            <p className="mt-1">user@, provider@ or admin@desiconnect.example with password DemoPass123!</p>
          </div>
        ) : null}
      </div>
      <div className="space-y-5 rounded-3xl border border-line bg-surface p-6 md:p-8">
        {socialError && (AUTH_MODE === "local" || error === "social_unavailable") ? <Alert tone="danger">{socialError}</Alert> : null}
        <SocialButtons providers={social} next={typeof next === "string" ? next : undefined} />
        {AUTH_MODE === "oidc" ? (
          <OidcSignIn next={typeof next === "string" ? next : undefined} error={typeof error === "string" ? error : undefined} />
        ) : (
          <LoginForm next={typeof next === "string" ? next : undefined} />
        )}
      </div>
    </div>
  );
}
