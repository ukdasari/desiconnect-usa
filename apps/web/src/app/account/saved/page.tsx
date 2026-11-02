import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ListingSummaryDto } from "@desiconnect/contracts";
import { AccountNav } from "@/components/account-nav";
import { ListingRow } from "@/components/listing";
import { ButtonLink, EmptyState, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { getMe } from "@/lib/session";

export const metadata: Metadata = { title: "Saved" };

export default async function SavedPage() {
  const me = await getMe();
  if (!me) redirect("/login?next=/account/saved");
  const saved = (await api<ListingSummaryDto[]>("/me/favorites")).data;
  return (
    <div className="container-page py-10">
      <PageHeader title="Saved" description="Listings you've saved. Tap the heart on any listing to add or remove it." />
      <AccountNav current="/account/saved" />
      <div className="mt-6">
        {saved.length ? (
          saved.map((l) => <ListingRow key={l.id} listing={l} back="/account/saved" signedIn />)
        ) : (
          <EmptyState title="Nothing saved yet" action={<ButtonLink href="/search" variant="secondary">Start exploring</ButtonLink>}>
            Save providers, events and homes to compare them later.
          </EmptyState>
        )}
      </div>
    </div>
  );
}
