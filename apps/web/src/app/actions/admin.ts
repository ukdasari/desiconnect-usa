"use server";

import { revalidatePath } from "next/cache";
import { api } from "@/lib/api";
import { fromError, str, type ActionState } from "@/lib/action-state";

export async function moderate(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const target = str(fd, "target");
  const id = str(fd, "id");
  const decision = str(fd, "decision");
  const reason = str(fd, "reason") ?? "";
  try {
    if (target === "listing") {
      if (decision === "APPROVE") await api(`/admin/listings/${id}/approve`, { method: "POST" });
      else await api(`/admin/listings/${id}/reject`, { method: "POST", body: { reason } });
    } else {
      const path = { provider: "providers", credential: "credentials", review: "reviews" }[target ?? ""];
      if (!path) return { ok: false, message: "Unknown item" };
      await api(`/admin/${path}/${id}/decision`, { method: "POST", body: { decision, reason } });
    }
  } catch (err) {
    return fromError(err);
  }
  revalidatePath("/admin");
  return { ok: true, message: decision === "APPROVE" ? "Approved." : "Rejected. The owner can see your reason." };
}

export async function resolveReport(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await api(`/admin/reports/${str(fd, "id")}/resolve`, {
      method: "POST",
      body: { status: str(fd, "status"), resolutionNote: str(fd, "resolutionNote") ?? "", archiveTarget: fd.get("archiveTarget") === "on" },
    });
  } catch (err) {
    return fromError(err);
  }
  revalidatePath("/admin/reports");
  return { ok: true, message: "Report closed." };
}

export async function setSuspended(fd: FormData) {
  await api(`/admin/users/${str(fd, "id")}/suspend`, { method: "POST", body: { suspended: fd.get("suspended") === "true", reason: str(fd, "reason") ?? "" } });
  revalidatePath("/admin/users");
}
