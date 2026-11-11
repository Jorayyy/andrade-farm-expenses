"use client";

import { useActionState, useState, type ReactNode } from "react";
import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { deleteExpense, initialActionState, saveExpense, type ActionState } from "@/app/actions";
import { ConfirmButton, Modal } from "@/components/modal";
import { ReceiptInput } from "@/components/receipt-input";
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
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/lib/constants";
import { formatDate, formatPeso, toDateInput } from "@/lib/format";

export type ExpenseRow = {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  vendor: string | null;
  paymentMethod: string | null;
  notes: string | null;
  receiptId: string | null;
};

export function ExpensesManager({
  expenses,
  filters,
}: {
  expenses: ExpenseRow[];
  filters?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseRow | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [state, formAction, pending] = useActionState(
    async (previous: ActionState, formData: FormData) => {
      const result = await saveExpense(previous, formData);
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

  function openEdit(row: ExpenseRow) {
    setEditing(row);
    setFormKey((key) => key + 1);
    setOpen(true);
  }

  return (
    <>
      <PageHeader
        title="Expenses"
        subtitle="Track every peso spent on the farm."
        actions={
          <button type="button" className={btn.primary} onClick={openNew}>
            <Plus className="h-4 w-4" /> Add expense
          </button>
        }
      />

      {filters}

      <TableShell>
        {expenses.length === 0 ? (
          <EmptyState
            title="No expenses found"
            description="Add your first expense or adjust the filters above."
          />
        ) : (
          <table className="min-w-full divide-y divide-stone-200">
            <thead className="bg-stone-50">
              <tr>
                <th className={thClass}>Date</th>
                <th className={thClass}>Description</th>
                <th className={thClass}>Category</th>
                <th className={thClass}>Vendor</th>
                <th className={thClass}>Method</th>
                <th className={`${thClass} text-right`}>Amount</th>
                <th className={thClass}>Receipt</th>
                <th className={`${thClass} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {expenses.map((row) => (
                <tr key={row.id} className="hover:bg-stone-50/70">
                  <td className={tdClass}>{formatDate(row.date)}</td>
                  <td className={tdClass}>
                    <span className="font-medium text-stone-900">{row.description}</span>
                    {row.notes ? (
                      <span className="block max-w-xs truncate text-xs text-stone-400">{row.notes}</span>
                    ) : null}
                  </td>
                  <td className={tdClass}>
                    <Badge tone="green">{row.category}</Badge>
                  </td>
                  <td className={tdClass}>{row.vendor ?? "—"}</td>
                  <td className={tdClass}>{row.paymentMethod ?? "—"}</td>
                  <td className={`${tdClass} text-right font-semibold text-red-600`}>
                    {formatPeso(row.amount)}
                  </td>
                  <td className={tdClass}>
                    {row.receiptId ? (
                      <Link
                        href={`/api/receipts/${row.receiptId}`}
                        target="_blank"
                        className="text-xs font-semibold text-emerald-700 hover:underline"
                      >
                        View
                      </Link>
                    ) : (
                      <span className="text-xs text-stone-400">None</span>
                    )}
                  </td>
                  <td className={`${tdClass} text-right`}>
                    <div className="flex items-center justify-end gap-1">
                      <button type="button" className={btn.ghost} onClick={() => openEdit(row)}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                      <form action={deleteExpense}>
                        <input type="hidden" name="id" value={row.id} />
                        <ConfirmButton className={btn.ghost} message="Delete this expense?">
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
        title={editing ? "Edit expense" : "Add expense"}
        subtitle="Amounts are in Philippine pesos."
        wide
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
              placeholder="e.g. 2 sacks of urea fertilizer"
              className={inputClass}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category">
              <select name="category" defaultValue={editing?.category ?? "Supplies"} className={inputClass}>
                {EXPENSE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Payment method">
              <select
                name="paymentMethod"
                defaultValue={editing?.paymentMethod ?? "Cash"}
                className={inputClass}
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Vendor / supplier">
              <input
                type="text"
                name="vendor"
                defaultValue={editing?.vendor ?? ""}
                placeholder="e.g. Agri Supply Co."
                className={inputClass}
              />
            </Field>
            <Field label="Notes">
              <input
                type="text"
                name="notes"
                defaultValue={editing?.notes ?? ""}
                placeholder="Optional details"
                className={inputClass}
              />
            </Field>
          </div>

          <ReceiptInput existingReceiptId={editing?.receiptId} />

          {state.error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{state.error}</p>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-stone-100 pt-4">
            <button type="button" className={btn.secondary} onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" className={btn.primary} disabled={pending}>
              {pending ? "Saving..." : editing ? "Save changes" : "Add expense"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
