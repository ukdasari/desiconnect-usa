"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { moderate, resolveReport } from "@/app/actions/admin";
import { initialState } from "@/lib/action-state-client";
import { cn } from "@/lib/cn";
import { FormMessage, SubmitButton } from "./forms";
import { Checkbox, Input, Select } from "./ui";

/** Approve / reject control. Rejection requires a reason that the owner will see. */
export function DecisionForm({ target, id }: { target: "listing" | "provider" | "credential" | "review" | "claim"; id: string }) {
  const [state, action] = useActionState(moderate, initialState);
  const [rejecting, setRejecting] = useState(false);
  if (state.ok) return <p className="text-sm font-semibold text-leaf" role="status">{state.message}</p>;
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="target" value={target} />
      <input type="hidden" name="id" value={id} />
      <FormMessage state={state} />
      {rejecting ? (
        <div className="space-y-2">
          <label htmlFor={`reason-${id}`} className="block text-sm font-semibold">Reason (shown to the owner)</label>
          <Input id={`reason-${id}`} name="reason" required minLength={5} placeholder="For example, license number doesn't match state records" />
          <div className="flex gap-2">
            <SubmitButton name="decision" value="REJECT" variant="danger" pendingText="Rejecting…">Reject</SubmitButton>
            <button type="button" onClick={() => setRejecting(false)} className="px-3 text-sm font-semibold text-ink-2">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <SubmitButton name="decision" value="APPROVE" pendingText="Approving…">Approve</SubmitButton>
          <button type="button" onClick={() => setRejecting(true)} className="inline-flex h-11 items-center rounded-full border border-line px-5 font-semibold hover:border-kumkum hover:text-kumkum">Reject</button>
        </div>
      )}
    </form>
  );
}

export function ResolveReportForm({ id, canArchive }: { id: string; canArchive: boolean }) {
  const [state, action] = useActionState(resolveReport, initialState);
  if (state.ok) return <p className="text-sm font-semibold text-leaf" role="status">{state.message}</p>;
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <FormMessage state={state} />
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={`rs-${id}`} className="sr-only">Outcome</label>
        <Select id={`rs-${id}`} name="status" defaultValue="RESOLVED" className="w-40">
          <option value="RESOLVED">Resolved</option>
          <option value="DISMISSED">Dismissed</option>
        </Select>
        <label htmlFor={`rn-${id}`} className="sr-only">Note</label>
        <Input id={`rn-${id}`} name="resolutionNote" placeholder="Internal note" className="w-56" />
        <SubmitButton variant="secondary" pendingText="Saving…">Close report</SubmitButton>
      </div>
      {canArchive ? <Checkbox name="archiveTarget" label="Also archive the listing" /> : null}
    </form>
  );
}

const ADMIN_LINKS = [
  { href: "/admin", label: "Review queue" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/audit", label: "Audit log" },
];

export function AdminNav({ current }: { current: string }) {
  return (
    <nav aria-label="Admin" className="mt-6 flex gap-1 overflow-x-auto border-b border-line">
      {ADMIN_LINKS.map((l) => (
        <Link key={l.href} href={l.href} aria-current={current === l.href ? "page" : undefined}
          className={cn("-mb-px shrink-0 border-b-2 px-4 py-2.5 text-sm font-semibold", current === l.href ? "border-marigold text-ink" : "border-transparent text-ink-2 hover:text-ink")}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
