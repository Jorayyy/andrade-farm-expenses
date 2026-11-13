import { Field, inputClass } from "@/components/ui";
import {
  IRRIGATION_TYPES,
  ISSUE_TYPES,
  OPERATION_TYPES,
  PADDY_STATUSES,
  PLANTING_METHODS,
  SEASON_STATUSES,
  SEASON_TYPES,
  SOIL_TYPES,
  TASK_PRIORITIES,
  TASK_TYPES,
  UNITS,
  WATER_SOURCES,
} from "@/lib/constants";
import { toDateInput } from "@/lib/format";

type Option = { id: string; label: string };

function Select({
  name,
  options,
  defaultValue,
  includeBlank,
}: {
  name: string;
  options: readonly string[] | Option[];
  defaultValue?: string | null;
  includeBlank?: string;
}) {
  const rows = options.map((option) =>
    typeof option === "string" ? { id: option, label: option } : option,
  );
  return (
    <select name={name} defaultValue={defaultValue ?? ""} className={inputClass}>
      {includeBlank ? <option value="">{includeBlank}</option> : null}
      {rows.map((row) => (
        <option key={row.id} value={row.id}>
          {row.label}
        </option>
      ))}
    </select>
  );
}

const grid = "grid gap-4 sm:grid-cols-2";
const grid3 = "grid gap-4 sm:grid-cols-3";

export type PaddyDefaults = {
  code?: string;
  name?: string;
  areaHa?: number | string | null;
  lengthM?: number | null;
  widthM?: number | null;
  soilType?: string | null;
  irrigationType?: string | null;
  waterSource?: string | null;
  elevationM?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  status?: string | null;
  notes?: string | null;
};

export function PaddyFields({ defaults = {} }: { defaults?: PaddyDefaults }) {
  return (
    <>
      <div className={grid}>
        <Field label="Paddy code" hint="Short unique code, e.g. P-01">
          <input name="code" required defaultValue={defaults.code ?? ""} className={inputClass} />
        </Field>
        <Field label="Paddy name">
          <input name="name" required defaultValue={defaults.name ?? ""} className={inputClass} />
        </Field>
      </div>
      <div className={grid3}>
        <Field label="Area (ha)" hint="Auto-filled from length × width if blank">
          <input
            name="areaHa"
            type="number"
            step="0.0001"
            min="0"
            defaultValue={defaults.areaHa ?? ""}
            className={inputClass}
          />
        </Field>
        <Field label="Length (m)">
          <input
            name="lengthM"
            type="number"
            step="0.1"
            min="0"
            defaultValue={defaults.lengthM ?? ""}
            className={inputClass}
          />
        </Field>
        <Field label="Width (m)">
          <input
            name="widthM"
            type="number"
            step="0.1"
            min="0"
            defaultValue={defaults.widthM ?? ""}
            className={inputClass}
          />
        </Field>
      </div>
      <div className={grid3}>
        <Field label="Soil type">
          <Select name="soilType" options={SOIL_TYPES} defaultValue={defaults.soilType} includeBlank="Not set" />
        </Field>
        <Field label="Irrigation">
          <Select
            name="irrigationType"
            options={IRRIGATION_TYPES}
            defaultValue={defaults.irrigationType ?? "Irrigated"}
          />
        </Field>
        <Field label="Water source">
          <Select
            name="waterSource"
            options={WATER_SOURCES}
            defaultValue={defaults.waterSource}
            includeBlank="Not set"
          />
        </Field>
      </div>
      <div className={grid3}>
        <Field label="Elevation (m)">
          <input
            name="elevationM"
            type="number"
            step="0.1"
            defaultValue={defaults.elevationM ?? ""}
            className={inputClass}
          />
        </Field>
        <Field label="Latitude" hint="For local weather">
          <input
            name="latitude"
            type="number"
            step="0.000001"
            defaultValue={defaults.latitude ?? ""}
            className={inputClass}
            placeholder="15.486"
          />
        </Field>
        <Field label="Longitude">
          <input
            name="longitude"
            type="number"
            step="0.000001"
            defaultValue={defaults.longitude ?? ""}
            className={inputClass}
            placeholder="120.973"
          />
        </Field>
      </div>
      <div className={grid}>
        <Field label="Status">
          <Select name="status" options={PADDY_STATUSES} defaultValue={defaults.status ?? "Active"} />
        </Field>
        <Field label="Notes">
          <input name="notes" defaultValue={defaults.notes ?? ""} className={inputClass} />
        </Field>
      </div>
    </>
  );
}

export type SeasonDefaults = {
  label?: string;
  seasonType?: string | null;
  method?: string | null;
  status?: string | null;
  nurseryDate?: Date | null;
  plantingDate?: Date | null;
  expectedHarvestDate?: Date | null;
  harvestDate?: Date | null;
  seedRateKgHa?: number | null;
  targetYieldTha?: number | string | null;
  actualYieldKg?: number | string | null;
  grainMoisturePct?: number | null;
  pricePerKg?: number | string | null;
  nAppliedKg?: number | null;
  pAppliedKg?: number | null;
  kAppliedKg?: number | null;
  notes?: string | null;
  varietyId?: string | null;
};

