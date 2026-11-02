"use client";

import Link from "next/link";
import { Button } from "@/components/ui";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container-page max-w-2xl py-24 text-center">
      <h1 className="text-4xl font-bold">This page didn&rsquo;t load</h1>
      <p className="mt-3 text-ink-2">
        DesiConnect couldn&rsquo;t complete the request. Try again; if it keeps happening, the service may be down for a moment.
      </p>
      {error.digest ? <p className="mt-2 text-xs text-ink-2">Reference: {error.digest}</p> : null}
      <div className="mt-8 flex justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Link href="/emergency" className="inline-flex h-11 items-center rounded-full border border-line px-5 font-semibold">Emergency numbers</Link>
      </div>
    </div>
  );
}
