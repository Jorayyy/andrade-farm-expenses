import type { ReactNode } from "react";
import { Leaf, LogOut } from "lucide-react";
import { logout } from "@/app/auth-actions";
import { NavLinks } from "@/components/nav-links";
import { requireAuth } from "@/lib/auth";

export default async function FarmLayout({ children }: { children: ReactNode }) {
  await requireAuth();

  return (
    <>
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
        <div className="mt-auto space-y-2">
          <div className="rounded-lg bg-stone-50 p-3 text-xs text-stone-500">
            All amounts are recorded in Philippine pesos (₱).
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="md:pl-60">
        <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 px-4 py-3 backdrop-blur md:hidden">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
                <Leaf className="h-4 w-4" />
              </span>
              <p className="text-sm font-bold text-stone-900">Andrade Farm</p>
            </div>
            <form action={logout}>
              <button type="submit" className="rounded-md p-2 text-stone-500 hover:bg-stone-100">
                <LogOut className="h-4 w-4" />
                <span className="sr-only">Sign out</span>
              </button>
            </form>
          </div>
          <div className="-mx-1 overflow-x-auto px-1 pb-1">
            <NavLinks compact />
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </>
  );
}
