import test from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  daysBetween,
  dailyGdd,
  forecastSeason,
  growthStage,
  normalizeMoistureKg,
  projectWaterBalance,
  waterState,
} from "../src/lib/agronomy.ts";

test("daysBetween and addDays use calendar days", () => {
  const start = new Date(2026, 0, 1);
  assert.equal(daysBetween(start, new Date(2026, 0, 11)), 10);
  assert.equal(daysBetween(new Date(2026, 0, 11), start), -10);
  assert.equal(addDays(start, 21).getDate(), 22);
});

test("growth stage follows days after planting", () => {
  assert.equal(growthStage(null, 114).key, "planned");
  assert.equal(growthStage(7, 114).key, "seedling");
  assert.equal(growthStage(40, 114).key, "vegetative");
  assert.equal(growthStage(60, 114).key, "reproductive");
  assert.equal(growthStage(100, 114).key, "ripening");
  assert.equal(growthStage(120, 114).key, "mature");
});

test("water state uses paddy depth thresholds", () => {
  assert.equal(waterState(null), "unknown");
  assert.equal(waterState(1.5), "critical");
  assert.equal(waterState(4), "low");
  assert.equal(waterState(7), "optimal");
  assert.equal(waterState(14), "excess");
});

test("growing degree days use a 10 C base and 30 C cap", () => {
  assert.equal(dailyGdd(32, 24), 18);
  assert.equal(dailyGdd(8, 4), 0);
  assert.equal(dailyGdd(40, 40), 20);
});

test("forecast is reduced by water and pest stress", () => {
  const base = forecastSeason({
    areaHa: 1,
    maturityDays: 114,
    potentialYieldTha: 6,
    nRequirementKgHa: 120,
    nAppliedKg: 120,
    plantingDate: addDays(new Date(), -60),
    irrigationType: "Irrigated",
    water: "optimal",
  });
  assert.ok(Math.abs(base.forecastYieldTha - 6) < 0.001);
  assert.equal(base.stage.key, "reproductive");
  assert.equal(base.confidencePct >= 8 && base.confidencePct <= 40, true);

  const dry = forecastSeason({
    areaHa: 1,
    maturityDays: 114,
    potentialYieldTha: 6,
    plantingDate: addDays(new Date(), -60),
    water: "critical",
  });
  assert.ok(dry.forecastYieldTha < base.forecastYieldTha);
  assert.ok(dry.warnings.some((warning) => warning.includes("below 2 cm")));

  const infested = forecastSeason({
    areaHa: 1,
    maturityDays: 114,
    potentialYieldTha: 6,
    plantingDate: addDays(new Date(), -60),
    water: "optimal",
    openIssues: [{ severity: 5, affectedPct: 100 }],
  });
  assert.ok(infested.forecastYieldTha < base.forecastYieldTha);
});

test("water balance drains without rain and holds with heavy rain", () => {
  const dryDays = Array.from({ length: 10 }, (_, index) => ({
    date: `2026-11-${String(index + 1).padStart(2, "0")}`,
    rainMm: 0,
    et0Mm: 4,
  }));
  const dry = projectWaterBalance({ latestDepthCm: 5, forecast: dryDays });
  assert.equal(dry.daysUntilCritical, 5);
  assert.equal(dry.projectedDepthCm, 0);
  assert.equal(dry.irrigationNeededMm, 50);

  const wetDays = Array.from({ length: 10 }, (_, index) => ({
    date: `2026-11-${String(index + 1).padStart(2, "0")}`,
    rainMm: 10,
    et0Mm: 4,
  }));
  const wet = projectWaterBalance({ latestDepthCm: 5, forecast: wetDays });
  assert.equal(wet.daysUntilCritical, null);
  assert.ok(wet.projectedDepthCm > 5);
  assert.equal(wet.irrigationNeededMm, 0);
});

test("harvest weight is normalised to 14% moisture", () => {
  assert.ok(Math.abs(normalizeMoistureKg(100, 20) - 93.023) < 0.01);
  assert.equal(normalizeMoistureKg(100, null), 100);
  assert.equal(normalizeMoistureKg(100, 14), 100);
});
