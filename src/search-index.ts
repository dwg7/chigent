/**
 * 検索用の小さな索引(DECISIONS.md D-017)。
 *
 * layers-martin の catalog は約 56 万字で、エージェントの取得(WebFetch は 1 回 10 万字まで)では途中で切れる。
 * そこで layers.txt の階層(パス)の近いレイヤーを、1 ファイル 8,000 字以内の「節」にまとめ、
 * 節を案内する小さな目次(router.txt)を付ける。エージェントは router.txt → 節 の 2 回の取得で ID にたどり着ける。
 */
import type { LayerEntry, LayerIndex } from "./layers.ts";

/** 公開先(GitHub Pages の想定。公開して取得できることを確かめるまでは未確認)。プロンプトにも同じ URL を書く。 */
export const INDEX_BASE_URL = "https://dwg7.unopengis.org/chigent/index/";
export const SHARD_BUDGET = 8000; // 節ファイル 1 つの上限(文字数)
export const ROUTER_BUDGET = 6000; // router.txt の上限(文字数)
const SNAPSHOT = new Set(["sar_observation_snapshot", "aircraft_sar_observation_snapshot"]);

/** 最上位の分類の並び(router.txt の節の順)。問いに出やすいものを先にする。 */
const TOP_ORDER = ["背景地図", "標高・土地の凹凸", "土地の成り立ち・土地利用", "近年の災害", "災害伝承・避難場所等", "年代別の写真", "正射画像", "基準点・地磁気・地殻変動", "その他"];

interface Item {
  id: string;
  path: string[];
  line: string;
}

export interface Shard {
  name: string; // "S01"
  scope: string;
  items: Item[];
  text: string;
}

export interface SearchIndexFiles {
  router: string;
  shards: Shard[];
  excluded: number;
}

const clean = (s: string) => s.replace(/\s+/g, " ").replace(/\|/g, "｜").trim();

function pathOf(id: string, e: LayerEntry): string[] {
  const segs = e.p ? e.p.split(" > ").map(clean).filter(Boolean) : [];
  // グループの階層には自分のタイトルが末尾に入ることがある(子の共通部分から作るため)。重複は落とす。
  if (segs.length > 0 && segs[segs.length - 1] === clean(e.t)) segs.pop();
  return segs.length > 0 ? segs : ["(階層なし)"];
}

function lineOf(id: string, e: LayerEntry): string {
  const tags: string[] = [];
  if (e.z) tags.push(`z${e.z[0]}-${e.z[1]}`);
  if (e.c) tags.push(`c${e.c[0]},${e.c[1]},${e.c[2]}`);
  if (e.b) tags.push(`b${e.b.join(",")}`);
  if (e.s === "group") tags.push("g");
  else if (e.s !== "catalog") tags.push("v");
  return `${id} | ${clean(e.t)} | ${tags.length > 0 ? tags.join(" ") : "-"}`;
}

interface Node {
  name: string;
  children: Map<string, Node>;
  items: Item[];
}
const newNode = (name: string): Node => ({ name, children: new Map(), items: [] });

const itemsOf = (n: Node): Item[] => [...n.items, ...[...n.children.values()].flatMap(itemsOf)];

/** ヘッダ行(## パス)を含めた大きさの見積もり */
function sizeOf(items: Item[]): number {
  let size = 0;
  let last = "";
  for (const it of items) {
    const p = it.path.join(" > ");
    if (p !== last) { size += p.length + 4; last = p; }
    size += it.line.length + 1;
  }
  return size;
}

interface Unit {
  label: string[];
  items: Item[];
  size: number;
}

function units(node: Node, prefix: string[], budget: number): Unit[] {
  const all = itemsOf(node);
  const label = prefix;
  if (sizeOf(all) <= budget) return [{ label, items: all, size: sizeOf(all) }];
  const out: Unit[] = [];
  // このノード直下のレイヤーを、上限を超えないよう順に区切る
  let chunk: Item[] = [];
  for (const it of node.items) {
    if (sizeOf([...chunk, it]) > budget && chunk.length > 0) { out.push({ label, items: chunk, size: sizeOf(chunk) }); chunk = []; }
    chunk.push(it);
  }
  if (chunk.length > 0) out.push({ label, items: chunk, size: sizeOf(chunk) });
  for (const child of node.children.values()) out.push(...units(child, [...prefix, child.name], budget));
  return out;
}

