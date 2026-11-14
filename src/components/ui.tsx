import type { ReactNode } from "react";
import { cn } from "@/lib/format";

export const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20";

export const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500";

export const btn = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-60",
  secondary:
    "inline-flex items-center justify-center gap-2 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-sm font-semibold text-stone-700 shadow-sm transition hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:opacity-60",
  danger:
    "inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-400/30 disabled:opacity-60",
  ghost:
    "inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-stone-500 transition hover:bg-stone-100 hover:text-stone-800",
};

export function Card({ className, children, id }: { className?: string; children: ReactNode; id?: string }) {
  return (
    <div id={id} className={cn("rounded-xl border border-stone-200 bg-white shadow-sm", className)}>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-stone-500">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

const badgeTones = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  stone: "bg-stone-100 text-stone-600 ring-stone-200",
  purple: "bg-purple-50 text-purple-700 ring-purple-200",
} as const;

export function Badge({
  children,
  tone = "stone",
  className,
}: {
  children: ReactNode;
  tone?: keyof typeof badgeTones;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset",
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "green",
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  tone?: "green" | "red" | "blue" | "amber";
}) {
  const tones = {
    green: "bg-emerald-100 text-emerald-700",
    red: "bg-red-100 text-red-600",
    blue: "bg-blue-100 text-blue-600",
    amber: "bg-amber-100 text-amber-600",
  };
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</p>
          <p className="mt-2 truncate text-xl font-bold tracking-tight text-stone-900 sm:text-2xl">{value}</p>
          {hint ? <p className="mt-1 text-xs text-stone-500">{hint}</p> : null}
        </div>
        {icon ? (
          <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", tones[tone])}>
            {icon}
          </span>
        ) : null}
      </div>
    </Card>
  );
}

export function Field({
  label,
  children,
  hint,
  className,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className={labelClass}>{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-stone-400">{hint}</span> : null}
    </label>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 px-6 py-14 text-center">
      <p className="text-sm font-semibold text-stone-700">{title}</p>
      {description ? <p className="max-w-sm text-sm text-stone-500">{description}</p> : null}
    </div>
  );
}

export function TableShell({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <Card className="overflow-hidden">
      <div id={id} className="scroll-mt-28 overflow-x-auto">
        {children}
      </div>
    </Card>
  );
}

export const thClass =
  "whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-stone-500 sm:px-4 sm:py-3";

export const tdClass = "whitespace-nowrap px-3 py-2.5 text-sm text-stone-700 sm:px-4 sm:py-3";
