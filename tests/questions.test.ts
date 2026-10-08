import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gradeAnswer, type QuestionCase } from "../src/grade.ts";
import { loadLayerIndex } from "../src/layers.ts";

const cases: QuestionCase[] = JSON.parse(readFileSync(new URL("./questions/cases.json", import.meta.url), "utf8"));
const index = loadLayerIndex();
const byId = (id: string) => cases.find((c) => c.id === id)!;

const HAKONE = "https://maps.gsi.go.jp/#14/35.233184/139.021025/&base=std&ls=std%7Cvlcd_hakone&blend=0&disp=11&lcd=vlcd_hakone&vs=c1g1j0h0k0l0u0t0z0r0s0m0f1&d=m";
const KOTO = "https://maps.gsi.go.jp/#13/35.673180/139.817047/&base=std&ls=std%7C01_flood_l2_shinsuishin_data&blend=0&disp=11&lcd=01_flood_l2_shinsuishin_data&vs=c1g1j0h0k0l0u0t0z0r0s0m0f1&d=m";

test("cases are well-formed and reference real layers", () => {
  assert.equal(new Set(cases.map((c) => c.id)).size, cases.length);
  for (const c of cases) {
    assert.ok(c.question && c.basis, c.id);
    for (const id of [...(c.expect.layersAll ?? []), ...(c.expect.layersAny ?? []).flat()]) {
      assert.ok(index.layers[id], `${c.id}: unknown layer ${id}`);
    }
    if (c.expect.zoom) assert.ok(c.expect.zoom[0] <= c.expect.zoom[1], c.id);
  }
});

test("a known-good answer passes its case (grader sanity)", () => {
  assert.deepEqual(gradeAnswer(byId("hakone-volcano"), HAKONE, index).failures, []);
  assert.deepEqual(gradeAnswer(byId("koto-flood"), KOTO, index).failures, []);
});

test("grading catches wrong layer, wrong place, bad zoom, broken separator, extra overlays", () => {
  const hakone = byId("hakone-volcano");
  assert.ok(!gradeAnswer(hakone, HAKONE.replace("vlcd_hakone", "relief"), index).pass);
  assert.ok(!gradeAnswer(hakone, HAKONE.replace("35.233184/139.021025", "34.69/135.5"), index).pass);
  assert.ok(!gradeAnswer(hakone, HAKONE.replace("#14/", "#5/"), index).pass);
  assert.ok(!gradeAnswer(hakone, HAKONE.replace("139.021025/&", "139.021025&"), index).pass);
  assert.ok(!gradeAnswer(hakone, HAKONE.replace("ls=std%7Cvlcd_hakone", "ls=std%7Cvlcd_hakone%7Crelief%7Chillshademap").replace("disp=11", "disp=1111"), index).pass);
  assert.ok(!gradeAnswer(hakone, HAKONE.replace("vlcd_hakone", "Vlcd_Hakone"), index).pass);
});

test("noUrl cases: returning a URL fails, returning none passes", () => {
  assert.ok(gradeAnswer(byId("no-route"), null, index).pass);
  assert.ok(!gradeAnswer(byId("no-route"), HAKONE, index).pass);
  assert.ok(!gradeAnswer(hakoneCase(), null, index).pass);
  function hakoneCase() { return byId("hakone-volcano"); }
});

test("a wrong number of blend digits fails (found in round 1: blend=00 for a single overlay)", () => {
  assert.ok(!gradeAnswer(byId("koto-flood"), KOTO.replace("blend=0&", "blend=00&"), index).pass);
  assert.ok(!gradeAnswer(byId("koto-flood"), KOTO.replace("&blend=0", ""), index).pass);
  assert.ok(gradeAnswer(byId("koto-flood"), KOTO, index).pass);
});

test("orNoUrl and layersForbid", () => {
  const c = byId("nagoya-storm-surge");
  assert.ok(gradeAnswer(c, null, index).pass);
  const SHELTER = "https://maps.gsi.go.jp/#13/35.107777/136.885559/&base=std&ls=std%7Cskhb03&blend=0&disp=11&lcd=skhb03&vs=c1g1j0h0k0l0u0t0z0r0s0m0f1&d=m";
  assert.ok(gradeAnswer(c, SHELTER, index).pass);
  assert.ok(!gradeAnswer(c, SHELTER.replace("skhb03", "04_tsunami_newlegend_data"), index).pass);
  assert.ok(!gradeAnswer(byId("koto-flood"), null, index).pass);
});
