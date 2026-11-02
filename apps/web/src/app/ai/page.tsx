import type { Metadata } from "next";
import Link from "next/link";
import { DesiAi } from "@/components/desi-ai";
import { getMe } from "@/lib/session";

export const metadata: Metadata = { title: "Desi AI", description: "Ask for what you need in plain language and get real listings back." };

export default async function AiPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const [{ q }, me] = await Promise.all([searchParams, getMe()]);
  return (
    <div className="container-page grid gap-10 py-10 lg:grid-cols-[1fr_20rem]">
      <div>
        <h1 className="text-3xl font-bold md:text-4xl">Ask Desi AI</h1>
        <p className="prose-measure mt-2 text-ink-2">
          Describe what you&rsquo;re looking for, including language and neighborhood. Desi AI searches DesiConnect listings and shows you the matches.
        </p>
        <div className="mt-6"><DesiAi variant="page" initialQuestion={typeof q === "string" ? q.slice(0, 500) : undefined} /></div>
      </div>
      <aside className="space-y-5 text-sm lg:pt-16">
        <section className="rounded-3xl border border-line bg-surface p-5">
          <h2 className="font-semibold">What Desi AI does</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-ink-2">
            <li>Finds providers, events, jobs and homes that are actually listed here.</li>
            <li>Tells you when nothing matches instead of making something up.</li>
            <li>Never sends requests or shares your details. You decide when to contact someone.</li>
          </ul>
        </section>
        <section className="rounded-3xl border border-line bg-surface p-5">
          <h2 className="font-semibold">What it won&rsquo;t do</h2>
          <p className="mt-2 text-ink-2">It doesn&rsquo;t give legal, immigration, medical or tax advice. It can help you find a licensed professional who can.</p>
        </section>
        <section className="rounded-3xl border border-line bg-surface p-5">
          <h2 className="font-semibold">Your history</h2>
          <p className="mt-2 text-ink-2">
            {me ? (
              <>Conversations are saved to your account so you can continue them. <Link href="/account#privacy" className="font-semibold text-ink underline">Delete your history</Link> any time.</>
            ) : (
              <>You&rsquo;re not signed in, so nothing is saved.</>
            )}
          </p>
        </section>
      </aside>
    </div>
  );
}
