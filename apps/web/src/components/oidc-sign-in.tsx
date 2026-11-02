import { ShieldCheck } from "lucide-react";
import { Alert, buttonClass } from "./ui";

const ERRORS: Record<string, string> = {
  cancelled: "Sign-in was cancelled. Try again when you're ready.",
  expired: "That sign-in took too long or was opened in another browser. Start again.",
  email_unverified: "Verify your email address with your sign-in provider, then sign in again.",
  provider_unavailable: "The sign-in service isn't reachable right now. Try again in a minute.",
  provider_error: "The sign-in service returned an error. Try again.",
  sign_in_failed: "We couldn't complete sign-in. Try again.",
  api_unavailable: "DesiConnect is temporarily unavailable. Try again in a minute.",
  account_error: "We couldn't set up your account. Contact support if this keeps happening.",
};

/** Sign-in / sign-up panel for OIDC mode: hands off to the identity provider's hosted page. */
export function OidcSignIn({ next, signup = false, error }: { next?: string; signup?: boolean; error?: string }) {
  const params = new URLSearchParams();
  if (next) params.set("next", next);
  if (signup) params.set("signup", "1");
  return (
    <div className="space-y-5">
      {error ? <Alert tone="danger">{ERRORS[error] ?? ERRORS.sign_in_failed}</Alert> : null}
      <a href={`/auth/login?${params}`} className={buttonClass("primary", "lg", "w-full")}>
        {signup ? "Create account" : "Sign in"}
      </a>
      <p className="flex items-start gap-2 text-sm text-ink-2">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-leaf" aria-hidden />
        You&rsquo;ll continue on our secure sign-in page, where you can use your email or a connected account.
        DesiConnect never sees your password.
      </p>
      <p className="text-center text-sm text-ink-2">
        {signup ? "Already have an account? " : "New here? "}
        <a href={`/auth/login?${new URLSearchParams({ ...(next ? { next } : {}), ...(signup ? {} : { signup: "1" }) })}`} className="font-semibold text-ink underline">
          {signup ? "Sign in" : "Create an account"}
        </a>
      </p>
    </div>
  );
}
