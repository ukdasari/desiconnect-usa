import { ApiError } from "./api";

import type { ActionState } from "./action-state-client";

export type { ActionState } from "./action-state-client";

export function fromError(err: unknown, values?: Record<string, string>): ActionState {
  if (err instanceof ApiError) {
    return {
      ok: false,
      message: err.code === "VALIDATION_FAILED" && err.details ? "Check the highlighted fields and try again." : err.message,
      fieldErrors: err.details,
      values,
    };
  }
  // Next's redirect()/notFound() throw special errors that must propagate.
  throw err;
}

export function formValues(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string" && !k.startsWith("$") && !/password/i.test(k)) out[k] = v;
  return out;
}

export const str = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
};
export const num = (fd: FormData, key: string) => {
  const v = str(fd, key);
  return v === undefined ? undefined : Number(v);
};
export const list = (fd: FormData, key: string) => fd.getAll(key).filter((v): v is string => typeof v === "string" && v !== "");
