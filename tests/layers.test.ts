import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { BASE_IDS, loadLayerIndex, searchLayers, validate } from "../src/layers.ts";
import { parseGsiUrl } from "../src/gsi-url.ts";

const index = loadLayerIndex();
const observed: Array<{ url: string }> = JSON.parse(readFileSync(new URL("./roundtrip/observed-urls.json", import.meta.url), "utf8"));

test("index covers catalog and excluded layers", () => {
  assert.ok(Object.keys(index.layers).length > 13800);
  assert.equal(index.counts.catalog, 1876);
  for (const id of BASE_IDS) assert.equal(index.layers[id]?.s, "catalog", id);
});

test("observed URLs validate (GeoJSON layers are known but not in the catalog)", () => {
  for (const o of observed) {
    const r = validate(parseGsiUrl(o.url).intent, index);
    assert.equal(r.ok, true, JSON.stringify(r.issues));
    assert.equal(r.issues.filter((i) => i.level !== "info").length, 0, JSON.stringify(r.issues));
  }
  const r = validate(parseGsiUrl(observed[2].url).intent, index);
  assert.ok(r.issues.some((i) => i.code === "not_in_catalog" && i.message.includes("disaster_lore_all")));
});

test("validate: unknown layer, bad base, bad zoom, base not first", () => {
  const codes = (u: string) => validate(parseGsiUrl(u).intent, index).issues.map((i) => i.code);
  assert.ok(codes("#5/36/140/&base=std&ls=std|nonexistent_layer&disp=11").includes("unknown_layer"));
  assert.ok(codes("#5/36/140/&base=relief&ls=relief&disp=1").includes("unknown_base"));
  assert.ok(codes("#19/36/140/&base=std").includes("zoom_range"));
  assert.ok(codes("#5/36/140/&base=std&ls=relief&disp=1").includes("first_layer_not_base"));
  assert.ok(codes("#5/36/140/&base=std&ls=std|pale&disp=11").includes("base_in_overlay"));
});

test("searchLayers finds by Japanese title, id, and path", () => {
  assert.equal(searchLayers(index, "色別標高図")[0].id, "relief");
  assert.equal(searchLayers(index, "relief")[0].id, "relief");
  assert.ok(searchLayers(index, "洪水 浸水").every((h) => h.title.includes("洪水") || h.path.includes("洪水")));
  assert.ok(searchLayers(index, "自然災害伝承碑").some((h) => h.id === "disaster_lore_all"));
});

test("searchLayers hides SAR snapshots unless asked", () => {
  const q = "熊本地震";
  assert.ok(searchLayers(index, q, { limit: 1000 }).every((h) => !h.status.includes("sar_")));
  assert.ok(searchLayers(index, q, { limit: 1000, includeSnapshots: true }).some((h) => h.status.includes("sar_")));
  assert.deepEqual(searchLayers(index, "   "), []);
});

test("IDs keep their original case; wrong case is an error", () => {
  assert.ok(index.layers["DisasterHist_flood_tokyo"]);
  assert.ok(index.layers["ort_USA10"]);
  const r = validate(parseGsiUrl("#10/35.7/139.7/&base=std&ls=std|disasterhist_flood_tokyo&disp=11").intent, index);
  assert.ok(r.issues.some((i) => i.code === "layer_case_mismatch"));
});

test("LayerGroup ids are known (layers-martin drops them)", () => {
  assert.equal(index.layers["20160414kumamoto_ort_all"]?.s, "group");
  const r = validate(parseGsiUrl("#12/32.79/130.8/&base=std&ls=std|20160414kumamoto_ort_all&disp=11").intent, index);
  assert.equal(r.ok, true);
});

test("validate warns when the view zoom is outside the layer's range", () => {
  const z = index.layers["DisasterHist_flood_tokyo"].z!;
  const r = validate(parseGsiUrl(`#${z[1] + 1}/35.7/139.7/&base=std&ls=std|DisasterHist_flood_tokyo&disp=11`).intent, index);
  assert.ok(r.issues.some((i) => i.code === "zoom_outside_layer"));
});
