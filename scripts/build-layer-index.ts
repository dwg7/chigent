/**
 * layers-martin の catalog と report.json から、レイヤー ID の索引 data/layers-index.json を作る。
 *
 *   node scripts/build-layer-index.ts [layers-martin の docs/ のパスまたは URL]
 *
 * 既定は https://hfu.github.io/layers-martin/ 。catalog に載るレイヤー(画像タイル・MVT)と、
 * report.json の excluded にあるレイヤー(GeoJSON・KML・SAR 観測スナップショットなど)を合わせて、
 * layers.txt にある ID を網羅する(DECISIONS.md D-008)。
 */
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const PUBLIC_ROOT = "https://hfu.github.io/layers-martin/";
const root = (process.argv[2] ?? PUBLIC_ROOT).replace(/\/?$/, "/");

async function load(name: string): Promise<{ text: string; json: any }> {
  const text = root.startsWith("http")
    ? await fetch(root + name).then((r) => {
        if (!r.ok) throw new Error(`${root}${name}: ${r.status}`);
        return r.text();
      })
    : await readFile(root + name, "utf8");
  return { text, json: JSON.parse(text) };
}

/** layers.txt のタイトルには <br> などの HTML が混じる。 */
const plain = (s: string) => s.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

const catalog = await load("catalog.json");
const report = await load("report.json");

// 元データ(catalog と report.json)が前回と同じなら、何も書かずに終わる(定期実行で無意味な差分を出さない)
const sha = (t: string) => createHash("sha256").update(t).digest("hex");
try {
  const prev = JSON.parse(await readFile(new URL("../data/layers-index.json", import.meta.url), "utf8"));
  if (prev.source?.catalogSha256 === sha(catalog.text) && prev.source?.reportSha256 === sha(report.text)) {
    console.log("up to date: layers-martin の catalog と report.json は前回と同じ。索引は変更しない。");
    process.exit(0);
  }
} catch { /* 初回など */ }

/**
 * t: タイトル, p: 階層, s: 状態, x: 拡張子(除外のみ),
 * z: [minzoom, maxzoom](catalog のみ), c: [緯度, 経度, ズーム](図の公開位置の中心 = layers.txt の area / TileJSON の center),
 * b: [西, 南, 東, 北](bounds があるものだけ)
 */
type Entry = { t: string; p: string; s: string; x?: string; z?: [number, number]; c?: [number, number, number]; b?: [number, number, number, number] };

const r4 = (n: number) => Math.round(n * 1e4) / 1e4;
const centerOf = (c: unknown): Entry["c"] =>
  Array.isArray(c) && c.length >= 3 && c.every((x) => typeof x === "number") ? [r4(c[1]), r4(c[0]), c[2]] : undefined; // TileJSON は [経度, 緯度, ズーム]
/** TileJSON は [西,南,東,北]、layers.txt は [[南緯,西経],[北緯,東経]](Leaflet の形)。 */
const boundsOf = (b: unknown): Entry["b"] => {
  if (Array.isArray(b) && b.length === 4 && b.every((x) => typeof x === "number")) return b.map(r4) as Entry["b"];
  if (Array.isArray(b) && b.length === 2 && b.every((p) => Array.isArray(p) && p.length === 2 && p.every((x) => typeof x === "number"))) {
    return [r4(b[0][1]), r4(b[0][0]), r4(b[1][1]), r4(b[1][0])];
  }
  return undefined;
};
const layers: Record<string, Entry> = {};

for (const e of report.json.excluded as any[]) {
  if (!e.id || layers[e.id]) continue; // ID の無い項目(layers.txt の説明用の行)は索引に入れない
  layers[e.id] = { t: plain(e.title ?? ""), p: (e.path ?? []).map(plain).join(" > "), s: e.reason, x: e.extension };
}
// catalog に載るものが優先(同じ ID が別の場所で除外されていても、使えるものとして扱う)。
// catalog のキーは小文字化されている(DisasterHist_flood_tokyo → disasterhist_flood_tokyo)が、
// URL の ID は大文字小文字を区別する。本来の ID は各 TileJSON の id にあるので、1 件ずつ読む(D-010)。
const keys = Object.keys(catalog.json.tiles);
let next = 0;
async function worker() {
  while (next < keys.length) {
    const key = keys[next++];
    const v = catalog.json.tiles[key];
    const tj = (await load(`${key}.json`)).json;
    // TileJSON の id は大文字小文字の復元にだけ使う(ort → _ort のように別名になっているものは catalog のキーを使う)
    const id: string = typeof tj.id === "string" && tj.id.toLowerCase() === key ? tj.id : key;
    const e: Entry = { t: plain(v.name ?? tj.title ?? ""), p: (v.path ?? []).map(plain).join(" > "), s: "catalog" };
    if (typeof tj.minzoom === "number" || typeof tj.maxzoom === "number") e.z = [tj.minzoom ?? 0, tj.maxzoom ?? 18];
    const c = centerOf(tj.center);
    if (c) e.c = c;
    const b = boundsOf(tj.bounds);
    if (b) e.b = b;
    layers[id] = e;
  }
}
await Promise.all(Array.from({ length: root.startsWith("http") ? 6 : 1 }, worker));

