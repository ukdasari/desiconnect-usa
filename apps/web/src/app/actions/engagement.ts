"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AiChatResponseDto } from "@desiconnect/contracts";
import { api, ApiError } from "@/lib/api";
import { fromError, formValues, num, str, type ActionState } from "@/lib/action-state";
import { getLocation, getToken } from "@/lib/session";

async function requireSignIn(next: string) {
  if (!(await getToken())) redirect(`/login?next=${encodeURIComponent(next)}`);
}

export async function sendInquiry(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const back = str(fd, "back") ?? "/";
  await requireSignIn(back);
  try {
    await api("/inquiries", {
      method: "POST",
      body: {
        listingId: str(fd, "listingId"),
        message: str(fd, "message") ?? "",
        phone: str(fd, "phone") ?? "",
        preferredContact: str(fd, "preferredContact") ?? "EMAIL",
        consentToShare: fd.get("consentToShare") === "on",
      },
    });
  } catch (err) {
    return fromError(err, formValues(fd));
  }
  revalidatePath("/account/requests");
  return { ok: true, message: "Request sent. The provider will contact you using the method you chose. You can track it under My requests." };
}

export async function toggleFavorite(fd: FormData) {
  const listingId = str(fd, "listingId")!;
  const back = str(fd, "back") ?? "/";
  await requireSignIn(back);
  await api(`/me/favorites/${listingId}`, { method: fd.get("on") === "true" ? "POST" : "DELETE" });
  revalidatePath(back);
  revalidatePath("/account/saved");
}

export async function registerForEvent(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const back = str(fd, "back") ?? "/events";
  await requireSignIn(back);
  try {
    const res = await api<{ status: string }>(`/events/${str(fd, "listingId")}/registrations`, { method: "POST", body: { guests: num(fd, "guests") ?? 1 } });
    revalidatePath(back);
    return {
      ok: true,
      message: res.data.status === "WAITLISTED" ? "This event is full, so you're on the waitlist. The organizer will be in touch if a spot opens." : "You're registered. Find it any time under My requests.",
    };
  } catch (err) {
    return fromError(err);
  }
}

export async function cancelRegistration(fd: FormData) {
  await api(`/events/${str(fd, "listingId")}/registrations`, { method: "DELETE" });
  revalidatePath("/account/requests");
}

export async function applyToJob(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const back = str(fd, "back") ?? "/jobs";
  await requireSignIn(back);
  const out = new FormData();
  out.set("consentToShare", fd.get("consentToShare") === "on" ? "true" : "false");
  for (const key of ["coverLetter", "phone"]) {
    const v = str(fd, key);
    if (v) out.set(key, v);
  }
  const resume = fd.get("resume");
  if (resume instanceof File && resume.size > 0) out.set("resume", resume, resume.name);
  try {
    await api(`/jobs/${str(fd, "listingId")}/applications`, { method: "POST", formData: out });
  } catch (err) {
    return fromError(err, formValues(fd));
  }
  revalidatePath("/account/requests");
  return { ok: true, message: "Application submitted. You can follow its status under My requests." };
}

export async function withdrawApplication(fd: FormData) {
  await api(`/applications/${str(fd, "applicationId")}`, { method: "PATCH", body: { status: "WITHDRAWN" } });
  revalidatePath("/account/requests");
}

export async function closeInquiry(fd: FormData) {
  await api(`/inquiries/${str(fd, "inquiryId")}`, { method: "PATCH", body: { status: "CLOSED" } });
  revalidatePath("/account/requests");
}

export async function reportListing(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const back = str(fd, "back") ?? "/";
  await requireSignIn(back);
  try {
    await api("/reports", { method: "POST", body: { targetType: "LISTING", targetId: str(fd, "listingId"), reason: str(fd, "reason") ?? "OTHER", details: str(fd, "details") ?? "" } });
  } catch (err) {
    return fromError(err);
  }
  return { ok: true, message: "Thanks. Our moderators will review this listing." };
}

export async function submitReview(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const back = str(fd, "back") ?? "/";
  await requireSignIn(back);
  try {
    await api(`/listings/${str(fd, "listingId")}/reviews`, { method: "POST", body: { rating: num(fd, "rating"), body: str(fd, "body") ?? "" } });
  } catch (err) {
    return fromError(err, formValues(fd));
  }
  return { ok: true, message: "Review received. It will appear after a moderator approves it." };
}

/** Homepage sentence search: interpret free text into filters, then open the results page. */
export async function smartSearch(fd: FormData) {
  const q = str(fd, "q");
  const where = str(fd, "where");
  if (!q) redirect(where ? `/search?city=${encodeURIComponent(where)}` : "/search");
  const loc = await getLocation();
  let target = `/search?q=${encodeURIComponent(q)}`;
  try {
    const text = where ? `${q} near ${where}` : q;
    const res = await api<{ searchUrl: string; safety: { type: string } | null }>("/ai/interpret", {
      auth: false,
      query: { q: text.slice(0, 200), city: loc.city, state: loc.state, zip: loc.zip },
    });
    if (res.data.safety?.type === "emergency" || res.data.safety?.type === "crisis") target = "/emergency";
    else target = res.data.searchUrl;
  } catch {
    // Fall back to a plain keyword search.
  }
  redirect(target);
}

export type AiReply = { ok: true; data: AiChatResponseDto } | { ok: false; message: string };

export async function askDesiAi(message: string, conversationId?: string): Promise<AiReply> {
  const loc = await getLocation();
  try {
    const res = await api<AiChatResponseDto>("/ai/chat", {
      method: "POST",
      body: { message: message.slice(0, 1000), conversationId, location: { city: loc.city ?? "", state: loc.state, zip: loc.zip ?? "" } },
    });
    return { ok: true, data: res.data };
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, message: err.message };
    return { ok: false, message: "Desi AI is unavailable right now. You can still search directly." };
  }
}

export async function claimListing(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const back = str(fd, "back") ?? "/";
  await requireSignIn(back);
  try {
    await api(`/listings/${str(fd, "listingId")}/claims`, {
      method: "POST",
      body: { role: str(fd, "role") ?? "", phone: str(fd, "phone") ?? "", verification: str(fd, "verification") ?? "" },
    });
  } catch (err) {
    return fromError(err, formValues(fd));
  }
  revalidatePath("/provider");
  return { ok: true, message: "Claim sent. We'll call to confirm, usually within two business days, and let you know here and by email." };
}

export async function withdrawClaim(fd: FormData) {
  await api(`/me/claims/${str(fd, "claimId")}/withdraw`, { method: "POST" });
  revalidatePath("/provider");
}
