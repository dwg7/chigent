import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCoverage, coarsen, describeCoverage, rectangles } from "../src/coverage.ts";
import { loadLayerIndex } from "../src/layers.ts";

test("rectangles: a solid block becomes one rectangle", () => {
  const tiles: Array<[number, number]> = [];
  for (let x = 10; x <= 12; x++) for (let y = 20; y <= 21; y++) tiles.push([x, y]);
  assert.deepEqual(rectangles(tiles), [[10, 20, 12, 21]]);
});

test("rectangles: an L shape and a separate tile cover exactly the same tiles", () => {
  const tiles: Array<[number, number]> = [[1, 1], [1, 2], [1, 3], [2, 3], [3, 3], [8, 8]];
  const covered = new Set(rectangles(tiles).flatMap(([x0, y0, x1, y1]) => {
    const out: string[] = [];
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) out.push(`${x},${y}`);
    return out;
  }));
  assert.deepEqual([...covered].sort(), tiles.map(([x, y]) => `${x},${y}`).sort());
});

test("rectangles: rows that are not adjacent do not merge", () => {
  assert.equal(rectangles([[5, 5], [5, 7]]).length, 2);
});

test("coarsen halves the tile grid", () => {
  assert.deepEqual(coarsen([[4, 6], [5, 7], [6, 6]]).sort(), [[2, 3], [3, 3]]);
});

test("describeCoverage writes [west,south,east,north] in degrees", () => {
  // ズーム 9 のタイル x=448 は経度 135.0〜135.7、y=203 は緯度 約 34.8〜34.4(大阪付近)
  const s = describeCoverage({ id: "x", zEnd: 9, present: [[448, 203]] });
  assert.match(s, /^\[135\.0,34\.\d,135\.\d,34\.\d\]$/);
});

test("coarsens until the list is short enough", () => {
  const tiles: Array<[number, number]> = [];
  for (let i = 0; i < 40; i++) tiles.push([100 + 2 * i, 200 + 2 * i]); // 斜めに離れた 40 枚
  const s = describeCoverage({ id: "x", zEnd: 9, present: tiles }, 24);
  assert.ok(s.split("][").length <= 24);
});

test("buildCoverage lists layers with their titles", () => {
  const index = loadLayerIndex();
  const text = buildCoverage(index, [{ id: "afm", zEnd: 9, present: [[448, 203]] }], "2026-10-09T00:00:00Z");
  assert.match(text, /^afm \| 活断層図（都市圏活断層図） \| \[/m);
});
