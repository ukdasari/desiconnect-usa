import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth-forms";
import { OidcSignIn } from "@/components/oidc-sign-in";
import { SOCIAL_ERRORS, SocialButtons } from "@/components/social-buttons";
import { Alert } from "@/components/ui";
import { socialProviders } from "@/lib/social";
import { AUTH_MODE } from "@/lib/oidc";
import { getMe } from "@/lib/session";

export const metadata: Metadata = { title: "Create an account" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; message?: string }> }) {
  const { next, error, message } = await searchParams;
  const social = (await socialProviders()).map((s) => s.provider);
  const socialError = typeof error === "string" ? (error === "social_refused" ? message : SOCIAL_ERRORS[error]) : undefined;
  if (await getMe()) redirect("/account");
  return (
    <div className="container-page grid max-w-5xl gap-10 py-14 md:grid-cols-2">
      <div>
        <h1 className="text-3xl font-bold md:text-4xl">Create your free account</h1>
        <ul className="mt-5 space-y-3 text-ink-2">
          <li>Send requests to providers and see their replies.</li>
          <li>RSVP to events and apply to jobs with your resume.</li>
          <li>Save listings and pick up Desi AI conversations later.</li>
        </ul>
        <p className="mt-5 text-sm text-ink-2">We never share your contact details with a provider until you choose to send them a request.</p>
      </div>
      <div className="space-y-5 rounded-3xl border border-line bg-surface p-6 md:p-8">
        {socialError && (AUTH_MODE === "local" || error === "social_unavailable") ? <Alert tone="danger">{socialError}</Alert> : null}
        <SocialButtons providers={social} next={typeof next === "string" ? next : undefined} />
        {AUTH_MODE === "oidc" ? (
          <OidcSignIn next={typeof next === "string" ? next : undefined} error={typeof error === "string" ? error : undefined} signup />
        ) : (
          <RegisterForm next={typeof next === "string" ? next : undefined} />
        )}
      </div>
    </div>
  );
}
