/**
 * 実機(Microsoft 365 Copilot、源内)での測定の記録表を作る。手順は docs/field-test.md。
 *   node scripts/field-sheet.ts [short|full] [--csv]
 * 問いは tests/questions/cases.json から。short は結果が割れやすい 8 問、full は 14 問。
 * 採点にかけるときは、回答の全文を data/field/<日付>-<環境>-<プロンプト>/<問いのid>.txt に保存する
 * (「=== 回答 ===」の見出しは付けても付けなくてもよい)。
 */
import { readFileSync } from "node:fs";

/** 結果が割れやすい 8 問。何を試すか(why)も書く。 */
export const FIELD_SHORT: Array<{ id: string; why: string }> = [
  { id: "onchozu-place", why: "地名だけ(背景だけのリンク)。msearch で座標を確かめる" },
  { id: "hakone-volcano", why: "表の ID を 1 枚重ねる基本形" },
  { id: "miyazaki-tsunami-on-photo", why: "写真(ort)を背景に、図を重ねる(b と l の併用)" },
  { id: "tokyo-1960s", why: "coverage.txt の取得と、過去の写真" },
  { id: "kurikoma-volcano", why: "索引(router.txt → S04.txt)の取得" },
  { id: "joso-flood", why: "索引で日付つきの ID を探す(要約で行が落ちやすい)" },
  { id: "chuo-ku-ambiguous", why: "聞き返し(リンクを作らない)" },
  { id: "moon-map", why: "できない問い(リンクを作らない)" },
];
export const FIELD_FULL: Array<{ id: string; why: string }> = [
  ...FIELD_SHORT,
  { id: "takaosan-place", why: "場所だけ(山)。「重ねたい地図があれば」の一言" },
  { id: "kumamoto-castle-english", why: "英語の問いと、写真(ort)" },
  { id: "miyazaki-tsunami-typo", why: "表記ゆれ(ひらがな・旧字)" },
  { id: "afm-ishigaki-outside", why: "整備範囲の外(図を足さない)" },
  { id: "fuji-explain-me", why: "解説の誘い(URL が先、説明は短く)" },
  { id: "kesennuma-shelter-tsunami", why: "避難場所(skhb)" },
];

export const CAPABILITY_CHECKS: string[] = [
  "指示文の全文(コア約 6,200 字 / genkan 約 5,800 字)を貼れる。切れない",
  "router.txt を取得できる(全行が返るか、要約か)",
  "S04.txt から「栗駒」を含む行を取り出せる",
  "coverage.txt の afm の見出しの下の全行を取り出せる",
  "msearch(音調津)の結果を取得できる",
  "ウェブ検索で座標を確かめられる",
  "回答のリンクがクリックできる形で出る(Markdown のリンクか、素の文字列か)",
  "genkan のリンクの # 以降が、表示でも、コピー&ペースト後でも保たれる",
  "コアの完全な地理院の URL(%7C、#)が、コピー後も保たれる",
  "genkan のページが開く(ドメイン、JS の許可)",
  "genkan のページで、地理院地図のフレームが表示される",
  "genkan の &m=g(自動転送)が許される",
];

function rows(set: "short" | "full") {
  const cases: Array<{ id: string; question: string }> = JSON.parse(readFileSync(new URL("../tests/questions/cases.json", import.meta.url), "utf8"));
  const list = set === "short" ? FIELD_SHORT : FIELD_FULL;
  return list.map((f) => {
    const c = cases.find((x) => x.id === f.id);
    if (!c) throw new Error(`unknown case id: ${f.id}`);
    return { id: f.id, question: c.question, why: f.why };
  });
}

export function sheet(set: "short" | "full", csv: boolean): string {
  const head = ["問いの id", "問い", "表示された回答のリンク(そのまま貼る)", "コピー&ペースト後も同じか(○/×)", "開けたか(○/×)", "位置と図は正しいか(○/×)", "外部の取得(索引/coverage/msearch/検索)", "メモ"];
  const body = rows(set).map((r) => [r.id, r.question, "", "", "", "", "", ""]);
  if (csv) return [head, ...body].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n") + "\n";
  const md = (r: string[]) => `| ${r.join(" | ")} |`;
  return [md(head), md(head.map(() => "---")), ...body.map(md)].join("\n") + "\n";
}

export function capabilitySheet(): string {
  const head = ["#", "確かめること", "Copilot", "源内", "メモ"];
  const md = (r: string[]) => `| ${r.join(" | ")} |`;
  return [md(head), md(head.map(() => "---")), ...CAPABILITY_CHECKS.map((c, i) => md([`C${i + 1}`, c, "", "", ""]))].join("\n") + "\n";
}

if (import.meta.main) {
  const set = process.argv.includes("full") ? "full" : "short";
  const csv = process.argv.includes("--csv");
  if (!csv) console.log("## 能力の確認\n\n" + capabilitySheet() + "\n## 問いの記録(" + (set === "short" ? "短縮 8 問" : "全 14 問") + ")\n");
  process.stdout.write(sheet(set, csv));
}
