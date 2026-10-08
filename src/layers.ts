/**
 * レイヤーの知識(data/layers-index.json)に対する検索と検証。
 * 索引は scripts/build-layer-index.ts が layers-martin から作る(DECISIONS.md D-008)。
 */
import { readFileSync } from "node:fs";
import type { GsiMapIntent } from "./mapintent.ts";

export interface LayerEntry {
  /** タイトル(HTML 除去済み) */
  t: string;
  /** 階層(" > " 区切り) */
  p: string;
  /** "catalog" = layers-martin の catalog にある(画像タイル/MVT)。"group" = id を持つ LayerGroup(子をまとめて表示)。それ以外は catalog から除外された理由。 */
  s: string;
  /** 拡張子(除外されたものだけ) */
  x?: string;
  /** [minzoom, maxzoom](catalog のレイヤーのうち、TileJSON に範囲があるもの) */
  z?: [number, number];
}

export interface LayerIndex {
  source: { root: string; catalogSha256: string; reportSha256: string; generatedAt: string };
  counts: Record<string, number>;
  layers: Record<string, LayerEntry>;
}

export function loadLayerIndex(path = new URL("../data/layers-index.json", import.meta.url)): LayerIndex {
  return JSON.parse(readFileSync(path, "utf8"));
}

/** 背景地図(layers0.txt)。base= に指定でき、ls の中で背景の枠を占める。 */
export const BASE_IDS: ReadonlySet<string> = new Set(["std", "pale", "blank", "english", "ort"]);

/** 災害時の観測スナップショット。件数が多く、普段の問いには出ない。 */
const SNAPSHOT = new Set(["sar_observation_snapshot", "aircraft_sar_observation_snapshot"]);

const norm = (s: string) => s.normalize("NFKC").toLowerCase();

export interface SearchHit {
  id: string;
  title: string;
  path: string;
  status: string;
}

/**
 * 言葉でレイヤーを探す。空白で区切った語がすべて ID・タイトル・階層のどれかに含まれるものを返す。
 * 既定では SAR 観測スナップショットを除く(includeSnapshots で含める)。
 */
export function searchLayers(
  index: LayerIndex,
  query: string,
  options: { limit?: number; includeSnapshots?: boolean } = {},
): SearchHit[] {
  const tokens = norm(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  const hits: Array<SearchHit & { score: number }> = [];
  for (const [id, e] of Object.entries(index.layers)) {
    if (!options.includeSnapshots && SNAPSHOT.has(e.s)) continue;
    const nid = norm(id), nt = norm(e.t), np = norm(e.p);
    let score = 0;
    let all = true;
    for (const tok of tokens) {
      const s = nid === tok ? 10 : nt.includes(tok) ? 3 : nid.includes(tok) ? 2 : np.includes(tok) ? 1 : 0;
      if (s === 0) { all = false; break; }
      score += s;
    }
    if (all) hits.push({ id, title: e.t, path: e.p, status: e.s, score: score + (e.s === "catalog" ? 0.5 : 0) });
  }
  hits.sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : 1));
  return hits.slice(0, options.limit ?? 20).map(({ score: _, ...h }) => h);
}

export interface Issue {
  level: "error" | "warning" | "info";
  code: string;
  message: string;
}

export interface ValidateResult {
  ok: boolean;
  issues: Issue[];
}

/** MapIntent が地理院地図で意図どおりに開けるかを確かめる(ズーム範囲・レイヤー別の範囲は未対応)。 */
export function validate(intent: GsiMapIntent, index: LayerIndex): ValidateResult {
  const issues: Issue[] = [];
  const add = (level: Issue["level"], code: string, message: string) => issues.push({ level, code, message });
  const { view, base, layers } = intent.map;

  if (!Number.isInteger(view.zoom) || view.zoom < 0 || view.zoom > 18) add("error", "zoom_range", `zoom ${view.zoom} is not an integer in 0..18`);
  if (!(view.lat >= -90 && view.lat <= 90)) add("error", "lat_range", `lat ${view.lat} is outside -90..90`);
  if (!(view.lon >= -180 && view.lon <= 180)) add("warning", "lon_range", `lon ${view.lon} is outside -180..180`);

  if (base !== undefined && !BASE_IDS.has(base)) add("error", "unknown_base", `base '${base}' is not a base map (${[...BASE_IDS].join(", ")})`);

  const seen = new Set<string>();
  layers.forEach((l, i) => {
    let e = index.layers[l.id];
    if (!e) {
      // URL の ID は大文字小文字を区別する(layers-martin の catalog のキーは小文字化されている)
      const hit = Object.keys(index.layers).find((k) => k.toLowerCase() === l.id.toLowerCase());
      if (hit) add("error", "layer_case_mismatch", `layer '${l.id}' should be '${hit}' (IDs are case-sensitive)`);
      else add("error", "unknown_layer", `layer '${l.id}' is not in layers.txt`);
    } else if (e.s === "group") add("info", "layer_group", `layer '${l.id}' is a LayerGroup (shows its members)`);
    else if (e.s !== "catalog") add("info", "not_in_catalog", `layer '${l.id}' is not in the layers-martin catalog (${e.s}${e.x ? " " + e.x : ""})`);
    if (e?.z && (view.zoom < e.z[0] || view.zoom > e.z[1])) {
      add("warning", "zoom_outside_layer", `layer '${l.id}' is available at zoom ${e.z[0]}..${e.z[1]}, view is ${view.zoom}`);
    }
    if (seen.has(l.id)) add("warning", "duplicate_layer", `layer '${l.id}' appears more than once`);
    seen.add(l.id);
    if (i > 0 && BASE_IDS.has(l.id)) add("warning", "base_in_overlay", `base map '${l.id}' at ls[${i}]: gsimaps replaces it with the base map`);
  });
  if (layers.length > 0 && !BASE_IDS.has(layers[0].id)) {
    add("warning", "first_layer_not_base", `ls[0] '${layers[0].id}' is not a base map: gsimaps prepends the base map and shifts disp by one`);
  }
  if (layers.length === 0) add("info", "no_layers", "no ls: only the base map is shown");
  return { ok: !issues.some((i) => i.level === "error"), issues };
}
