import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CAPABILITY_CHECKS, FIELD_FULL, FIELD_SHORT, capabilitySheet, sheet } from "../scripts/field-sheet.ts";

const cases: Array<{ id: string }> = JSON.parse(readFileSync(new URL("./questions/cases.json", import.meta.url), "utf8"));

test("every field-test question exists in the question set, once", () => {
  const ids = new Set(cases.map((c) => c.id));
  for (const f of FIELD_FULL) assert.ok(ids.has(f.id), f.id);
  assert.equal(new Set(FIELD_FULL.map((f) => f.id)).size, FIELD_FULL.length);
  assert.equal(FIELD_SHORT.length, 8);
  assert.equal(FIELD_FULL.length, 14);
  assert.deepEqual(FIELD_FULL.slice(0, 8), FIELD_SHORT);
});

test("the sheets have one row per question and per capability check", () => {
  assert.equal(sheet("short", false).trim().split("\n").length, 2 + 8);
  assert.equal(sheet("full", false).trim().split("\n").length, 2 + 14);
  assert.equal(capabilitySheet().trim().split("\n").length, 2 + CAPABILITY_CHECKS.length);
  const csv = sheet("short", true);
  assert.equal(csv.trim().split("\n").length, 1 + 8);
  assert.ok(csv.startsWith('"問いの id"'));
});

test("the field-test document names the same questions and the same sheet script", () => {
  const doc = readFileSync(new URL("../docs/field-test.md", import.meta.url), "utf8");
  for (const f of FIELD_FULL) assert.ok(doc.includes(f.id), `docs/field-test.md should mention ${f.id}`);
  assert.ok(doc.includes("scripts/field-sheet.ts"));
});
