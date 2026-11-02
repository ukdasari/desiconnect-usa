import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { APPLICATION_STATUSES, type ApplicationDto, type InquiryDto, type ListingDetailDto } from "@desiconnect/contracts";
import { listingAction, setApplicationStatus } from "@/app/actions/provider";
import { RespondForm } from "@/components/provider-forms";
import { Alert, Badge, ButtonLink, EmptyState, PageHeader } from "@/components/ui";
import { api, apiOrNull } from "@/lib/api";
import { enumText, relativeTime } from "@/lib/format";
import { getMe } from "@/lib/session";

export const metadata: Metadata = { title: "Manage listing" };

interface Attendee { id: string; status: string; guests: number; createdAt: string; attendee: { name: string | null; email: string } }

export default async function ManageListingPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string; updated?: string }> }) {
  const [{ id }, sp, me] = await Promise.all([params, searchParams, getMe()]);
  if (!me) redirect(`/login?next=/provider/listings/${id}`);
  const listing = (await apiOrNull<ListingDetailDto>(`/listings/${id}`))?.data;
  if (!listing || (listing.ownerId !== me.id && !me.roles.includes("ADMIN"))) notFound();

  const [inquiries, applications, attendees] = await Promise.all([
    api<InquiryDto[]>("/provider/inquiries", { query: { listingId: id } }).then((r) => r.data),
    listing.kind === "JOB" ? api<ApplicationDto[]>(`/jobs/${id}/applications`).then((r) => r.data) : Promise.resolve([]),
    listing.kind === "EVENT" ? api<Attendee[]>(`/events/${id}/registrations`).then((r) => r.data) : Promise.resolve([]),
  ]);
  const API_PUBLIC = "/api/resume";

  return (
    <div className="container-page py-10">
      <Link href="/provider" className="text-sm text-ink-2 hover:underline">Provider dashboard</Link>
      <PageHeader title={listing.title} description={<span className="inline-flex flex-wrap items-center gap-2"><Badge tone={listing.status === "PUBLISHED" ? "leaf" : listing.status === "REJECTED" ? "kumkum" : "marigold"}>{enumText(listing.status)}</Badge>{listing.subcategory?.name ?? listing.category.name}</span>}>
        {listing.status === "PUBLISHED" ? <ButtonLink href={`/listings/${listing.slug}`} variant="secondary">View public page</ButtonLink> : null}
        <ButtonLink href={`/provider/listings/${listing.id}/edit`} variant="secondary">Edit</ButtonLink>
        {["DRAFT", "REJECTED", "ARCHIVED"].includes(listing.status) ? (
          <form action={listingAction}><input type="hidden" name="id" value={listing.id} /><input type="hidden" name="action" value="submit" /><button className="inline-flex h-11 items-center rounded-full bg-marigold px-5 font-semibold text-[#1b1206]">Submit for review</button></form>
        ) : null}
        {listing.status !== "ARCHIVED" ? (
          <form action={listingAction}><input type="hidden" name="id" value={listing.id} /><input type="hidden" name="action" value="archive" /><button className="inline-flex h-11 items-center rounded-full px-4 font-semibold text-ink-2 hover:text-ink">Archive</button></form>
        ) : null}
      </PageHeader>

      {sp.created ? <Alert className="mt-6" tone="success" title={listing.status === "DRAFT" ? "Draft saved" : "Submitted for review"}>{listing.status === "DRAFT" ? "Submit it when you're ready for it to go live." : "We'll notify you when it's approved."}</Alert> : null}
      {sp.updated ? <Alert className="mt-6" tone="success" title="Changes saved">{listing.status === "PENDING_REVIEW" ? "They'll be visible after review." : null}</Alert> : null}
      {listing.status === "REJECTED" && listing.rejectionReason ? <Alert className="mt-6" tone="danger" title="Changes requested">{listing.rejectionReason}</Alert> : null}

      {listing.kind === "JOB" ? (
        <section className="mt-10" aria-labelledby="apps-h">
          <h2 id="apps-h" className="text-xl font-bold">Applications ({applications.length})</h2>
          {applications.length ? (
            <ul className="mt-3 divide-y divide-line rounded-2xl border border-line bg-surface">
              {applications.map((a) => (
                <li key={a.id} className="grid gap-3 p-5 md:grid-cols-[1fr_auto] md:items-start">
                  <div>
                    <p className="font-semibold">{a.applicant?.name ?? "Applicant"} <span className="font-normal text-ink-2">{a.applicant?.email}{a.phone ? `, ${a.phone}` : ""}</span></p>
                    <p className="text-sm text-ink-2">Applied {relativeTime(a.createdAt)}</p>
                    {a.coverLetter ? <p className="mt-2 whitespace-pre-line text-sm">{a.coverLetter}</p> : null}
                    {a.hasResume ? <a href={`${API_PUBLIC}/${a.id}`} className="mt-2 inline-block text-sm font-semibold underline">Download resume</a> : <p className="mt-2 text-sm text-ink-2">No resume attached</p>}
                  </div>
                  <form action={setApplicationStatus} className="flex items-center gap-2">
                    <input type="hidden" name="applicationId" value={a.id} />
                    <input type="hidden" name="listingId" value={listing.id} />
                    <label htmlFor={`as-${a.id}`} className="sr-only">Status</label>
                    <select id={`as-${a.id}`} name="status" defaultValue={a.status} className="h-10 rounded-xl border border-line bg-surface px-3 text-sm" disabled={a.status === "WITHDRAWN"}>
                      {APPLICATION_STATUSES.filter((s) => s !== "WITHDRAWN" || a.status === "WITHDRAWN").map((s) => <option key={s} value={s}>{enumText(s)}</option>)}
                    </select>
                    {a.status !== "WITHDRAWN" ? <button className="h-10 rounded-full border border-line px-4 text-sm font-semibold">Update</button> : null}
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-3"><EmptyState title="No applications yet" /></div>
          )}
        </section>
      ) : null}

      {listing.kind === "EVENT" ? (
        <section className="mt-10" aria-labelledby="att-h">
          <h2 id="att-h" className="text-xl font-bold">RSVPs ({attendees.filter((a) => a.status === "REGISTERED").reduce((s, a) => s + a.guests, 0)} people)</h2>
          {attendees.length ? (
            <ul className="mt-3 divide-y divide-line rounded-2xl border border-line bg-surface text-sm">
              {attendees.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                  <span><span className="font-semibold">{a.attendee.name ?? a.attendee.email}</span> <span className="text-ink-2">{a.attendee.email}, {a.guests} {a.guests === 1 ? "person" : "people"}</span></span>
                  <Badge tone={a.status === "REGISTERED" ? "leaf" : a.status === "WAITLISTED" ? "marigold" : "neutral"}>{enumText(a.status)}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-3"><EmptyState title="No RSVPs yet" /></div>
          )}
        </section>
      ) : null}

      <section className="mt-10" aria-labelledby="inq-h">
        <h2 id="inq-h" className="text-xl font-bold">Requests ({inquiries.length})</h2>
        {inquiries.length ? (
          <ul className="mt-3 space-y-3">
            {inquiries.map((i) => (
              <li key={i.id} className="grid gap-4 rounded-2xl border border-line bg-surface p-5 md:grid-cols-2">
                <div>
                  <p className="font-semibold">{i.requester?.name ?? "Customer"}</p>
                  <p className="text-sm text-ink-2">{i.requester?.email}{i.phone ? `, ${i.phone}` : ""}. Prefers {i.preferredContact.toLowerCase()}. {relativeTime(i.createdAt)}.</p>
                  <p className="mt-2 whitespace-pre-line">{i.message}</p>
                </div>
                <RespondForm inquiryId={i.id} currentStatus={i.status} existing={i.providerResponse} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-3"><EmptyState title="No requests yet">Requests customers send from this listing appear here.</EmptyState></div>
        )}
      </section>
    </div>
  );
}
