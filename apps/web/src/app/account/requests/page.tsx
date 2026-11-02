import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ApplicationDto, InquiryDto, RegistrationDto } from "@desiconnect/contracts";
import { cancelRegistration, closeInquiry, withdrawApplication } from "@/app/actions/engagement";
import { AccountNav } from "@/components/account-nav";
import { DateBlock } from "@/components/listing";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { enumText, formatEventWhen, relativeTime } from "@/lib/format";
import { getMe } from "@/lib/session";

export const metadata: Metadata = { title: "My requests" };

const statusTone = (s: string) =>
  (({ NEW: "marigold", VIEWED: "peacock", RESPONDED: "leaf", SUBMITTED: "marigold", REVIEWING: "peacock", INTERVIEW: "leaf", OFFERED: "leaf", REGISTERED: "leaf", WAITLISTED: "marigold", REJECTED: "kumkum" }) as const)[s as "NEW"] ?? "neutral";

export default async function RequestsPage() {
  const me = await getMe();
  if (!me) redirect("/login?next=/account/requests");
  const [inquiries, applications, registrations] = await Promise.all([
    api<InquiryDto[]>("/me/inquiries").then((r) => r.data),
    api<ApplicationDto[]>("/me/applications").then((r) => r.data),
    api<RegistrationDto[]>("/me/registrations").then((r) => r.data),
  ]);
  const upcoming = registrations.filter((r) => r.status !== "CANCELLED");

  return (
    <div className="container-page py-10">
      <PageHeader title="My requests" description="Everything you've sent: service requests, job applications and event RSVPs." />
      <AccountNav current="/account/requests" />

      <section className="mt-8" aria-labelledby="inq-h">
        <h2 id="inq-h" className="text-xl font-bold">Service requests <span className="text-base font-normal text-ink-2">({inquiries.length})</span></h2>
        {inquiries.length ? (
          <ul className="mt-3 space-y-3">
            {inquiries.map((i) => (
              <li key={i.id} className="rounded-2xl border border-line bg-surface p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/listings/${i.listing.slug}`} className="font-semibold hover:underline">{i.listing.title}</Link>
                  <Badge tone={statusTone(i.status)}>{i.status === "VIEWED" ? "Seen by provider" : enumText(i.status)}</Badge>
                </div>
                <p className="mt-1 text-sm text-ink-2">Sent {relativeTime(i.createdAt)}</p>
                <p className="mt-2 text-sm">{i.message}</p>
                {i.providerResponse ? (
                  <div className="mt-3 rounded-xl bg-leaf-soft p-3 text-sm">
                    <p className="font-semibold">Reply{i.respondedAt ? `, ${relativeTime(i.respondedAt)}` : ""}</p>
                    <p className="mt-1">{i.providerResponse}</p>
                  </div>
                ) : null}
                {i.status !== "CLOSED" ? (
                  <form action={closeInquiry} className="mt-3">
                    <input type="hidden" name="inquiryId" value={i.id} />
                    <button className="text-sm font-semibold text-ink-2 underline hover:text-ink">Close request</button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-3"><EmptyState title="No requests yet">When you contact a provider, owner or organizer, you can follow it here.</EmptyState></div>
        )}
      </section>

      <section className="mt-12" aria-labelledby="app-h">
        <h2 id="app-h" className="text-xl font-bold">Job applications <span className="text-base font-normal text-ink-2">({applications.length})</span></h2>
        {applications.length ? (
          <ul className="mt-3 divide-y divide-line rounded-2xl border border-line bg-surface">
            {applications.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
                <div>
                  <Link href={`/listings/${a.job.slug}`} className="font-semibold hover:underline">{a.job.title}</Link>
                  <p className="text-sm text-ink-2">{a.job.company}, applied {relativeTime(a.createdAt)}{a.hasResume ? ", resume attached" : ""}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={statusTone(a.status)}>{enumText(a.status)}</Badge>
                  {["SUBMITTED", "REVIEWING"].includes(a.status) ? (
                    <form action={withdrawApplication}>
                      <input type="hidden" name="applicationId" value={a.id} />
                      <button className="text-sm font-semibold text-ink-2 underline hover:text-ink">Withdraw</button>
                    </form>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-3"><EmptyState title="No applications yet" action={<Link href="/jobs" className="font-semibold underline">Browse jobs</Link>} /></div>
        )}
      </section>

      <section className="mt-12" aria-labelledby="rsvp-h">
        <h2 id="rsvp-h" className="text-xl font-bold">Event RSVPs <span className="text-base font-normal text-ink-2">({upcoming.length})</span></h2>
        {upcoming.length ? (
          <ul className="mt-3 space-y-3">
            {upcoming.map((r) => (
              <li key={r.id} className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4">
                <DateBlock iso={r.event.startAt} />
                <div className="min-w-0 flex-1">
                  <Link href={`/listings/${r.event.slug}`} className="font-semibold hover:underline">{r.event.title}</Link>
                  <p className="text-sm text-ink-2">{formatEventWhen(r.event.startAt, null)}, {r.event.venue}. {r.guests} {r.guests === 1 ? "person" : "people"}.</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge tone={statusTone(r.status)}>{enumText(r.status)}</Badge>
                  <form action={cancelRegistration}>
                    <input type="hidden" name="listingId" value={r.event.listingId} />
                    <button className="text-sm font-semibold text-ink-2 underline hover:text-ink">Cancel</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-3"><EmptyState title="No RSVPs" action={<Link href="/events" className="font-semibold underline">Find events</Link>} /></div>
        )}
      </section>
    </div>
  );
}
