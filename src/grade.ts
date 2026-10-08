/**
 * 「問い → 期待される URL(の許される範囲)」の採点(CLAUDE.md 柱 7)。
 * Copilot の出した URL を貼って、仕様どおりかを機械で判定する。コードは Copilot の中では動かないので、
 * これが「正解」の基準になる(D-009)。
 */
import { parseGsiUrl } from "./gsi-url.ts";
import { loadLayerIndex, validate, type LayerIndex } from "./layers.ts";

export interface QuestionCase {
  id: string;
  question: string;
  /** 根拠(どの事例や製品ページ、あるいは判断か) */
  basis: string;
  expect: {
    /** 地図を返せない問い。URL を返してはいけない。 */
    noUrl?: boolean;
    /** URL を返さなくてもよい(「ない」と答えるのが正しい場合もある)。返すなら下の条件を満たすこと。 */
    orNoUrl?: boolean;
    /** 含んではいけないレイヤー(問われていない地図や、代用してはいけない地図) */
    layersForbid?: string[];
    center?: { lat: number; lon: number; withinKm: number };
    zoom?: [min: number, max: number];
    /** すべて含む */
    layersAll?: string[];
    /** 各グループから 1 つ以上含む */
    layersAny?: string[][];
    /** 重ねる枚数(背景を除く)の上限 */
    maxOverlays?: number;
    /** base= として許すもの(既定は std/pale/blank/english/seamlessphoto/ort のどれか) */
    base?: string[];
  };
}

export interface Grade {
  pass: boolean;
  failures: string[];
  warnings: string[];
}

const km = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
  const r = Math.PI / 180, R = 6371;
  const dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

/** answer は Copilot が返した URL。URL を返さなかったときは null。 */
export function gradeAnswer(c: QuestionCase, answer: string | null, index: LayerIndex = loadLayerIndex()): Grade {
  const failures: string[] = [], warnings: string[] = [];
  const e = c.expect;
  if (e.noUrl) {
    if (answer !== null) failures.push("a URL was returned for a question that a map cannot answer");
    return { pass: failures.length === 0, failures, warnings };
  }
  if (answer === null) return e.orNoUrl ? { pass: true, failures, warnings: ["no URL returned (allowed)"] } : { pass: false, failures: ["no URL returned"], warnings };

  let parsed;
  try { parsed = parseGsiUrl(answer); } catch (err) { return { pass: false, failures: [`unparsable URL: ${err}`], warnings }; }
  const { intent } = parsed;
  warnings.push(...parsed.warnings);
  if (parsed.warnings.length > 0) failures.push(`URL gsimaps would not read as written: ${parsed.warnings.join("; ")}`);

  const v = validate(intent, index);
  for (const i of v.issues) {
    if (i.level === "error") failures.push(`${i.code}: ${i.message}`);
    else if (i.level === "warning") warnings.push(`${i.code}: ${i.message}`);
  }

  const ids = intent.map.layers.map((l) => l.id);
  const base = intent.map.base ?? ids[0];
  const bases = e.base ?? ["std", "pale", "blank", "english", "seamlessphoto", "ort"];
  if (!bases.includes(base)) failures.push(`base '${base}' not in ${bases.join(",")}`);
  const overlays = ids.slice(1); // 先頭は背景地図
  if (e.maxOverlays !== undefined && overlays.length > e.maxOverlays) failures.push(`${overlays.length} overlays > ${e.maxOverlays}`);
  for (const id of e.layersAll ?? []) if (!ids.includes(id)) failures.push(`missing layer ${id}`);
  for (const id of e.layersForbid ?? []) if (ids.includes(id)) failures.push(`forbidden layer ${id}`);
  for (const group of e.layersAny ?? []) if (!group.some((id) => ids.includes(id))) failures.push(`none of ${group.join("|")}`);
  if (e.zoom && (intent.map.view.zoom < e.zoom[0] || intent.map.view.zoom > e.zoom[1])) failures.push(`zoom ${intent.map.view.zoom} not in ${e.zoom.join("..")}`);
  if (e.center) {
    const d = km(intent.map.view, e.center);
    if (d > e.center.withinKm) failures.push(`center is ${d.toFixed(1)} km from the expected place (> ${e.center.withinKm} km)`);
  }
  // 形式の規約(プロンプトの「URLの形」)。blend の桁数が合わないと、gsimaps は余った桁を無視し、
  // 足りない桁は「relief を含む ID だけ 1」の既定になる(url-grammar.md)ので、意図が変わりうる。失敗にする。
  if (!intent.screen.vs) warnings.push("vs missing");
  const wantBlend = Math.max(0, ids.length - 1);
  const gotBlend = (intent.screen.blend ?? "").length;
  if (gotBlend !== wantBlend) failures.push(`blend has ${gotBlend} digits, expected ${wantBlend} (ls has ${ids.length} elements)`);
  if (!/^0*$/.test(intent.screen.blend ?? "")) warnings.push("blend contains 1 (multiply): not in the prompt's template");
  return { pass: failures.length === 0, failures, warnings };
}