/** 節の範囲を表す短い説明: 親が同じ階層をまとめて「親 > {子1、子2…}」にする */
function describe(labels: string[][], cap = 420): string {
  const byParent = new Map<string, string[]>();
  for (const l of labels) {
    const parent = l.slice(0, -1).join(" > ");
    const last = l[l.length - 1] ?? "";
    const arr = byParent.get(parent) ?? [];
    if (!arr.includes(last)) arr.push(last);
    byParent.set(parent, arr);
  }
  const parts = [...byParent].map(([p, lasts]) => (p ? `${p} > ${lasts.length > 1 ? "{" + lasts.join("、") + "}" : lasts[0]}` : lasts.join("、")));
  const s = parts.join("；");
  return s.length > cap ? s.slice(0, cap - 1) + "…" : s;
}

export function buildSearchIndex(index: LayerIndex, generatedAt = index.source.generatedAt): SearchIndexFiles {
  const items: Item[] = [];
  let excluded = 0;
  for (const [id, e] of Object.entries(index.layers)) {
    if (SNAPSHOT.has(e.s)) { excluded++; continue; }
    items.push({ id, path: pathOf(id, e), line: lineOf(id, e) });
  }
  // 階層順、同じ階層ではID順(結果が毎回同じになる)。最上位の分類は、問いに出やすい順に並べる。
  const rank = (seg: string) => {
    const r = TOP_ORDER.findIndex((t) => seg === t);
    return r >= 0 ? r : TOP_ORDER.findIndex((t) => t === "その他") - 1; // 未知の分類(最近の災害名など)は「近年の災害」の直後
  };
  const cmp = (a: string[], b: string[]) => {
    if (a[0] !== b[0]) return rank(a[0]) - rank(b[0]) || (a[0] < b[0] ? -1 : 1);
    for (let i = 1; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
    return a.length - b.length;
  };
  items.sort((a, b) => cmp(a.path, b.path) || (a.id < b.id ? -1 : 1));

  const root = newNode("");
  for (const it of items) {
    let n = root;
    for (const seg of it.path) {
      let c = n.children.get(seg);
      if (!c) { c = newNode(seg); n.children.set(seg, c); }
      n = c;
    }
    n.items.push(it);
  }

  const HEADER = 600; // 節の先頭行(範囲の説明を含む)と見積もりの誤差の余裕
  const us = units(root, [], SHARD_BUDGET - HEADER);
  // 隣り合う単位を、上限まで詰める(階層順なので、近い話題が同じ節に入る)
  const groups: Unit[][] = [];
  let cur: Unit[] = [];
  let curSize = 0;
  for (const u of us) {
    if (cur.length > 0 && curSize + u.size > SHARD_BUDGET - HEADER) { groups.push(cur); cur = []; curSize = 0; }
    cur.push(u);
    curSize += u.size;
  }
  if (cur.length > 0) groups.push(cur);

  const shards: Shard[] = groups.map((g, i) => {
    const name = `S${String(i + 1).padStart(2, "0")}`;
    const its = g.flatMap((u) => u.items);
    const scope = describe(g.map((u) => u.label));
    const lines = [`# chigent 索引 ${name} — ${scope}`, "# ID | タイトル | z=ズーム範囲 c=公開位置の中心(緯度,経度,ズーム) b=範囲(西,南,東,北) v=ベクトルタイル g=グループ"];
    let last = "";
    for (const it of its) {
      const p = it.path.join(" > ");
      if (p !== last) { lines.push(`## ${p}`); last = p; }
      lines.push(it.line);
    }
    return { name, scope, items: its, text: lines.join("\n") + "\n" };
  });

  const router = [
    "# chigent レイヤー検索用の索引 (v1)",
    `# 生成: ${generatedAt.slice(0, 10)}、元: layers.txt(地理院地図)を layers-martin 経由で整理。`,
    "使い方: ①下の一覧から問いに近い節を1〜2つ選ぶ。②その節のファイル(例: S07.txt)を取得し、日本語のタイトルでIDを探す。IDは大文字小文字を区別するので、そのまま写す。",
    "各行は「ID | タイトル | z=表示できるズーム c=その図が公開されている場所の中心(緯度,経度,ズーム) b=範囲(西,南,東,北) v=ベクトル(GeoJSON)タイル g=グループ(子をまとめて表示)」。",
    "含めないもの: SAR観測スナップショット(約1万件。基準点・地磁気・地殻変動の下)。",
    "",
    ...shards.map((s) => `${s.name}.txt | ${s.scope} | ${s.items.length}件`),
    "",
  ].join("\n");

  return { router, shards, excluded };
}
