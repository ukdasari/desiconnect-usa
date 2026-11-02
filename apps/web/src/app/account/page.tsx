import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { markNotificationsRead } from "@/app/actions/profile";
import { AccountNav } from "@/components/account-nav";
import { DeleteAiHistory, ProfileForm } from "@/components/profile-forms";
import { Badge, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { enumText, relativeTime } from "@/lib/format";
import { getMe } from "@/lib/session";

export const metadata: Metadata = { title: "Your account" };

interface Notification { id: string; title: string; body: string; read: boolean; createdAt: string }

export default async function AccountPage() {
  const me = await getMe();
  if (!me) redirect("/login?next=/account");
  const notifications = (await api<Notification[]>("/me/notifications").catch(() => ({ data: [] as Notification[] }))).data;
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="container-page py-10">
      <PageHeader title={me.name ? `Namaste, ${me.name.split(" ")[0]}` : "Your account"} description={me.email}>
        {me.roles.filter((r) => r !== "CONSUMER").map((r) => <Badge key={r} tone="peacock">{enumText(r)}</Badge>)}
      </PageHeader>
      <AccountNav current="/account" />
      {me.suspended ? <p className="mt-6 rounded-2xl bg-kumkum-soft p-4 text-sm">Your account is suspended, so you can browse but not post or send requests.</p> : null}

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_24rem]">
        <section aria-labelledby="profile-h" className="rounded-3xl border border-line bg-surface p-6">
          <h2 id="profile-h" className="text-xl font-bold">Profile</h2>
          <div className="mt-4"><ProfileForm me={me} /></div>
        </section>
        <div className="space-y-6">
          <section aria-labelledby="notif-h" className="rounded-3xl border border-line bg-surface p-6">
            <div className="flex items-center justify-between">
              <h2 id="notif-h" className="text-xl font-bold">Updates {unread ? <span className="text-base font-semibold text-marigold-strong">({unread} new)</span> : null}</h2>
              {unread ? (
                <form action={markNotificationsRead}><button className="text-sm font-semibold underline">Mark all read</button></form>
              ) : null}
            </div>
            {notifications.length ? (
              <ul className="mt-3 divide-y divide-line">
                {notifications.slice(0, 12).map((n) => (
                  <li key={n.id} className="py-3">
                    <p className={n.read ? "font-medium" : "font-bold"}>{n.title}</p>
                    <p className="text-sm text-ink-2">{n.body}</p>
                    <p className="mt-0.5 text-xs text-ink-2">{relativeTime(n.createdAt)}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-ink-2">Replies from providers, RSVP confirmations and application updates will show up here.</p>
            )}
          </section>
          <section id="privacy" aria-labelledby="privacy-h" className="rounded-3xl border border-line bg-surface p-6">
            <h2 id="privacy-h" className="text-xl font-bold">Privacy</h2>
            <p className="mt-2 text-sm text-ink-2">Your contact details are shared only with providers you send a request or application to. Desi AI conversations are saved to your account until you delete them.</p>
            <div className="mt-4"><DeleteAiHistory /></div>
          </section>
        </div>
      </div>
    </div>
  );
}
