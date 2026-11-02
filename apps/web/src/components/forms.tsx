"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { REPORT_REASONS } from "@desiconnect/contracts";
import { applyToJob, registerForEvent, reportListing, sendInquiry, submitReview } from "@/app/actions/engagement";
import { initialState, type ActionState } from "@/lib/action-state-client";
import { enumText } from "@/lib/format";
import { Alert, Button, Checkbox, Field, Input, Select, Textarea } from "./ui";

export function SubmitButton({ children, pendingText, variant = "primary", className, name, value }: { children: React.ReactNode; pendingText?: string; variant?: "primary" | "secondary" | "danger" | "ghost"; className?: string; name?: string; value?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending} className={className} name={name} value={value}>
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {pending ? (pendingText ?? "Working…") : children}
    </Button>
  );
}

export function FormMessage({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return <Alert tone={state.ok ? "success" : "danger"}>{state.message}</Alert>;
}

const err = (state: ActionState, key: string) => state.fieldErrors?.[key];
const invalid = (state: ActionState, key: string) => (state.fieldErrors?.[key] ? true : undefined);

function SignInPrompt({ back, verb }: { back: string; verb: string }) {
  return (
    <p className="text-sm text-ink-2">
      <Link href={`/login?next=${encodeURIComponent(back)}`} className="font-semibold text-ink underline">Sign in</Link> or{" "}
      <Link href={`/register?next=${encodeURIComponent(back)}`} className="font-semibold text-ink underline">create a free account</Link> to {verb}.
    </p>
  );
}

export function InquiryForm({ listingId, back, signedIn, ctaLabel, placeholder }: { listingId: string; back: string; signedIn: boolean; ctaLabel: string; placeholder: string }) {
  const [state, action] = useActionState(sendInquiry, initialState);
  if (!signedIn) return <SignInPrompt back={back} verb="send a request" />;
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="listingId" value={listingId} />
      <input type="hidden" name="back" value={back} />
      <FormMessage state={state} />
      <Field label="What do you need?" htmlFor="inq-message" error={err(state, "message")} required>
        <Textarea id="inq-message" name="message" required minLength={10} maxLength={2000} placeholder={placeholder} defaultValue={state.values?.message} aria-invalid={invalid(state, "message")} aria-describedby="inq-message-error" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Best way to reach you" htmlFor="inq-contact">
          <Select id="inq-contact" name="preferredContact" defaultValue={state.values?.preferredContact ?? "EMAIL"}>
            <option value="EMAIL">Email</option>
            <option value="PHONE">Phone</option>
            <option value="EITHER">Either</option>
          </Select>
        </Field>
        <Field label="Phone (optional)" htmlFor="inq-phone" error={err(state, "phone")}>
          <Input id="inq-phone" name="phone" type="tel" autoComplete="tel" defaultValue={state.values?.phone} aria-invalid={invalid(state, "phone")} />
        </Field>
      </div>
      <Checkbox
        name="consentToShare"
        required
        label={<>Share my name, email{state.values?.phone ? " and phone" : " and phone (if given)"} with this provider so they can reply. <span className="text-kumkum">*</span></>}
      />
      {err(state, "consentToShare") ? <p className="text-sm font-medium text-kumkum">{err(state, "consentToShare")?.join(" ")}</p> : null}
      <SubmitButton pendingText="Sending…" className="w-full">{ctaLabel}</SubmitButton>
    </form>
  );
}

export function RsvpForm({ listingId, back, signedIn, full }: { listingId: string; back: string; signedIn: boolean; full: boolean }) {
  const [state, action] = useActionState(registerForEvent, initialState);
  if (!signedIn) return <SignInPrompt back={back} verb="RSVP" />;
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="listingId" value={listingId} />
      <input type="hidden" name="back" value={back} />
      <FormMessage state={state} />
      <Field label="How many people, including you?" htmlFor="rsvp-guests">
        <Select id="rsvp-guests" name="guests" defaultValue="1">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
        </Select>
      </Field>
      <SubmitButton pendingText="Saving…" className="w-full">{full ? "Join the waitlist" : "RSVP"}</SubmitButton>
    </form>
  );
}

