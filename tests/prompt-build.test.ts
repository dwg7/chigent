import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PROMPTS, render } from "../scripts/build-prompts.ts";

const template = readFileSync(new URL("../prompt/src/prompt.md", import.meta.url), "utf8");

test("the published prompts are exactly what the generator makes from prompt/src/prompt.md (run scripts/build-prompts.ts)", () => {
  for (const p of PROMPTS) {
    assert.equal(readFileSync(new URL(`../prompt/${p.file}`, import.meta.url), "utf8"), render(template, p.variant), `${p.file} is stale`);
  }
});

test("no markers are left in the generated prompts", () => {
  for (const p of PROMPTS) {
    const text = render(template, p.variant);
    assert.ok(!/<!--|-->|\{\{|\}\}/.test(text), p.file);
  }
});

test("block and inline variants", () => {
  const t = ["共通", "<!--core-->", "コア行", "<!--genkan-->", "genkan行", "<!--/-->", "語: {{core:URL}}{{genkan:リンク}}。{{core:のみ}}"].join("\n");
  assert.equal(render(t, "core"), "共通\nコア行\n語: URL。のみ");
  assert.equal(render(t, "genkan"), "共通\ngenkan行\n語: リンク。");
});

test("malformed templates are refused, not silently mis-built", () => {
  assert.throws(() => render("<!--genkan-->\nx\n<!--/-->", "core"));
  assert.throws(() => render("<!--core-->\nx", "core"));
  assert.throws(() => render("x\n<!--/-->", "core"));
  assert.throws(() => render("<!--core-->\n<!--core-->\n<!--/-->", "core"));
});

test("the two prompts differ only where the template says so (the shared table and steps are one text)", () => {
  const shared = (t: string, head: string) => new RegExp(`${head}[\\s\\S]*?(?=\\n## |$)`).exec(t)?.[0];
  const core = render(template, "core");
  const gk = render(template, "genkan");
  assert.equal(shared(core, "## よく使う地図のID"), shared(gk, "## よく使う地図のID"));
});
