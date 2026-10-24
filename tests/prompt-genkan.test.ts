import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { checkPrompt, INSTRUCTIONS_LIMIT } from "../src/prompt-check.ts";
import { GENKAN_ORIGIN, genkanToGsiUrl } from "../src/genkan.ts";
import { INDEX_BASE_URL } from "../src/search-index.ts";
import { loadLayerIndex, validate } from "../src/layers.ts";
import { parseGsiUrl } from "../src/gsi-url.ts";

const read = (f: string) => readFileSync(new URL(`../prompt/${f}`, import.meta.url), "utf8");
const text = read("genkan.md");
const core = read("chigent.md");
const index = loadLayerIndex();
const section = (t: string, head: string) => new RegExp(`${head}[\\s\\S]*?(?=\\n## |$)`).exec(t)?.[0] ?? "";

test("the genkan prompt fits the instructions limit with margin, and is shorter than the core prompt", () => {
  const n = [...text].length;
  assert.ok(n < INSTRUCTIONS_LIMIT * 0.95, `length ${n}`);
  assert.ok(n < [...core].length, "genkan.md should not be longer than chigent.md");
});

test("every example link in the genkan prompt converts to a valid GSI URL", () => {
  const links = [...text.matchAll(/https:\/\/dwg7\.unopengis\.org\/chigent\/genkan\/#[^\s)]+/g)].map((m) => m[0]).filter((u) => !/[{}]/.test(u));
  assert.ok(links.length >= 2);
  for (const l of links) {
    const r = genkanToGsiUrl(l);
    assert.ok(r.url, `${l}: ${r.problems.join(";")}`);
    assert.deepEqual(r.warnings, [], l);
    const v = validate(parseGsiUrl(r.url!).intent, index);
    assert.ok(v.ok, `${l}: ${JSON.stringify(v.issues)}`);
  }
});

test("the ids in the genkan prompt's table exist (same check as the core prompt)", () => {
  assert.deepEqual(checkPrompt(text, index).unknownIds, []);
});

test("the table and the steps are the same as in the core prompt (no drift)", () => {
  assert.equal(section(text, "## よく使う地図のID"), section(core, "## よく使う地図のID"));
  const steps = (t: string) => section(t, "## 進め方").split("\n").filter((l) => /^[1-4]\. /.test(l));
  assert.deepEqual(steps(text), steps(core));
});

test("the genkan prompt teaches the contract and not the GSI parameters", () => {
  assert.ok(text.includes(GENKAN_ORIGIN + "#"));
  assert.ok(text.includes("/&"));
  assert.ok(text.includes(INDEX_BASE_URL + "router.txt"));
  const form = section(text, "## リンクの形");
  assert.ok(!/blend=|disp=|lcd=|vs=|%7C/.test(form), "GSI-only parameters in the form section");
  assert.ok(!/maps\.gsi\.go\.jp\/#/.test(text), "a raw GSI URL in the prompt");
});
