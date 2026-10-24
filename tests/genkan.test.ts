import { test } from "node:test";
import assert from "node:assert/strict";
import {
  GENKAN_BASE_IDS,
  buildGenkanUrl,
  fromGsiIntent,
  genkanToGsiUrl,
  parseGenkan,
  summarize,
  toGsiIntent,
} from "../src/genkan.ts";
import { BASE_IDS, loadLayerIndex, validate } from "../src/layers.ts";
import { buildGsiUrl, parseGsiUrl } from "../src/gsi-url.ts";

const G = "https://dwg7.unopengis.org/chigent/genkan/";
const ok = (s: string) => {
  const r = parseGenkan(s);
  assert.ok(r.intent, `no intent: ${r.problems.join("; ")}`);
  return r;
};

test("the base map ids agree with layers.ts", () => {
  assert.deepEqual([...GENKAN_BASE_IDS].sort(), [...BASE_IDS].sort());
});

test("basic form: position, then /&, then key=value pairs", () => {
  const { intent, warnings } = ok(`${G}#14/36.228823/137.586174/&l=vlcd_yakedake`);
  assert.deepEqual(intent!.view, { zoom: 14, lat: 36.228823, lon: 137.586174 });
  assert.equal(intent!.base, "std");
  assert.deepEqual(intent!.overlays, ["vlcd_yakedake"]);
  assert.deepEqual(warnings, []);
});

test("the contract converts to exactly the URL the core prompt teaches (n=2 and n=3)", () => {
  assert.equal(
    genkanToGsiUrl(`${G}#14/36.228823/137.586174/&l=vlcd_yakedake`).url,
    "https://maps.gsi.go.jp/#14/36.228823/137.586174/&base=std&ls=std%7Cvlcd_yakedake&blend=0&disp=11&lcd=vlcd_yakedake&vs=c1g1j0h0k0l0u0t0z0r0s0m0f1&d=m",
  );
  assert.equal(
    genkanToGsiUrl(`${G}#13/34.3853/132.4553/&l=05_dosekiryukeikaikuiki,05_kyukeishakeikaikuiki`).url,
    "https://maps.gsi.go.jp/#13/34.385300/132.455300/&base=std&ls=std%7C05_dosekiryukeikaikuiki%7C05_kyukeishakeikaikuiki&blend=00&disp=111&lcd=05_kyukeishakeikaikuiki&vs=c1g1j0h0k0l0u0t0z0r0s0m0f1&d=m",
  );
});

test("background only (n=1): no blend, disp=1, lcd=background", () => {
  assert.equal(
    genkanToGsiUrl(`${G}#14/42.222534/143.316803`).url,
    "https://maps.gsi.go.jp/#14/42.222534/143.316803/&base=std&ls=std&disp=1&lcd=std&vs=c1g1j0h0k0l0u0t0z0r0s0m0f1&d=m",
  );
});

test("b selects another background; a base id in l is moved out (liberal)", () => {
  const a = ok(`${G}#12/35/139/&b=pale&l=relief`);
  assert.equal(a.intent!.base, "pale");
  const b = ok(`${G}#12/35/139/&l=pale,relief`);
  assert.equal(b.intent!.base, "std");
  assert.deepEqual(b.intent!.overlays, ["relief"]);
  assert.ok(b.warnings.length > 0);
});

test("the consumer is liberal about the separator after the position", () => {
  const want = ok(`${G}#14/36/137/&l=a1`).intent;
  for (const s of [`${G}#14/36/137&l=a1`, `${G}#14/36/137/?l=a1`, `${G}#14/36/137?l=a1`, `#14/36/137/&l=a1`]) {
    assert.deepEqual(ok(s).intent, want, s);
  }
});

test("repeated l and a trailing comma are tolerated and keep their order", () => {
  const r = ok(`${G}#14/36/137/&l=a1,a2&l=a3,`);
  assert.deepEqual(r.intent!.overlays, ["a1", "a2", "a3"]);
});

test("duplicate overlays are dropped once, unknown parameters are ignored", () => {
  const r = ok(`${G}#14/36/137/&l=a1,a1&zzz=1&m=g`);
  assert.deepEqual(r.intent!.overlays, ["a1"]);
  assert.equal(r.intent!.mode, "g");
});

test("GSI's own names are read as input (ls = background first, base)", () => {
  const a = ok(`${G}#14/36/137/&ls=std,vlcd_yakedake`);
  assert.equal(a.intent!.base, "std");
  assert.deepEqual(a.intent!.overlays, ["vlcd_yakedake"]);
  const b = ok(`${G}#14/36/137/&base=pale&ls=pale%7Crelief`);
  assert.equal(b.intent!.base, "pale");
  assert.deepEqual(b.intent!.overlays, ["relief"]);
});

test("b=seamlessphoto is read as b=ort (the photo base map, same tiles); any other non-base id in b becomes an overlay", () => {
  const r = ok(`${G}#15/32.8/130.7/&b=seamlessphoto`);
  assert.equal(r.intent!.base, "ort");
  assert.deepEqual(r.intent!.overlays, []);
  assert.ok(r.warnings.length > 0);
  const o = ok(`${G}#15/32.8/130.7/&b=relief`);
  assert.equal(o.intent!.base, "std");
  assert.deepEqual(o.intent!.overlays, ["relief"]);
});

