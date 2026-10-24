// 生成物: scripts/build-genkan.ts が src/genkan.ts から作る。直接は編集しない。
/**
 * genkan(玄関): エージェントが出す「短い契約のリンク」を読み、地理院地図の URL にする。
 * 仕様は docs/genkan-spec.md。ブラウザでもそのまま動くように、fs などには依存しない
 * (docs/genkan/ に scripts/build-genkan.ts がこのファイルから JS を生成する)。
 *
 *   https://dwg7.unopengis.org/chigent/genkan/#{z}/{lat}/{lon}/&b={背景}&l={図},{図}
 *
 * 契約は「地図の意図」(位置・背景・重ねる図)だけを運ぶ。blend / disp / lcd / vs / d は、ここで決まった値を入れる。
 * 送り手には厳しく(仕様の範囲だけ)、受け手には寛容に(直せる誤りは直し、警告を返す)。
 */
import { buildGsiUrl } from "./gsi-url.js";
                                                   

export const GENKAN_ORIGIN = "https://dwg7.unopengis.org/chigent/genkan/";
export const GENKAN_BASE_IDS                      = new Set(["std", "pale", "blank", "english", "ort"]);
export const GENKAN_MODES                      = new Set(["p", "g", "n"]);
const MAX_OVERLAYS = 8;
/** vs= は画面の状態(D-002)。エージェントには決めさせず、プロンプトの型(D-013)と同じ値を入れる。 */
const VS = "c1g1j0h0k0l0u0t0z0r0s0m0f1";

                             
               
              
              
 
                               
                   
                                                
               
                          
                     
                                                  
                
 
                              
                        
                                 
                     
                
                     
 

const BASE_NAMES                         = {
  std: "標準地図",
  pale: "淡色地図",
  blank: "白地図",
  english: "English",
  ort: "電子国土基本図（オルソ画像）",
};

