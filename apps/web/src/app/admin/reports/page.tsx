import type { Metadata } from "next";
import Link from "next/link";
import type { ReportDto } from "@desiconnect/contracts";
import { AdminNav, ResolveReportForm } from "@/components/admin";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-guard";
import { enumText, relativeTime } from "@/lib/format";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin("/admin/reports");
  const { status = "OPEN" } = await searchParams;
  const reports = (await api<ReportDto[]>("/admin/reports", { query: { status } })).data;
  return (
    <div className="container-page py-10">
      <PageHeader title="Reports" description="Listings, providers and reviews flagged by members." />
      <AdminNav current="/admin/reports" />
      <div className="mt-6 flex gap-2 text-sm">
        {["OPEN", "RESOLVED", "DISMISSED"].map((s) => (
          <Link key={s} href={`/admin/reports?status=${s}`} aria-current={s === status ? "page" : undefined} className="rounded-full border border-line px-3 py-1.5 font-medium aria-[current=page]:border-peacock aria-[current=page]:bg-peacock aria-[current=page]:text-white">
            {enumText(s)}
          </Link>
        ))}
      </div>
      {reports.length ? (
        <ul className="mt-6 divide-y divide-line rounded-2xl border border-line bg-surface">
          {reports.map((r) => (
            <li key={r.id} className="grid gap-4 p-5 lg:grid-cols-[1fr_auto]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="kumkum">{enumText(r.reason)}</Badge>
                  <Badge>{enumText(r.targetType)}</Badge>
                </div>
                <p className="mt-2 font-semibold">
                  {r.targetType === "LISTING" ? <Link href={`/admin/listing-redirect/${r.targetId}`} className="hover:underline">{r.targetTitle ?? r.targetId}</Link> : r.targetType === "PROVIDER" ? <Link href={`/providers/${r.targetId}`} className="hover:underline">{r.targetTitle ?? r.targetId}</Link> : r.targetId}
                </p>
                <p className="text-sm text-ink-2">Reported by {r.reporterEmail}, {relativeTime(r.createdAt)}</p>
                {r.details ? <p className="mt-2 text-sm">{r.details}</p> : null}
              </div>
              {r.status === "OPEN" ? <ResolveReportForm id={r.id} canArchive={r.targetType === "LISTING"} /> : <Badge>{enumText(r.status)}</Badge>}
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-6"><EmptyState title={`No ${status.toLowerCase()} reports`} /></div>
      )}
    </div>
  );
}
