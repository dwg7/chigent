/**
 * サブエージェントが保存した回答ファイル(<ラベル>.txt)から、問いごとの URL を取り出して answers.json 形式にする。
 *   node scripts/collect-answers.ts <回答ファイルのディレクトリ> [接頭辞]
 * ファイル名は「<接頭辞>-<問いのid>.txt」。URL が無ければ null(URL を返さなかった)。
 * 「=== 回答 ===」と「=== 検証メモ ===」の間(回答部分)にある最初の maps.gsi.go.jp の URL を採る。
 */
import { readdirSync, readFileSync } from "node:fs";

const dir = process.argv[2];
const prefix = process.argv[3] ?? "";
const out: Record<string, string | null> = {};
for (const f of readdirSync(dir).filter((f) => f.endsWith(".txt") && f.startsWith(prefix)).sort()) {
  const id = f.slice(prefix.length).replace(/^-/, "").replace(/\.txt$/, "");
  const text = readFileSync(`${dir.replace(/\/?$/, "/")}${f}`, "utf8");
  const answer = text.split("=== 検証メモ ===")[0];
  out[id] = /https:\/\/maps\.gsi\.go\.jp\/#[^\s)）」]+/.exec(answer)?.[0] ?? null;
}
console.log(JSON.stringify(out, null, 1));
