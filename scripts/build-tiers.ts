/**
 * 事例(data/examples/*.jsonl)から、レイヤーの使われ方を数え、核/周辺に分ける(CLAUDE.md 柱 3)。
 *   node scripts/build-tiers.ts  →  data/layer-tiers.json と docs/layer-tiers.md
 *
 * 数え方(DECISIONS.md D-011):
 * - 出どころの種類ごとに、そのレイヤーを含む「ページ数」と「リンク数」を数える。ページ数を主に見る
 *   (1 ページに同じ製品のリンクが数百あることがあるため)。
 * - 一覧型は「存在する」根拠にしかならない。使用頻度には数えない。
 * - 背景地図(base)として使われただけのものは、製品の証拠にしない(std は全リンクに出る)。
 * - 個々の ID ではなく「族」(同じ製品の ID 群)で見る。
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { parseGsiUrl } from "../src/gsi-url.ts";
import { BASE_IDS, loadLayerIndex } from "../src/layers.ts";

const index = loadLayerIndex();
const dir = "data/examples/";
const rows = readdirSync(dir).filter((f) => f.endsWith(".jsonl")).flatMap((f) =>
  readFileSync(dir + f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)),
);

/** 同じ製品の ID 群。上から順に最初に合うものを採る。 */
const FAMILIES: Array<[name: string, re: RegExp]> = [
  ["火山土地条件図", /^vlcd(_|$)/],
  ["火山基本図", /^vbmd_/],
  ["活断層図", /^afm(_|$)/],
  ["治水地形分類図", /^lcmfc\d*$/],
  ["沿岸海域土地条件図", /^ccm\d+$/],
  ["土地条件図(数値地図25000)", /^lcm25k/],
  ["地形分類(ベクトルタイル)", /^experimental_landformclassification/],
  ["自然災害伝承碑", /^disaster_lore/],
  ["指定緊急避難場所", /^skhb/],
  ["土地履歴(災害履歴図)", /^DisasterHist_/],
  ["災害対応(日付つきの個別ID)", /^20\d{6}/],
  ["年代別の写真", /^(ort_|gazo\d|toho\d|ort_riku|ort_USA)/],
  ["デジタル標高地形図", /^d1-no\d+/],
];
const familyOf = (id: string) => FAMILIES.find(([, re]) => re.test(id))?.[0] ?? id;

interface Ev { productPages: Set<string>; productLinks: number; explPages: Set<string>; explLinks: number; listingPages: Set<string> }
const ev = new Map<string, Ev>();
const seen = new Set<string>();
for (const r of rows) {
  const key = r.pageUrl + "\t" + r.url;
  if (seen.has(key)) continue;
  seen.add(key);
  let intent;
  try { intent = parseGsiUrl(r.url).intent; } catch { continue; }
  for (const l of intent.map.layers) {
    if (BASE_IDS.has(l.id) || l.id === "seamlessphoto") continue; // 背景としての出現は製品の証拠にしない
    const e = ev.get(l.id) ?? { productPages: new Set(), productLinks: 0, explPages: new Set(), explLinks: 0, listingPages: new Set() };
    if (r.sourceType === "product") { e.productPages.add(r.pageUrl); e.productLinks++; }
    else if (r.sourceType === "explanatory") { e.explPages.add(r.pageUrl); e.explLinks++; }
    else e.listingPages.add(r.pageUrl);
    ev.set(l.id, e);
  }
}

// 族ごとに集計(族に属する ID の、ページの和集合)
interface Fam { name: string; ids: Set<string>; productPages: Set<string>; explPages: Set<string>; productLinks: number }
const fams = new Map<string, Fam>();
for (const [id, e] of ev) {
  const name = familyOf(id);
  const f = fams.get(name) ?? { name, ids: new Set(), productPages: new Set(), explPages: new Set(), productLinks: 0 };
  f.ids.add(id);
  e.productPages.forEach((p) => f.productPages.add(p));
  e.explPages.forEach((p) => f.explPages.add(p));
  f.productLinks += e.productLinks;
  fams.set(name, f);
}

/**
 * 段の仮判定(v0):
 *  核   = 背景地図(BASE_IDS と seamlessphoto)/ 製品型ページで 2 ページ以上に現れる族 / 製品型と解説型の両方に現れる族
 *         / 解説型ページで 3 ページ以上に現れる族(陰影起伏図・色別標高図など、製品ページを持たない基本の地図)
 *  周辺 = それ以外で、製品型か解説型の証拠が 1 つでもあるもの、および layers.txt にあるすべて(証拠なし)
 *  対象外 = 判定しない(理由を書ける段階になるまで空。D-011)
 */
const tierOfFamily = (f: Fam): "core" | "periphery" =>
  f.productPages.size >= 2 || (f.productPages.size >= 1 && f.explPages.size >= 1) || f.explPages.size >= 3 ? "core" : "periphery";

const out: Record<string, { tier: string; family?: string; productPages: number; productLinks: number; explPages: number; listingPages: number }> = {};
for (const [id, e] of ev) {
  const f = fams.get(familyOf(id))!;
  out[id] = {
    tier: tierOfFamily(f),
    ...(familyOf(id) !== id ? { family: f.name } : {}),
    productPages: e.productPages.size, productLinks: e.productLinks, explPages: e.explPages.size, listingPages: e.listingPages.size,
  };
}
for (const id of [...BASE_IDS, "seamlessphoto"]) out[id] = { ...(out[id] ?? { productPages: 0, productLinks: 0, explPages: 0, listingPages: 0 }), tier: "core" };

const tiers = { core: 0, periphery: 0 };
for (const v of Object.values(out)) tiers[v.tier as "core" | "periphery"]++;
const withEvidence = new Set(Object.keys(out));
const noEvidence = Object.keys(index.layers).filter((id) => !withEvidence.has(id));

