import test from "node:test";
import assert from "node:assert/strict";
import { parseCsv, parseCsvDate, parseCsvNumber, rowsToObjects, toCsv } from "../src/lib/csv.ts";

test("parseCsv handles quotes, escaped quotes, and CRLF", () => {
  const rows = parseCsv('date,description,amount\r\n2026-11-02,"2 sacks, urea",3500\r\n2026-11-03,"He said ""ok""",12.5\r\n');
  assert.deepEqual(rows, [
    ["date", "description", "amount"],
    ["2026-11-02", "2 sacks, urea", "3500"],
    ["2026-11-03", 'He said "ok"', "12.5"],
  ]);
});

test("parseCsv ignores blank rows and a BOM", () => {
  assert.deepEqual(parseCsv("\uFEFFa,b\n\n1,2\n"), [
    ["a", "b"],
    ["1", "2"],
  ]);
});

test("rowsToObjects lowercases headers", () => {
  assert.deepEqual(rowsToObjects([["Date", "Amount"], ["2026-11-02", "10"]]), [
    { date: "2026-11-02", amount: "10" },
  ]);
});

test("parseCsvNumber accepts peso signs and commas", () => {
  assert.equal(parseCsvNumber("₱3,500.50"), 3500.5);
  assert.equal(parseCsvNumber("not money"), null);
  assert.equal(parseCsvNumber(undefined), null);
});

test("parseCsvDate parses date-only values", () => {
  const parsed = parseCsvDate("2026-11-02");
  assert.ok(parsed);
  assert.equal(parsed.getFullYear(), 2026);
  assert.equal(parsed.getMonth(), 10);
  assert.equal(parsed.getDate(), 2);
  assert.equal(parseCsvDate(""), null);
});

test("toCsv quotes fields that need it", () => {
  assert.equal(toCsv([["a", 'b,"c"']]), 'a,"b,""c"""');
});
