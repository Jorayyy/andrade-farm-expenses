"use client";

import { useActionState } from "react";
import { FileUp } from "lucide-react";
import { importExpenses, importInventory } from "@/app/actions";
import { initialActionState } from "@/lib/action-state";
import { btn, inputClass } from "@/components/ui";

export function ImportForm({ kind }: { kind: "expenses" | "inventory" }) {
  const [state, formAction, pending] = useActionState(
    kind === "expenses" ? importExpenses : importInventory,
    initialActionState,
  );

  return (
    <form action={formAction} className="space-y-3">
      <input
        type="file"
        name="file"
        accept=".csv,text/csv"
        required
        className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-emerald-50 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-emerald-700`}
      />
      <button type="submit" className={btn.primary} disabled={pending}>
        <FileUp className="h-4 w-4" />
        {pending ? "Importing..." : `Import ${kind} CSV`}
      </button>
      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{state.error}</p>
      ) : null}
      {state.ok && state.message ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
