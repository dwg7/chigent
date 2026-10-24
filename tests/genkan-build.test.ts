import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MODULES, generatedLayers, generatedModule } from "../scripts/build-genkan.ts";

const read = (f: string) => readFileSync(new URL(`../docs/genkan/${f}`, import.meta.url), "utf8");

test("the published browser modules are exactly what the generator makes from src/ (run scripts/build-genkan.ts)", () => {
  for (const m of MODULES) assert.equal(read(`${m}.js`), generatedModule(m), `${m}.js is stale`);
});

test("the published layer table is exactly what the generator makes from the layer index", () => {
  assert.equal(read("layers.json"), generatedLayers());
});

test("generated modules are plain browser JS: relative .js imports only, no node: imports, no type syntax left", () => {
  for (const m of MODULES) {
    const js = read(`${m}.js`);
    assert.ok(!/from\s+["']node:/.test(js), `${m}: node: import`);
    assert.ok(!/from\s+["']\.\/[\w-]+\.ts["']/.test(js), `${m}: .ts import`);
    assert.ok(!/\binterface\s+\w+\s*\{/.test(js), `${m}: interface left`);
  }
});

test("the page never writes HTML from input, and only imports its own generated modules", () => {
  const js = read("page.js").replace(/^\s*\/\/.*$/gm, ""); // コメントは除く
  for (const bad of ["innerHTML", "outerHTML", "insertAdjacentHTML", "document.write", "eval(", "new Function"]) assert.ok(!js.includes(bad), bad);
  const imports = [...js.matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1]).sort();
  assert.deepEqual(imports, ["./genkan.js", "./gsi-url.js"]);
});

test("the page is locked down: CSP allows only itself and the GSI frame, no inline script, no referrer, noindex", () => {
  const html = read("index.html");
  const csp = /http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(html)?.[1] ?? "";
  assert.match(csp, /default-src 'none'/);
  assert.match(csp, /script-src 'self'/);
  assert.match(csp, /frame-src https:\/\/maps\.gsi\.go\.jp(;|$)/);
  assert.match(csp, /connect-src 'self'/);
  assert.ok(!/<script(?![^>]*\bsrc=)/.test(html), "inline script");
  assert.match(html, /name="referrer" content="no-referrer"/);
  assert.match(html, /name="robots" content="noindex"/);
});

test("the page only ever opens maps.gsi.go.jp (the guard is in the source)", () => {
  assert.match(read("page.js"), /url\.startsWith\(GSI\)/);
  assert.match(read("page.js"), /const GSI = "https:\/\/maps\.gsi\.go\.jp\/#"/);
});
