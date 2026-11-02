"use client";

import { useActionState, useState } from "react";
import {
  CATEGORIES,
  CREDENTIAL_TYPES,
  EMPLOYMENT_TYPES,
  INQUIRY_STATUSES,
  LANGUAGES,
  PROPERTY_TYPES,
  SALARY_PERIODS,
  TRANSACTION_TYPES,
  US_STATES,
  WORK_ARRANGEMENTS,
  getCategory,
  type ListingDetailDto,
} from "@desiconnect/contracts";
import { createListing, onboardProvider, respondToInquiry, submitCredential, updateListing } from "@/app/actions/provider";
import { initialState, type ActionState } from "@/lib/action-state-client";
import { enumText } from "@/lib/format";
import { FormMessage, SubmitButton } from "./forms";
import { Alert, Checkbox, Field, Input, Select, Textarea } from "./ui";

const e = (s: ActionState, k: string) => s.fieldErrors?.[k];
const v = (s: ActionState, k: string, fallback = "") => s.values?.[k] ?? fallback;

function StateSelect({ id, name = "state", value, state }: { id: string; name?: string; value?: string; state: ActionState }) {
  return (
    <Select id={id} name={name} defaultValue={v(state, name, value ?? "TX")} aria-invalid={e(state, name) ? true : undefined}>
      {US_STATES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
    </Select>
  );
}

function LanguagePicker({ name, selected, legend }: { name: string; selected: string[]; legend: string }) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold">{legend}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {LANGUAGES.map((l) => (
          <label key={l} className="cursor-pointer rounded-full border border-line px-3 py-1.5 text-sm has-[:checked]:border-peacock-2 has-[:checked]:bg-peacock-soft">
            <input type="checkbox" name={name} value={l} defaultChecked={selected.includes(l)} className="sr-only" />
            {l}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

// ---------------------------------------------------------------- onboarding

export function OnboardingForm({ defaultEmail }: { defaultEmail: string }) {
  const [state, action] = useActionState(onboardProvider, initialState);
  const serviceCategories = CATEGORIES.filter((c) => c.kind === "SERVICE");
  return (
    <form action={action} className="space-y-8">
      <FormMessage state={state} />
      <section className="space-y-4">
        <h2 className="text-lg font-bold">Your business</h2>
        <Field label="Business name" htmlFor="ob-name" error={e(state, "businessName")} required>
          <Input id="ob-name" name="businessName" required defaultValue={v(state, "businessName")} />
        </Field>
        <Field label="What you do" htmlFor="ob-desc" hint="Two or three sentences customers will read first." error={e(state, "description")} required>
          <Textarea id="ob-desc" name="description" required minLength={20} maxLength={3000} defaultValue={v(state, "description")} />
        </Field>
        <fieldset>
          <legend className="text-sm font-semibold">Categories <span className="text-kumkum">*</span></legend>
          <p className="text-sm text-ink-2">Choose up to five. Licensed categories need a license before you&rsquo;re verified.</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {serviceCategories.map((c) => (
              <label key={c.slug} className="flex cursor-pointer items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm has-[:checked]:border-peacock-2 has-[:checked]:bg-peacock-soft">
                <input type="checkbox" name="categorySlugs" value={c.slug} className="size-4 accent-[var(--peacock-2)]" />
                {c.name}
                {c.regulated ? <span className="ml-auto text-xs text-ink-2">license required</span> : null}
              </label>
            ))}
          </div>
          {e(state, "categorySlugs") ? <p className="mt-1 text-sm font-medium text-kumkum">{e(state, "categorySlugs")?.join(" ")}</p> : null}
        </fieldset>
        <LanguagePicker name="languages" selected={["English"]} legend="Languages you serve customers in" />
        {e(state, "languages") ? <p className="text-sm font-medium text-kumkum">{e(state, "languages")?.join(" ")}</p> : null}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold">Contact and service area</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Business email" htmlFor="ob-email" error={e(state, "email")} required>
            <Input id="ob-email" name="email" type="email" required defaultValue={v(state, "email", defaultEmail)} />
          </Field>
          <Field label="Business phone" htmlFor="ob-phone" error={e(state, "phone")} required>
            <Input id="ob-phone" name="phone" type="tel" required defaultValue={v(state, "phone")} />
          </Field>
          <Field label="Website (optional)" htmlFor="ob-web" error={e(state, "website")}>
            <Input id="ob-web" name="website" type="url" placeholder="https://" defaultValue={v(state, "website")} />
          </Field>
          <Field label="Street address (optional)" htmlFor="ob-addr" hint="Not shown publicly unless you choose to.">
            <Input id="ob-addr" name="addressLine" defaultValue={v(state, "addressLine")} />
          </Field>
          <Field label="City" htmlFor="ob-city" error={e(state, "city")} required>
            <Input id="ob-city" name="city" required defaultValue={v(state, "city")} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="State" htmlFor="ob-state"><StateSelect id="ob-state" state={state} /></Field>
            <Field label="ZIP" htmlFor="ob-zip" error={e(state, "zipCode")}>
              <Input id="ob-zip" name="zipCode" inputMode="numeric" maxLength={5} defaultValue={v(state, "zipCode")} />
            </Field>
          </div>
          <Field label="How far you travel" htmlFor="ob-radius">
            <Select id="ob-radius" name="serviceRadiusMiles" defaultValue={v(state, "serviceRadiusMiles", "25")}>
              {[0, 10, 25, 50, 100].map((m) => <option key={m} value={m}>{m === 0 ? "Customers come to me" : `Up to ${m} miles`}</option>)}
            </Select>
          </Field>
        </div>
      </section>
      <SubmitButton pendingText="Creating profile…">Create business profile</SubmitButton>
    </form>
  );
}

export function CredentialForm() {
  const [state, action] = useActionState(submitCredential, initialState);
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-3">
      <FormMessage state={state} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Type" htmlFor="cr-type">
          <Select id="cr-type" name="type" defaultValue={v(state, "type", "BUSINESS_LICENSE")}>
            {CREDENTIAL_TYPES.map((t) => <option key={t} value={t}>{enumText(t)}</option>)}
          </Select>
        </Field>
        <Field label="Issuing state" htmlFor="cr-state"><StateSelect id="cr-state" name="jurisdiction" state={state} /></Field>
        <Field label="License number" htmlFor="cr-num" error={e(state, "licenseNumber")}>
          <Input id="cr-num" name="licenseNumber" required defaultValue={v(state, "licenseNumber")} />
        </Field>
        <Field label="Expires (optional)" htmlFor="cr-exp">
          <Input id="cr-exp" name="expiresAt" type="date" defaultValue={v(state, "expiresAt")} />
        </Field>
      </div>
      <Field label="Issuing authority (optional)" htmlFor="cr-auth" hint="For example, State Bar of Texas or Texas Department of Insurance.">
        <Input id="cr-auth" name="issuingAuthority" defaultValue={v(state, "issuingAuthority")} />
      </Field>
      <SubmitButton variant="secondary" pendingText="Submitting…">Submit for verification</SubmitButton>
    </form>
  );
}

