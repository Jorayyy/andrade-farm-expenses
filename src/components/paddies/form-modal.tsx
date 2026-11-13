"use client";

import { useActionState, useState, type ReactNode } from "react";
import { Modal } from "@/components/modal";
import { btn } from "@/components/ui";
import { initialActionState, type ActionState } from "@/lib/action-state";

/**
 * Button + dialog + server-action form. Keeps every paddy form consistent
 * without adding a client-side form library.
 */
export function FormModal({
  action,
  title,
  subtitle,
  trigger,
  triggerClass = btn.primary,
  submitLabel = "Save",
  wide = false,
  hidden,
  children,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  title: string;
  subtitle?: string;
  trigger: ReactNode;
  triggerClass?: string;
  submitLabel?: string;
  wide?: boolean;
  hidden?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async (previous, formData) => {
      const result = await action(previous, formData);
      if (result.ok) setOpen(false);
      return result;
    },
    initialActionState,
  );

  return (
    <>
      <button type="button" className={triggerClass} onClick={() => setOpen(true)}>
        {trigger}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={title} subtitle={subtitle} wide={wide}>
        <form action={formAction} className="space-y-4">
          {hidden}
          {children}
          {state.error ? (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {state.error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2 border-t border-stone-100 pt-3">
            <button type="button" className={btn.secondary} onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" className={btn.primary} disabled={pending}>
              {pending ? "Saving…" : submitLabel}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
