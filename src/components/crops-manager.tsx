"use client";

import { useActionState, useState, type ReactNode } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { deleteCrop, saveCrop } from "@/app/actions";
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
import { AREA_UNITS, CROP_STATUSES } from "@/lib/constants";
import { formatDate, formatNumber, toDateInput } from "@/lib/format";

export type CropRow = {
  id: string;
  name: string;
  variety: string | null;
  plot: string | null;
  area: number | null;
  areaUnit: string | null;
  plantedDate: string | null;
  expectedHarvestDate: string | null;
  status: string;
  notes: string | null;
};

const statusTone: Record<string, "green" | "blue" | "amber" | "red" | "stone"> = {
  Planned: "stone",
  Growing: "green",
  Harvested: "blue",
  Failed: "red",
};

export function CropsManager({ crops, filters }: { crops: CropRow[]; filters?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CropRow | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [state, formAction, pending] = useActionState(
    async (previous: ActionState, formData: FormData) => {
      const result = await saveCrop(previous, formData);
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

  function openEdit(row: CropRow) {
    setEditing(row);
    setFormKey((key) => key + 1);
    setOpen(true);
  }

  return (
    <>
      <PageHeader
        title="Crops"
        subtitle="Plantings and harvest schedule."
        actions={
          <button type="button" className={btn.primary} onClick={openNew}>
            <Plus className="h-4 w-4" /> Add crop
          </button>
        }
      />

      {filters}

      <TableShell>
        {crops.length === 0 ? (
          <EmptyState title="No crops recorded" description="Add rice, corn, vegetables, or other plantings." />
        ) : (
          <table className="min-w-full divide-y divide-stone-200">
            <thead className="bg-stone-50">
              <tr>
                <th className={thClass}>Crop</th>
                <th className={thClass}>Variety</th>
                <th className={thClass}>Plot</th>
                <th className={`${thClass} text-right`}>Area</th>
                <th className={thClass}>Planted</th>
                <th className={thClass}>Expected harvest</th>
                <th className={thClass}>Status</th>
                <th className={`${thClass} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {crops.map((row) => (
                <tr key={row.id} className="hover:bg-stone-50/70">
                  <td className={tdClass}>
                    <span className="font-medium text-stone-900">{row.name}</span>
                    {row.notes ? (
                      <span className="block max-w-xs truncate text-xs text-stone-400">{row.notes}</span>
                    ) : null}
                  </td>
                  <td className={tdClass}>{row.variety ?? "—"}</td>
                  <td className={tdClass}>{row.plot ?? "—"}</td>
                  <td className={`${tdClass} text-right`}>
                    {row.area === null ? "—" : `${formatNumber(row.area)} ${row.areaUnit ?? ""}`}
                  </td>
                  <td className={tdClass}>{formatDate(row.plantedDate)}</td>
                  <td className={tdClass}>{formatDate(row.expectedHarvestDate)}</td>
                  <td className={tdClass}>
                    <Badge tone={statusTone[row.status] ?? "stone"}>{row.status}</Badge>
                  </td>
                  <td className={`${tdClass} text-right`}>
                    <div className="flex items-center justify-end gap-1">
                      <button type="button" className={btn.ghost} onClick={() => openEdit(row)}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                      <form action={deleteCrop}>
                        <input type="hidden" name="id" value={row.id} />
                        <ConfirmButton className={btn.ghost} message="Delete this crop record?">
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

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit crop" : "Add crop"} wide>
        <form key={formKey} action={formAction} className="space-y-4">
          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Crop name">
              <input
                type="text"
                name="name"
                required
                defaultValue={editing?.name ?? ""}
                placeholder="e.g. Rice"
                className={inputClass}
              />
            </Field>
            <Field label="Variety">
              <input
                type="text"
                name="variety"
                defaultValue={editing?.variety ?? ""}
                placeholder="e.g. NSIC Rc222"
                className={inputClass}
              />
            </Field>
            <Field label="Plot / field">
              <input
                type="text"
                name="plot"
                defaultValue={editing?.plot ?? ""}
                placeholder="e.g. North field"
                className={inputClass}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <Field label="Area">
              <input
                type="number"
                name="area"
                min="0"
                step="0.01"
                defaultValue={editing?.area ?? ""}
                className={inputClass}
              />
            </Field>
            <Field label="Area unit">
              <select name="areaUnit" defaultValue={editing?.areaUnit ?? "ha"} className={inputClass}>
                {AREA_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Planted date">
              <input
                type="date"
                name="plantedDate"
                defaultValue={editing?.plantedDate ? toDateInput(editing.plantedDate) : ""}
                className={inputClass}
              />
            </Field>
            <Field label="Expected harvest">
              <input
                type="date"
                name="expectedHarvestDate"
                defaultValue={editing?.expectedHarvestDate ? toDateInput(editing.expectedHarvestDate) : ""}
                className={inputClass}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Status">
              <select name="status" defaultValue={editing?.status ?? "Planned"} className={inputClass}>
                {CROP_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
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

          {state.error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{state.error}</p>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-stone-100 pt-4">
            <button type="button" className={btn.secondary} onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" className={btn.primary} disabled={pending}>
              {pending ? "Saving..." : editing ? "Save changes" : "Add crop"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
