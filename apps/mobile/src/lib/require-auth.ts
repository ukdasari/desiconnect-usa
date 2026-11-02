import { useRouter, type Href } from "expo-router";
import { useCallback } from "react";
import { useAuth } from "./auth";

/** Runs `action` when signed in; otherwise opens sign-in first. */
export function useRequireAuth() {
  const { status } = useAuth();
  const router = useRouter();
  return useCallback(
    (action: () => void, reason?: string) => {
      if (status === "signedIn") action();
      else router.push({ pathname: "/sign-in", params: reason ? { reason } : {} } as Href);
    },
    [status, router],
  );
}
