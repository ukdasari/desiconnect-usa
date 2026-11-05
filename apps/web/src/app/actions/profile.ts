"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clearSession } from "@/lib/session";
import { api } from "@/lib/api";
import { fromError, formValues, list, str, type ActionState } from "@/lib/action-state";

export async function updateProfile(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await api("/me", {
      method: "PATCH",
      body: {
        name: str(fd, "name"),
        phone: str(fd, "phone") ?? "",
        city: str(fd, "city") ?? "",
        state: str(fd, "state"),
        zipCode: str(fd, "zipCode") ?? "",
        preferredLanguages: list(fd, "preferredLanguages"),
      },
    });
  } catch (err) {
    return fromError(err, formValues(fd));
  }
  revalidatePath("/account");
  return { ok: true, message: "Profile saved." };
}

export async function deleteAiHistory(_prev: ActionState): Promise<ActionState> {
  try {
    const res = await api<{ deletedConversations: number }>("/me/ai-history", { method: "DELETE" });
    return { ok: true, message: `Deleted ${res.data.deletedConversations} conversation(s).` };
  } catch (err) {
    return fromError(err);
  }
}

export async function markNotificationsRead() {
  await api("/me/notifications/read-all", { method: "POST" });
  revalidatePath("/account");
}

/** Deletes the account (the API removes personal data), then signs out on this device. */
export async function deleteAccount(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await api("/me", { method: "DELETE", body: { confirm: str(fd, "confirm") ?? "" } });
  } catch (err) {
    return fromError(err, formValues(fd));
  }
  await clearSession();
  redirect("/goodbye");
}
