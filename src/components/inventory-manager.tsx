"use client";

import { useActionState, useState, type ReactNode } from "react";
import { ArrowDownUp, Pencil, Plus, Trash2 } from "lucide-react";
import {
  deleteInventoryItem,
  initialActionState,
  recordStockMovement,
  saveInventoryItem,
  type ActionState,
} from "@/app/actions";
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
import { INVENTORY_CATEGORIES, UNITS } from "@/lib/constants";
import { formatNumber, formatPeso, toDateInput } from "@/lib/format";

export type InventoryRow = {
  id: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  reorderLevel: number;
  unitCost: number;
  location: string | null;
  notes: string | null;
};

export function InventoryManager({ items, filters }: { items: InventoryRow[]; filters?: ReactNode }) {
  const [itemOpen, setItemOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryRow | null>(null);
  const [itemFormKey, setItemFormKey] = useState(0);
  const [stockItem, setStockItem] = useState<InventoryRow | null>(null);
  const [stockFormKey, setStockFormKey] = useState(0);

  const [itemState, itemAction, itemPending] = useActionState(
    async (previous: ActionState, formData: FormData) => {
      const result = await saveInventoryItem(previous, formData);
      if (result.ok) {
        setItemOpen(false);
        setEditing(null);
      }
      return result;
    },
    initialActionState,
  );
  const [stockState, stockAction, stockPending] = useActionState(
    async (previous: ActionState, formData: FormData) => {
      const result = await recordStockMovement(previous, formData);
      if (result.ok) {
        setStockItem(null);
      }
      return result;
    },
    initialActionState,
  );

  function openNewItem() {
    setEditing(null);
    setItemFormKey((key) => key + 1);
    setItemOpen(true);
  }

  function openEditItem(row: InventoryRow) {
    setEditing(row);
    setItemFormKey((key) => key + 1);
    setItemOpen(true);
  }

  function openStock(row: InventoryRow) {
    setStockItem(row);
    setStockFormKey((key) => key + 1);
  }

  return (
    <>
      <PageHeader
        title="Inventory"
        subtitle="Supplies, feed, and materials on hand."
        actions={
          <button type="button" className={btn.primary} onClick={openNewItem}>
            <Plus className="h-4 w-4" /> Add item
          </button>
        }
      />

      {filters}

      <TableShell>
        {items.length === 0 ? (
          <EmptyState title="No inventory items" description="Add seeds, feed, fertilizer, or tools to get started." />
        ) : (
          <table className="min-w-full divide-y divide-stone-200">
            <thead className="bg-stone-50">
              <tr>
                <th className={thClass}>Item</th>
                <th className={thClass}>Category</th>
                <th className={`${thClass} text-right`}>On hand</th>
                <th className={`${thClass} text-right`}>Reorder at</th>
                <th className={`${thClass} text-right`}>Unit cost</th>
                <th className={`${thClass} text-right`}>Value</th>
                <th className={thClass}>Location</th>
                <th className={`${thClass} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {items.map((row) => {
                const lowStock = row.quantity <= row.reorderLevel;
                return (
                  <tr key={row.id} className="hover:bg-stone-50/70">
                    <td className={tdClass}>
                      <span className="font-medium text-stone-900">{row.name}</span>
                      {lowStock ? (
                        <span className="ml-2">
                          <Badge tone="red">Low stock</Badge>
                        </span>
                      ) : null}
                    </td>
                    <td className={tdClass}>
                      <Badge tone="green">{row.category}</Badge>
                    </td>
                    <td className={`${tdClass} text-right font-semibold`}>
                      {formatNumber(row.quantity)} {row.unit}
                    </td>
                    <td className={`${tdClass} text-right text-stone-500`}>
                      {formatNumber(row.reorderLevel)} {row.unit}
                    </td>
                    <td className={`${tdClass} text-right`}>{formatPeso(row.unitCost)}</td>
                    <td className={`${tdClass} text-right`}>{formatPeso(row.quantity * row.unitCost)}</td>
                    <td className={tdClass}>{row.location ?? "—"}</td>
                    <td className={`${tdClass} text-right`}>
                      <div className="flex items-center justify-end gap-1">
                        <button type="button" className={btn.ghost} onClick={() => openStock(row)}>
                          <ArrowDownUp className="h-3.5 w-3.5" /> Stock
                        </button>
                        <button type="button" className={btn.ghost} onClick={() => openEditItem(row)}>
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </button>
                        <form action={deleteInventoryItem}>
                          <input type="hidden" name="id" value={row.id} />
                          <ConfirmButton className={btn.ghost} message="Delete this item and its stock history?">
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </ConfirmButton>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </TableShell>

      <Modal
        open={itemOpen}
        onClose={() => setItemOpen(false)}
        title={editing ? "Edit item" : "Add inventory item"}
        subtitle="Stock quantities can also be adjusted with the Stock button."
        wide
      >
        <form key={itemFormKey} action={itemAction} className="space-y-4">
          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Item name">
              <input
                type="text"
                name="name"
                required
                defaultValue={editing?.name ?? ""}
                placeholder="e.g. Urea fertilizer"
                className={inputClass}
              />
            </Field>
            <Field label="Category">
              <select name="category" defaultValue={editing?.category ?? "Supplies"} className={inputClass}>
                {INVENTORY_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <Field label="Unit">
              <select name="unit" defaultValue={editing?.unit ?? "kg"} className={inputClass}>
                {UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Quantity on hand" hint={editing ? "Use Stock to adjust" : undefined}>
              <input
                type="number"
                name="quantity"
                min="0"
                step="0.01"
                defaultValue={editing?.quantity ?? 0}
                readOnly={Boolean(editing)}
                className={`${inputClass} ${editing ? "bg-stone-100 text-stone-500" : ""}`}
              />
            </Field>
            <Field label="Reorder level">
              <input
                type="number"
                name="reorderLevel"
                min="0"
                step="0.01"
                defaultValue={editing?.reorderLevel ?? 0}
                className={inputClass}
              />
            </Field>
            <Field label="Unit cost (₱)">
              <input
                type="number"
                name="unitCost"
                min="0"
                step="0.01"
                defaultValue={editing?.unitCost ?? 0}
                className={inputClass}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Storage location">
              <input
                type="text"
                name="location"
                defaultValue={editing?.location ?? ""}
                placeholder="e.g. Barn shelf A"
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

          {itemState.error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{itemState.error}</p>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-stone-100 pt-4">
            <button type="button" className={btn.secondary} onClick={() => setItemOpen(false)}>
              Cancel
            </button>
            <button type="submit" className={btn.primary} disabled={itemPending}>
              {itemPending ? "Saving..." : editing ? "Save changes" : "Add item"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(stockItem)}
        onClose={() => setStockItem(null)}
        title="Update stock"
        subtitle={
          stockItem
            ? `${stockItem.name} · currently ${formatNumber(stockItem.quantity)} ${stockItem.unit}`
            : undefined
        }
      >
        <form key={stockFormKey} action={stockAction} className="space-y-4">
          {stockItem ? <input type="hidden" name="itemId" value={stockItem.id} /> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Movement type">
              <select name="type" defaultValue="IN" className={inputClass}>
                <option value="IN">Stock in (add)</option>
                <option value="OUT">Stock out (use / sell)</option>
                <option value="ADJUST">Adjust (set counted total)</option>
              </select>
            </Field>
            <Field label={`Quantity (${stockItem?.unit ?? "unit"})`}>
              <input type="number" name="quantity" min="0" step="0.01" required className={inputClass} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date">
              <input type="date" name="date" defaultValue={toDateInput(new Date())} className={inputClass} />
            </Field>
            <Field label="Note">
              <input type="text" name="note" placeholder="e.g. Purchased from supplier" className={inputClass} />
            </Field>
          </div>

          {stockState.error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{stockState.error}</p>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-stone-100 pt-4">
            <button type="button" className={btn.secondary} onClick={() => setStockItem(null)}>
              Cancel
            </button>
            <button type="submit" className={btn.primary} disabled={stockPending}>
              {stockPending ? "Updating..." : "Update stock"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
