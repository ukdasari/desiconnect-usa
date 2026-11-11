import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BellRing, Mail, Smartphone } from "lucide-react";
import type { AlertDto, NotificationSettingsDto } from "@desiconnect/contracts";
import { deleteAlert, setAlertFrequency, setNotificationChannel } from "@/app/actions/alerts";
import { AccountNav } from "@/components/account-nav";
import { NewAlertForm } from "@/components/alert-forms";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { getMe } from "@/lib/session";

export const metadata: Metadata = { title: "Alerts" };

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function AlertsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const me = await getMe();
  if (!me) redirect(`/login?next=${encodeURIComponent("/account/alerts")}`);
  const [alerts, settings] = await Promise.all([
    api<AlertDto[]>("/me/alerts").then((r) => r.data),
    api<NotificationSettingsDto>("/me/notification-settings").then((r) => r.data),
  ]);
  const defaults = { topic: one(params.topic), city: one(params.city) || (me.city ?? ""), state: one(params.state) || (me.state ?? ""), zip: one(params.zip) };

  return (
    <div className="container-page py-10">
      <PageHeader title="Alerts" description="Hear about new events, jobs, restaurants and more near you, by email, phone and here on DesiConnect." />
      <AccountNav current="/account/alerts" />

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-8">
          <section aria-labelledby="mine-h">
            <h2 id="mine-h" className="text-lg font-bold">Your alerts</h2>
            {alerts.length ? (
              <ul className="mt-3 divide-y divide-line rounded-3xl border border-line bg-surface">
                {alerts.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center gap-3 p-4">
                    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-haldi text-marigold-strong" aria-hidden>
                      <BellRing className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{a.topicLabel}</p>
                      <p className="text-sm text-ink-2">{a.locationLabel ? `Within ${a.radiusMiles} miles of ${a.locationLabel}` : "Anywhere"}</p>
                    </div>
                    <form action={setAlertFrequency} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="frequency" value={a.frequency === "INSTANT" ? "WEEKLY" : "INSTANT"} />
                      <Badge tone={a.frequency === "INSTANT" ? "marigold" : "peacock"}>{a.frequency === "INSTANT" ? "Instant" : "Weekly digest"}</Badge>
                      <button type="submit" className="text-sm text-ink-2 underline hover:text-ink">
                        Switch to {a.frequency === "INSTANT" ? "weekly" : "instant"}
                      </button>
                    </form>
                    <form action={deleteAlert}>
                      <input type="hidden" name="id" value={a.id} />
                      <button type="submit" className="text-sm font-semibold text-kumkum hover:underline" aria-label={`Remove ${a.topicLabel} alert`}>
                        Remove
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-3">
                <EmptyState title="No alerts yet">Create one below, or use &ldquo;Get alerts&rdquo; on the Restaurants, Attorneys, Events and Jobs pages.</EmptyState>
              </div>
            )}
          </section>

          <section aria-labelledby="new-h" id="new" className="rounded-3xl border border-line bg-surface p-6 md:p-8">
            <h2 id="new-h" className="text-lg font-bold">New alert</h2>
            <div className="mt-4">
              <NewAlertForm defaults={defaults} />
            </div>
          </section>
        </div>

        <aside aria-labelledby="channels-h" className="h-fit rounded-3xl border border-line bg-surface p-5">
          <h2 id="channels-h" className="font-bold">How we reach you</h2>
          <p className="mt-1 text-sm text-ink-2">Alerts always appear under the bell here. Choose where else they go.</p>
          <ul className="mt-4 space-y-3">
            {[
              { field: "alertEmails", on: settings.alertEmails, icon: Mail, label: "Email", hint: settings.email },
              { field: "alertPush", on: settings.alertPush, icon: Smartphone, label: "Phone notifications", hint: "From the DesiConnect app" },
            ].map((c) => (
              <li key={c.field}>
                <form action={setNotificationChannel} className="flex items-center gap-3">
                  <input type="hidden" name="field" value={c.field} />
                  <input type="hidden" name="value" value={String(!c.on)} />
                  <c.icon className="size-4 shrink-0 text-ink-2" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{c.label}</span>
                    <span className="block truncate text-xs text-ink-2">{c.hint}</span>
                  </span>
                  <button
                    type="submit"
                    role="switch"
                    aria-checked={c.on}
                    aria-label={`${c.label} alerts`}
                    className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${c.on ? "bg-leaf" : "bg-line"}`}
                  >
                    <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${c.on ? "left-[1.375rem]" : "left-0.5"}`} />
                  </button>
                </form>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-ink-2">Account messages, like replies to your requests, are always sent.</p>
        </aside>
      </div>
    </div>
  );
}
