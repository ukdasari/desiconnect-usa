"use client";

import { useActionState, useState } from "react";
import { ALERT_TOPICS, US_STATES, getAlertTopic } from "@desiconnect/contracts";
import { createAlert, unsubscribeAlerts } from "@/app/actions/alerts";
import { initialState } from "@/lib/action-state-client";
import { FormMessage, SubmitButton } from "./forms";
import { Field, Input, Select } from "./ui";

const err = (s: { fieldErrors?: Record<string, string[] | undefined> }, k: string) => s.fieldErrors?.[k]?.[0];

export function NewAlertForm({ defaults }: { defaults: { topic?: string; city?: string; state?: string; zip?: string } }) {
  const [state, action] = useActionState(createAlert, initialState);
  const [topic, setTopic] = useState(getAlertTopic(defaults.topic ?? "")?.key ?? "events");
  const t = getAlertTopic(topic)!;
  const v = (k: string, d?: string) => state.values?.[k] ?? d ?? "";
  return (
    <form action={action} className="space-y-5" key={state.ok ? "done" : "form"}>
      <FormMessage state={state} />
      <fieldset>
        <legend className="text-sm font-semibold">What should we tell you about?</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ALERT_TOPICS.map((x) => (
            <label key={x.key} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-surface p-3 has-[:checked]:border-peacock has-[:checked]:bg-peacock-soft">
              <input type="radio" name="topic" value={x.key} checked={topic === x.key} onChange={() => setTopic(x.key)} className="mt-1 size-4 accent-[var(--peacock-2)]" />
              <span>
                <span className="block font-semibold">{x.label}</span>
                <span className="block text-xs text-ink-2">{x.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-sm font-semibold">Where? <span className="font-normal text-ink-2">(leave empty for anywhere)</span></legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_6rem_7rem_10rem]">
          <Input name="city" aria-label="City" placeholder="City, e.g. Plano" defaultValue={v("city", defaults.city)} />
          <Select name="state" aria-label="State" defaultValue={v("state", defaults.state ?? (defaults.city ? "TX" : ""))}>
            <option value="">State</option>
            {US_STATES.map(([code]) => <option key={code} value={code}>{code}</option>)}
          </Select>
          <Input name="zip" aria-label="ZIP code" inputMode="numeric" maxLength={5} placeholder="ZIP" defaultValue={v("zip", defaults.zip)} />
          <Select name="radiusMiles" aria-label="Distance" defaultValue={v("radiusMiles", "25")}>
            {[5, 10, 25, 50, 100].map((m) => <option key={m} value={m}>Within {m} miles</option>)}
          </Select>
        </div>
        {err(state, "zip") || err(state, "state") || err(state, "city") ? (
          <p className="mt-1 text-sm text-kumkum">{err(state, "zip") ?? err(state, "state") ?? err(state, "city")}</p>
        ) : null}
      </fieldset>
      <Field label="How often?" htmlFor="alert-frequency" hint={t.defaultFrequency === "INSTANT" ? "Instant suits time-sensitive things like events and jobs." : "A weekly digest arrives on Sunday mornings, only when there's something new."}>
        <Select id="alert-frequency" name="frequency" key={topic} defaultValue={t.defaultFrequency} className="sm:max-w-xs">
          <option value="INSTANT">As soon as it&apos;s listed</option>
          <option value="WEEKLY">Weekly digest</option>
        </Select>
      </Field>
      <SubmitButton pendingText="Saving…">Create alert</SubmitButton>
    </form>
  );
}

export function UnsubscribeForm({ token }: { token: string }) {
  const [state, action] = useActionState(unsubscribeAlerts, initialState);
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <FormMessage state={state} />
      <SubmitButton>Unsubscribe from alert emails</SubmitButton>
    </form>
  );
}
