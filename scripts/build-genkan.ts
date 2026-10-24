/**
 * genkan(docs/genkan/)の生成物を作る。
 *   node scripts/build-genkan.ts
 * - src/ の TypeScript(mapintent / gsi-url / genkan)から、型だけを除いた JS を docs/genkan/ に出す(ブラウザ用)。
 *   コードは採点・テストと同じものを共有する(CLAUDE.md 柱 6)。import の拡張子は .ts → .js にする。
 * - 図の表 docs/genkan/layers.json: { ID: [タイトル, 最小ズーム|null, 最大ズーム|null] }。
 *   ページが大文字小文字の補正・存在確認・要約に使う(遅れて取得するので、無くても動く)。
 * `npm test` が、生成物とリポジトリの一致を確かめる(索引と同じ)。
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { loadLayerIndex } from "../src/layers.ts";

const SRC = new URL("../src/", import.meta.url);
const OUT = new URL("../docs/genkan/", import.meta.url);

export const MODULES = ["mapintent", "gsi-url", "genkan"] as const;

export function generatedModule(name: string): string {
  const ts = readFileSync(new URL(`${name}.ts`, SRC), "utf8");
  const js = stripTypeScriptTypes(ts, { mode: "strip" }).replace(/(from\s+["']\.\/[\w-]+)\.ts(["'])/g, "$1.js$2");
  return `// 生成物: scripts/build-genkan.ts が src/${name}.ts から作る。直接は編集しない。\n${js}`;
}

export function generatedLayers(): string {
  const index = loadLayerIndex();
  const out: Record<string, [string, number | null, number | null]> = {};
  for (const id of Object.keys(index.layers).sort()) {
    const e = index.layers[id];
    out[id] = [e.t, e.z?.[0] ?? null, e.z?.[1] ?? null];
  }
  return JSON.stringify(out);
}

if (import.meta.main) {
  mkdirSync(OUT, { recursive: true });
  for (const m of MODULES) writeFileSync(new URL(`${m}.js`, OUT), generatedModule(m));
  const layers = generatedLayers();
  writeFileSync(new URL("layers.json", OUT), layers);
  console.log(`docs/genkan: ${MODULES.length} modules, layers.json ${(layers.length / 1024).toFixed(0)} KiB (${Object.keys(JSON.parse(layers)).length} ids)`);
}
