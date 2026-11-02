// Small component kit in the shadcn/ui style (hand-authored: the shadcn registry was unreachable from the build
// environment). Variants are deliberately few so hierarchy comes from layout, not decoration.
import Link from "next/link";
import { forwardRef, type ComponentProps, type ReactNode } from "react";
import { AlertTriangle, BadgeCheck, CheckCircle2, Clock, FlaskConical, Info } from "lucide-react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "inverse";
type ButtonSize = "sm" | "md" | "lg";

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors disabled:pointer-events-none disabled:opacity-55 whitespace-nowrap";
const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-marigold text-[#1b1206] hover:bg-marigold-strong hover:text-white dark:hover:text-[#1b1206]",
  secondary: "border border-line bg-surface text-ink hover:border-ink-2",
  ghost: "text-ink hover:bg-surface-2",
  danger: "bg-kumkum text-white hover:opacity-90",
  inverse: "bg-white text-peacock hover:bg-haldi",
};
const buttonSizes: Record<ButtonSize, string> = { sm: "h-9 px-4 text-sm", md: "h-11 px-5 text-[0.95rem]", lg: "h-13 px-7 text-base" };

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(buttonBase, buttonVariants[variant], buttonSizes[size], className);
}

export const Button = forwardRef<HTMLButtonElement, ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize }>(
  function Button({ variant = "primary", size = "md", className, ...props }, ref) {
    return <button ref={ref} className={buttonClass(variant, size, className)} {...props} />;
  },
);

export function ButtonLink({ variant = "primary", size = "md", className, ...props }: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

const fieldBase =
  "w-full rounded-xl border border-line bg-surface px-3.5 text-ink placeholder:text-ink-2/70 transition-colors focus:border-peacock-2 focus:outline-none focus-visible:outline-3 focus-visible:outline-offset-0 aria-[invalid=true]:border-kumkum";

export const Input = forwardRef<HTMLInputElement, ComponentProps<"input">>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(fieldBase, "h-11", className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, ComponentProps<"textarea">>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(fieldBase, "min-h-28 py-2.5 leading-relaxed", className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, ComponentProps<"select">>(function Select({ className, children, ...props }, ref) {
  return (
    <select ref={ref} className={cn(fieldBase, "h-11 appearance-none bg-[length:16px] bg-[right_0.8rem_center] bg-no-repeat pr-9", className)}
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%234a5d5b' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}
      {...props}>
      {children}
    </select>
  );
});

/** Label + control + hint + error, wired for screen readers. */
export function Field({
  label, htmlFor, hint, error, required, children, className,
}: { label: string; htmlFor: string; hint?: string; error?: string[] | string; required?: boolean; children: ReactNode; className?: string }) {
  const errors = typeof error === "string" ? [error] : error;
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-ink">
        {label}
        {required ? <span className="text-kumkum" aria-hidden> *</span> : null}
      </label>
      {children}
      {hint && !errors?.length ? <p id={`${htmlFor}-hint`} className="text-sm text-ink-2">{hint}</p> : null}
      {errors?.length ? <p id={`${htmlFor}-error`} className="text-sm font-medium text-kumkum">{errors.join(" ")}</p> : null}
    </div>
  );
}

export function Checkbox({ label, className, ...props }: ComponentProps<"input"> & { label: ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3 text-sm leading-relaxed", className)}>
      <input type="checkbox" className="mt-0.5 size-4.5 shrink-0 accent-[var(--peacock-2)]" {...props} />
      <span>{label}</span>
    </label>
  );
}

type AlertTone = "info" | "success" | "warning" | "danger";
const alertTone: Record<AlertTone, string> = {
  info: "border-peacock-2/25 bg-peacock-soft text-ink",
  success: "border-leaf/30 bg-leaf-soft text-ink",
  warning: "border-marigold/40 bg-haldi text-ink",
  danger: "border-kumkum/30 bg-kumkum-soft text-ink",
};
const alertIcon = { info: Info, success: CheckCircle2, warning: AlertTriangle, danger: AlertTriangle };

export function Alert({ tone = "info", title, children, className }: { tone?: AlertTone; title?: string; children?: ReactNode; className?: string }) {
  const Icon = alertIcon[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex gap-3 rounded-2xl border p-4 text-sm", alertTone[tone], className)}>
      <Icon className="mt-0.5 size-4.5 shrink-0" aria-hidden />
      <div className="space-y-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className="leading-relaxed text-ink-2 [&_a]:font-semibold [&_a]:text-ink [&_a]:underline">{children}</div> : null}
      </div>
    </div>
  );
}

export function Badge({ children, className, tone = "neutral" }: { children: ReactNode; className?: string; tone?: "neutral" | "leaf" | "marigold" | "kumkum" | "peacock" }) {
  const tones = {
    neutral: "bg-surface-2 text-ink-2",
    leaf: "bg-leaf-soft text-leaf",
    marigold: "bg-haldi text-marigold-strong",
    kumkum: "bg-kumkum-soft text-kumkum",
    peacock: "bg-peacock-soft text-peacock-2 dark:text-ink",
  };
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone], className)}>{children}</span>;
}

export function VerificationBadge({ status }: { status: string }) {
  if (status === "VERIFIED") return <Badge tone="leaf"><BadgeCheck className="size-3.5" aria-hidden />Verified</Badge>;
  if (status === "PENDING") return <Badge tone="marigold"><Clock className="size-3.5" aria-hidden />Verification pending</Badge>;
  return null;
}

export function DemoBadge() {
  return (
    <Badge tone="neutral" className="border border-dashed border-ink-2/40">
      <FlaskConical className="size-3.5" aria-hidden />
      Demo
    </Badge>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-line bg-surface px-6 py-12 text-center">
      <p className="font-display text-xl font-semibold">{title}</p>
      {children ? <div className="mx-auto mt-2 max-w-md text-ink-2">{children}</div> : null}
      {action ? <div className="mt-5 flex justify-center gap-3">{action}</div> : null}
    </div>
  );
}

export function PageHeader({ title, description, children }: { title: string; description?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 border-b border-line pb-6 md:flex-row md:items-end md:justify-between">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold md:text-4xl">{title}</h1>
        {description ? <div className="prose-measure text-ink-2">{description}</div> : null}
      </div>
      {children ? <div className="flex shrink-0 flex-wrap gap-2">{children}</div> : null}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-sm text-ink-2">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold">{value}</p>
      {hint ? <p className="mt-1 text-xs text-ink-2">{hint}</p> : null}
    </div>
  );
}
