import type { ReactNode } from "react";

/** Contact address on the legal pages. Set SUPPORT_EMAIL in production. */
export const supportEmail = () => process.env.SUPPORT_EMAIL || "support@desiconnect.example";
export const LEGAL_UPDATED = "November 11, 2026";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="container-page max-w-3xl py-12">
      <h1 className="text-3xl font-bold md:text-4xl">{title}</h1>
      <p className="mt-2 text-sm text-ink-2">Last updated {LEGAL_UPDATED}</p>
      <div className="mt-8 space-y-6 leading-relaxed text-ink-2 [&_a]:font-semibold [&_a]:text-ink [&_a]:underline [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-ink [&_li]:mt-1.5 [&_strong]:text-ink [&_ul]:list-disc [&_ul]:pl-6">
        {children}
      </div>
    </div>
  );
}
