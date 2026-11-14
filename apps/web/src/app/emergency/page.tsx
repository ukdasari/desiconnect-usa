import type { Metadata } from "next";
import Link from "next/link";
import { Phone } from "lucide-react";

export const metadata: Metadata = {
  title: "Emergency and help lines",
  description: "911, 988 and non-emergency help for the Desi community in the USA.",
};

// National numbers only: these are stable and apply everywhere in the USA.
// Local resources should be added by administrators after verification.
const LINES = [
  { number: "911", label: "Police, fire or medical emergency", body: "Call when someone is in danger, hurt, or a crime is happening. Ask for an interpreter if you need one.", tel: "911", urgent: true },
  { number: "988", label: "Suicide & Crisis Lifeline", body: "Call or text 988, or chat at 988lifeline.org, if you or someone you know is in emotional distress. Free and confidential, 24/7.", tel: "988", urgent: true },
  { number: "1-800-222-1222", label: "Poison Help", body: "If someone swallowed, breathed in or touched something harmful and is awake and breathing. Free, 24/7.", tel: "18002221222" },
  { number: "1-800-799-7233", label: "National Domestic Violence Hotline", body: "Confidential support for anyone experiencing abuse. You can also text START to 88788.", tel: "18007997233" },
  { number: "211", label: "Local community help", body: "Food, housing, utility bills and other local services. Available in most of the USA.", tel: "211" },
];

export default function EmergencyPage() {
  return (
    <div className="container-page py-10">
      <div className="rounded-3xl bg-kumkum p-6 text-white md:p-10">
        <h1 className="text-3xl font-bold md:text-5xl">If anyone is in danger, call 911 now.</h1>
        <p className="mt-3 max-w-2xl text-lg text-white/90">1StopDesi can&rsquo;t contact emergency services for you. 911 dispatchers can connect an interpreter for many languages.</p>
        <a href="tel:911" className="mt-6 inline-flex h-13 items-center gap-2 rounded-full bg-white px-7 text-lg font-bold text-kumkum">
          <Phone className="size-5" aria-hidden /> Call 911
        </a>
      </div>

      <h2 className="mt-12 text-2xl font-bold">Help lines</h2>
      <ul className="mt-4 divide-y divide-line rounded-3xl border border-line bg-surface">
        {LINES.map((l) => (
          <li key={l.number} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <p className="font-semibold">{l.label}</p>
              <p className="mt-0.5 text-sm text-ink-2">{l.body}</p>
            </div>
            <a href={`tel:${l.tel}`} className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-5 font-bold ${l.urgent ? "bg-kumkum text-white" : "border border-line"}`}>
              <Phone className="size-4" aria-hidden /> {l.number}
            </a>
          </li>
        ))}
      </ul>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <section className="rounded-3xl border border-line p-6">
          <h2 className="text-xl font-bold">Indian consular services in Texas</h2>
          <p className="mt-2 text-ink-2">
            The Consulate General of India in Houston serves Texas and several nearby states for passports, visas, OCI cards and emergency help
            for Indian citizens. Check the consulate&rsquo;s official website for current hours and emergency contact numbers before you go.
          </p>
        </section>
        <section className="rounded-3xl border border-line p-6">
          <h2 className="text-xl font-bold">Not an emergency?</h2>
          <p className="mt-2 text-ink-2">For urgent but non-life-threatening problems, find local help on 1StopDesi.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/c/healthcare" className="rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-ink-2">Doctors and clinics</Link>
            <Link href="/search?category=hvac" className="rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-ink-2">AC and heating repair</Link>
            <Link href="/search?category=plumbing" className="rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-ink-2">Plumbers</Link>
            <Link href="/c/immigration" className="rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-ink-2">Immigration help</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
