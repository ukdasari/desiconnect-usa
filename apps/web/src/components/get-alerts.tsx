import Link from "next/link";
import { BellPlus } from "lucide-react";
import { cn } from "@/lib/cn";
import { buttonClass } from "./ui";

/** "Get alerts" for a topic. Opens the alert form pre-filled (sign-in first if needed). */
export function GetAlertsLink({ topic, city, state, onDark = false }: { topic: string; city?: string; state?: string; onDark?: boolean }) {
  const qs = new URLSearchParams({ topic });
  if (city) qs.set("city", city);
  if (state) qs.set("state", state);
  return (
    <Link
      href={`/account/alerts?${qs}#new`}
      className={
        onDark
          ? "inline-flex items-center gap-2 rounded-full border border-white/30 px-5 py-2.5 font-semibold text-white hover:bg-white/10"
          : cn(buttonClass("secondary", "md"))
      }
    >
      <BellPlus className="size-4" aria-hidden /> Get alerts
    </Link>
  );
}