function dec(s        )         {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/** URL 全体、または # 以降(または位置から始まる文字列)を読む。 */
export function parseGenkan(input        )              {
  const problems           = [];
  const warnings           = [];
  const h = input.indexOf("#");
  const frag = h >= 0 ? input.slice(h + 1) : /^\s*-?\d/.test(input) ? input : "";
  if (frag.trim() === "") return { problems: ["位置(ズーム/緯度/経度)が届いていません"], warnings };

  const m = /^\s*([^/&?]*)\/([^/&?]*)\/([^/&?]*)([\s\S]*)$/.exec(frag);
  if (!m) return { problems: ["位置が「ズーム/緯度/経度」の形ではありません"], warnings };
  const num = (s        )         => (dec(s).trim() === "" ? NaN : Number(dec(s)));
  let zoom = num(m[1]);
  let lat = num(m[2]);
  let lon = num(m[3]);
  if (![zoom, lat, lon].every(Number.isFinite)) return { problems: ["ズーム・緯度・経度が数値ではありません"], warnings };

  // 緯度と経度の取り違え: 緯度に収まらず、経度の側に緯度として収まる値が来ているときだけ入れ替える
  if (Math.abs(lat) > 90 && Math.abs(lon) <= 90) {
    [lat, lon] = [lon, lat];
    warnings.push("緯度と経度が逆に書かれていたので入れ替えました");
  }
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return { problems: ["緯度・経度が範囲外です"], warnings };
  if (!Number.isInteger(zoom)) {
    zoom = Math.round(zoom);
    warnings.push("ズームが整数でなかったので丸めました");
  }
  if (zoom < 0 || zoom > 18) {
    zoom = Math.min(18, Math.max(0, zoom));
    warnings.push("ズームを 0〜18 に収めました");
  }

  // 位置の直後は「/&」が正。「&」「?」「/?」でも読む(受け手は寛容に)
  const params = new URLSearchParams(m[4].replace(/^\/?[&?]?/, ""));
  const last = (k        ) => {
    const all = params.getAll(k);
    return all.length > 0 ? all[all.length - 1] : undefined;
  };

  let base = last("b") ?? last("base");
  let overlays = params
    .getAll("l")
    .flatMap((v) => v.split(","))
    .map((s) => s.trim())
    .filter((s) => s !== "");
  if (overlays.length === 0 && params.has("ls")) {
    // 地理院の名前(先頭が背景)も入力として読む
    const parts = params.getAll("ls").flatMap((v) => v.split(/[,|]/)).map((s) => s.trim()).filter((s) => s !== "");
    if (parts.length > 0 && GENKAN_BASE_IDS.has(parts[0])) {
      const first = parts.shift() ;
      base = base ?? first;
    }
    overlays = parts;
  }
  if (base === undefined || base === "") base = "std";
  if (!GENKAN_BASE_IDS.has(base)) {
    warnings.push(`b=${base} は背景地図ではないので、重ねる図として扱いました`);
    overlays.unshift(base);
    base = "std";
  }
  const kept           = [];
  for (const id of overlays) {
    if (GENKAN_BASE_IDS.has(id)) warnings.push(`${id} は背景地図なので、重ねる図からは除きました`);
    else if (kept.includes(id)) warnings.push(`${id} が重複していたので 1 つにしました`);
    else kept.push(id);
  }
  if (kept.length > MAX_OVERLAYS) {
    warnings.push(`重ねる図が多すぎるので、先頭の ${MAX_OVERLAYS} 枚にしました`);
    kept.length = MAX_OVERLAYS;
  }
  const mode = last("m");
  const intent               = { view: { zoom, lat, lon }, base, overlays: kept };
  if (mode !== undefined && GENKAN_MODES.has(mode)) intent.mode = mode;
  return { intent, problems, warnings };
}

/** 契約 → 地理院方言の MapIntent。画面の状態(blend / disp / lcd / vs / d)はここで決める。 */
export function toGsiIntent(i              )               {
  const ids = [i.base, ...i.overlays];
  return {
    dialect: "gsimaps",
    map: {
      view: { ...i.view },
      base: i.base,
      layers: ids.map((id) => ({ id, opacity: 1, hidden: false })),
    },
    screen: {
      ...(ids.length > 1 ? { blend: "0".repeat(ids.length - 1) } : {}),
      lcd: ids[ids.length - 1],
      vs: VS,
      d: "m",
    },
    extra: [],
  };
}

/** 地理院方言 → 契約。契約で言えない形(背景と ls の先頭の食い違い、不透明度、非表示)は undefined。 */
export function fromGsiIntent(g              )                           {
  const layers = g.map.layers;
  const base = g.map.base ?? layers[0]?.id ?? "std";
  if (!GENKAN_BASE_IDS.has(base)) return undefined;
  if (layers.length > 0 && layers[0].id !== base) return undefined;
  if (layers.some((l) => l.hidden || l.opacity !== 1)) return undefined;
  return { view: { ...g.map.view }, base, overlays: layers.slice(1).map((l) => l.id) };
}

                                                       
               
 
/** 契約のリンク(または # 以降)→ 地理院地図の URL。 */
export function genkanToGsiUrl(input        )                   {
  const r = parseGenkan(input);
  if (!r.intent) return r;
  return { ...r, url: buildGsiUrl(toGsiIntent(r.intent)) };
}

/** 契約のリンクを組み立てる(送り手の側。テストと、プロンプトの例の生成に使う)。 */
export function buildGenkanUrl(i              , origin         = GENKAN_ORIGIN)         {
  const pos = `${i.view.zoom}/${i.view.lat.toFixed(6)}/${i.view.lon.toFixed(6)}`;
  const params           = [];
  if (i.base !== "std") params.push(`b=${encodeURIComponent(i.base)}`);
  if (i.overlays.length > 0) params.push(`l=${i.overlays.map(encodeURIComponent).join(",")}`);
  return `${origin}#${pos}${params.length > 0 ? "/&" + params.join("&") : ""}`;
}

                                 
                                                    
                                              
                                             
                 
                                                       
 
                          
               
                       
                              
                  
 

/** 検算用の要約(利用者が、AI の判断を目で確かめるための文)。 */
export function summarize(i              , o                 = {})          {
  const unknownIds           = [];
  const notes           = [];
  const canonicalOverlays = i.overlays.map((id) => {
    if (!o.lookup) return id;
    const c = o.lookup(id);
    if (c === undefined) {
      unknownIds.push(id);
      return id;
    }
    return c;
  });
  const names = canonicalOverlays.map((id) => o.title?.(id) ?? id);
  for (const id of canonicalOverlays) {
    const r = o.range?.(id);
    if (r && (i.view.zoom < r[0] || i.view.zoom > r[1])) notes.push(`${o.title?.(id) ?? id} はズーム ${r[0]}〜${r[1]} の図です(いまはズーム ${i.view.zoom})`);
  }
  const ns = i.view.lat >= 0 ? `北緯${i.view.lat.toFixed(6)}` : `南緯${(-i.view.lat).toFixed(6)}`;
  const ew = i.view.lon >= 0 ? `東経${i.view.lon.toFixed(6)}` : `西経${(-i.view.lon).toFixed(6)}`;
  const layers = [BASE_NAMES[i.base] ?? i.base, ...names].join(" + ");
  return { text: `${layers}、ズーム${i.view.zoom}、${ns} ${ew}`, unknownIds, canonicalOverlays, notes };
}
