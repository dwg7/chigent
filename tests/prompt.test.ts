import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { checkPrompt, INSTRUCTIONS_LIMIT } from "../src/prompt-check.ts";
import { INDEX_BASE_URL } from "../src/search-index.ts";

const text = readFileSync(new URL("../prompt/chigent.md", import.meta.url), "utf8");
const report = checkPrompt(text);

test("prompt fits the instructions limit with margin", () => {
  assert.ok(report.length < INSTRUCTIONS_LIMIT * 0.95, `length ${report.length}`);
});

test("every example URL in the prompt is valid", () => {
  assert.ok(report.urls.length >= 2);
  for (const u of report.urls) assert.ok(u.ok, `${u.url} ${u.issues.join(",")}`);
});

test("every ID listed in the table exists in layers.txt (exact case)", () => {
  assert.deepEqual(report.unknownIds, []);
});

test("prompt keeps the rules that matter", () => {
  for (const must of ["/&", "%7C", "layers-martin", "大文字小文字", "座標は推定", "blend=00", "市役所"]) assert.ok(text.includes(must), must);
});

test("the prompt points to the published search index (same URL as the generator)", () => {
  assert.ok(text.includes(INDEX_BASE_URL + "router.txt"));
});

test("the prompt no longer asks to fetch the whole catalog", () => {
  assert.ok(!/catalogを取得|catalog.*取得して/.test(text.replace("catalog全体は大きすぎて途中で切れるので取得しない", "")));
});
