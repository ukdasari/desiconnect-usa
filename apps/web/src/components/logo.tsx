import Link from "next/link";
import mark from "@/assets/brand/1stopdesi-mark.png";
import wordmark from "@/assets/brand/1stopdesi-wordmark.png";
import { cn } from "@/lib/cn";

type ImageSource = string | { src: string };
const src = (img: ImageSource) => (typeof img === "string" ? img : img.src);

/**
 * 1StopDesi logo: the bag-and-community symbol with the "1stopdesi" lettering. The lettering's navy
 * doesn't read on dark backgrounds, so dark mode shows the same word set in type instead.
 * The full circular badge lives in src/assets/brand/ for large uses (share image, print).
 */
export function Logo({ className, inverse = false }: { className?: string; inverse?: boolean }) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2 rounded-lg", className)} aria-label="1StopDesi home">
      <img src={src(mark)} alt="" className={cn("h-9 w-auto shrink-0", inverse ? "rounded-lg bg-white p-1" : "dark:rounded-lg dark:bg-white dark:p-1")} width={48} height={36} />
      <img src={src(wordmark)} alt="" className={cn("h-7 w-auto", inverse ? "hidden" : "dark:hidden")} width={116} height={28} />
      <span className={cn("font-display text-[1.35rem] font-extrabold italic tracking-tight", inverse ? "inline" : "hidden dark:inline")}>
        <span className="text-[#f47a1f]">1</span>
        <span className="text-white">stop</span>
        <span className="text-[#f47a1f]">desi</span>
      </span>
    </Link>
  );
}
