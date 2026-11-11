"use client";

import { useActionState, useState, type ReactNode } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { deleteIncome, saveIncome } from "@/app/actions";
import { initialActionState, type ActionState } from "@/lib/action-state";
import { ConfirmButton, Modal } from "@/components/modal";
import {
  Badge,
  EmptyState,
  Field,
  PageHeader,
  TableShell,
  btn,
  inputClass,
  tdClass,
  thClass,
} from "@/components/ui";
import { INCOME_CATEGORIES } from "@/lib/constants";
import { formatDate, formatPeso, toDateInput } from "@/lib/format";

export type IncomeRow = {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  buyer: string | null;
  notes: string | null;
};

export function IncomeManager({ income, filters }: { income: IncomeRow[]; filters?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<IncomeRow | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [state, formAction, pending] = useActionState(
    async (previous: ActionState, formData: FormData) => {
      const result = await saveIncome(previous, formData);
      if (result.ok) {
        setOpen(false);
        setEditing(null);
      }
      return result;
    },
    initialActionState,
  );

  function openNew() {
    setEditing(null);
    setFormKey((key) => key + 1);
    setOpen(true);
  }

  function openEdit(row: IncomeRow) {
    setEditing(row);
    setFormKey((key) => key + 1);
    setOpen(true);
  }

  return (
    <>
      <PageHeader
        title="Income"
        subtitle="Sales and other revenue from the farm."
        actions={
          <button type="button" className={btn.primary} onClick={openNew}>
            <Plus className="h-4 w-4" /> Add income
          </button>
        }
      />

      {filters}

      <TableShell>
        {income.length === 0 ? (
          <EmptyState title="No income recorded" description="Log your first sale or revenue entry." />
        ) : (
          <table className="min-w-full divide-y divide-stone-200">
            <thead className="bg-stone-50">
              <tr>
                <th className={thClass}>Date</th>
                <th className={thClass}>Description</th>
                <th className={thClass}>Category</th>
                <th className={thClass}>Buyer</th>
                <th className={`${thClass} text-right`}>Amount</th>
                <th className={`${thClass} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {income.map((row) => (
                <tr key={row.id} className="hover:bg-stone-50/70">
                  <td className={tdClass}>{formatDate(row.date)}</td>
                  <td className={tdClass}>
                    <span className="font-medium text-stone-900">{row.description}</span>
                    {row.notes ? (
                      <span className="block max-w-xs truncate text-xs text-stone-400">{row.notes}</span>
                    ) : null}
                  </td>
                  <td className={tdClass}>
                    <Badge tone="blue">{row.category}</Badge>
                  </td>
                  <td className={tdClass}>{row.buyer ?? "—"}</td>
                  <td className={`${tdClass} text-right font-semibold text-emerald-600`}>
                    {formatPeso(row.amount)}
                  </td>
                  <td className={`${tdClass} text-right`}>
                    <div className="flex items-center justify-end gap-1">
                      <button type="button" className={btn.ghost} onClick={() => openEdit(row)}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                      <form action={deleteIncome}>
                        <input type="hidden" name="id" value={row.id} />
                        <ConfirmButton className={btn.ghost} message="Delete this income entry?">
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </ConfirmButton>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableShell>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit income" : "Add income"}
        subtitle="Amounts are in Philippine pesos."
      >
        <form key={formKey} action={formAction} className="space-y-4">
          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date">
              <input
                type="date"
                name="date"
                required
                defaultValue={editing ? toDateInput(editing.date) : toDateInput(new Date())}
                className={inputClass}
              />
            </Field>
            <Field label="Amount (₱)">
              <input
                type="number"
                name="amount"
                min="0"
                step="0.01"
                required
                defaultValue={editing?.amount ?? ""}
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Description">
            <input
              type="text"
              name="description"
              required
              defaultValue={editing?.description ?? ""}
              placeholder="e.g. 15 sacks of palay"
              className={inputClass}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category">
              <select name="category" defaultValue={editing?.category ?? "Crop Sales"} className={inputClass}>
                {INCOME_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Buyer">
              <input
                type="text"
                name="buyer"
                defaultValue={editing?.buyer ?? ""}
                placeholder="e.g. Local trader"
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Notes">
            <input
              type="text"
              name="notes"
              defaultValue={editing?.notes ?? ""}
              placeholder="Optional details"
              className={inputClass}
            />
          </Field>

          {state.error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{state.error}</p>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-stone-100 pt-4">
            <button type="button" className={btn.secondary} onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" className={btn.primary} disabled={pending}>
              {pending ? "Saving..." : editing ? "Save changes" : "Add income"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