// layers-martin が落としている「id を持つ LayerGroup」(toggleall で子をまとめて出す)を補う(D-010)。
// layers-martin が読んだ layers.txt 系ファイル(report.json の fetched_files)を、もう一度たどる。
const files: string[] = (report.json.fetched_files as Array<{ url: string }>).map((f) => f.url);
const groupChildren = new Map<string, string[]>();
const childIds = (n: any, out: string[] = []): string[] => {
  if (Array.isArray(n)) n.forEach((c) => childIds(c, out));
  else if (n && typeof n === "object") {
    if (n.type === "Layer" && typeof n.id === "string") out.push(n.id);
    for (const v of Object.values(n)) childIds(v, out);
  }
  return out;
};
const walkGroups = (n: any, src: string, path: string[]) => {
  if (Array.isArray(n)) n.forEach((c) => walkGroups(c, src, path));
  else if (n && typeof n === "object") {
    const here = typeof n.title === "string" && (n.type === "LayerGroup" || n.type === "LayerGroupRoot") ? [...path, plain(n.title)] : path;
    if (n.type === "LayerGroup" && typeof n.id === "string" && n.id && !layers[n.id]) {
      layers[n.id] = { t: plain(n.title ?? ""), p: path.join(" > "), s: "group" };
      groupChildren.set(n.id, childIds(n));
    }
    // catalog に無いレイヤー(GeoJSON など)の位置情報は layers.txt から取る
    if (n.type === "Layer" && typeof n.id === "string" && layers[n.id] && layers[n.id].s !== "catalog") {
      const e = layers[n.id];
      if (!e.c && n.area && typeof n.area.lat === "number" && typeof n.area.lng === "number") e.c = [r4(n.area.lat), r4(n.area.lng), n.area.zoom ?? 12];
      const bb = boundsOf(n.bounds);
      if (!e.b && bb) e.b = bb;
    }
    for (const v of Object.values(n)) walkGroups(v, src, here);
  }
};
let fi = 0;
async function groupWorker() {
  while (fi < files.length) {
    const url = files[fi++];
    try {
      const text = root.startsWith("http") || url.startsWith("http") ? await fetch(url).then((r) => r.text()) : "";
      walkGroups(JSON.parse(text), url, []);
    } catch (e) {
      console.error("skip (unparsable or unreachable):", url);
    }
  }
}
await Promise.all(Array.from({ length: 4 }, groupWorker));

// 別ファイルの親を辿れないグループは、子レイヤーの階層の共通部分を階層とする
for (const [gid, kids] of groupChildren) {
  const paths = kids.map((k) => layers[k]?.p).filter((x): x is string => !!x).map((x) => x.split(" > "));
  if (paths.length === 0) continue;
  let common = paths[0];
  for (const q of paths.slice(1)) {
    let i = 0;
    while (i < common.length && i < q.length && common[i] === q[i]) i++;
    common = common.slice(0, i);
  }
  if (common.length > layers[gid].p.split(" > ").filter(Boolean).length) layers[gid].p = common.join(" > ");
}

const sorted = Object.fromEntries(Object.entries(layers).sort(([a], [b]) => (a < b ? -1 : 1)));
const counts: Record<string, number> = {};
for (const e of Object.values(sorted)) counts[e.s] = (counts[e.s] ?? 0) + 1;

await writeFile(
  new URL("../data/layers-index.json", import.meta.url),
  JSON.stringify({
    source: {
      root: PUBLIC_ROOT, // ローカルのコピーから作ったときも、来歴には公開 URL を書く(手元のパスを残さない)
      catalogSha256: createHash("sha256").update(catalog.text).digest("hex"),
      reportSha256: createHash("sha256").update(report.text).digest("hex"),
      generatedAt: new Date().toISOString(),
    },
    counts,
    layers: sorted,
  }) + "\n",
);
console.log(Object.keys(sorted).length, counts);
