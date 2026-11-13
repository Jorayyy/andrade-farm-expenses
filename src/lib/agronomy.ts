/**
 * Rice agronomy helpers.
 *
 * The forecast is deliberately simple and explainable, following the structure
 * of ORYZA2000 / DSSAT-CERES-Rice: a potential yield is reduced by water,
 * nutrient and pest stress. It is a decision aid, not a guarantee.
 */

export type WaterState = "critical" | "low" | "optimal" | "excess" | "unknown";

export type GrowthStage = {
  key: "planned" | "seedling" | "vegetative" | "reproductive" | "ripening" | "mature";
  label: string;
  progress: number;
};

export type ForecastFactor = {
  label: string;
  value: number;
  detail: string;
};

export type SeasonForecast = {
  daysAfterPlanting: number | null;
  daysToHarvest: number | null;
  maturityDays: number;
  progress: number;
  stage: GrowthStage;
  potentialYieldTha: number;
  forecastYieldTha: number;
  forecastKg: number;
  lowKg: number;
  highKg: number;
  confidencePct: number;
  harvestDate: Date | null;
  factors: ForecastFactor[];
  warnings: string[];
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const DEFAULT_MATURITY_DAYS = 114;
export const DEFAULT_POTENTIAL_YIELD_THA = 6;

/** Whole days between two calendar dates, ignoring time of day. */
export function daysBetween(from: Date, to: Date) {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / 86_400_000);
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function growthStage(daysAfterPlanting: number | null, maturityDays: number): GrowthStage {
  if (daysAfterPlanting === null || daysAfterPlanting < 0) {
    return { key: "planned", label: "Not planted", progress: 0 };
  }
  const progress = clamp(daysAfterPlanting / Math.max(1, maturityDays), 0, 1.25);
  if (daysAfterPlanting <= 14) return { key: "seedling", label: "Seedling", progress };
  if (progress < 0.45) return { key: "vegetative", label: "Vegetative", progress };
  if (progress < 0.7) return { key: "reproductive", label: "Reproductive", progress };
  if (progress < 1) return { key: "ripening", label: "Ripening", progress };
  return { key: "mature", label: "Mature / harvest ready", progress };
}

export function waterState(depthCm: number | null | undefined): WaterState {
  if (depthCm === null || depthCm === undefined || Number.isNaN(depthCm)) return "unknown";
  if (depthCm < 2) return "critical";
  if (depthCm < 5) return "low";
  if (depthCm <= 12) return "optimal";
  return "excess";
}

export const WATER_STATE_LABEL: Record<WaterState, string> = {
  critical: "Critical — irrigate now",
  low: "Low — irrigate soon",
  optimal: "Optimal",
  excess: "Excess — drain",
  unknown: "No reading yet",
};

/** Growing degree days for rice: base 10 °C, capped at 30 °C. */
export function dailyGdd(tempMax: number, tempMin: number) {
  const mean = (tempMax + tempMin) / 2;
  return Math.max(0, Math.min(30, mean) - 10);
}

export function sumGdd(days: { tempMax: number; tempMin: number }[]) {
  return days.reduce((total, day) => total + dailyGdd(day.tempMax, day.tempMin), 0);
}

export type ForecastInput = {
  areaHa: number;
  maturityDays?: number | null;
  potentialYieldTha?: number | null;
  targetYieldTha?: number | null;
  nRequirementKgHa?: number | null;
  nAppliedKg?: number | null;
  plantingDate?: Date | null;
  expectedHarvestDate?: Date | null;
  harvestDate?: Date | null;
  actualYieldKg?: number | null;
  method?: string | null;
  irrigationType?: string | null;
  water?: WaterState;
  seasonRainMm?: number | null;
  openIssues?: { severity: number; affectedPct?: number | null }[];
  pricePerKg?: number | null;
  today?: Date;
};

export function forecastSeason(input: ForecastInput): SeasonForecast {
  const today = input.today ?? new Date();
  const maturityDays = input.maturityDays ?? DEFAULT_MATURITY_DAYS;
  const potentialYieldTha = input.potentialYieldTha ?? input.targetYieldTha ?? DEFAULT_POTENTIAL_YIELD_THA;
  const planted = input.plantingDate ?? null;
  const daysAfterPlanting = planted ? daysBetween(planted, today) : null;
  const stage = growthStage(daysAfterPlanting, maturityDays);
  const progress = clamp(Math.max(stage.progress, 0), 0, 1);
  const warnings: string[] = [];

  const baseHarvest =
    input.harvestDate ??
    input.expectedHarvestDate ??
    (planted ? addDays(planted, maturityDays) : null);
  const daysToHarvest = baseHarvest ? daysBetween(today, baseHarvest) : null;

  // Water stress. Rainfed paddies depend on seasonal rainfall; irrigated ones
  // depend on the latest measured depth.
  const rainfed = (input.irrigationType ?? "Irrigated").toLowerCase().includes("rainfed");
  let waterFactor = 0.95;
  let waterDetail = "No water reading — assuming adequate supply.";
  if (input.water && input.water !== "unknown") {
    waterFactor =
      input.water === "optimal" ? 1 : input.water === "low" ? 0.9 : input.water === "excess" ? 0.95 : 0.72;
    waterDetail = `Latest paddy status: ${WATER_STATE_LABEL[input.water]}.`;
  } else if (rainfed) {
    const rain = input.seasonRainMm ?? 0;
    waterFactor = clamp(rain / 900, 0.6, 1);
    waterDetail = `${Math.round(rain)} mm seasonal rainfall vs ~900 mm rice requirement.`;
    if (rain < 500) warnings.push("Low seasonal rainfall for a rainfed paddy.");
  } else {
    waterDetail = "Irrigated paddy; no recent water-depth log.";
    warnings.push("Log water depth to improve the water-stress estimate.");
  }
  if (input.water === "critical") warnings.push("Paddy is below 2 cm — yield is at risk.");
  if (input.water === "excess") warnings.push("Water is deeper than 12 cm — check drainage.");

  // Nitrogen. 70% of potential with no N, full potential at the variety's
  // recommended rate.
  const nRequired = input.nRequirementKgHa ?? 120;
  let nutrientFactor = 0.95;
  let nutrientDetail = "No nitrogen record — assuming recommended rate.";
  if (input.nAppliedKg !== null && input.nAppliedKg !== undefined) {
    nutrientFactor = 0.7 + 0.3 * clamp(input.nAppliedKg / Math.max(1, nRequired), 0, 1);
    nutrientDetail = `${input.nAppliedKg} kg N/ha applied of ${nRequired} kg/ha recommended.`;
    if (input.nAppliedKg < nRequired * 0.6) warnings.push("Nitrogen is well below the recommendation.");
  }

  // Pest and disease pressure from open scouting records.
  const issues = input.openIssues ?? [];
  const pressure = issues.reduce(
    (total, issue) => total + (clamp(issue.severity, 1, 5) / 5) * (clamp(issue.affectedPct ?? 10, 0, 100) / 100),
    0,
  );
  const healthFactor = clamp(1 - pressure * 0.35, 0.55, 1);
  if (pressure > 0.2) warnings.push("Open pest/disease records are reducing the forecast.");

  const methodFactor = (input.method ?? "").toLowerCase().includes("direct") ? 0.97 : 1;

  const forecastYieldTha = clamp(
    potentialYieldTha * waterFactor * nutrientFactor * healthFactor * methodFactor,
    0.5,
    potentialYieldTha * 1.05,
  );
  const forecastKg = forecastYieldTha * input.areaHa * 1000;

  // Uncertainty is wide at planting and narrows as the crop matures.
  let confidencePct = 8 + 14 * (1 - progress);
  if (!planted) confidencePct += 10;
  if (!input.water || input.water === "unknown") confidencePct += 4;
  if (input.nAppliedKg === null || input.nAppliedKg === undefined) confidencePct += 3;
  confidencePct = Math.round(clamp(confidencePct, 8, 40));

  const factors: ForecastFactor[] = [
    {
      label: "Variety potential",
      value: potentialYieldTha,
      detail: `${potentialYieldTha.toFixed(2)} t/ha with good management.`,
    },
    { label: "Water", value: waterFactor, detail: waterDetail },
    { label: "Nitrogen", value: nutrientFactor, detail: nutrientDetail },
    {
      label: "Pest & disease",
      value: healthFactor,
      detail: issues.length
        ? `${issues.length} open record(s); pressure score ${pressure.toFixed(2)}.`
        : "No open pest or disease records.",
    },
    ...(methodFactor < 1
      ? [{ label: "Establishment", value: methodFactor, detail: "Direct seeding: slightly lower establishment factor." }]
      : []),
  ];

  if (!planted) warnings.push("Add a planting date for a stage and harvest-date forecast.");
  if (!input.potentialYieldTha && !input.targetYieldTha) {
    warnings.push("Pick a variety to use its maturity and yield reference.");
  }

  return {
    daysAfterPlanting,
    daysToHarvest,
    maturityDays,
    progress,
    stage,
    potentialYieldTha,
    forecastYieldTha,
    forecastKg,
    lowKg: forecastKg * (1 - confidencePct / 100),
    highKg: forecastKg * (1 + confidencePct / 100),
    confidencePct,
    harvestDate: baseHarvest,
    factors,
    warnings,
  };
}

export type WaterBalanceInput = {
  latestDepthCm: number | null;
  targetDepthCm?: number;
  seepageMmPerDay?: number;
  forecast: { date: string; rainMm: number; et0Mm: number }[];
  irrigationMm?: number;
};

export type WaterBalance = {
  projectedDepthCm: number;
  daysUntilCritical: number | null;
  irrigationNeededMm: number;
  totalRainMm: number;
  totalEtMm: number;
  status: WaterState;
};

/**
 * Daily paddy water balance: depth + rain + irrigation − ET − seepage.
 * Depths are in cm, water amounts in mm (10 mm = 1 cm).
 */
export function projectWaterBalance(input: WaterBalanceInput): WaterBalance {
  const target = input.targetDepthCm ?? 5;
  const seepage = input.seepageMmPerDay ?? 2.5;
  let depth = input.latestDepthCm ?? 0;
  let daysUntilCritical: number | null = depth < 2 ? 0 : null;
  let totalRainMm = 0;
  let totalEtMm = 0;

  input.forecast.forEach((day, index) => {
    totalRainMm += day.rainMm;
    totalEtMm += day.et0Mm;
    depth += (day.rainMm - day.et0Mm - seepage) / 10;
    depth = Math.max(0, depth);
    if (daysUntilCritical === null && depth < 2) daysUntilCritical = index + 1;
  });

  const irrigationNeededMm = Math.max(0, (target - depth) * 10);

  return {
    projectedDepthCm: depth,
    daysUntilCritical,
    irrigationNeededMm,
    totalRainMm,
    totalEtMm,
    status: waterState(depth),
  };
}

/** Simple reference: rice uses roughly 4–6 mm/day at mid-season. */
export function referenceEtMm(dayNumber: number, maturityDays = 114) {
  const progress = clamp(dayNumber / Math.max(1, maturityDays), 0, 1);
  if (progress < 0.15) return 3.2;
  if (progress < 0.45) return 4.2;
  if (progress < 0.75) return 5.2;
  return 4.6;
}

/** Converts grams of paddy at a moisture content to 14% moisture weight. */
export function normalizeMoistureKg(weightKg: number, moisturePct: number | null | undefined) {
  if (!moisturePct) return weightKg;
  return weightKg * ((100 - moisturePct) / (100 - 14));
}

export function yieldThaFromKg(kg: number | null | undefined, areaHa: number) {
  if (!kg || areaHa <= 0) return 0;
  return kg / 1000 / areaHa;
}
