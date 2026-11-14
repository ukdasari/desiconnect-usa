"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { AlertTriangle, BadgeCheck, FlaskConical, Loader2, MapPin, SendHorizonal, Sparkles } from "lucide-react";
import type { AiChatResponseDto, ListingSummaryDto } from "@desiconnect/contracts";
import { askDesiAi } from "@/app/actions/engagement";
import { cn } from "@/lib/cn";

type Turn =
  | { role: "user"; text: string }
  | { role: "assistant"; data: AiChatResponseDto }
  | { role: "error"; text: string };

const STARTERS = [
  "Find Telugu-speaking immigration attorneys near Frisco",
  "Show Indian cultural events in Dallas this month",
  "Find a rental home in Prosper under $2,500",
  "Find Indian catering for 200 guests",
];

export function DesiAi({ variant = "panel", initialQuestion }: { variant?: "panel" | "page"; initialQuestion?: string }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const [conversationId, setConversationId] = useState<string>();
  const [pending, start] = useTransition();
  const logRef = useRef<HTMLDivElement>(null);
  const asked = useRef(false);

  const ask = (message: string) => {
    const m = message.trim();
    if (!m || pending) return;
    setTurns((t) => [...t, { role: "user", text: m }]);
    setText("");
    start(async () => {
      const res = await askDesiAi(m, conversationId);
      if (res.ok) {
        setConversationId(res.data.conversationId);
        setTurns((t) => [...t, { role: "assistant", data: res.data }]);
      } else {
        setTurns((t) => [...t, { role: "error", text: res.message }]);
      }
    });
  };

  useEffect(() => {
    if (initialQuestion && !asked.current) {
      asked.current = true;
      ask(initialQuestion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, pending]);

  const last = [...turns].reverse().find((t): t is Extract<Turn, { role: "assistant" }> => t.role === "assistant");
  const suggestions = last?.data.suggestions.length ? last.data.suggestions : turns.length ? [] : STARTERS;

  return (
    <section
      aria-label="Desi AI assistant"
      className={cn(
        "flex flex-col overflow-hidden rounded-3xl border border-line bg-surface",
        variant === "page" ? "min-h-[70vh]" : "h-[34rem]",
      )}
    >
      <div className="flex items-center gap-3 border-b border-line px-5 py-4">
        <span className="inline-flex size-9 items-center justify-center rounded-xl bg-peacock text-marigold" aria-hidden>
          <Sparkles className="size-5" />
        </span>
        <div>
          <p className="font-display text-lg font-semibold leading-tight">Desi AI</p>
          <p className="text-sm text-ink-2">Answers come only from listings on 1StopDesi.</p>
        </div>
      </div>

      <div ref={logRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-5" role="log" aria-live="polite" aria-busy={pending}>
        {turns.length === 0 ? (
          <p className="max-w-md text-ink-2">
            Ask the way you'd ask a friend. For example, “a pediatrician near Little Elm who speaks Tamil.”
            I'll search verified and listed providers. I never contact anyone for you.
          </p>
        ) : null}
        {turns.map((t, i) =>
          t.role === "user" ? (
            <p key={i} className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-peacock px-4 py-2.5 text-white">{t.text}</p>
          ) : t.role === "error" ? (
            <p key={i} className="w-fit max-w-[85%] rounded-2xl bg-kumkum-soft px-4 py-2.5 text-sm">{t.text}</p>
          ) : (
            <AssistantTurn key={i} data={t.data} />
          ),
        )}
        {pending ? (
          <p className="inline-flex items-center gap-2 text-sm text-ink-2">
            <Loader2 className="size-4 animate-spin" aria-hidden /> Searching listings…
          </p>
        ) : null}
      </div>

      {suggestions.length ? (
        <div className="flex gap-2 overflow-x-auto px-5 pb-3">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => ask(s)}
              disabled={pending}
              className="shrink-0 rounded-full border border-line px-3 py-1.5 text-sm text-ink-2 hover:border-peacock-2 hover:text-ink disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      ) : null}

      <form
        className="flex items-center gap-2 border-t border-line p-3"
        onSubmit={(e) => {
          e.preventDefault();
          ask(text);
        }}
      >
        <label htmlFor={`ai-${variant}`} className="sr-only">Ask Desi AI</label>
        <input
          id={`ai-${variant}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={1000}
          placeholder="What do you need help finding?"
          className="h-11 flex-1 rounded-full border border-line bg-paper px-4 focus:border-peacock-2 focus:outline-none"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={pending || !text.trim()}
          className="inline-flex size-11 items-center justify-center rounded-full bg-marigold text-[#1b1206] hover:bg-marigold-strong hover:text-white disabled:opacity-50"
          aria-label="Send"
        >
          <SendHorizonal className="size-5" aria-hidden />
        </button>
      </form>
    </section>
  );
}

function AssistantTurn({ data }: { data: AiChatResponseDto }) {
  const urgent = data.safety && (data.safety.type === "emergency" || data.safety.type === "crisis");
  return (
    <div className="max-w-[92%] space-y-3">
      {urgent ? (
        <div role="alert" className="flex gap-3 rounded-2xl border border-kumkum/40 bg-kumkum-soft p-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-kumkum" aria-hidden />
          <div className="space-y-2">
            <p className="font-semibold">{data.reply}</p>
            <div className="flex flex-wrap gap-2">
              <a href="tel:911" className="rounded-full bg-kumkum px-4 py-1.5 text-sm font-bold text-white">Call 911</a>
              <a href="tel:988" className="rounded-full border border-kumkum px-4 py-1.5 text-sm font-bold text-kumkum">Call or text 988</a>
              <Link href="/emergency" className="rounded-full px-3 py-1.5 text-sm font-semibold underline">More help</Link>
            </div>
          </div>
        </div>
      ) : (
        <p className="whitespace-pre-line leading-relaxed">{data.reply}</p>
      )}
      {data.results.length ? (
        <ul className="space-y-2">
          {data.results.map((r) => <AiResult key={r.id} item={r} />)}
        </ul>
      ) : null}
      {data.searchUrl && data.results.length ? (
        <Link href={data.searchUrl} className="inline-block text-sm font-semibold text-peacock-2 underline dark:text-marigold">
          See all results with filters
        </Link>
      ) : null}
    </div>
  );
}

function AiResult({ item }: { item: ListingSummaryDto }) {
  return (
    <li>
      <Link href={`/listings/${item.slug}`} className="block rounded-2xl border border-line bg-paper p-3 hover:border-peacock-2">
        <span className="flex flex-wrap items-center gap-2 text-xs">
          {item.provider?.verification === "VERIFIED" ? (
            <span className="inline-flex items-center gap-1 font-semibold text-leaf"><BadgeCheck className="size-3.5" aria-hidden />Verified</span>
          ) : null}
          {item.isDemo ? <span className="inline-flex items-center gap-1 text-ink-2"><FlaskConical className="size-3.5" aria-hidden />Demo</span> : null}
          <span className="text-ink-2">{item.subcategory?.name ?? item.category.name}</span>
        </span>
        <span className="mt-1 block font-semibold leading-snug">{item.title}</span>
        <span className="mt-1 flex items-center gap-1 text-sm text-ink-2">
          <MapPin className="size-3.5" aria-hidden />
          {item.location.city}, {item.location.state}
          {item.distanceMiles !== null ? ` (${item.distanceMiles} mi)` : ""}
          {item.languages.length ? `, speaks ${item.languages.slice(0, 3).join(", ")}` : ""}
        </span>
      </Link>
    </li>
  );
}
