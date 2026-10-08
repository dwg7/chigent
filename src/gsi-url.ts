/**
 * 地理院地図 URL ⇄ MapIntent(地理院方言)の決定的な変換。
 *
 * 振る舞いは gsimaps のソースに合わせてある(根拠: docs/url-grammar.md)。
 * 推測で補った箇所は無い。AI は一切使わない。
 */

import {
  GsiUrlError,
  type GsiLayer,
  type GsiMapIntent,
  type ParseResult,
} from "./mapintent.ts";

export const DEFAULT_ORIGIN = "https://maps.gsi.go.jp/";

/** decodeURIComponent は不正な % で例外を投げる。gsimaps は黙って捨てるが、こちらは生のまま残す。 */
function decode(s: string, warnings: string[]): string {
  try {
    return decodeURIComponent(s);
  } catch {
    warnings.push(`invalid percent-encoding kept as-is: ${s}`);
    return s;
  }
}

/** 地理院地図の URL(または `#` 以降のハッシュ)を MapIntent にする。 */
export function parseGsiUrl(input: string): ParseResult {
  const warnings: string[] = [];

  const hashAt = input.indexOf("#");
  if (hashAt < 0) throw new GsiUrlError("no '#' hash part in URL");
  const hash = input.slice(hashAt + 1);

  // gsimaps は "/&" でハッシュを「位置」と「オプション」に分ける
  // (gsimaps.js HashCreate / QueryParams.initialize)。
  const sep = hash.indexOf("/&");
  const positionPart = sep < 0 ? hash : hash.slice(0, sep);
  const optionPart = sep < 0 ? "" : hash.slice(sep + 2);
  if (sep < 0 && hash.includes("&")) {
    warnings.push("'&' found but no '/&' separator: gsimaps ignores all options");
  }
  if (sep >= 0 && optionPart.includes("/&")) {
    warnings.push("multiple '/&' separators: gsimaps ignores all options");
  }

  // 位置: L.Hash.parseHash(leaflet-hash-gsi.js)
  const args = positionPart.split("/");
  if (args.length < 3) throw new GsiUrlError(`position needs z/lat/lon: ${positionPart}`);
  const zoom = parseInt(args[0], 10);
  const lat = parseFloat(args[1]);
  const lon = parseFloat(args[2]);
  if (Number.isNaN(zoom) || Number.isNaN(lat) || Number.isNaN(lon)) {
    throw new GsiUrlError(`position is not numeric: ${positionPart}`);
  }
  if (zoom < 0 || zoom > 18) warnings.push(`zoom ${zoom} is outside 0..18`);

  // オプション: QueryParams._parse。同じキーは後勝ち。
  const known = new Map<string, string>();
  const extra: GsiMapIntent["extra"] = [];
  const KNOWN = new Set(["base", "base_grayscale", "ls", "blend", "disp", "lcd", "hc", "vs", "d"]);
  for (const seg of optionPart.split("&")) {
    if (seg === "") continue;
    const eq = seg.indexOf("=");
    const key = decode(eq < 0 ? seg : seg.slice(0, eq), warnings);
    const value = eq < 0 ? null : decode(seg.slice(eq + 1), warnings);
    if (KNOWN.has(key) && value !== null) {
      if (known.has(key)) warnings.push(`duplicate '${key}': last one wins`);
      known.set(key, value);
    } else {
      extra.push([key, value]);
    }
  }

  // ls + disp → layers(QueryParams._initLayerList)。
  // disp は ls の「元の添字」で引く(空要素を読み飛ばしても添字はずれない)。
  const layers: GsiLayer[] = [];
  const ls = known.get("ls");
  const disp = known.get("disp");
  if (ls) {
    const segs = ls.split("|");
    for (let i = 0; i < segs.length; i++) {
      if (segs[i].trim() === "") {
        warnings.push(`empty ls element at index ${i} skipped`);
        continue;
      }
      const parts = segs[i].split(",");
      let opacity = 1;
      if (parts.length >= 2) {
        if (!Number.isNaN(Number(parts[1]))) {
          const o = parseFloat(parts[1]);
          if (o >= 0 && o <= 1) opacity = o;
          else warnings.push(`opacity out of range ignored: ${segs[i]}`);
        } else {
          warnings.push(`opacity not numeric ignored: ${segs[i]}`);
        }
      }
      if (parts.length >= 3) warnings.push(`extra ls fields ignored: ${segs[i]}`);
      const hidden = disp !== undefined && disp.length > i && disp[i] === "0";
      layers.push({ id: parts[0], opacity, hidden });
    }
  }
  if (disp !== undefined && !ls) warnings.push("disp without ls ignored");

  const intent: GsiMapIntent = {
    dialect: "gsimaps",
    map: { view: { zoom, lat, lon }, layers },
    screen: {},
    extra,
  };
  const base = known.get("base");
  if (base !== undefined && base !== "") intent.map.base = base;
  if (known.get("base_grayscale") === "1") intent.map.baseGrayscale = true;
  for (const k of ["lcd", "hc", "vs", "d", "blend"] as const) {
    const v = known.get(k);
    if (v !== undefined && v !== "") intent.screen[k] = v;
  }
  return { intent, warnings };
}

