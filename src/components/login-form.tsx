"use client";

import { useActionState } from "react";
import { Lock } from "lucide-react";
import { login } from "@/app/auth-actions";
import { initialActionState, type ActionState } from "@/lib/action-state";
import { btn, inputClass } from "@/components/ui";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(login, initialActionState);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500">
          Farm password
        </span>
        <input
          type="password"
          name="password"
          required
          autoFocus
          autoComplete="current-password"
          className={inputClass}
          placeholder="Enter the shared farm password"
        />
      </label>

      {state.error ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {state.error}
        </p>
      ) : null}

      <button type="submit" className={`${btn.primary} w-full`} disabled={pending}>
        <Lock className="h-4 w-4" />
        {pending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
