"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, register } from "@/app/actions/auth";
import { initialState } from "@/lib/action-state-client";
import { FormMessage, SubmitButton } from "./forms";
import { Checkbox, Field, Input } from "./ui";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(login, initialState);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <FormMessage state={state} />
      <Field label="Email" htmlFor="login-email" error={state.fieldErrors?.email}>
        <Input id="login-email" name="email" type="email" autoComplete="email" required defaultValue={state.values?.email} />
      </Field>
      <Field label="Password" htmlFor="login-password" error={state.fieldErrors?.password}>
        <Input id="login-password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <SubmitButton pendingText="Signing in…" className="w-full">Sign in</SubmitButton>
      <p className="text-center text-sm text-ink-2">
        New here? <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-ink underline">Create an account</Link>
      </p>
    </form>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const [state, action] = useActionState(register, initialState);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <FormMessage state={state} />
      <Field label="Your name" htmlFor="reg-name" error={state.fieldErrors?.name}>
        <Input id="reg-name" name="name" autoComplete="name" required minLength={2} defaultValue={state.values?.name} aria-invalid={state.fieldErrors?.name ? true : undefined} />
      </Field>
      <Field label="Email" htmlFor="reg-email" error={state.fieldErrors?.email}>
        <Input id="reg-email" name="email" type="email" autoComplete="email" required defaultValue={state.values?.email} aria-invalid={state.fieldErrors?.email ? true : undefined} />
      </Field>
      <Field label="Password" htmlFor="reg-password" hint="At least 8 characters." error={state.fieldErrors?.password}>
        <Input id="reg-password" name="password" type="password" autoComplete="new-password" required minLength={8} aria-invalid={state.fieldErrors?.password ? true : undefined} />
      </Field>
      <Checkbox name="terms" required label="I agree to the Terms of Use and Privacy Policy." />
      <SubmitButton pendingText="Creating account…" className="w-full">Create account</SubmitButton>
      <p className="text-center text-sm text-ink-2">
        Already have an account? <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-ink underline">Sign in</Link>
      </p>
    </form>
  );
}
