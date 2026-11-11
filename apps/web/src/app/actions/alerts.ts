"use server";

import { revalidatePath } from "next/cache";
import { api } from "@/lib/api";
import { fromError, formValues, str, type ActionState } from "@/lib/action-state";

export async function createAlert(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await api("/me/alerts", {
      method: "POST",
      body: {
        topic: str(fd, "topic") ?? "",
        city: str(fd, "city") ?? "",
        state: str(fd, "state") ?? "",
        zip: str(fd, "zip") ?? "",
        radiusMiles: Number(str(fd, "radiusMiles") ?? 25),
        frequency: str(fd, "frequency") || undefined,
      },
    });
  } catch (err) {
    return fromError(err, formValues(fd));
  }
  revalidatePath("/account/alerts");
  return { ok: true, message: "Alert created. We'll let you know when something new is listed." };
}

export async function deleteAlert(fd: FormData) {
  await api(`/me/alerts/${str(fd, "id")}`, { method: "DELETE" });
  revalidatePath("/account/alerts");
}

export async function setAlertFrequency(fd: FormData) {
  await api(`/me/alerts/${str(fd, "id")}`, { method: "PATCH", body: { frequency: str(fd, "frequency") } });
  revalidatePath("/account/alerts");
}

export async function setNotificationChannel(fd: FormData) {
  const field = str(fd, "field");
  if (field !== "alertEmails" && field !== "alertPush") return;
  await api("/me/notification-settings", { method: "PATCH", body: { [field]: str(fd, "value") === "true" } });
  revalidatePath("/account/alerts");
}

export async function unsubscribeAlerts(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await api("/alerts/unsubscribe", { method: "POST", auth: false, body: { token: str(fd, "token") ?? "" } });
  } catch (err) {
    return fromError(err);
  }
  return { ok: true, message: "You're unsubscribed from alert emails." };
}
