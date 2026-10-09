/**
 * タイルの有無の実測(scripts/probe-coverage.ts、DECISIONS.md D-020)から、「図がある範囲」の一覧を作る。
 * ズーム 9 のタイル(約 60 km 四方)のうち、図があるものを長方形にまとめ、緯度経度で書く。
 */
import { readdirSync, readFileSync } from "node:fs";
import type { LayerIndex } from "./layers.ts";

export const COVERAGE_BUDGET = 8000; // coverage.txt の上限(文字数)。節ファイルと同じ

export interface CoverageData {
  id: string;
  zEnd: number;
  present: Array<[number, number]>;
}

const lon = (x: number, z: number) => (x / 2 ** z) * 360 - 180;
const lat = (y: number, z: number) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / 2 ** z))) * 180) / Math.PI;
const r1 = (n: number) => (Math.round(n * 10) / 10).toFixed(1);

/** 図があるタイルを、長方形(タイルの x0,y0,x1,y1。端を含む)にまとめる。行ごとの連続区間を、縦に同じ区間でつなぐ。 */
export function rectangles(tiles: Array<[number, number]>): Array<[number, number, number, number]> {
  const rows = new Map<number, number[]>();
  for (const [x, y] of tiles) rows.set(y, [...(rows.get(y) ?? []), x]);
  const open = new Map<string, [number, number, number, number]>(); // "x0,x1" → 直前の行まで伸びている長方形
  const done: Array<[number, number, number, number]> = [];
  for (const y of [...rows.keys()].sort((a, b) => a - b)) {
    const runs: Array<[number, number]> = [];
    for (const x of rows.get(y)!.sort((a, b) => a - b)) {
      const l = runs[runs.length - 1];
      if (l && l[1] === x - 1) l[1] = x;
      else runs.push([x, x]);
    }
    const keys = new Set(runs.map(([a, b]) => `${a},${b}`));
    for (const [k, r] of [...open]) {
      if (r[3] !== y - 1 || !keys.has(k)) { done.push(r); open.delete(k); }
    }
    for (const [a, b] of runs) {
      const r = open.get(`${a},${b}`);
      if (r) r[3] = y;
      else open.set(`${a},${b}`, [a, y, b, y]);
    }
  }
  done.push(...open.values());
  return done.sort((p, q) => p[1] - q[1] || p[0] - q[0]);
}

/** ズームを 1 段下げて(タイルを 4 枚ずつまとめて)粗くする。 */
export function coarsen(tiles: Array<[number, number]>): Array<[number, number]> {
  return [...new Set(tiles.map(([x, y]) => `${x >> 1},${y >> 1}`))].map((s) => s.split(",").map(Number) as [number, number]);
}

export function describeCoverage(data: CoverageData, maxRects = 24): string {
  let z = data.zEnd;
  let tiles = data.present;
  let rects = rectangles(tiles);
  while (rects.length > maxRects && z > 6) {
    tiles = coarsen(tiles);
    z--;
    rects = rectangles(tiles);
  }
  return rects.map(([x0, y0, x1, y1]) => `[${r1(lon(x0, z))},${r1(lat(y1 + 1, z))},${r1(lon(x1 + 1, z))},${r1(lat(y0, z))}]`).join("");
}

export function buildCoverage(index: LayerIndex, all: CoverageData[], generatedAt: string): string {
  const lines = [
    "# chigent 図の整備範囲(実測)",
    `# 実測日: ${generatedAt.slice(0, 10)}。地理院のタイルサーバーで、図のタイルがあるかを調べた結果。`,
    "各行は「ID | タイトル | 図がある範囲[西,南,東,北](度)」。範囲は約60km四方(ズーム9)のタイルを長方形にまとめたもので、粗い。",
    "問いの場所(経度,緯度)がどの範囲にも入らなければ、その図は無い可能性が高い。範囲に入っても、その場所に図があるとは限らない。",
    "",
  ];
  for (const d of all.sort((a, b) => (a.id < b.id ? -1 : 1))) {
    const e = index.layers[d.id];
    lines.push(`${d.id} | ${e?.t ?? ""} | ${d.present.length === 0 ? "なし" : describeCoverage(d)}`);
  }
  return lines.join("\n") + "\n";
}

/** data/coverage/*.json を読む。 */
export function loadCoverage(dir = new URL("../data/coverage/", import.meta.url)): { files: CoverageData[]; generatedAt: string } {
  const files: CoverageData[] = [];
  let generatedAt = "";
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
    const j = JSON.parse(readFileSync(new URL(f, dir), "utf8"));
    files.push(j);
    if (j.generatedAt > generatedAt) generatedAt = j.generatedAt;
  }
  return { files, generatedAt };
}
