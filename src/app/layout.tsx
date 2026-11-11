import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Leaf } from "lucide-react";
import { NavLinks } from "@/components/nav-links";
import "./globals.css";

export const metadata: Metadata = {
  title: "Andrade Farm · Expenses & Inventory",
  description: "Inventory, expenses, income, livestock, and crop tracking for Andrade Farm.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-stone-200 bg-white px-3 py-5 md:flex">
          <div className="mb-6 flex items-center gap-2.5 px-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
              <Leaf className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold leading-tight text-stone-900">Andrade Farm</p>
              <p className="text-xs text-stone-500">Expenses & Inventory</p>
            </div>
          </div>
          <NavLinks />
          <div className="mt-auto rounded-lg bg-stone-50 p-3 text-xs text-stone-500">
            All amounts are recorded in Philippine pesos (₱).
          </div>
        </aside>

        <div className="md:pl-60">
          <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 px-4 py-3 backdrop-blur md:hidden">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
                <Leaf className="h-4 w-4" />
              </span>
              <p className="text-sm font-bold text-stone-900">Andrade Farm</p>
            </div>
            <div className="-mx-1 overflow-x-auto px-1 pb-1">
              <NavLinks compact />
            </div>
          </header>

          <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
