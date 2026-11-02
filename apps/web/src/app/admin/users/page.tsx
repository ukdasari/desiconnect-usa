import type { Metadata } from "next";
import { setSuspended } from "@/app/actions/admin";
import { AdminNav } from "@/components/admin";
import { Badge, Button, Input, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-guard";
import { enumText, formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Users" };

interface AdminUser { id: string; email: string; name: string | null; roles: string[]; status: string; isDemo: boolean; createdAt: string }

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const me = await requireAdmin("/admin/users");
  const { q = "" } = await searchParams;
  const users = (await api<AdminUser[]>("/admin/users", { query: { q } })).data;
  return (
    <div className="container-page py-10">
      <PageHeader title="Users" description="Search accounts and suspend those that break the community guidelines. Every change is logged." />
      <AdminNav current="/admin/users" />
      <form className="mt-6 flex max-w-md gap-2" role="search">
        <label htmlFor="uq" className="sr-only">Search users</label>
        <Input id="uq" name="q" defaultValue={q} placeholder="Name or email" />
        <Button type="submit" variant="secondary">Search</Button>
      </form>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-ink-2">
            <tr><th className="px-4 py-3 font-semibold">Account</th><th className="px-4 py-3 font-semibold">Roles</th><th className="px-4 py-3 font-semibold">Joined</th><th className="px-4 py-3 font-semibold">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3"><p className="font-semibold">{u.name ?? "No name"} {u.isDemo ? <Badge>Demo</Badge> : null}</p><p className="text-ink-2">{u.email}</p></td>
                <td className="px-4 py-3">{u.roles.map(enumText).join(", ")}</td>
                <td className="px-4 py-3 text-ink-2">{formatDate(u.createdAt)}</td>
                <td className="px-4 py-3">
                  {u.id === me.id ? (
                    <span className="text-ink-2">You</span>
                  ) : (
                    <form action={setSuspended} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={u.id} />
                      <input type="hidden" name="suspended" value={u.status === "SUSPENDED" ? "false" : "true"} />
                      <Badge tone={u.status === "SUSPENDED" ? "kumkum" : "leaf"}>{enumText(u.status)}</Badge>
                      <button className="text-sm font-semibold underline">{u.status === "SUSPENDED" ? "Reinstate" : "Suspend"}</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
