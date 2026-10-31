/**
 * プロンプトを 1 つの元(prompt/src/prompt.md)から 2 本生成する(D-029)。
 *   node scripts/build-prompts.ts
 *   prompt/chigent.md  … コア(完全な地理院の URL を返す)
 *   prompt/genkan.md   … genkan(短い契約のリンクを返す。docs/genkan-spec.md)
 * 元の書き方:
 *   共通の行は、そのまま書く(2 本に入る)。
 *   行ごとの違い:  <!--core-->  …コアだけの行…  <!--genkan-->  …genkan だけの行…  <!--/-->  (単独の行)
 *   行の中の違い:  {{core:コアだけの語}}{{genkan:genkan だけの語}}  (どちらかが空でもよい)
 * 生成物はコミットする(利用者が Copilot に貼るため)。`npm test` が元との一致を確かめる。直すのは元だけ。
 */
import { readFileSync, writeFileSync } from "node:fs";

export type Variant = "core" | "genkan";

export function render(template: string, variant: Variant): string {
  const out: string[] = [];
  let mode: "both" | Variant = "both";
  let open = false;
  template.split("\n").forEach((line, i) => {
    const at = `line ${i + 1}`;
    if (line === "<!--core-->") {
      if (open) throw new Error(`${at}: <!--core--> inside a block`);
      mode = "core";
      open = true;
    } else if (line === "<!--genkan-->") {
      if (!open || mode !== "core") throw new Error(`${at}: <!--genkan--> must follow <!--core-->`);
      mode = "genkan";
    } else if (line === "<!--/-->") {
      if (!open) throw new Error(`${at}: <!--/--> without a block`);
      mode = "both";
      open = false;
    } else if (mode === "both" || mode === variant) {
      out.push(line.replace(/\{\{(core|genkan):(.*?)\}\}/g, (_m, v: string, text: string) => (v === variant ? text : "")));
    }
  });
  if (open) throw new Error("unclosed <!--core--> block");
  return out.join("\n");
}

export const PROMPTS: Array<{ file: string; variant: Variant }> = [
  { file: "chigent.md", variant: "core" },
  { file: "genkan.md", variant: "genkan" },
];

if (import.meta.main) {
  const template = readFileSync(new URL("../prompt/src/prompt.md", import.meta.url), "utf8");
  for (const p of PROMPTS) {
    const text = render(template, p.variant);
    writeFileSync(new URL(`../prompt/${p.file}`, import.meta.url), text);
    console.log(`prompt/${p.file}: ${[...text].length} chars`);
  }
}
