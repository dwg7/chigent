import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildGsiUrl, effectiveBlend, parseGsiUrl, vsPairs } from "../../src/gsi-url.ts";
import { GsiUrlError } from "../../src/mapintent.ts";

const observed: Array<{ name: string; url: string; canonical: string }> = JSON.parse(
  readFileSync(new URL("./observed-urls.json", import.meta.url), "utf8"),
);

// ---- 観察済みの URL(往復の最初の材料) ----

for (const c of observed) {
  test(`observed: ${c.name}`, () => {
    const { intent, warnings } = parseGsiUrl(c.url);
    assert.deepEqual(warnings, []);
    // URL → MapIntent → URL が、表記の正規化(| → %7C)を除いて元に戻る
    assert.equal(buildGsiUrl(intent), c.canonical);
    // 意味の往復: parse(build(parse(u))) == parse(u)
    assert.deepEqual(parseGsiUrl(buildGsiUrl(intent)).intent, intent);
  });
}

test("observed #1: structure", () => {
  const { intent } = parseGsiUrl(observed[0].url);
  assert.deepEqual(intent.map, {
    view: { zoom: 5, lat: 36.104611, lon: 140.084556 },
    base: "std",
    layers: [
      { id: "std", opacity: 1, hidden: false },
      { id: "relief", opacity: 1, hidden: false },
    ],
  });
  assert.deepEqual(intent.screen, { lcd: "relief", vs: "c1j0h0k0l0u0t0z0r0s0m0f1", d: "vl", blend: "0" });
  assert.deepEqual(intent.extra, []);
});

test("observed #4: vs has g, f2", () => {
  const { intent } = parseGsiUrl(observed[3].url);
  assert.deepEqual(vsPairs(intent.screen.vs!).slice(0, 2), [["c", "1"], ["g", "1"]]);
  assert.deepEqual(vsPairs(intent.screen.vs!).at(-1), ["f", "2"]);
});

// ---- blend の既定値(blend= が無いとき ID に relief を含むと 1) ----

test("effectiveBlend: explicit blend=0 overrides the relief default", () => {
  assert.deepEqual(effectiveBlend(parseGsiUrl(observed[0].url).intent), [false]);
});

test("effectiveBlend: absent blend → relief-containing ids are 1", () => {
  const u = "https://maps.gsi.go.jp/#5/36/140/&base=std&ls=std%7Crelief%7Cgazo1&disp=111";
  assert.deepEqual(effectiveBlend(parseGsiUrl(u).intent), [true, false]);
});

// ---- ls / disp / 不透明度 ----

test("opacity and hidden layers round-trip", () => {
  const u = "https://maps.gsi.go.jp/#10/35.5/139.5/&base=std&ls=std%7Cgazo1%2C0.5%7Crelief%2C0.25&disp=101";
  const { intent, warnings } = parseGsiUrl(u);
  assert.deepEqual(warnings, []);
  assert.deepEqual(intent.map.layers, [
    { id: "std", opacity: 1, hidden: false },
    { id: "gazo1", opacity: 0.5, hidden: true },
    { id: "relief", opacity: 0.25, hidden: false },
  ]);
  assert.equal(buildGsiUrl(intent), u.replace("35.5/139.5", "35.500000/139.500000"));
  assert.deepEqual(parseGsiUrl(buildGsiUrl(intent)).intent, intent);
});

test("opacity: literal comma and %2C are the same; 0 and trailing zeros", () => {
  const a = parseGsiUrl("https://maps.gsi.go.jp/#5/36/140/&ls=std|a,0|b,0.50&disp=111").intent;
  const b = parseGsiUrl("https://maps.gsi.go.jp/#5/36/140/&ls=std%7Ca%2C0%7Cb%2C0.50&disp=111").intent;
  assert.deepEqual(a, b);
  assert.deepEqual(a.map.layers.map((l) => l.opacity), [1, 0, 0.5]);
  assert.match(buildGsiUrl(a), /ls=std%7Ca%2C0%7Cb%2C0\.5&/);
});

test("opacity that toFixed(2) cannot express is not truncated", () => {
  const { intent } = parseGsiUrl("https://maps.gsi.go.jp/#5/36/140/&ls=std|a,0.333&disp=11");
  assert.equal(intent.map.layers[1].opacity, 0.333);
  assert.deepEqual(parseGsiUrl(buildGsiUrl(intent)).intent, intent);
});

test("invalid opacity is ignored like gsimaps, with a warning", () => {
  const { intent, warnings } = parseGsiUrl("https://maps.gsi.go.jp/#5/36/140/&ls=std|a,2|b,x&disp=111");
  assert.deepEqual(intent.map.layers.map((l) => l.opacity), [1, 1, 1]);
  assert.equal(warnings.length, 2);
});

test("disp shorter than ls: missing digits mean visible; digits other than 0 mean visible", () => {
  const { intent } = parseGsiUrl("https://maps.gsi.go.jp/#5/36/140/&ls=std|a|b&disp=02");
  assert.deepEqual(intent.map.layers.map((l) => l.hidden), [true, false, false]);
});

