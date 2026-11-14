"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Beef,
  CalendarDays,
  FileSpreadsheet,
  LayoutDashboard,
  Package,
  Receipt,
  Sprout,
  TrendingUp,
  Waves,
  Wheat,
} from "lucide-react";
import { NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/format";

const icons = {
  LayoutDashboard,
  Waves,
  CalendarDays,
  Receipt,
  TrendingUp,
  Package,
  Beef,
  Sprout,
  FileSpreadsheet,
};

export function NavLinks({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex gap-1", compact ? "overflow-x-auto" : "flex-col")}>
      {NAV_ITEMS.map((item) => {
        const Icon = icons[item.icon as keyof typeof icons] ?? Wheat;
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition",
              compact ? "shrink-0 whitespace-nowrap" : "",
              active
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-stone-600 hover:bg-stone-100 hover:text-stone-900",
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