export function SeasonFields({
  defaults = {},
  varieties,
  showPaddy = false,
  paddies,
}: {
  defaults?: SeasonDefaults;
  varieties: Option[];
  showPaddy?: boolean;
  paddies?: Option[];
}) {
  return (
    <>
      <div className={grid}>
        {showPaddy ? (
          <Field label="Paddy">
            <Select name="paddyId" options={paddies ?? []} includeBlank="Choose a paddy" />
          </Field>
        ) : null}
        <Field label="Variety">
          <Select name="varietyId" options={varieties} defaultValue={defaults.varietyId} includeBlank="Not set" />
        </Field>
        <Field label="Season label" hint="Defaults from the planting year">
          <input name="label" defaultValue={defaults.label ?? ""} className={inputClass} placeholder="2026 Dry season" />
        </Field>
      </div>
      <div className={grid3}>
        <Field label="Season">
          <Select name="seasonType" options={SEASON_TYPES} defaultValue={defaults.seasonType ?? "Wet"} />
        </Field>
        <Field label="Method">
          <Select name="method" options={PLANTING_METHODS} defaultValue={defaults.method ?? "Transplanted"} />
        </Field>
        <Field label="Status">
          <Select name="status" options={SEASON_STATUSES} defaultValue={defaults.status ?? "Planned"} />
        </Field>
      </div>
      <div className={grid}>
        <Field label="Nursery / sowing date">
          <input
            name="nurseryDate"
            type="date"
            defaultValue={toDateInput(defaults.nurseryDate)}
            className={inputClass}
          />
        </Field>
        <Field label="Planting / transplant date">
          <input
            name="plantingDate"
            type="date"
            defaultValue={toDateInput(defaults.plantingDate)}
            className={inputClass}
          />
        </Field>
        <Field label="Expected harvest" hint="Auto-filled from variety maturity">
          <input
            name="expectedHarvestDate"
            type="date"
            defaultValue={toDateInput(defaults.expectedHarvestDate)}
            className={inputClass}
          />
        </Field>
        <Field label="Harvest date (if done)">
          <input
            name="harvestDate"
            type="date"
            defaultValue={toDateInput(defaults.harvestDate)}
            className={inputClass}
          />
        </Field>
      </div>
      <div className={grid3}>
        <Field label="Seed rate (kg/ha)">
          <input
            name="seedRateKgHa"
            type="number"
            step="1"
            min="0"
            defaultValue={defaults.seedRateKgHa ?? ""}
            className={inputClass}
          />
        </Field>
        <Field label="Target yield (t/ha)">
          <input
            name="targetYieldTha"
            type="number"
            step="0.1"
            min="0"
            defaultValue={defaults.targetYieldTha ?? ""}
            className={inputClass}
          />
        </Field>
        <Field label="Actual yield (kg, wet)">
          <input
            name="actualYieldKg"
            type="number"
            step="1"
            min="0"
            defaultValue={defaults.actualYieldKg ?? ""}
            className={inputClass}
          />
        </Field>
      </div>
      <div className={grid3}>
        <Field label="Grain moisture (%)">
          <input
            name="grainMoisturePct"
            type="number"
            step="0.1"
            min="5"
            max="40"
            defaultValue={defaults.grainMoisturePct ?? ""}
            className={inputClass}
          />
        </Field>
        <Field label="Price (₱/kg)">
          <input
            name="pricePerKg"
            type="number"
            step="0.01"
            min="0"
            defaultValue={defaults.pricePerKg ?? ""}
            className={inputClass}
          />
        </Field>
        <Field label="Notes">
          <input name="notes" defaultValue={defaults.notes ?? ""} className={inputClass} />
        </Field>
      </div>
      <div className={grid3}>
        <Field label="N applied (kg/ha)">
          <input
            name="nAppliedKg"
            type="number"
            step="1"
            min="0"
            defaultValue={defaults.nAppliedKg ?? ""}
            className={inputClass}
          />
        </Field>
        <Field label="P₂O₅ applied (kg/ha)">
          <input
            name="pAppliedKg"
            type="number"
            step="1"
            min="0"
            defaultValue={defaults.pAppliedKg ?? ""}
            className={inputClass}
          />
        </Field>
        <Field label="K₂O applied (kg/ha)">
          <input
            name="kAppliedKg"
            type="number"
            step="1"
            min="0"
            defaultValue={defaults.kAppliedKg ?? ""}
            className={inputClass}
          />
        </Field>
      </div>
    </>
  );
}