// ---------------------------------------------------------------- listing editor

const local = (iso: string | null | undefined) => {
  if (!iso) return "";
  // Show in Central time for the datetime-local input.
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(d);
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour") === "24" ? "00" : g("hour")}:${g("minute")}`;
};

export function ListingForm({ listing, defaultCategory, canPostServices }: { listing?: ListingDetailDto; defaultCategory?: string; canPostServices: boolean }) {
  const [state, action] = useActionState(listing ? updateListing : createListing, initialState);
  const initialCategory = listing ? (listing.subcategory?.slug ?? listing.category.slug) : (defaultCategory ?? "");
  const [category, setCategory] = useState(v(state, "categorySlug", initialCategory));
  const kind = getCategory(category)?.kind;
  const choosable = CATEGORIES.filter((c) => c.kind !== "RESOURCE");
  const blockedService = !listing && kind === "SERVICE" && !canPostServices;

  return (
    <form action={action} className="space-y-8">
      {listing ? <input type="hidden" name="id" value={listing.id} /> : null}
      <input type="hidden" name="kind" value={kind ?? ""} />
      <FormMessage state={state} />

      <section className="space-y-4">
        <Field label="Category" htmlFor="lf-cat" error={e(state, "categorySlug")} required>
          <Select id="lf-cat" name="categorySlug" value={category} onChange={(ev) => setCategory(ev.target.value)} disabled={!!listing} required>
            <option value="">Choose a category</option>
            {choosable.map((c) => (
              <optgroup key={c.slug} label={c.name}>
                {c.subcategories.map((s) => <option key={s.slug} value={s.slug}>{c.name}: {s.name}</option>)}
              </optgroup>
            ))}
          </Select>
        </Field>
        {blockedService ? (
          <Alert tone="warning" title="Service listings need a business profile">
            Create your business profile first so customers can see who they&rsquo;re contacting. <a href="/provider/onboarding">Create profile</a>
          </Alert>
        ) : null}
        <Field label={kind === "JOB" ? "Job title" : kind === "EVENT" ? "Event name" : "Title"} htmlFor="lf-title" error={e(state, "title")} required>
          <Input id="lf-title" name="title" required minLength={5} maxLength={120} defaultValue={v(state, "title", listing?.title)} />
        </Field>
        <Field label="Description" htmlFor="lf-desc" error={e(state, "description")} required>
          <Textarea id="lf-desc" name="description" rows={7} required minLength={20} maxLength={5000} defaultValue={v(state, "description", listing?.description)} />
        </Field>
      </section>

      {kind === "EVENT" ? (
        <section className="space-y-4">
          <h2 className="text-lg font-bold">Event details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Starts (Central time)" htmlFor="lf-start" error={e(state, "event.startAt")} required>
              <Input id="lf-start" name="startAt" type="datetime-local" required defaultValue={v(state, "startAt", local(listing?.event?.startAt))} />
            </Field>
            <Field label="Ends (optional)" htmlFor="lf-end" error={e(state, "event.endAt")}>
              <Input id="lf-end" name="endAt" type="datetime-local" defaultValue={v(state, "endAt", local(listing?.event?.endAt))} />
            </Field>
            <Field label="Venue" htmlFor="lf-venue" error={e(state, "event.venue")} required>
              <Input id="lf-venue" name="venue" required defaultValue={v(state, "venue", listing?.event?.venue)} />
            </Field>
            <Field label="Capacity (optional)" htmlFor="lf-cap" hint="RSVPs beyond this join a waitlist." error={e(state, "event.capacity")}>
              <Input id="lf-cap" name="capacity" type="number" min={1} defaultValue={v(state, "capacity", listing?.event?.capacity?.toString() ?? "")} />
            </Field>
            <Field label="Ticket link (optional)" htmlFor="lf-ticket" error={e(state, "event.ticketUrl")}>
              <Input id="lf-ticket" name="ticketUrl" type="url" placeholder="https://" defaultValue={v(state, "ticketUrl", listing?.event?.ticketUrl ?? "")} />
            </Field>
            <div className="flex items-end pb-2">
              <Checkbox name="isFree" label="Free to attend" defaultChecked={listing ? listing.event?.isFree : true} />
            </div>
          </div>
        </section>
      ) : null}

      {kind === "JOB" ? (
        <section className="space-y-4">
          <h2 className="text-lg font-bold">Job details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company" htmlFor="lf-company" error={e(state, "job.company")} required>
              <Input id="lf-company" name="company" required defaultValue={v(state, "company", listing?.job?.company)} />
            </Field>
            <Field label="Job type" htmlFor="lf-etype">
              <Select id="lf-etype" name="employmentType" defaultValue={v(state, "employmentType", listing?.job?.employmentType ?? "FULL_TIME")}>
                {EMPLOYMENT_TYPES.map((t) => <option key={t} value={t}>{enumText(t)}</option>)}
              </Select>
            </Field>
            <Field label="Work arrangement" htmlFor="lf-warr">
              <Select id="lf-warr" name="workArrangement" defaultValue={v(state, "workArrangement", listing?.job?.workArrangement ?? "ONSITE")}>
                {WORK_ARRANGEMENTS.map((t) => <option key={t} value={t}>{enumText(t)}</option>)}
              </Select>
            </Field>
            <Field label="Skills (comma separated)" htmlFor="lf-skills">
              <Input id="lf-skills" name="skills" placeholder="Java, Playwright, SQL" defaultValue={v(state, "skills", listing?.job?.skills.join(", "))} />
            </Field>
            <div className="grid grid-cols-3 gap-2 sm:col-span-2">
              <Field label="Pay from" htmlFor="lf-smin"><Input id="lf-smin" name="salaryMin" type="number" min={0} defaultValue={v(state, "salaryMin", listing?.job?.salaryMin?.toString() ?? "")} /></Field>
              <Field label="Pay to" htmlFor="lf-smax" error={e(state, "job.salaryMax")}><Input id="lf-smax" name="salaryMax" type="number" min={0} defaultValue={v(state, "salaryMax", listing?.job?.salaryMax?.toString() ?? "")} /></Field>
              <Field label="Per" htmlFor="lf-sper">
                <Select id="lf-sper" name="salaryPeriod" defaultValue={v(state, "salaryPeriod", listing?.job?.salaryPeriod ?? "YEAR")}>
                  {SALARY_PERIODS.map((t) => <option key={t} value={t}>{enumText(t)}</option>)}
                </Select>
              </Field>
            </div>
          </div>
        </section>
      ) : null}

      {kind === "PROPERTY" ? (
        <section className="space-y-4">
          <h2 className="text-lg font-bold">Property details</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Listing type" htmlFor="lf-tt">
              <Select id="lf-tt" name="transactionType" defaultValue={v(state, "transactionType", listing?.property?.transactionType ?? (category === "roommates" ? "ROOMMATE" : category === "for-sale" ? "SALE" : "RENT"))}>
                {TRANSACTION_TYPES.map((t) => <option key={t} value={t}>{({ RENT: "For rent", SALE: "For sale", ROOMMATE: "Room / roommate" })[t]}</option>)}
              </Select>
            </Field>
            <Field label="Property type" htmlFor="lf-pt">
              <Select id="lf-pt" name="propertyType" defaultValue={v(state, "propertyType", listing?.property?.propertyType ?? "HOUSE")}>
                {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{enumText(t)}</option>)}
              </Select>
            </Field>
            <Field label="Price (USD; monthly for rent)" htmlFor="lf-price" error={e(state, "property.price")} required>
              <Input id="lf-price" name="price" type="number" min={0} required defaultValue={v(state, "price", listing?.property?.price.toString() ?? "")} />
            </Field>
            <Field label="Bedrooms" htmlFor="lf-beds"><Input id="lf-beds" name="beds" type="number" min={0} step="1" defaultValue={v(state, "beds", listing?.property?.beds?.toString() ?? "")} /></Field>
            <Field label="Bathrooms" htmlFor="lf-baths"><Input id="lf-baths" name="baths" type="number" min={0} step="0.5" defaultValue={v(state, "baths", listing?.property?.baths?.toString() ?? "")} /></Field>
            <Field label="Square feet" htmlFor="lf-sqft"><Input id="lf-sqft" name="sqft" type="number" min={0} defaultValue={v(state, "sqft", listing?.property?.sqft?.toString() ?? "")} /></Field>
            <Field label="Available from" htmlFor="lf-avail"><Input id="lf-avail" name="availableFrom" type="date" defaultValue={v(state, "availableFrom", listing?.property?.availableFrom?.slice(0, 10) ?? "")} /></Field>
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-lg font-bold">Location and contact</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {kind !== "EVENT" ? (
            <Field label="Street address (optional)" htmlFor="lf-addr" hint="Only the city is shown publicly.">
              <Input id="lf-addr" name="addressLine" defaultValue={v(state, "addressLine", listing?.location.addressLine ?? "")} />
            </Field>
          ) : null}
          <Field label="City" htmlFor="lf-city" error={e(state, "city")} required>
            <Input id="lf-city" name="city" required defaultValue={v(state, "city", listing?.location.city)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="State" htmlFor="lf-state"><StateSelect id="lf-state" state={state} value={listing?.location.state} /></Field>
            <Field label="ZIP" htmlFor="lf-zip" error={e(state, "zipCode")}><Input id="lf-zip" name="zipCode" inputMode="numeric" maxLength={5} defaultValue={v(state, "zipCode", listing?.location.zipCode ?? "")} /></Field>
          </div>
          <Field label="Contact email" htmlFor="lf-email" hint="Defaults to your account email." error={e(state, "contactEmail")}>
            <Input id="lf-email" name="contactEmail" type="email" defaultValue={v(state, "contactEmail", listing?.contactEmail ?? "")} />
          </Field>
          <Field label="Contact phone (optional)" htmlFor="lf-phone" error={e(state, "contactPhone")}>
            <Input id="lf-phone" name="contactPhone" type="tel" defaultValue={v(state, "contactPhone", listing?.contactPhone ?? "")} />
          </Field>
          <Field label="Website (optional)" htmlFor="lf-web" error={e(state, "website")}>
            <Input id="lf-web" name="website" type="url" placeholder="https://" defaultValue={v(state, "website", listing?.website ?? "")} />
          </Field>
          {kind === "SERVICE" || kind === "EVENT" ? (
            <Field label={kind === "EVENT" ? "Ticket price text (optional)" : "Pricing (optional)"} htmlFor="lf-pricetext" hint={kind === "EVENT" ? "For example, $25 or $10 per child." : "For example, Consultation from $150."}>
              <Input id="lf-pricetext" name="priceText" maxLength={80} defaultValue={v(state, "priceText", listing?.priceText ?? "")} />
            </Field>
          ) : null}
          <Field label="Search tags (comma separated)" htmlFor="lf-tags">
            <Input id="lf-tags" name="tags" placeholder="H-1B, weekend appointments" defaultValue={v(state, "tags", listing?.tags.join(", "))} />
          </Field>
        </div>
        <LanguagePicker name="languages" selected={listing?.languages ?? ["English"]} legend="Languages" />
      </section>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
        {listing ? (
          <SubmitButton pendingText="Saving…">Save changes</SubmitButton>
        ) : (
          <>
            <SubmitButton name="intent" value="submit" pendingText="Submitting…">Submit for review</SubmitButton>
            <SubmitButton name="intent" value="draft" variant="secondary" pendingText="Saving…">Save as draft</SubmitButton>
          </>
        )}
        <p className="text-sm text-ink-2">
          {listing && listing.status === "PUBLISHED" ? "Changes to a live listing are reviewed before they appear." : "A moderator reviews new listings, usually within one business day."}
        </p>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- leads

export function RespondForm({ inquiryId, currentStatus, existing }: { inquiryId: string; currentStatus: string; existing: string | null }) {
  const [state, action] = useActionState(respondToInquiry, initialState);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="inquiryId" value={inquiryId} />
      <FormMessage state={state} />
      <Field label="Reply to the customer" htmlFor={`reply-${inquiryId}`} hint="They'll see this under My requests and get a notification.">
        <Textarea id={`reply-${inquiryId}`} name="providerResponse" rows={3} maxLength={2000} defaultValue={existing ?? ""} />
      </Field>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Status" htmlFor={`status-${inquiryId}`}>
          <Select id={`status-${inquiryId}`} name="status" defaultValue={currentStatus} className="w-44">
            {INQUIRY_STATUSES.map((s) => <option key={s} value={s}>{enumText(s)}</option>)}
          </Select>
        </Field>
        <SubmitButton variant="secondary" pendingText="Saving…">Save</SubmitButton>
      </div>
    </form>
  );
}
