/**
 * プロンプト(prompt/chigent.md)の検査。Copilot に載せる前に、プロンプト自身が正しい URL と ID を
 * 例示しているかを確かめる(コードは Copilot の中では動かないので、ここが基準になる。D-009)。
 */
import { parseGsiUrl } from "./gsi-url.ts";
import { loadLayerIndex, validate, type LayerIndex } from "./layers.ts";

/** Microsoft 365 Copilot のエージェントの指示文の上限(文字数)。**未確認**(D-009)。余裕を見て使う。 */
export const INSTRUCTIONS_LIMIT = 8000;

export interface PromptReport {
  length: number;
  urls: Array<{ url: string; ok: boolean; issues: string[] }>;
  /** 本文中でバッククォートなしの識別子として挙がっている ID のうち、索引にないもの */
  unknownIds: string[];
}

/** 表の節に現れる英数字の連なりを、すべて ID の候補として検査する。例外: ズーム(z10)、接頭辞の説明(vlcd_)、英語の語。 */
const ID_RE = /[A-Za-z0-9_]{3,}/g;
const NOT_IDS = new Set(["catalog", "TileJSON", "center", "GeoJSON", "lcd"]); // 説明文中の英語
const SKIP = (t: string) => /^z\d+$/.test(t) || t.endsWith("_") || /^\d+$/.test(t);

export function checkPrompt(text: string, index: LayerIndex = loadLayerIndex()): PromptReport {
  const urls = [...text.matchAll(/https:\/\/maps\.gsi\.go\.jp\/#[^\s)]+/g)].map((m) => m[0]);
  const report: PromptReport = { length: [...text].length, urls: [], unknownIds: [] };
  for (const url of urls) {
    if (/[{}]/.test(url)) continue; // テンプレート
    try {
      const { intent, warnings } = parseGsiUrl(url);
      const v = validate(intent, index);
      const issues = [...warnings, ...v.issues.filter((i) => i.level !== "info").map((i) => `${i.level}:${i.code}`)];
      report.urls.push({ url, ok: v.ok && warnings.length === 0, issues });
    } catch (e) {
      report.urls.push({ url, ok: false, issues: [String(e)] });
    }
  }
  // 表の「よく使う地図のID」節のIDを検査(ワイルドカード・接頭辞の書き方は除く)
  const section = (/## よく使う地図のID([\s\S]*?)## /.exec(text)?.[1] ?? "").replace(/https?:\/\/[^\s）)]+/g, ""); // URL は ID ではない
  const ids = new Set<string>();
  for (const m of section.matchAll(ID_RE)) if (!SKIP(m[0]) && !NOT_IDS.has(m[0])) ids.add(m[0]);
  for (const id of ids) if (!index.layers[id]) report.unknownIds.push(id);
  return report;
}
