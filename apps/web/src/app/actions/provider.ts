"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ListingDetailDto, ProviderDto } from "@desiconnect/contracts";
import { api } from "@/lib/api";
import { fromError, formValues, list, num, str, type ActionState } from "@/lib/action-state";

export async function onboardProvider(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await api<ProviderDto>("/providers", {
      method: "POST",
      body: {
        businessName: str(fd, "businessName") ?? "",
        description: str(fd, "description") ?? "",
        email: str(fd, "email") ?? "",
        phone: str(fd, "phone") ?? "",
        website: str(fd, "website") ?? "",
        categorySlugs: list(fd, "categorySlugs"),
        languages: list(fd, "languages"),
        addressLine: str(fd, "addressLine") ?? "",
        city: str(fd, "city") ?? "",
        state: str(fd, "state"),
        zipCode: str(fd, "zipCode") ?? "",
        serviceRadiusMiles: num(fd, "serviceRadiusMiles") ?? 25,
      },
    });
  } catch (err) {
    return fromError(err, formValues(fd));
  }
  revalidatePath("/provider");
  redirect("/provider?welcome=1");
}

export async function submitCredential(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await api("/providers/me/credentials", {
      method: "POST",
      body: {
        type: str(fd, "type"),
        jurisdiction: str(fd, "jurisdiction"),
        licenseNumber: str(fd, "licenseNumber") ?? "",
        issuingAuthority: str(fd, "issuingAuthority") ?? "",
        expiresAt: str(fd, "expiresAt"),
      },
    });
  } catch (err) {
    return fromError(err, formValues(fd));
  }
  revalidatePath("/provider");
  return { ok: true, message: "Credential submitted. An administrator will check it with the issuing authority." };
}

/** Converts a datetime-local value entered in DFW (Central) time to UTC, honoring daylight saving. */
function centralToIso(local: string): string {
  const asUtc = new Date(`${local}:00Z`);
  const tz = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", timeZoneName: "shortOffset" })
    .formatToParts(asUtc)
    .find((p) => p.type === "timeZoneName")?.value;
  const offsetHours = Number(tz?.match(/GMT([+-]\d+)/)?.[1] ?? -6);
  return new Date(asUtc.getTime() - offsetHours * 3600_000).toISOString();
}

/** Builds the API payload for a listing from the shared listing form. */
function listingBody(fd: FormData) {
  const kind = str(fd, "kind");
  const base = {
    title: str(fd, "title") ?? "",
    description: str(fd, "description") ?? "",
    addressLine: str(fd, "addressLine") ?? "",
    city: str(fd, "city") ?? "",
    state: str(fd, "state"),
    zipCode: str(fd, "zipCode") ?? "",
    languages: list(fd, "languages"),
    contactEmail: str(fd, "contactEmail") ?? "",
    contactPhone: str(fd, "contactPhone") ?? "",
    website: str(fd, "website") ?? "",
    priceText: str(fd, "priceText") ?? "",
    tags: (str(fd, "tags") ?? "").split(",").map((t) => t.trim()).filter(Boolean).slice(0, 10),
  };
  const zone = (local?: string) => (local ? centralToIso(local) : undefined);
  const extra =
    kind === "EVENT"
      ? { event: { startAt: zone(str(fd, "startAt")), endAt: zone(str(fd, "endAt")), venue: str(fd, "venue") ?? "", capacity: num(fd, "capacity"), isFree: fd.get("isFree") === "on", ticketUrl: str(fd, "ticketUrl") ?? "" } }
      : kind === "JOB"
        ? { job: { company: str(fd, "company") ?? "", employmentType: str(fd, "employmentType"), workArrangement: str(fd, "workArrangement"), salaryMin: num(fd, "salaryMin"), salaryMax: num(fd, "salaryMax"), salaryPeriod: str(fd, "salaryPeriod"), skills: (str(fd, "skills") ?? "").split(",").map((s) => s.trim()).filter(Boolean) } }
        : kind === "PROPERTY"
          ? { property: { transactionType: str(fd, "transactionType"), propertyType: str(fd, "propertyType"), price: num(fd, "price"), beds: num(fd, "beds"), baths: num(fd, "baths"), sqft: num(fd, "sqft"), availableFrom: str(fd, "availableFrom") } }
          : {};
  return { ...base, ...extra };
}

export async function createListing(_prev: ActionState, fd: FormData): Promise<ActionState> {
  let created: ListingDetailDto;
  try {
    created = (
      await api<ListingDetailDto>("/listings", {
        method: "POST",
        body: { ...listingBody(fd), categorySlug: str(fd, "categorySlug") ?? "", saveAsDraft: fd.get("intent") === "draft" },
      })
    ).data;
  } catch (err) {
    return fromError(err, formValues(fd));
  }
  revalidatePath("/provider");
  redirect(`/provider/listings/${created.id}?created=1`);
}

export async function updateListing(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const id = str(fd, "id")!;
  try {
    await api(`/listings/${id}`, { method: "PATCH", body: listingBody(fd) });
  } catch (err) {
    return fromError(err, formValues(fd));
  }
  revalidatePath("/provider");
  redirect(`/provider/listings/${id}?updated=1`);
}

export async function listingAction(fd: FormData) {
  const id = str(fd, "id")!;
  await api(`/listings/${id}`, { method: "PATCH", body: { action: str(fd, "action") } });
  revalidatePath("/provider");
  revalidatePath(`/provider/listings/${id}`);
}

export async function respondToInquiry(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await api(`/inquiries/${str(fd, "inquiryId")}`, {
      method: "PATCH",
      body: { providerResponse: str(fd, "providerResponse") ?? "", status: str(fd, "status") },
    });
  } catch (err) {
    return fromError(err, formValues(fd));
  }
  revalidatePath("/provider/inquiries");
  return { ok: true, message: "Saved. The customer has been notified." };
}

export async function setApplicationStatus(fd: FormData) {
  await api(`/applications/${str(fd, "applicationId")}`, { method: "PATCH", body: { status: str(fd, "status") } });
  revalidatePath(`/provider/listings/${str(fd, "listingId")}`);
}
