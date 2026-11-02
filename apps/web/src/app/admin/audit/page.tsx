import type { Metadata } from "next";
import Link from "next/link";
import type { AuditLogDto } from "@desiconnect/contracts";
import { AdminNav } from "@/components/admin";
import { PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-guard";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Audit log" };

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireAdmin("/admin/audit");
  const page = Math.max(1, Number((await searchParams).page ?? 1) || 1);
  const res = await api<AuditLogDto[]>("/admin/audit-logs", { query: { page, pageSize: 50 } });
  const meta = res.meta!;
  return (
    <div className="container-page py-10">
      <PageHeader title="Audit log" description="Every moderation decision, suspension, credential check and resume download, newest first." />
      <AdminNav current="/admin/audit" />
      <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-ink-2">
            <tr><th className="px-4 py-3 font-semibold">When</th><th className="px-4 py-3 font-semibold">Who</th><th className="px-4 py-3 font-semibold">Action</th><th className="px-4 py-3 font-semibold">Resource</th><th className="px-4 py-3 font-semibold">Details</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {res.data.map((a) => (
              <tr key={a.id} className="align-top">
                <td className="whitespace-nowrap px-4 py-3 text-ink-2">{formatDate(a.createdAt, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</td>
                <td className="px-4 py-3">{a.actorEmail ?? "System"}</td>
                <td className="px-4 py-3 font-semibold">{a.action}</td>
                <td className="px-4 py-3 text-ink-2">{a.resourceType} {a.resourceId?.slice(0, 8)}</td>
                <td className="px-4 py-3 text-ink-2">{a.metadata ? Object.entries(a.metadata).filter(([, v]) => v !== null).map(([k, v]) => `${k}: ${String(v)}`).join(", ") : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <nav aria-label="Pagination" className="mt-4 flex justify-between text-sm">
        {page > 1 ? <Link href={`/admin/audit?page=${page - 1}`} className="font-semibold underline">Newer</Link> : <span />}
        <span className="text-ink-2">Page {meta.page} of {meta.totalPages}</span>
        {page < meta.totalPages ? <Link href={`/admin/audit?page=${page + 1}`} className="font-semibold underline">Older</Link> : <span />}
      </nav>
    </div>
  );
}