writeFileSync("data/layer-tiers.json", JSON.stringify({
  generatedFrom: { links: rows.length, pages: new Set(rows.map((r) => r.pageUrl)).size },
  rule: "core = base maps | family in >=2 product pages | family in >=1 product page and >=1 explanatory page | family in >=3 explanatory pages; periphery = other evidence; layers without evidence are periphery by default",
  tiers: { ...tiers, noEvidencePeriphery: noEvidence.length },
  layers: out,
}, null, 1) + "\n");

// ---- docs/layer-tiers.md ----
const t = (id: string) => index.layers[id]?.t ?? "";
const lines: string[] = [];
lines.push("# レイヤーの段(核/周辺/対象外)— 仮判定 v0", "");
lines.push("`scripts/build-tiers.ts` が `data/examples/` から作る(DECISIONS.md D-011)。**事例が少なく、地理院自身のサイトに偏っているため、暫定**。", "");
lines.push(`- 事例: ${rows.length} リンク / ${new Set(rows.map((r) => r.pageUrl)).size} ページ(種類別: ${["product", "explanatory", "listing"].map((k) => `${k} ${rows.filter((r) => r.sourceType === k).length}`).join("、")})`);
lines.push(`- 証拠のある ID: ${withEvidence.size}(核 ${tiers.core}、周辺 ${tiers.periphery})。証拠のない ID ${noEvidence.length} は周辺(検索で引く)。`, "");
lines.push("## 核", "", "### 背景地図", "");
for (const id of [...BASE_IDS, "seamlessphoto"]) lines.push(`- \`${id}\` ${t(id)}`);
lines.push("", "### 族(製品)", "", "| 族 | ID 数 | 製品型ページ | 解説型ページ | 例 |", "|---|---|---|---|---|");
for (const f of [...fams.values()].sort((a, b) => b.productPages.size - a.productPages.size || b.productLinks - a.productLinks)) {
  if (tierOfFamily(f) !== "core") continue;
  const ex = [...f.ids].slice(0, 3).map((i) => `\`${i}\``).join(" ");
  lines.push(`| ${f.name} | ${f.ids.size} | ${f.productPages.size} | ${f.explPages.size} | ${ex} |`);
}
lines.push("", "## 周辺(証拠はあるが核の基準に届かない族)", "", "| 族 | ID 数 | 製品型ページ | 解説型ページ | 例 |", "|---|---|---|---|---|");
for (const f of [...fams.values()].sort((a, b) => b.explPages.size - a.explPages.size)) {
  if (tierOfFamily(f) !== "periphery") continue;
  const ex = [...f.ids].slice(0, 3).map((i) => `\`${i}\``).join(" ");
  lines.push(`| ${f.name} | ${f.ids.size} | ${f.productPages.size} | ${f.explPages.size} | ${ex} |`);
}
// 製品型の事例から、族ごとの「見せ方」(ズーム・重ね方・blend・d)の型を取り出す
const sigs = new Map<string, Map<string, { n: number; pages: Set<string>; example: string; zooms: number[] }>>();
for (const r of rows) {
  if (r.sourceType !== "product") continue;
  let it;
  try { it = parseGsiUrl(r.url).intent; } catch { continue; }
  const members = it.map.layers.filter((l) => !BASE_IDS.has(l.id));
  if (members.length === 0) continue;
  const fam = familyOf(members[members.length - 1].id);
  const sig = [
    "ls=" + it.map.layers.map((l) => (BASE_IDS.has(l.id) ? l.id : familyOf(l.id) === l.id ? l.id : `<${familyOf(l.id)}>`) + (l.hidden ? "(hidden)" : "")).join("|"),
    `blend=${it.screen.blend ?? "-"}`, `lcd=${it.screen.lcd ? (familyOf(it.screen.lcd) === it.screen.lcd ? it.screen.lcd : `<${familyOf(it.screen.lcd)}>`) : "-"}`, `d=${it.screen.d ?? "-"}`,
  ].join(" ");
  const m = sigs.get(fam) ?? new Map();
  const e = m.get(sig) ?? { n: 0, pages: new Set<string>(), example: r.url, zooms: [] };
  e.n++; e.pages.add(r.pageUrl); e.zooms.push(it.map.view.zoom);
  m.set(sig, e); sigs.set(fam, m);
}
lines.push("", "## 製品型の事例から見た「見せ方」の型", "", "製品型ページのリンクを族ごとに束ね、同じ構造のものを数えた(`<族>` はその族の ID が入る位置)。「この製品を、この場所で、この枠で見る」の正解例の要約。", "");
for (const [fam, m] of [...sigs].sort((a, b) => [...b[1].values()].reduce((x, y) => x + y.n, 0) - [...a[1].values()].reduce((x, y) => x + y.n, 0))) {
  lines.push(`### ${fam}`, "");
  for (const [sig, e] of [...m].sort((a, b) => b[1].n - a[1].n).slice(0, 3)) {
    const z = [...new Set(e.zooms)].sort((a, b) => a - b);
    lines.push(`- ${e.n} リンク / ${e.pages.size} ページ、ズーム ${z.length > 4 ? `${z[0]}〜${z[z.length - 1]}` : z.join(",")}: \`${sig}\``);
    lines.push(`  - 例: ${e.example}`);
  }
  lines.push("");
}
lines.push("", "## 対象外", "", "未判定。理由を DECISIONS.md に書ける候補が出たら追加する。", "");
writeFileSync("docs/layer-tiers.md", lines.join("\n"));
console.log(tiers, "no evidence:", noEvidence.length);
