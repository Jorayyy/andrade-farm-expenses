import Link from "next/link";
import type { ReactNode } from "react";
import { btn, inputClass, labelClass } from "@/components/ui";
import { cn } from "@/lib/format";

export function FilterForm({ children, resetHref }: { children: ReactNode; resetHref: string }) {
  return (
    <form
      method="get"
      className="mb-4 flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end"
    >
      {children}
      <div className="flex items-center gap-2 sm:ml-auto">
        <button type="submit" className={btn.secondary}>
          Apply filters
        </button>
        <Link href={resetHref} className={btn.ghost}>
          Reset
        </Link>
      </div>
    </form>
  );
}

export function FilterField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block sm:w-40", className)}>
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

export const filterInputClass = `${inputClass} py-1.5 text-sm`;