/** 緯度経度: gsimaps は toFixed(6)。6 桁で足りない値だけ桁を増やして、値を失わない。 */
function formatCoord(n: number): string {
  if (!Number.isFinite(n)) throw new GsiUrlError(`not a finite number: ${n}`);
  for (let d = 6; d <= 20; d++) {
    const s = n.toFixed(d);
    if (Number(s) === n) return s;
  }
  return n.toFixed(20);
}

/** 不透明度: gsimaps は toFixed(2) の末尾の 0 を 1 つ落とす。2 桁で表せない値だけ素直に出す。 */
function formatOpacity(o: number): string {
  if (o === 0) return "0";
  const s = o.toFixed(2);
  if (Number(s) !== o) return String(o);
  return s.replace(/0$/, "");
}

function checkLayer(l: GsiLayer): void {
  if (l.id === "" || /[|,]/.test(l.id) || l.id !== l.id.trim()) {
    throw new GsiUrlError(`invalid layer id: ${JSON.stringify(l.id)}`);
  }
  if (!(l.opacity >= 0 && l.opacity <= 1)) {
    throw new GsiUrlError(`opacity must be within 0..1: ${l.id}`);
  }
}

/** MapIntent から URL を組み立てる。パラメータの順序は gsimaps 自身が書き出す順序に合わせる。 */
export function buildGsiUrl(intent: GsiMapIntent, options: { origin?: string } = {}): string {
  const { view, base, baseGrayscale, layers } = intent.map;
  if (!Number.isInteger(view.zoom)) throw new GsiUrlError(`zoom must be an integer: ${view.zoom}`);
  layers.forEach(checkLayer);

  const q: string[] = [];
  const add = (k: string, v: string) => q.push(`${k}=${encodeURIComponent(v)}`);

  // 順序: base, base_grayscale, ls, blend, disp, lcd, hc, vs, d, その他
  // (pageStateManager.getBaseLayerQueryString → getLayersQueryString → getTileViewSetting
  //  → getCurrentPathQueryString → getQueryParams の呼び出し順。gsimaps.js HashCreateProc)
  if (base) add("base", base);
  if (baseGrayscale) q.push("base_grayscale=1");
  if (layers.length > 0) {
    add("ls", layers.map((l) => l.id + (l.opacity !== 1 ? "," + formatOpacity(l.opacity) : "")).join("|"));
    if (intent.screen.blend) q.push(`blend=${intent.screen.blend}`);
    q.push(`disp=${layers.map((l) => (l.hidden ? "0" : "1")).join("")}`);
  }
  if (intent.screen.lcd) add("lcd", intent.screen.lcd);
  if (intent.screen.hc) q.push(`hc=${intent.screen.hc}`);
  if (intent.screen.vs) q.push(`vs=${intent.screen.vs}`);
  if (intent.screen.d) q.push(`d=${intent.screen.d}`);
  for (const [k, v] of intent.extra) {
    q.push(v === null ? encodeURIComponent(k) : `${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  }

  const pos = `${view.zoom}/${formatCoord(view.lat)}/${formatCoord(view.lon)}`;
  return `${options.origin ?? DEFAULT_ORIGIN}#${pos}/${q.map((s) => "&" + s).join("")}`;
}

/**
 * blend= の実効値(ls の 2 番目以降のレイヤーごと)。
 * blend= が無いとき gsimaps は、ID に "relief" を含むレイヤーだけ 1 にする(_initLayerList)。
 */
export function effectiveBlend(intent: GsiMapIntent): boolean[] {
  const blend = intent.screen.blend;
  return intent.map.layers.slice(1).map((l, i) => (blend !== undefined ? blend[i] === "1" : l.id.includes("relief")));
}

/** vs= を [キー, 値] の組に分ける(奇数長の末尾 1 字は gsimaps と同じく捨てる)。 */
export function vsPairs(vs: string): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (let i = 0; i + 1 < vs.length; i += 2) out.push([vs[i], vs[i + 1]]);
  return out;
}
