import { redirect } from "next/navigation";
import { Leaf } from "lucide-react";
import { LoginForm } from "@/components/login-form";
import { isAuthenticated } from "@/lib/auth";

export const metadata = { title: "Sign in · Andrade Farm" };

export default async function LoginPage() {
  if (await isAuthenticated()) redirect("/");

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <Leaf className="h-5 w-5" />
          </span>
          <div>
            <p className="text-base font-bold leading-tight text-stone-900">Andrade Farm</p>
            <p className="text-xs text-stone-500">Expenses & Inventory</p>
          </div>
        </div>

        <p className="mt-5 text-sm text-stone-600">
          This dashboard is private. Enter the shared farm password to continue.
        </p>

        <LoginForm />

        <p className="mt-5 text-center text-xs text-stone-400">
          All amounts are recorded in Philippine pesos (₱).
        </p>
      </div>
    </main>
  );
}
