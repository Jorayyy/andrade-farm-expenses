"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addDays, fertilizerPlan, normalizeMoistureKg } from "@/lib/agronomy";
import { parseDateInput } from "@/lib/format";
import type { ActionState } from "@/lib/action-state";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(formData: FormData, key: string) {
  const value = text(formData, key);
  return value === "" ? null : value;
}

function numberValue(formData: FormData, key: string) {
  const value = text(formData, key);
  if (value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function revalidateAll() {
  revalidatePath("/", "layout");
}

class UserError extends Error {}

function errorMessage(error: unknown) {
  return error instanceof UserError ? error.message : "Something went wrong. Please try again.";
}

async function run(name: string, work: () => Promise<ActionState>): Promise<ActionState> {
  await requireAuth();
  try {
    return await work();
  } catch (error) {
    console.error(`[${name}]`, error);
    return { ok: false, error: errorMessage(error) };
  }
}

// ---------------------------------------------------------------------------
// Paddies
// ---------------------------------------------------------------------------

export async function savePaddy(previous: ActionState, formData: FormData): Promise<ActionState> {
  return run("savePaddy", async () => {
    const id = text(formData, "id") || null;
    const code = text(formData, "code");
    const name = text(formData, "name");
    const lengthM = numberValue(formData, "lengthM");
    const widthM = numberValue(formData, "widthM");
    let areaHa = numberValue(formData, "areaHa");
    const soilType = optionalText(formData, "soilType");
    const irrigationType = text(formData, "irrigationType") || "Irrigated";
    const waterSource = optionalText(formData, "waterSource");
    const elevationM = numberValue(formData, "elevationM");
    const latitude = numberValue(formData, "latitude");
    const longitude = numberValue(formData, "longitude");
    const status = text(formData, "status") || "Active";
    const notes = optionalText(formData, "notes");

    if (!code) return { ok: false, error: "Paddy code is required (for example P-01)." };
    if (!name) return { ok: false, error: "Paddy name is required." };

    if ((!areaHa || areaHa <= 0) && lengthM && widthM) {
      areaHa = (lengthM * widthM) / 10_000;
    }
    if (!areaHa || areaHa <= 0) return { ok: false, error: "Enter an area in hectares, or length and width." };
    if (areaHa > 500) return { ok: false, error: "Area looks too large. Check hectares vs square metres." };
    if (lengthM !== null && lengthM <= 0) return { ok: false, error: "Length must be positive." };
    if (widthM !== null && widthM <= 0) return { ok: false, error: "Width must be positive." };
    if (latitude !== null && (latitude < -90 || latitude > 90)) {
      return { ok: false, error: "Latitude must be between -90 and 90." };
    }
    if (longitude !== null && (longitude < -180 || longitude > 180)) {
      return { ok: false, error: "Longitude must be between -180 and 180." };
    }

    const existing = await prisma.paddy.findUnique({ where: { code }, select: { id: true } });
    if (existing && existing.id !== id) return { ok: false, error: `Paddy code ${code} is already used.` };

    const data = {
      code,
      name,
      areaHa,
      lengthM,
      widthM,
      soilType,
      irrigationType,
      waterSource,
      elevationM,
      latitude,
      longitude,
      status,
      notes,
    };

    if (id) {
      await prisma.paddy.update({ where: { id }, data });
    } else {
      await prisma.paddy.create({ data });
    }

    revalidateAll();
    return { ok: true, message: id ? "Paddy updated." : "Paddy added." };
  });
}

export async function deletePaddy(formData: FormData): Promise<void> {
  await requireAuth();
  const id = text(formData, "id");
  if (!id) return;
  await prisma.paddy.delete({ where: { id } });
  revalidateAll();
}

// ---------------------------------------------------------------------------
// Seasons
// ---------------------------------------------------------------------------

export async function saveSeason(previous: ActionState, formData: FormData): Promise<ActionState> {
  return run("saveSeason", async () => {
    const id = text(formData, "id") || null;
    const paddyId = text(formData, "paddyId");
    const varietyId = text(formData, "varietyId") || null;
    const seasonType = text(formData, "seasonType") || "Wet";
    const method = text(formData, "method") || "Transplanted";
    const status = text(formData, "status") || "Planned";
    const nurseryDate = parseDateInput(formData.get("nurseryDate"));
    const plantingDate = parseDateInput(formData.get("plantingDate"));
    const expectedHarvestDate = parseDateInput(formData.get("expectedHarvestDate"));
    const harvestDate = parseDateInput(formData.get("harvestDate"));
    const seedRateKgHa = numberValue(formData, "seedRateKgHa");
    const targetYieldTha = numberValue(formData, "targetYieldTha");
    const actualYieldKg = numberValue(formData, "actualYieldKg");
    const grainMoisturePct = numberValue(formData, "grainMoisturePct");
    const pricePerKg = numberValue(formData, "pricePerKg");
    const nAppliedKg = numberValue(formData, "nAppliedKg");
    const pAppliedKg = numberValue(formData, "pAppliedKg");
    const kAppliedKg = numberValue(formData, "kAppliedKg");
    const notes = optionalText(formData, "notes");

    if (!paddyId) return { ok: false, error: "Choose a paddy." };

    const paddy = await prisma.paddy.findUnique({ where: { id: paddyId }, select: { id: true } });
    if (!paddy) return { ok: false, error: "Paddy not found." };

    const variety = varietyId
      ? await prisma.riceVariety.findUnique({ where: { id: varietyId } })
      : null;

    const label =
      text(formData, "label") ||
      `${(plantingDate ?? nurseryDate ?? new Date()).getFullYear()} ${seasonType} season`;

    let expected = expectedHarvestDate;
    if (!expected && plantingDate && variety) expected = addDays(plantingDate, variety.maturityDays);

    if (plantingDate && nurseryDate && nurseryDate > plantingDate) {
      return { ok: false, error: "Nursery date cannot be after the planting date." };
    }
    if (targetYieldTha !== null && targetYieldTha <= 0) {
      return { ok: false, error: "Target yield must be positive." };
    }
    if (actualYieldKg !== null && actualYieldKg < 0) {
      return { ok: false, error: "Actual yield cannot be negative." };
    }
    if (grainMoisturePct !== null && (grainMoisturePct < 5 || grainMoisturePct > 40)) {
      return { ok: false, error: "Grain moisture should be between 5% and 40%." };
    }

    const data = {
      paddyId,
      varietyId,
      label,
      seasonType,
      method,
      status: harvestDate ? "Harvested" : status,
      nurseryDate,
      plantingDate,
      expectedHarvestDate: expected,
      harvestDate,
      seedRateKgHa,
      targetYieldTha,
      actualYieldKg: actualYieldKg === null ? null : normalizeMoistureKg(actualYieldKg, grainMoisturePct),
      grainMoisturePct,
      pricePerKg,
      nAppliedKg,
      pAppliedKg,
      kAppliedKg,
      notes,
    };

    if (id) {
      await prisma.season.update({ where: { id }, data });
    } else {
      await prisma.season.create({ data });
    }

    revalidateAll();
    return { ok: true, message: id ? "Season updated." : "Season added." };
  });
}

export async function deleteSeason(formData: FormData): Promise<void> {
  await requireAuth();
  const id = text(formData, "id");
  if (!id) return;
  await prisma.season.delete({ where: { id } });
  revalidateAll();
}

/** Creates the standard rice crop calendar for a season. */
export async function generateSeasonTasks(formData: FormData): Promise<void> {
  await requireAuth();
  const seasonId = text(formData, "seasonId");
  if (!seasonId) return;

  const season = await prisma.season.findUnique({
    where: { id: seasonId },
    include: { paddy: true, variety: true },
  });
  if (!season || !season.plantingDate) return;

  const maturity = season.variety?.maturityDays ?? 114;
  const planted = season.plantingDate;
  const fertilizer = fertilizerPlan({
    areaHa: Number(season.paddy.areaHa),
    nRequirementKgHa: season.variety?.nRequirementKgHa,
  });
  const plan: { offset: number; title: string; type: string; priority?: string; notes?: string }[] = [
    {
      offset: -14,
      title: "Land preparation and leveling",
      type: "Maintenance",
      notes: "Plow and puddle, level the field, repair dikes and clean the canals.",
    },
    ...fertilizer.map((step) => ({
      offset: step.offset,
      title: `${step.title} (${step.product})`,
      type: "Fertilizer",
      priority: step.offset < 0 || step.title.startsWith("First") ? "High" : undefined,
      notes: `${step.bags} bag(s) of 50 kg (${step.rateKgHa} kg/ha). ${step.instruction}`,
    })),
    {
      offset: 0,
      title: season.method === "Direct-seeded" ? "Sow pre-germinated seed" : "Transplant seedlings",
      type: "Other",
      notes:
        season.method === "Direct-seeded"
          ? "Sow at 2–3 cm depth with 2–5 cm water."
          : "Transplant 2–3 seedlings per hill at 20 × 20 cm.",
    },
    {
      offset: 10,
      title: "Check water depth (target 2-5 cm)",
      type: "Irrigation",
      notes: "Keep 2–5 cm water during establishment.",
    },
    { offset: 30, title: "Pest and disease scouting", type: "Scouting", notes: "Check for pests, diseases and weeds." },
    {
      offset: 55,
      title: "Pest and disease scouting",
      type: "Scouting",
      notes: "Check for pests, diseases and weeds.",
    },
    {
      offset: 70,
      title: "Check water and drainage",
      type: "Irrigation",
      notes: "Maintain 2–5 cm water; drain if deeper than 12 cm.",
    },
    {
      offset: maturity - 14,
      title: "Drain the paddy before harvest",
      type: "Irrigation",
      notes: "Stop irrigation and drain so the field firms up for harvest.",
    },
    {
      offset: maturity - 7,
      title: "Scout for lodging and grain maturity",
      type: "Scouting",
      notes: "Check grain colour and stems; harvest when 80–85% of grains are golden.",
    },
    {
      offset: maturity,
      title: "Harvest and record yield",
      type: "Harvest",
      priority: "High",
      notes: "Harvest, dry to 14% moisture, and record the actual yield.",
    },
  ];

  const dueDates = plan.map((item) => addDays(planted, item.offset));
  const existing = await prisma.task.findMany({
    where: { seasonId, dueDate: { in: dueDates } },
    select: { title: true, dueDate: true },
  });

  const rows = plan
    .map((item, index) => ({ ...item, dueDate: dueDates[index] }))
    .filter(
      (item) =>
        !existing.some(
          (task) => task.title === item.title && task.dueDate.getTime() === item.dueDate.getTime(),
        ),
    )
    .map((item) => ({
      paddyId: season.paddyId,
      seasonId: season.id,
      title: item.title,
      type: item.type,
      dueDate: item.dueDate,
      priority: item.priority ?? "Normal",
      notes: [`${season.paddy.code} · ${season.label}`, item.notes].filter(Boolean).join(" — "),
    }));

  if (rows.length) await prisma.task.createMany({ data: rows });
  revalidateAll();
}

export async function recordHarvest(previous: ActionState, formData: FormData): Promise<ActionState> {
  return run("recordHarvest", async () => {
    const seasonId = text(formData, "seasonId");
    const harvestDate = parseDateInput(formData.get("harvestDate")) ?? new Date();
    const wetYieldKg = numberValue(formData, "actualYieldKg");
    const grainMoisturePct = numberValue(formData, "grainMoisturePct");
    const pricePerKg = numberValue(formData, "pricePerKg");
    const createIncome = text(formData, "createIncome") === "on";

    if (!seasonId) return { ok: false, error: "Season not found." };
    if (wetYieldKg === null || wetYieldKg <= 0) return { ok: false, error: "Enter the harvested weight in kg." };

    const season = await prisma.season.findUnique({ where: { id: seasonId }, include: { paddy: true } });
    if (!season) return { ok: false, error: "Season not found." };

    const dryKg = normalizeMoistureKg(wetYieldKg, grainMoisturePct);

    await prisma.$transaction(async (tx) => {
      await tx.season.update({
        where: { id: seasonId },
        data: {
          actualYieldKg: dryKg,
          grainMoisturePct,
          pricePerKg,
          harvestDate,
          status: "Harvested",
        },
      });

      if (createIncome && pricePerKg && pricePerKg > 0) {
        await tx.income.create({
          data: {
            date: harvestDate,
            description: `${season.paddy.code} harvest — ${season.label}`,
            amount: dryKg * pricePerKg,
            category: "Crop Sales",
            paddyId: season.paddyId,
            seasonId: season.id,
            notes: `${Math.round(dryKg)} kg at 14% moisture · ₱${pricePerKg}/kg`,
          },
        });
      }
    });

    revalidateAll();
    return { ok: true, message: `Harvest recorded: ${Math.round(dryKg)} kg at 14% moisture.` };
  });
}

// ---------------------------------------------------------------------------
// Water logs
// ---------------------------------------------------------------------------

export async function saveWaterLog(previous: ActionState, formData: FormData): Promise<ActionState> {
  return run("saveWaterLog", async () => {
    const paddyId = text(formData, "paddyId");
    const seasonId = text(formData, "seasonId") || null;
    const date = parseDateInput(formData.get("date")) ?? new Date();
    const waterDepthCm = numberValue(formData, "waterDepthCm");
    const irrigationMm = numberValue(formData, "irrigationMm") ?? 0;
    const rainfallMm = numberValue(formData, "rainfallMm") ?? 0;
    const drainageMm = numberValue(formData, "drainageMm") ?? 0;
    const note = optionalText(formData, "note");

    if (!paddyId) return { ok: false, error: "Choose a paddy." };
    if (waterDepthCm !== null && (waterDepthCm < 0 || waterDepthCm > 40)) {
      return { ok: false, error: "Water depth should be between 0 and 40 cm." };
    }
    if (irrigationMm < 0 || rainfallMm < 0 || drainageMm < 0) {
      return { ok: false, error: "Water amounts cannot be negative." };
    }

    await prisma.waterLog.create({
      data: { paddyId, seasonId, date, waterDepthCm, irrigationMm, rainfallMm, drainageMm, note },
    });

    revalidateAll();
    return { ok: true, message: "Water log saved." };
  });
}

export async function deleteWaterLog(formData: FormData): Promise<void> {
  await requireAuth();
  const id = text(formData, "id");
  if (!id) return;
  await prisma.waterLog.delete({ where: { id } });
  revalidateAll();
}

// ---------------------------------------------------------------------------
// Field operations
// ---------------------------------------------------------------------------

export async function saveOperation(previous: ActionState, formData: FormData): Promise<ActionState> {
  return run("saveOperation", async () => {
    const paddyId = text(formData, "paddyId");
    const seasonId = text(formData, "seasonId") || null;
    const date = parseDateInput(formData.get("date")) ?? new Date();
    const type = text(formData, "type") || "Other";
    const description = text(formData, "description");
    const quantity = numberValue(formData, "quantity");
    const unit = optionalText(formData, "unit");
    const cost = numberValue(formData, "cost");
    const notes = optionalText(formData, "notes");

    if (!paddyId) return { ok: false, error: "Choose a paddy." };
    if (!description) return { ok: false, error: "Describe the operation." };
    if (quantity !== null && quantity < 0) return { ok: false, error: "Quantity cannot be negative." };
    if (cost !== null && cost < 0) return { ok: false, error: "Cost cannot be negative." };

    await prisma.fieldOperation.create({
      data: { paddyId, seasonId, date, type, description, quantity, unit, cost, notes },
    });

    revalidateAll();
    return { ok: true, message: "Field operation recorded." };
  });
}

export async function deleteOperation(formData: FormData): Promise<void> {
  await requireAuth();
  const id = text(formData, "id");
  if (!id) return;
  await prisma.fieldOperation.delete({ where: { id } });
  revalidateAll();
}

// ---------------------------------------------------------------------------
// Pest, disease and other field issues
// ---------------------------------------------------------------------------

export async function saveIssue(previous: ActionState, formData: FormData): Promise<ActionState> {
  return run("saveIssue", async () => {
    const paddyId = text(formData, "paddyId");
    const seasonId = text(formData, "seasonId") || null;
    const date = parseDateInput(formData.get("date")) ?? new Date();
    const type = text(formData, "type") || "Other";
    const name = text(formData, "name");
    const severity = numberValue(formData, "severity") ?? 1;
    const affectedPct = numberValue(formData, "affectedPct");
    const treatment = optionalText(formData, "treatment");
    const notes = optionalText(formData, "notes");

    if (!paddyId) return { ok: false, error: "Choose a paddy." };
    if (!name) return { ok: false, error: "Name the pest, disease or problem." };
    if (severity < 1 || severity > 5) return { ok: false, error: "Severity must be from 1 to 5." };
    if (affectedPct !== null && (affectedPct < 0 || affectedPct > 100)) {
      return { ok: false, error: "Affected area must be between 0% and 100%." };
    }

    await prisma.fieldIssue.create({
      data: { paddyId, seasonId, date, type, name, severity, affectedPct, treatment, notes },
    });

    revalidateAll();
    return { ok: true, message: "Field issue logged." };
  });
}

export async function resolveIssue(formData: FormData): Promise<void> {
  await requireAuth();
  const id = text(formData, "id");
  if (!id) return;
  await prisma.fieldIssue.update({
    where: { id },
    data: { resolved: true, resolvedDate: new Date() },
  });
  revalidateAll();
}

export async function deleteIssue(formData: FormData): Promise<void> {
  await requireAuth();
  const id = text(formData, "id");
  if (!id) return;
  await prisma.fieldIssue.delete({ where: { id } });
  revalidateAll();
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export async function saveTask(previous: ActionState, formData: FormData): Promise<ActionState> {
  return run("saveTask", async () => {
    const id = text(formData, "id") || null;
    const paddyId = text(formData, "paddyId") || null;
    const seasonId = text(formData, "seasonId") || null;
    const title = text(formData, "title");
    const type = text(formData, "type") || "Other";
    const dueDate = parseDateInput(formData.get("dueDate"));
    const priority = text(formData, "priority") || "Normal";
    const notes = optionalText(formData, "notes");

    if (!title) return { ok: false, error: "Task title is required." };
    if (!dueDate) return { ok: false, error: "A due date is required." };

    const data = { paddyId, seasonId, title, type, dueDate, priority, notes };

    if (id) {
      await prisma.task.update({ where: { id }, data });
    } else {
      await prisma.task.create({ data });
    }

    revalidateAll();
    return { ok: true, message: id ? "Task updated." : "Task added." };
  });
}

export async function setTaskStatus(formData: FormData): Promise<void> {
  await requireAuth();
  const id = text(formData, "id");
  const status = text(formData, "status");
  if (!id || !["Open", "Done", "Skipped"].includes(status)) return;
  await prisma.task.update({
    where: { id },
    data: { status, completedAt: status === "Done" ? new Date() : null },
  });
  revalidateAll();
}

export async function deleteTask(formData: FormData): Promise<void> {
  await requireAuth();
  const id = text(formData, "id");
  if (!id) return;
  await prisma.task.delete({ where: { id } });
  revalidateAll();
}

// ---------------------------------------------------------------------------
// Varieties
// ---------------------------------------------------------------------------

export async function saveVariety(previous: ActionState, formData: FormData): Promise<ActionState> {
  return run("saveVariety", async () => {
    const name = text(formData, "name");
    const ecosystem = text(formData, "ecosystem") || "Irrigated";
    const maturityDays = numberValue(formData, "maturityDays");
    const potentialYieldTha = numberValue(formData, "potentialYieldTha");
    const seedRateKgHa = numberValue(formData, "seedRateKgHa") ?? 40;
    const nRequirementKgHa = numberValue(formData, "nRequirementKgHa") ?? 120;
    const notes = optionalText(formData, "notes");

    if (!name) return { ok: false, error: "Variety name is required." };
    if (!maturityDays || maturityDays < 60 || maturityDays > 200) {
      return { ok: false, error: "Maturity should be between 60 and 200 days." };
    }
    if (!potentialYieldTha || potentialYieldTha <= 0) {
      return { ok: false, error: "Potential yield must be positive." };
    }

    const existing = await prisma.riceVariety.findUnique({ where: { name } });
    if (existing) return { ok: false, error: "That variety already exists." };

    await prisma.riceVariety.create({
      data: { name, ecosystem, maturityDays, potentialYieldTha, seedRateKgHa, nRequirementKgHa, notes },
    });

    revalidateAll();
    return { ok: true, message: "Variety added." };
  });
}
