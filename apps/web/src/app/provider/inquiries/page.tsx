import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { InquiryDto } from "@desiconnect/contracts";
import { RespondForm } from "@/components/provider-forms";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { enumText, relativeTime } from "@/lib/format";
import { getMe } from "@/lib/session";

export const metadata: Metadata = { title: "Requests" };

export default async function ProviderInquiriesPage() {
  const me = await getMe();
  if (!me) redirect("/login?next=/provider/inquiries");
  const inquiries = (await api<InquiryDto[]>("/provider/inquiries")).data;
  const open = inquiries.filter((i) => !["CLOSED", "SPAM"].includes(i.status));
  const closed = inquiries.filter((i) => ["CLOSED", "SPAM"].includes(i.status));

  return (
    <div className="container-page py-10">
      <Link href="/provider" className="text-sm text-ink-2 hover:underline">Provider dashboard</Link>
      <PageHeader title="Requests" description="Customers who contacted you. Reply here and they'll be notified; you can also reach them directly." />
      {inquiries.length === 0 ? (
        <div className="mt-8"><EmptyState title="No requests yet">When customers contact you from a listing, their requests appear here.</EmptyState></div>
      ) : null}
      {[{ title: `Open (${open.length})`, items: open }, { title: `Closed (${closed.length})`, items: closed }].map((group) =>
        group.items.length ? (
          <section key={group.title} className="mt-8">
            <h2 className="text-xl font-bold">{group.title}</h2>
            <ul className="mt-3 space-y-3">
              {group.items.map((i) => (
                <li key={i.id} className="grid gap-4 rounded-2xl border border-line bg-surface p-5 md:grid-cols-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={i.status === "NEW" ? "marigold" : i.status === "RESPONDED" ? "leaf" : "neutral"}>{enumText(i.status)}</Badge>
                      <Link href={`/provider/listings/${i.listing.id}`} className="text-sm font-semibold hover:underline">{i.listing.title}</Link>
                    </div>
                    <p className="mt-2 font-semibold">{i.requester?.name ?? "Customer"}</p>
                    <p className="text-sm text-ink-2">
                      <a href={`mailto:${i.requester?.email}`} className="underline">{i.requester?.email}</a>
                      {i.phone ? <>, <a href={`tel:${i.phone}`} className="underline">{i.phone}</a></> : null}. Prefers {i.preferredContact.toLowerCase()}. {relativeTime(i.createdAt)}.
                    </p>
                    <p className="mt-2 whitespace-pre-line">{i.message}</p>
                  </div>
                  <RespondForm inquiryId={i.id} currentStatus={i.status} existing={i.providerResponse} />
                </li>
              ))}
            </ul>
          </section>
        ) : null,
      )}
    </div>
  );
}
