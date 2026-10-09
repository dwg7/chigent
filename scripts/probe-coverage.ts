/**
 * 地域限定の図が「どこにあるか」を、タイルの有無から調べる(DECISIONS.md D-020)。
 *   node scripts/probe-coverage.ts afm lcmfc2 ...     (引数なしは既定の一覧)
 *
 * 方法: 日本付近(緯度 20〜46、経度 122〜154)をズーム 6 のタイルで覆い、タイルがあれば(HTTP 200/206)
 * 子の 4 枚をズーム 7、8、9 まで順に調べる。タイルが無ければ(404)その下は調べない。
 * 図がある場所は、ズーム 9(1 枚が約 60 km 四方)の粒度で data/coverage/<id>.json に残す。
 *
 * 作法: User-Agent に chigent と連絡先を書く。1 秒に 3 回以下。取得は範囲指定の 1 バイト(-r 0-0)。
 * レイヤーの URL は layers-martin の TileJSON から取る(キーは小文字)。
 */
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { promisify } from "node:util";

const run = promisify(execFile);
const UA = "chigent-research/0.1 (dwg7 activity; +https://github.com/dwg7/chigent; coverage probe)";
const GAP_MS = 350;
const Z_START = 6;
const Z_END = 9;
const BBOX = { south: 20, north: 46, west: 122, east: 154 };

const DEFAULT = ["afm", "lcmfc2", "ccm1", "ccm2", "ort_USA10", "ort_riku10", "ort_old10", "ort_1928", "lcm25k_2012", "swale"];

const tileX = (lon: number, z: number) => Math.floor(((lon + 180) / 360) * 2 ** z);
const tileY = (lat: number, z: number) =>
  Math.floor(((1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2) * 2 ** z);

let last = 0;
async function status(url: string): Promise<number> {
  const wait = last + GAP_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  last = Date.now();
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { stdout } = await run("curl", ["-s", "-o", "/dev/null", "-m", "20", "-A", UA, "-r", "0-0", "-w", "%{http_code}", url]);
      const code = Number(stdout);
      if (code === 200 || code === 206 || code === 404 || code === 403) return code;
    } catch { /* 再試行 */ }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`unreliable response for ${url}`);
}

async function probe(id: string) {
  const out = new URL(`../data/coverage/${id}.json`, import.meta.url);
  if (existsSync(out)) { console.log(`${id}: already probed`); return; }
  const tj = await fetch(`https://hfu.github.io/layers-martin/${id.toLowerCase()}`).then((r) => r.json());
  const template: string = tj.tiles[0];
  const minzoom: number = tj.minzoom ?? 0;
  const maxzoom: number = tj.maxzoom ?? 18;
  if (minzoom > Z_START || maxzoom < Z_END) { console.log(`${id}: zoom ${minzoom}-${maxzoom} is outside the probe range; skipped`); return; }
  const url = (z: number, x: number, y: number) => template.replace("{z}", String(z)).replace("{x}", String(x)).replace("{y}", String(y));

  let probed = 0;
  let frontier: Array<[number, number]> = [];
  for (let x = tileX(BBOX.west, Z_START); x <= tileX(BBOX.east, Z_START); x++)
    for (let y = tileY(BBOX.north, Z_START); y <= tileY(BBOX.south, Z_START); y++) frontier.push([x, y]);
  let present: Array<[number, number]> = [];
  for (let z = Z_START; z <= Z_END; z++) {
    present = [];
    for (const [x, y] of frontier) {
      probed++;
      const code = await status(url(z, x, y));
      if (code === 200 || code === 206) present.push([x, y]);
    }
    console.log(`${id}: z${z} probed ${frontier.length}, present ${present.length}`);
    if (z === Z_END) break;
    frontier = present.flatMap(([x, y]) => [[2 * x, 2 * y], [2 * x + 1, 2 * y], [2 * x, 2 * y + 1], [2 * x + 1, 2 * y + 1]] as Array<[number, number]>);
  }
  await writeFile(out, JSON.stringify({ id, zStart: Z_START, zEnd: Z_END, probed, source: template, generatedAt: new Date().toISOString(), present }) + "\n");
}

for (const id of process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT) await probe(id);