test("the photo base map is ort: it builds base=ort&ls=ort, as GSI itself writes it", () => {
  assert.equal(
    genkanToGsiUrl(`${G}#15/32.8064/130.7058/&b=ort`).url,
    "https://maps.gsi.go.jp/#15/32.806400/130.705800/&base=ort&ls=ort&disp=1&lcd=ort&vs=c1g1j0h0k0l0u0t0z0r0s0m0f1&d=m",
  );
  assert.match(summarize(ok(`${G}#15/32.8/130.7/&b=ort`).intent!).text, /^写真、/);
});

test("latitude and longitude written the wrong way round are fixed when only one order is possible", () => {
  const r = ok(`${G}#14/137.586174/36.228823/&l=a1`);
  assert.deepEqual(r.intent!.view, { zoom: 14, lat: 36.228823, lon: 137.586174 });
  assert.ok(r.warnings.some((w) => /swap|入れ替/.test(w)));
});

test("a missing or broken position is a problem, never a silent guess", () => {
  for (const s of [`${G}`, `${G}#`, `${G}#&l=a1`, `${G}#14/36`, `${G}#x/36/137`, `${G}#14/abc/137`, `${G}#14/95/200`]) {
    const r = parseGenkan(s);
    assert.equal(r.intent, undefined, s);
    assert.ok(r.problems.length > 0, s);
  }
});

test("zoom is clamped to 0..18 with a warning; a fractional zoom is rounded", () => {
  assert.equal(ok(`${G}#25/36/137`).intent!.view.zoom, 18);
  assert.ok(ok(`${G}#25/36/137`).warnings.length > 0);
  assert.equal(ok(`${G}#13.6/36/137`).intent!.view.zoom, 14);
});

test("percent-encoded input is decoded; hostile input cannot add GSI parameters", () => {
  const r = ok(`${G}#14/36/137/&l=a1%26base%3Dblank,b2`);
  assert.deepEqual(r.intent!.overlays, ["a1&base=blank", "b2"]);
  const url = genkanToGsiUrl(`${G}#14/36/137/&l=a1%26base%3Dblank,b2`).url!;
  const back = parseGsiUrl(url).intent;
  assert.equal(back.map.base, "std"); // ls の中に閉じ込められ、base にはならない
  assert.deepEqual(back.map.layers.map((l) => l.id), ["std", "a1&base=blank", "b2"]);
});

test("the intent builds a URL that parses back to the same background and overlays", () => {
  const { intent } = ok(`${G}#12/35/139/&b=pale&l=relief,hillshademap`);
  const gsi = toGsiIntent(intent!);
  const back = fromGsiIntent(parseGsiUrl(buildGsiUrl(gsi)).intent);
  const { mode: _m, ...want } = intent!;
  assert.deepEqual(back, want);
});

test("fromGsiIntent refuses what the contract cannot say (base differs from ls[0])", () => {
  const gsi = parseGsiUrl("https://maps.gsi.go.jp/#14/36/137/&base=std&ls=pale%7Crelief&disp=11").intent;
  assert.equal(fromGsiIntent(gsi), undefined);
});

test("buildGenkanUrl omits b when it is std and writes l with commas", () => {
  assert.equal(
    buildGenkanUrl({ view: { zoom: 14, lat: 36.2288, lon: 137.5862 }, base: "std", overlays: ["a1", "b2"] }),
    `${G}#14/36.228800/137.586200/&l=a1,b2`,
  );
  assert.equal(
    buildGenkanUrl({ view: { zoom: 5, lat: 36, lon: 140 }, base: "pale", overlays: [] }),
    `${G}#5/36.000000/140.000000/&b=pale`,
  );
});

test("the links we write are fixed points of the WHATWG URL parser (clean URL)", () => {
  for (const i of [
    { view: { zoom: 14, lat: 36.2288, lon: 137.5862 }, base: "std", overlays: ["vlcd_yakedake", "2013_s-ortho_asosan"] },
    { view: { zoom: 5, lat: 36, lon: 140 }, base: "pale", overlays: [] },
  ]) {
    const s = buildGenkanUrl(i);
    assert.equal(new URL(s).href, s);
  }
});

test("known ids: every id the contract passes through is checked against the layer table", () => {
  const index = loadLayerIndex();
  const { intent } = ok(`${G}#14/36.228823/137.586174/&l=vlcd_yakedake,nonexistent_layer`);
  const lookup = (id: string) => (index.layers[id] ? id : undefined);
  const res = summarize(intent!, { lookup, title: (id) => index.layers[id]?.t });
  assert.deepEqual(res.unknownIds, ["nonexistent_layer"]);
  assert.match(res.text, /標準地図/);
  assert.match(res.text, /焼岳/);
  assert.match(res.text, /ズーム14/);
});

test("ids are matched case-insensitively against the table and written in canonical case", () => {
  const index = loadLayerIndex();
  const key = Object.keys(index.layers).find((k) => /[A-Z]/.test(k))!;
  const { intent } = ok(`${G}#14/36/137/&l=${key.toLowerCase()}`);
  const lowerMap = new Map(Object.keys(index.layers).map((k) => [k.toLowerCase(), k]));
  const res = summarize(intent!, { lookup: (id) => lowerMap.get(id.toLowerCase()), title: (id) => index.layers[id]?.t });
  assert.deepEqual(res.canonicalOverlays, [key]);
  assert.deepEqual(res.unknownIds, []);
});

test("the URL built for a valid contract passes the existing validator", () => {
  const index = loadLayerIndex();
  const url = genkanToGsiUrl(`${G}#14/36.228823/137.586174/&l=vlcd_yakedake`).url!;
  const v = validate(parseGsiUrl(url).intent, index);
  assert.ok(v.ok, JSON.stringify(v.issues));
});
