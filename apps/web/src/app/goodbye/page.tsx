import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { ButtonLink } from "@/components/ui";

export const metadata: Metadata = { title: "Account deleted" };

export default function GoodbyePage() {
  return (
    <div className="container-page max-w-2xl py-16">
      <CheckCircle2 className="size-10 text-leaf" aria-hidden />
      <h1 className="mt-4 text-3xl font-bold">Your account has been deleted</h1>
      <p className="mt-3 text-ink-2">
        We removed your profile and personal data and signed you out. Reviews you wrote stay up without your name. If you signed in
        through another provider (like Google or Microsoft), that account is separate and you can delete it there.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink href="/">Back to DesiConnect</ButtonLink>
        <ButtonLink href="/register" variant="secondary">Create a new account</ButtonLink>
      </div>
    </div>
  );
}
