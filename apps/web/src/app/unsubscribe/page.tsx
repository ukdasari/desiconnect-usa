import type { Metadata } from "next";
import Link from "next/link";
import { UnsubscribeForm } from "@/components/alert-forms";
import { Alert } from "@/components/ui";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false } };

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const raw = (await searchParams).token;
  const token = (Array.isArray(raw) ? raw[0] : raw) ?? "";
  return (
    <div className="container-page max-w-xl py-16">
      <h1 className="text-3xl font-bold">Unsubscribe from alert emails</h1>
      <p className="mt-2 text-ink-2">
        You&apos;ll stop getting alert and weekly digest emails. Alerts still show under the bell when you sign in, and account
        messages (like replies to your requests) are still sent.
      </p>
      <div className="mt-8">
        {token ? (
          <UnsubscribeForm token={token} />
        ) : (
          <Alert tone="info" title="This link is incomplete">Sign in and turn off alert emails on the Alerts page.</Alert>
        )}
      </div>
      <p className="mt-8 text-sm text-ink-2">
        Prefer fewer emails instead? <Link href="/account/alerts" className="font-semibold text-ink underline">Manage your alerts</Link>.
      </p>
    </div>
  );
}
