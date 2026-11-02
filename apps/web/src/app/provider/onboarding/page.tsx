import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/provider-forms";
import { PageHeader } from "@/components/ui";
import { getMe } from "@/lib/session";

export const metadata: Metadata = { title: "List your business" };

export default async function OnboardingPage() {
  const me = await getMe();
  if (!me) redirect("/login?next=/provider/onboarding");
  if (me.providerId) redirect("/provider");
  return (
    <div className="container-page max-w-3xl py-10">
      <PageHeader title="List your business" description="Tell customers who you are and where you work. An administrator reviews every profile before it shows a Verified badge." />
      <div className="mt-8 rounded-3xl border border-line bg-surface p-6 md:p-8">
        <OnboardingForm defaultEmail={me.email} />
      </div>
    </div>
  );
}
