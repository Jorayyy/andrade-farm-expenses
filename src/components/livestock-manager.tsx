"use client";

import { useActionState, useState, type ReactNode } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { deleteLivestock, saveLivestock } from "@/app/actions";
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
import { LIVESTOCK_SEXES, LIVESTOCK_SPECIES, LIVESTOCK_STATUSES } from "@/lib/constants";
import { formatDate, formatPeso, toDateInput } from "@/lib/format";

export type LivestockRow = {
  id: string;
  tag: string;
  species: string;
  breed: string | null;
  sex: string | null;
  birthDate: string | null;
  acquiredDate: string | null;
  acquisitionCost: number | null;
  status: string;
  location: string | null;
  notes: string | null;
};

const statusTone: Record<string, "green" | "blue" | "amber" | "red" | "stone"> = {
  Active: "green",
  Breeding: "blue",
  Quarantine: "amber",
  Sold: "stone",
  Deceased: "red",
};

export function LivestockManager({
  livestock,
  filters,
}: {
  livestock: LivestockRow[];
  filters?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LivestockRow | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [state, formAction, pending] = useActionState(
    async (previous: ActionState, formData: FormData) => {
      const result = await saveLivestock(previous, formData);
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

  function openEdit(row: LivestockRow) {
    setEditing(row);
    setFormKey((key) => key + 1);
    setOpen(true);
  }

  return (
    <>
      <PageHeader
        title="Livestock"
        subtitle="Animals raised on the farm."
        actions={
          <button type="button" className={btn.primary} onClick={openNew}>
            <Plus className="h-4 w-4" /> Add animal
          </button>
        }
      />

      {filters}

      <TableShell>
        {livestock.length === 0 ? (
          <EmptyState title="No livestock recorded" description="Add cattle, goats, poultry, or other animals." />
        ) : (
          <table className="min-w-full divide-y divide-stone-200">
            <thead className="bg-stone-50">
              <tr>
                <th className={thClass}>Tag / name</th>
                <th className={thClass}>Species</th>
                <th className={thClass}>Breed</th>
                <th className={thClass}>Sex</th>
                <th className={thClass}>Status</th>
                <th className={thClass}>Acquired</th>
                <th className={`${thClass} text-right`}>Cost</th>
                <th className={thClass}>Location</th>
                <th className={`${thClass} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {livestock.map((row) => (
                <tr key={row.id} className="hover:bg-stone-50/70">
                  <td className={tdClass}>
                    <span className="font-medium text-stone-900">{row.tag}</span>
                    {row.notes ? (
                      <span className="block max-w-xs truncate text-xs text-stone-400">{row.notes}</span>
                    ) : null}
                  </td>
                  <td className={tdClass}>{row.species}</td>
                  <td className={tdClass}>{row.breed ?? "—"}</td>
                  <td className={tdClass}>{row.sex ?? "—"}</td>
                  <td className={tdClass}>
                    <Badge tone={statusTone[row.status] ?? "stone"}>{row.status}</Badge>
                  </td>
                  <td className={tdClass}>{formatDate(row.acquiredDate)}</td>
                  <td className={`${tdClass} text-right`}>
                    {row.acquisitionCost === null ? "—" : formatPeso(row.acquisitionCost)}
                  </td>
                  <td className={tdClass}>{row.location ?? "—"}</td>
                  <td className={`${tdClass} text-right`}>
                    <div className="flex items-center justify-end gap-1">
                      <button type="button" className={btn.ghost} onClick={() => openEdit(row)}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                      <form action={deleteLivestock}>
                        <input type="hidden" name="id" value={row.id} />
                        <ConfirmButton className={btn.ghost} message="Delete this livestock record?">
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
        title={editing ? "Edit livestock" : "Add livestock"}
        wide
      >
        <form key={formKey} action={formAction} className="space-y-4">
          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Tag / name">
              <input
                type="text"
                name="tag"
                required
                defaultValue={editing?.tag ?? ""}
                placeholder="e.g. Cow-01"
                className={inputClass}
              />
            </Field>
            <Field label="Species">
              <select name="species" defaultValue={editing?.species ?? "Cattle"} className={inputClass}>
                {LIVESTOCK_SPECIES.map((species) => (
                  <option key={species} value={species}>
                    {species}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Breed">
              <input
                type="text"
                name="breed"
                defaultValue={editing?.breed ?? ""}
                placeholder="e.g. Brahman"
                className={inputClass}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Sex">
              <select name="sex" defaultValue={editing?.sex ?? ""} className={inputClass}>
                <option value="">Unknown</option>
                {LIVESTOCK_SEXES.map((sex) => (
                  <option key={sex} value={sex}>
                    {sex}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select name="status" defaultValue={editing?.status ?? "Active"} className={inputClass}>
                {LIVESTOCK_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Location">
              <input
                type="text"
                name="location"
                defaultValue={editing?.location ?? ""}
                placeholder="e.g. Pasture 2"
                className={inputClass}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <Field label="Birth date">
              <input
                type="date"
                name="birthDate"
                defaultValue={editing?.birthDate ? toDateInput(editing.birthDate) : ""}
                className={inputClass}
              />
            </Field>
            <Field label="Acquired date">
              <input
                type="date"
                name="acquiredDate"
                defaultValue={editing?.acquiredDate ? toDateInput(editing.acquiredDate) : ""}
                className={inputClass}
              />
            </Field>
            <Field label="Acquisition cost (₱)">
              <input
                type="number"
                name="acquisitionCost"
                min="0"
                step="0.01"
                defaultValue={editing?.acquisitionCost ?? ""}
                className={inputClass}
              />
            </Field>
            <Field label="Notes">
              <input
                type="text"
                name="notes"
                defaultValue={editing?.notes ?? ""}
                placeholder="Optional"
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
              {pending ? "Saving..." : editing ? "Save changes" : "Add livestock"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
