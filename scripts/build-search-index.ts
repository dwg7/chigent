/**
 * data/layers-index.json から、公開用の小さな索引 docs/index/ を作る(DECISIONS.md D-017)。
 *   node scripts/build-search-index.ts
 * docs/ は GitHub Pages で公開する想定(https://dwg7.unopengis.org/chigent/index/router.txt)。
 */
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { buildSearchIndex, ROUTER_BUDGET, SHARD_BUDGET } from "../src/search-index.ts";
import { loadLayerIndex } from "../src/layers.ts";
import { buildCoverage, COVERAGE_BUDGET, loadCoverage } from "../src/coverage.ts";

const out = new URL("../docs/index/", import.meta.url);
mkdirSync(out, { recursive: true });
for (const f of readdirSync(out)) if (/^(S\d+\.txt|router\.txt|coverage\.txt)$/.test(f)) rmSync(new URL(f, out));

const index = loadLayerIndex();
const files = buildSearchIndex(index);
writeFileSync(new URL("router.txt", out), files.router);
for (const s of files.shards) writeFileSync(new URL(`${s.name}.txt`, out), s.text);

const cov = loadCoverage();
if (cov.files.length > 0) {
  const text = buildCoverage(index, cov.files, cov.generatedAt);
  writeFileSync(new URL("coverage.txt", out), text);
  console.log(`coverage ${[...text].length}/${COVERAGE_BUDGET} chars, ${cov.files.length} layers`);
}

const max = Math.max(...files.shards.map((s) => [...s.text].length));
console.log(`router ${[...files.router].length}/${ROUTER_BUDGET} chars, ${files.shards.length} shards, largest ${max}/${SHARD_BUDGET}, excluded SAR ${files.excluded}`);
