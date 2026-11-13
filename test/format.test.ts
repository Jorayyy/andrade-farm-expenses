import test from "node:test";
import assert from "node:assert/strict";
import { formatNumber, formatPeso, parseDateInput, toDateInput } from "../src/lib/format.ts";

test("parseDateInput rejects impossible dates", () => {
  assert.equal(parseDateInput("2026-02-31"), null);
  assert.equal(parseDateInput("2026-13-01"), null);
  assert.equal(parseDateInput("11/02/2026"), null);
});

test("parseDateInput keeps the farm calendar day", () => {
  const date = parseDateInput("2026-02-28");
  assert.ok(date);
  assert.equal(toDateInput(date), "2026-02-28");
});

test("money formatting accepts decimal-like values", () => {
  assert.match(formatPeso(3500.5), /3,500\.50/);
  assert.match(formatPeso({ toString: () => "12.5" }), /12\.50/);
  assert.equal(formatNumber(4), "4");
});
