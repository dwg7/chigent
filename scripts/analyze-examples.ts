/**
 * data/examples.jsonl を MapIntent にかけ、レイヤーの使用頻度を出どころの種類別に数える。
 *   node scripts/analyze-examples.ts [data/examples/ または .jsonl]
 * 一覧型は「存在する」根拠にしかならないので、使用頻度には数えず別に出す(CLAUDE.md 柱 4・5)。
 */
import { readdirSync, readFileSync } from "node:fs";
import { buildGsiUrl, parseGsiUrl } from "../src/gsi-url.ts";
import { loadLayerIndex, validate } from "../src/layers.ts";

const path = process.argv[2] ?? "data/examples/";
const files = path.endsWith(".jsonl") ? [path] : readdirSync(path).filter((f) => f.endsWith(".jsonl")).map((f) => path.replace(/\/?$/, "/") + f);
const rows = files.flatMap((f) => readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)));
const index = loadLayerIndex();

const byType: Record<string, number> = {};
let parseFail = 0, roundtripDiff = 0;
// 層ごとに「リンク数」と「ページ数」を数える。1 ページに同じ製品のリンクが数百あることがあり、
// リンク数だけだと偏るので、核の判断にはページ数(と、そのページ内のリンク数の上限付き和)を見る。
interface Count { links: number; pages: Set<string> }
const layerCount: Record<string, Record<string, Count>> = {};
const problems: string[] = [];
const seen = new Set<string>();
for (const r of rows) {
  byType[r.sourceType] = (byType[r.sourceType] ?? 0) + 1;
  let p;
  try { p = parseGsiUrl(r.url); } catch (e) { parseFail++; problems.push(`parse: ${r.url} ${e}`); continue; }
  const back = parseGsiUrl(buildGsiUrl(p.intent)).intent;
  if (JSON.stringify(back) !== JSON.stringify(p.intent)) { roundtripDiff++; problems.push(`roundtrip: ${r.url}`); }
  for (const w of p.warnings) problems.push(`warn: ${w} <- ${r.pageUrl} ${r.linkText}`);
  for (const i of validate(p.intent, index).issues) if (i.level !== "info") problems.push(`${i.level}: ${i.code} ${i.message} <- ${r.url}`);
  const key = r.pageUrl + "\t" + r.url;
  if (seen.has(key)) continue;
  seen.add(key);
  const t = (layerCount[r.sourceType] ??= {});
  for (const l of p.intent.map.layers) {
    const c = (t[l.id] ??= { links: 0, pages: new Set() });
    c.links++;
    c.pages.add(r.pageUrl);
  }
}
console.log("links by type:", byType, "parseFail:", parseFail, "roundtripDiff:", roundtripDiff);
const top = Number(process.env.TOP ?? 40);
for (const [type, counts] of Object.entries(layerCount)) {
  console.log(`\n## ${type}  (links / pages)`);
  for (const [id, c] of Object.entries(counts).sort((a, b) => b[1].pages.size - a[1].pages.size || b[1].links - a[1].links).slice(0, top)) {
    console.log(String(c.links).padStart(4), String(c.pages.size).padStart(3), id, "-", index.layers[id]?.t ?? "(not in layers.txt)");
  }
}
if (problems.length) {
  const kinds: Record<string, number> = {};
  for (const p of problems) { const k = p.replace(/\u0027[^\u0027]*\u0027/g, "\u0027…\u0027").replace(/ <-.*/, ""); kinds[k] = (kinds[k] ?? 0) + 1; }
  console.log("\nproblems (grouped):");
  for (const [k, n] of Object.entries(kinds).sort((a, b) => b[1] - a[1]).slice(0, 25)) console.log(String(n).padStart(4), k);
}
