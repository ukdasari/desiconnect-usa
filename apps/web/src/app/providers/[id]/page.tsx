import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BadgeCheck, Globe, Languages, Mail, MapPin, Phone } from "lucide-react";
import type { ListingSummaryDto, ProviderDto } from "@desiconnect/contracts";
import { ListingRow } from "@/components/listing";
import { Alert, Badge, DemoBadge, EmptyState, VerificationBadge } from "@/components/ui";
import { apiOrNull } from "@/lib/api";
import { enumText, formatDate } from "@/lib/format";
import { getMe } from "@/lib/session";

type Profile = ProviderDto & { listings: ListingSummaryDto[] };
const UUID = /^[0-9a-f-]{36}$/i;

async function load(id: string) {
  if (!UUID.test(id)) return null;
  return (await apiOrNull<Profile>(`/providers/${id}`, { auth: false, revalidate: 60 }))?.data ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const p = await load((await params).id);
  return { title: p?.businessName ?? "Provider" };
}

export default async function ProviderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p, me] = await Promise.all([load(id), getMe()]);
  if (!p) notFound();
  return (
    <div className="container-page py-10">
      {p.isDemo ? <Alert tone="info" title="Demonstration business">This profile is sample data. It is not a real business.</Alert> : null}
      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_22rem]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <VerificationBadge status={p.verification} />
            {p.isDemo ? <DemoBadge /> : null}
            {p.categories.map((c) => <Badge key={c.slug} tone="peacock">{c.name}</Badge>)}
          </div>
          <h1 className="mt-3 text-3xl font-bold md:text-4xl">{p.businessName}</h1>
          <p className="prose-measure mt-4 whitespace-pre-line leading-relaxed">{p.description}</p>

          <h2 className="mt-10 text-xl font-bold">Listings</h2>
          {p.listings.length ? (
            <div className="mt-2">{p.listings.map((l) => <ListingRow key={l.id} listing={l} back={`/providers/${p.id}`} signedIn={!!me} />)}</div>
          ) : (
            <div className="mt-4"><EmptyState title="No published listings yet" /></div>
          )}
        </div>
        <aside className="space-y-5">
          <div className="rounded-3xl border border-line bg-surface p-6 text-sm">
            <ul className="space-y-2.5">
              {p.location ? <li className="flex gap-2"><MapPin className="size-4 shrink-0" aria-hidden />{p.location.city}, {p.location.state}{p.serviceRadiusMiles ? `, serves within ${p.serviceRadiusMiles} miles` : ""}</li> : null}
              <li className="flex gap-2"><Languages className="size-4 shrink-0" aria-hidden />{p.languages.join(", ")}</li>
              <li className="flex gap-2"><Phone className="size-4 shrink-0" aria-hidden /><a href={`tel:${p.phone}`} className="hover:underline">{p.phone}</a></li>
              <li className="flex gap-2"><Mail className="size-4 shrink-0" aria-hidden /><a href={`mailto:${p.email}`} className="break-all hover:underline">{p.email}</a></li>
              {p.website ? <li className="flex gap-2"><Globe className="size-4 shrink-0" aria-hidden /><a href={p.website} target="_blank" rel="noopener noreferrer nofollow" className="break-all hover:underline">{p.website.replace(/^https?:\/\//, "")}</a></li> : null}
            </ul>
          </div>
          {p.credentials.length ? (
            <div className="rounded-3xl border border-line p-6 text-sm">
              <h2 className="font-semibold">Credentials</h2>
              <ul className="mt-3 space-y-3">
                {p.credentials.map((c) => (
                  <li key={c.id}>
                    <p className="font-medium">{enumText(c.type)}, {c.jurisdiction}</p>
                    <p className="text-ink-2">No. {c.licenseNumber}</p>
                    {c.reviewStatus === "VERIFIED" ? (
                      <p className="mt-0.5 inline-flex items-center gap-1 text-leaf"><BadgeCheck className="size-3.5" aria-hidden />Checked {c.reviewedAt ? formatDate(c.reviewedAt) : ""}</p>
                    ) : (
                      <p className="mt-0.5 text-marigold-strong">Not yet checked</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
