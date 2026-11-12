import type { SocialProvider } from "@desiconnect/contracts";

/** Brand marks, drawn simply (each provider's own sign-in guidelines allow the logo on its button). */
function Mark({ p }: { p: SocialProvider }) {
  if (p === "google")
    return (
      <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
        <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.2l7.9 6.2C12.5 13.6 17.8 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.8c4.3-4 6.9-9.9 6.9-17.2z" />
        <path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-2.9-.8-4.6s.3-3.2.8-4.6l-7.9-6.2C1 16.6 0 20.2 0 24s1 7.4 2.7 10.8l7.9-6.2z" />
        <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.8c-2.1 1.4-4.8 2.3-8.5 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.2C6.6 42.6 14.6 48 24 48z" />
      </svg>
    );
  if (p === "facebook")
    return (
      <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
        <circle cx="12" cy="12" r="12" fill="#1877F2" />
        <path fill="#fff" d="M15.1 15.5l.5-3.4h-3.2V9.9c0-.9.4-1.8 1.9-1.8h1.5V5.2s-1.3-.2-2.6-.2c-2.7 0-4.4 1.6-4.4 4.5v2.6h-3v3.4h3V24h3.6v-8.5h2.7z" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden>
      <path fill="currentColor" d="M18.2 2.3h3.4l-7.4 8.4 8.7 11.5h-6.8l-5.3-7-6.1 7H1.3l7.9-9L.9 2.3h7l4.8 6.4 5.5-6.4zm-1.2 17.9h1.9L7 4.2H5l12 16z" />
    </svg>
  );
}

const LABEL: Record<SocialProvider, string> = { google: "Google", facebook: "Facebook", x: "X" };

/** "Continue with …" buttons for the providers this deployment has set up. Renders nothing when none are. */
export function SocialButtons({ providers, next }: { providers: SocialProvider[]; next?: string }) {
  if (!providers.length) return null;
  const qs = next ? `?next=${encodeURIComponent(next)}` : "";
  return (
    <div className="space-y-3">
      {providers.map((p) => (
        <a
          key={p}
          href={`/auth/social/${p}${qs}`}
          className="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-line bg-surface px-5 font-semibold text-ink transition-colors hover:border-ink-2 hover:bg-surface-2"
        >
          <Mark p={p} /> Continue with {LABEL[p]}
        </a>
      ))}
      <p className="text-center text-xs text-ink-2">
        By continuing, you agree to our{" "}
        <a href="/terms" className="underline hover:text-ink">Terms of service</a> and{" "}
        <a href="/privacy" className="underline hover:text-ink">Privacy policy</a>.
      </p>
      <div className="flex items-center gap-3 py-1 text-sm text-ink-2" aria-hidden>
        <span className="h-px flex-1 bg-line" /> or use your email <span className="h-px flex-1 bg-line" />
      </div>
    </div>
  );
}

export const SOCIAL_ERRORS: Record<string, string> = {
  cancelled: "Sign-in was cancelled. Try again when you're ready.",
  expired: "That sign-in took too long or was opened in another browser. Start again.",
  provider_error: "The sign-in service returned an error. Try again.",
  social_unavailable: "That sign-in option isn't available right now. Use your email instead.",
  api_unavailable: "DesiConnect is temporarily unavailable. Try again in a minute.",
};