test("empty ls element is skipped but disp keeps the original index", () => {
  const { intent, warnings } = parseGsiUrl("https://maps.gsi.go.jp/#5/36/140/&ls=std||b&disp=101");
  assert.equal(warnings.length, 1);
  assert.deepEqual(intent.map.layers, [
    { id: "std", opacity: 1, hidden: false },
    { id: "b", opacity: 1, hidden: false },
  ]);
});

// ---- 位置 ----

test("coordinates with more than 6 decimals are not rounded", () => {
  const { intent } = parseGsiUrl("https://maps.gsi.go.jp/#12/35.12345678/139.87654321/");
  assert.equal(intent.map.view.lat, 35.12345678);
  assert.equal(buildGsiUrl(intent), "https://maps.gsi.go.jp/#12/35.12345678/139.87654321/");
});

test("negative coordinates and short decimals", () => {
  const { intent } = parseGsiUrl("https://maps.gsi.go.jp/#3/-33.9/151.2/");
  assert.equal(buildGsiUrl(intent), "https://maps.gsi.go.jp/#3/-33.900000/151.200000/");
});

test("hash only (no origin) is accepted", () => {
  assert.equal(parseGsiUrl("#5/36/140/&base=std").intent.map.base, "std");
});

test("no options: position only", () => {
  const { intent, warnings } = parseGsiUrl("https://maps.gsi.go.jp/#5/36.104611/140.084556");
  assert.deepEqual(warnings, []);
  assert.equal(buildGsiUrl(intent), "https://maps.gsi.go.jp/#5/36.104611/140.084556/");
});

test("'&' without '/&': gsimaps ignores the options, and so do we (with a warning)", () => {
  const { intent, warnings } = parseGsiUrl("https://maps.gsi.go.jp/#5/36/140&base=std");
  assert.equal(intent.map.base, undefined);
  assert.equal(warnings.length, 1);
});

test("errors", () => {
  assert.throws(() => parseGsiUrl("https://maps.gsi.go.jp/"), GsiUrlError);
  assert.throws(() => parseGsiUrl("https://maps.gsi.go.jp/#5/36"), GsiUrlError);
  assert.throws(() => parseGsiUrl("https://maps.gsi.go.jp/#a/b/c/"), GsiUrlError);
});

// ---- 未モデル化パラメータの保持 ----

test("unknown / unmodeled params are preserved in order", () => {
  const u =
    "https://maps.gsi.go.jp/#5/36.000000/140.000000/&base=std&ls=std%7Cgazo1&disp=11&vs=c1f1&d=m" +
    "&sync=0&ll2=35.5%2C139.5%2C8&url1=https%3A%2F%2Fexample.com%2Fa.geojson%3Fx%3D1&flag";
  const { intent, warnings } = parseGsiUrl(u);
  assert.deepEqual(warnings, []);
  assert.deepEqual(intent.extra, [
    ["sync", "0"],
    ["ll2", "35.5,139.5,8"],
    ["url1", "https://example.com/a.geojson?x=1"],
    ["flag", null],
  ]);
  assert.equal(buildGsiUrl(intent), u);
});

test("base_grayscale and hc are modeled", () => {
  const u = "https://maps.gsi.go.jp/#5/36.000000/140.000000/&base=pale&base_grayscale=1&ls=pale&disp=1&hc=ih";
  assert.equal(buildGsiUrl(parseGsiUrl(u).intent), u);
});

test("duplicate known key: last wins, with a warning", () => {
  const { intent, warnings } = parseGsiUrl("https://maps.gsi.go.jp/#5/36/140/&base=std&base=pale");
  assert.equal(intent.map.base, "pale");
  assert.equal(warnings.length, 1);
});

// ---- ビルダー(MapIntent を直接組み立てる側) ----

test("build: invalid layers are rejected", () => {
  const mk = (id: string, opacity = 1) => ({
    dialect: "gsimaps" as const,
    map: { view: { zoom: 5, lat: 36, lon: 140 }, layers: [{ id, opacity, hidden: false }] },
    screen: {},
    extra: [],
  });
  assert.throws(() => buildGsiUrl(mk("a|b")), GsiUrlError);
  assert.throws(() => buildGsiUrl(mk("")), GsiUrlError);
  assert.throws(() => buildGsiUrl(mk("a", 1.5)), GsiUrlError);
});

test("build: a minimal intent produces a minimal URL", () => {
  const url = buildGsiUrl({
    dialect: "gsimaps",
    map: { view: { zoom: 14, lat: 35.7, lon: 139.7 }, base: "std", layers: [{ id: "std", opacity: 1, hidden: false }] },
    screen: {},
    extra: [],
  });
  assert.equal(url, "https://maps.gsi.go.jp/#14/35.700000/139.700000/&base=std&ls=std&disp=1");
});