export function ApplyForm({ listingId, back }: { listingId: string; back: string }) {
  const [state, action] = useActionState(applyToJob, initialState);
  if (state.ok) {
    return (
      <div className="space-y-4">
        <FormMessage state={state} />
        <Link href="/account/requests" className="font-semibold underline">Go to My requests</Link>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-5" encType="multipart/form-data">
      <input type="hidden" name="listingId" value={listingId} />
      <input type="hidden" name="back" value={back} />
      <FormMessage state={state} />
      <Field label="Resume" htmlFor="apply-resume" hint="PDF or Word (.docx), up to 5 MB. Only this employer can open it." error={err(state, "resume")}>
        <input id="apply-resume" name="resume" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="block w-full rounded-xl border border-dashed border-line bg-surface p-3 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-peacock file:px-4 file:py-2 file:font-semibold file:text-white" aria-describedby="apply-resume-hint" />
      </Field>
      <Field label="Cover note (optional)" htmlFor="apply-cover" error={err(state, "coverLetter")}>
        <Textarea id="apply-cover" name="coverLetter" maxLength={4000} rows={6} placeholder="A few lines about your experience and why this role fits." defaultValue={state.values?.coverLetter} />
      </Field>
      <Field label="Phone (optional)" htmlFor="apply-phone" error={err(state, "phone")}>
        <Input id="apply-phone" name="phone" type="tel" autoComplete="tel" defaultValue={state.values?.phone} className="sm:max-w-xs" />
      </Field>
      <Checkbox name="consentToShare" required label={<>Share my application, resume and contact details with this employer. <span className="text-kumkum">*</span></>} />
      {err(state, "consentToShare") ? <p className="text-sm font-medium text-kumkum">{err(state, "consentToShare")?.join(" ")}</p> : null}
      <SubmitButton pendingText="Submitting…">Submit application</SubmitButton>
    </form>
  );
}

export function ReportForm({ listingId, back }: { listingId: string; back: string }) {
  const [state, action] = useActionState(reportListing, initialState);
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="listingId" value={listingId} />
      <input type="hidden" name="back" value={back} />
      <FormMessage state={state} />
      <Field label="What's wrong?" htmlFor="report-reason">
        <Select id="report-reason" name="reason" defaultValue="MISLEADING">
          {REPORT_REASONS.map((r) => <option key={r} value={r}>{enumText(r)}</option>)}
        </Select>
      </Field>
      <Field label="Details (optional)" htmlFor="report-details">
        <Textarea id="report-details" name="details" rows={3} maxLength={2000} />
      </Field>
      <SubmitButton variant="secondary" pendingText="Sending…">Send report</SubmitButton>
    </form>
  );
}

export function ReviewForm({ listingId, back }: { listingId: string; back: string }) {
  const [state, action] = useActionState(submitReview, initialState);
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="listingId" value={listingId} />
      <input type="hidden" name="back" value={back} />
      <FormMessage state={state} />
      <fieldset>
        <legend className="text-sm font-semibold">Rating</legend>
        <div className="mt-1.5 flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="flex cursor-pointer items-center gap-1 rounded-full border border-line px-3 py-1 text-sm has-[:checked]:border-marigold has-[:checked]:bg-haldi">
              <input type="radio" name="rating" value={n} className="sr-only" required defaultChecked={n === 5} />
              {n}
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="Your experience" htmlFor="review-body" error={err(state, "body")}>
        <Textarea id="review-body" name="body" rows={3} minLength={10} maxLength={2000} defaultValue={state.values?.body} />
      </Field>
      <SubmitButton variant="secondary" pendingText="Sending…">Submit review</SubmitButton>
    </form>
  );
}
