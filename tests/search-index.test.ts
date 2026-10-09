import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { buildSearchIndex, ROUTER_BUDGET, SHARD_BUDGET } from "../src/search-index.ts";
import { loadLayerIndex } from "../src/layers.ts";
import { buildCoverage, COVERAGE_BUDGET, loadCoverage } from "../src/coverage.ts";

const index = loadLayerIndex();
const built = buildSearchIndex(index);
const dir = new URL("../docs/index/", import.meta.url);

test("every file stays within its budget (characters, not bytes)", () => {
  assert.ok([...built.router].length <= ROUTER_BUDGET, `router ${[...built.router].length}`);
  for (const s of built.shards) assert.ok([...s.text].length <= SHARD_BUDGET, `${s.name} ${[...s.text].length}`);
});

test("every non-SAR layer appears in exactly one shard, with its exact ID", () => {
  const seen = new Map<string, number>();
  for (const s of built.shards) {
    for (const line of s.text.split("\n")) {
      if (line.startsWith("#") || line === "") continue;
      const id = line.split(" | ")[0];
      seen.set(id, (seen.get(id) ?? 0) + 1);
    }
  }
  const want = Object.entries(index.layers).filter(([, e]) => !e.s.endsWith("snapshot")).map(([id]) => id);
  assert.equal(seen.size, want.length);
  for (const id of want) assert.equal(seen.get(id), 1, id);
  assert.equal(built.excluded, Object.keys(index.layers).length - want.length);
});

test("the router lists every shard once, with its count", () => {
  for (const s of built.shards) {
    const line = built.router.split("\n").find((l) => l.startsWith(`${s.name}.txt | `));
    assert.ok(line, s.name);
    assert.ok(line!.endsWith(` | ${s.items.length}件`), line);
  }
});

test("columns survive: GeoJSON layers are marked v, groups g, zoom and center are kept", () => {
  const all = built.shards.map((s) => s.text).join("\n");
  assert.match(all, /^20240106noto_suzu_wazimahigashi_0109rev \| .+ \| v$/m);
  assert.match(all, /^20160414kumamoto_ort_all \| .+ \| g$/m);
  assert.match(all, /^20240102noto_wazimanaka_0102do \| .+ \| z10-18 c37\.3475,136\.9432,14$/m);
  assert.match(all, /^DisasterHist_flood_tokyo \| /m); // 大文字小文字がそのまま
});

test("no title can break the column separator", () => {
  for (const s of built.shards) {
    for (const line of s.text.split("\n")) {
      if (line.startsWith("#") || line === "" ) continue;
      assert.equal(line.split(" | ").length, 3, line);
    }
  }
});

test("the published files in docs/index/ are up to date with the generator", () => {
  const cov = loadCoverage();
  const files = readdirSync(dir).filter((f) => /^(S\d+\.txt|router\.txt|coverage\.txt)$/.test(f)).sort();
  assert.deepEqual(files, ["router.txt", ...(cov.files.length ? ["coverage.txt"] : []), ...built.shards.map((s) => `${s.name}.txt`)].sort());
  if (cov.files.length) {
    const text = buildCoverage(index, cov.files, cov.generatedAt);
    assert.ok([...text].length <= COVERAGE_BUDGET, `coverage ${[...text].length}`);
    assert.equal(readFileSync(new URL("coverage.txt", dir), "utf8"), text);
  }
  assert.equal(readFileSync(new URL("router.txt", dir), "utf8"), built.router);
  for (const s of built.shards) assert.equal(readFileSync(new URL(`${s.name}.txt`, dir), "utf8"), s.text);
});
