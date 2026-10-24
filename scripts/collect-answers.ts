/**
 * サブエージェントが保存した回答ファイル(<ラベル>.txt)から、問いごとの URL を取り出して answers.json 形式にする。
 *   node scripts/collect-answers.ts <回答ファイルのディレクトリ> [接頭辞] [--text]
 * --genkan を付けると、回答の genkan のリンク(prompt/genkan.md の形)を、地理院の URL に直して採点にかける(回答文では、リンクを直した URL に置き換える)。
 *   受け手が直して読んだ点(警告)があれば、送り手の誤りとして採点で失敗にする。
 * --text を付けると、{ url, text }(回答文つき)で出す。回答文を採点する問い(asks など)に要る。
 * ファイル名は「<接頭辞>-<問いのid>.txt」。URL が無ければ null(URL を返さなかった)。
 * 「=== 回答 ===」と「=== 検証メモ ===」の間(回答部分)にある最初の maps.gsi.go.jp の URL を採る。
 */
import { readdirSync, readFileSync } from "node:fs";
import { genkanToGsiUrl } from "../src/genkan.ts";

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const genkan = process.argv.includes("--genkan");
const withText = process.argv.includes("--text");
const dir = args[0];
const prefix = args[1] ?? "";
const out: Record<string, string | null | { url: string | null; text?: string; repairs?: string[] }> = {};
for (const f of readdirSync(dir).filter((f) => f.endsWith(".txt") && f.startsWith(prefix)).sort()) {
  const id = f.slice(prefix.length).replace(/^-/, "").replace(/\.txt$/, "");
  const text = readFileSync(`${dir.replace(/\/?$/, "/")}${f}`, "utf8");
  const answer = text.split("=== 検証メモ ===")[0];
  let body = answer.replace("=== 回答 ===", "").trim();
  let url: string | null;
  let repairs: string[] = [];
  if (genkan) {
    const link = /https:\/\/dwg7\.unopengis\.org\/chigent\/genkan\/#[^\s)）」]+/.exec(answer)?.[0];
    const conv = link ? genkanToGsiUrl(link) : undefined;
    url = conv?.url ?? null; // 読めなかったリンクは「URL を返さなかった」と同じ扱い(採点で失敗になる)
    if (link && conv?.url) body = body.replace(link, conv.url);
    repairs = conv?.warnings ?? []; // 送り手が仕様の外を出した印。採点で失敗にする
  } else {
    url = /https:\/\/maps\.gsi\.go\.jp\/#[^\s)）」]+/.exec(answer)?.[0] ?? null;
  }
  out[id] = withText || repairs.length > 0 ? { url, ...(withText ? { text: body } : {}), ...(repairs.length > 0 ? { repairs } : {}) } : url;
}
console.log(JSON.stringify(out, null, 1));