export function WaterFields({ date }: { date?: string }) {
  return (
    <>
      <div className={grid3}>
        <Field label="Date">
          <input name="date" type="date" defaultValue={date ?? toDateInput(new Date())} className={inputClass} />
        </Field>
        <Field label="Measured depth (cm)" hint="Use a ruler or stake">
          <input name="waterDepthCm" type="number" step="0.5" min="0" max="40" className={inputClass} />
        </Field>
        <Field label="Irrigation added (mm)">
          <input name="irrigationMm" type="number" step="1" min="0" className={inputClass} />
        </Field>
      </div>
      <div className={grid3}>
        <Field label="Rainfall (mm)">
          <input name="rainfallMm" type="number" step="1" min="0" className={inputClass} />
        </Field>
        <Field label="Drainage out (mm)">
          <input name="drainageMm" type="number" step="1" min="0" className={inputClass} />
        </Field>
        <Field label="Note">
          <input name="note" className={inputClass} placeholder="Canal opened, pump 2 hrs…" />
        </Field>
      </div>
    </>
  );
}

export function OperationFields({ date }: { date?: string }) {
  return (
    <>
      <div className={grid3}>
        <Field label="Date">
          <input name="date" type="date" defaultValue={date ?? toDateInput(new Date())} className={inputClass} />
        </Field>
        <Field label="Operation">
          <Select name="type" options={OPERATION_TYPES} defaultValue="Other" />
        </Field>
        <Field label="Cost (₱)">
          <input name="cost" type="number" step="0.01" min="0" className={inputClass} />
        </Field>
      </div>
      <Field label="Description">
        <input name="description" required className={inputClass} placeholder="Urea topdress, 2 bags" />
      </Field>
      <div className={grid3}>
        <Field label="Quantity">
          <input name="quantity" type="number" step="0.01" min="0" className={inputClass} />
        </Field>
        <Field label="Unit">
          <Select name="unit" options={UNITS} includeBlank="—" />
        </Field>
        <Field label="Note">
          <input name="notes" className={inputClass} />
        </Field>
      </div>
    </>
  );
}

export function IssueFields({ date }: { date?: string }) {
  return (
    <>
      <div className={grid3}>
        <Field label="Date">
          <input name="date" type="date" defaultValue={date ?? toDateInput(new Date())} className={inputClass} />
        </Field>
        <Field label="Type">
          <Select name="type" options={ISSUE_TYPES} defaultValue="Pest" />
        </Field>
        <Field label="Severity (1–5)">
          <input name="severity" type="number" min="1" max="5" defaultValue="2" className={inputClass} />
        </Field>
      </div>
      <Field label="Problem">
        <input name="name" required className={inputClass} placeholder="Brown planthopper" />
      </Field>
      <div className={grid}>
        <Field label="Affected area (%)">
          <input name="affectedPct" type="number" step="1" min="0" max="100" className={inputClass} />
        </Field>
        <Field label="Treatment">
          <input name="treatment" className={inputClass} placeholder="Product and rate" />
        </Field>
      </div>
      <Field label="Note">
        <input name="notes" className={inputClass} />
      </Field>
    </>
  );
}

export function TaskFields({ dueDate }: { dueDate?: string }) {
  return (
    <>
      <Field label="Task">
        <input name="title" required className={inputClass} placeholder="Irrigate to 5 cm" />
      </Field>
      <div className={grid3}>
        <Field label="Type">
          <Select name="type" options={TASK_TYPES} defaultValue="Other" />
        </Field>
        <Field label="Due date">
          <input
            name="dueDate"
            type="date"
            required
            defaultValue={dueDate ?? toDateInput(new Date())}
            className={inputClass}
          />
        </Field>
        <Field label="Priority">
          <Select name="priority" options={TASK_PRIORITIES} defaultValue="Normal" />
        </Field>
      </div>
      <Field label="Note">
        <input name="notes" className={inputClass} />
      </Field>
    </>
  );
}

export function HarvestFields({ seasonId }: { seasonId: string }) {
  return (
    <>
      <input type="hidden" name="seasonId" value={seasonId} />
      <div className={grid}>
        <Field label="Harvest date">
          <input name="harvestDate" type="date" defaultValue={toDateInput(new Date())} className={inputClass} />
        </Field>
        <Field label="Wet weight (kg)">
          <input name="actualYieldKg" type="number" step="1" min="1" required className={inputClass} />
        </Field>
      </div>
      <div className={grid3}>
        <Field label="Moisture (%)" hint="Converted to 14% moisture">
          <input name="grainMoisturePct" type="number" step="0.1" min="5" max="40" className={inputClass} />
        </Field>
        <Field label="Price (₱/kg)">
          <input name="pricePerKg" type="number" step="0.01" min="0" className={inputClass} />
        </Field>
        <label className="mt-6 flex items-center gap-2 text-sm text-stone-700">
          <input type="checkbox" name="createIncome" className="h-4 w-4 rounded border-stone-300" />
          Also record income
        </label>
      </div>
    </>
  );
}
