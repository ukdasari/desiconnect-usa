"use client";

import { useActionState } from "react";
import { LANGUAGES, US_STATES, type MeDto } from "@desiconnect/contracts";
import { deleteAccount, deleteAiHistory, updateProfile } from "@/app/actions/profile";
import { initialState } from "@/lib/action-state-client";
import { FormMessage, SubmitButton } from "./forms";
import { Field, Input, Select } from "./ui";

export function ProfileForm({ me }: { me: MeDto }) {
  const [state, action] = useActionState(updateProfile, initialState);
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="p-name" error={state.fieldErrors?.name}>
          <Input id="p-name" name="name" defaultValue={me.name ?? ""} autoComplete="name" />
        </Field>
        <Field label="Phone" htmlFor="p-phone" error={state.fieldErrors?.phone}>
          <Input id="p-phone" name="phone" type="tel" defaultValue={me.phone ?? ""} autoComplete="tel" />
        </Field>
        <Field label="City" htmlFor="p-city" hint="Used as your default search location." error={state.fieldErrors?.city}>
          <Input id="p-city" name="city" defaultValue={me.city ?? ""} autoComplete="address-level2" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="State" htmlFor="p-state">
            <Select id="p-state" name="state" defaultValue={me.state ?? ""}>
              <option value="">Select</option>
              {US_STATES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
            </Select>
          </Field>
          <Field label="ZIP" htmlFor="p-zip" error={state.fieldErrors?.zipCode}>
            <Input id="p-zip" name="zipCode" inputMode="numeric" maxLength={5} defaultValue={me.zipCode ?? ""} autoComplete="postal-code" />
          </Field>
        </div>
      </div>
      <fieldset>
        <legend className="text-sm font-semibold">Languages you&rsquo;re comfortable with</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {LANGUAGES.map((l) => (
            <label key={l} className="cursor-pointer rounded-full border border-line px-3 py-1.5 text-sm has-[:checked]:border-peacock-2 has-[:checked]:bg-peacock-soft">
              <input type="checkbox" name="preferredLanguages" value={l} defaultChecked={me.preferredLanguages.includes(l)} className="sr-only" />
              {l}
            </label>
          ))}
        </div>
      </fieldset>
      <SubmitButton pendingText="Saving…">Save profile</SubmitButton>
    </form>
  );
}

export function DeleteAiHistory() {
  const [state, action] = useActionState(deleteAiHistory, initialState);
  return (
    <form action={action} className="space-y-3">
      <FormMessage state={state} />
      <SubmitButton variant="secondary" pendingText="Deleting…">Delete Desi AI history</SubmitButton>
    </form>
  );
}

export function DeleteAccount() {
  const [state, action] = useActionState(deleteAccount, initialState);
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <Field label="Type DELETE to confirm" htmlFor="del-confirm" error={state.fieldErrors?.confirm}>
        <Input id="del-confirm" name="confirm" autoComplete="off" autoCapitalize="characters" spellCheck={false} className="max-w-xs" required pattern="DELETE" />
      </Field>
      <SubmitButton variant="danger" pendingText="Deleting your account…">Delete my account</SubmitButton>
    </form>
  );
}
