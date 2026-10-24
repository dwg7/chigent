// genkan のページ。判断はすべて genkan.js(src/genkan.ts と同じコード)で行い、ここは画面の組み立てだけ。
// 受け取った文字列は textContent / 属性としてだけ使う(innerHTML は使わない)。
// 開く先は、必ず buildGsiUrl が作った maps.gsi.go.jp の URL だけ。
import { parseGenkan, summarize, toGsiIntent } from "./genkan.js";
import { buildGsiUrl } from "./gsi-url.js";

function el(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === false) continue;
    if (k === "class") e.className = v;
    else e.setAttribute(k, v === true ? "" : String(v));
  }
  for (const kid of kids) e.append(kid);
  return e;
}

const app = document.getElementById("app");
const info = el("div"); // 要約・案内（描き直す）
const frameBox = el("div"); // 地図のフレーム（URL が変わったときだけ更新する。移動すると再読み込みになるため）
app.append(info, frameBox);
const GSI = "https://maps.gsi.go.jp/#";
let table = null; // { ID: [タイトル, 最小ズーム, 最大ズーム] }
let lower = null; // 小文字の ID → 表の綴り
let tableState = "loading"; // loading | ready | failed
let waitedForTable = false;

function loadTable() {
  fetch("layers.json")
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((t) => {
      table = t;
      lower = new Map(Object.keys(t).map((k) => [k.toLowerCase(), k]));
      tableState = "ready";
      render();
    })
    .catch(() => {
      tableState = "failed";
      render();
    });
}

function copyButton(label, text, input) {
  const b = el("button", { class: "btn secondary", type: "button" }, label);
  b.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(text);
      b.textContent = "コピーしました";
    } catch {
      if (input) {
        input.focus();
        input.select();
      }
      b.textContent = "選択しました（Ctrl/⌘+C でコピー）";
    }
  });
  return b;
}

function notes(kind, lines) {
  if (lines.length === 0) return document.createDocumentFragment();
  return el("div", { class: `note ${kind}` }, el("ul", {}, ...lines.map((l) => el("li", {}, l))));
}

function renderAbout() {
  const ex = [
    ["焼岳の火山土地条件図", "#14/36.228823/137.586174/&l=vlcd_yakedake"],
    ["広島市の土石流と急傾斜地の警戒区域", "#13/34.385300/132.455300/&l=05_dosekiryukeikaikuiki,05_kyukeishakeikaikuiki"],
    ["石垣島の川平湾（標準地図だけ）", "#14/24.456400/124.151700"],
  ];
  info.append(
    el("h1", {}, "地理院地図への玄関"),
    el("p", {}, "chigent（問いに対して地理院地図の URL を返すエージェント）が返す、短いリンクの行き先です。リンクの # 以降の内容から、地理院地図の URL を組み立てて開きます。"),
    el("h2", {}, "リンクの形"),
    el("p", {}, el("code", {}, "https://dwg7.unopengis.org/chigent/genkan/#ズーム/緯度/経度/&b=背景&l=図,図")),
    el("p", { class: "muted" }, "b は省略すると標準地図（std）。l は下から上の順で、背景は含めません。&m=g を付けると、確認なしにそのまま地理院地図へ移ります。"),
    el("h2", {}, "例"),
    el("ul", {}, ...ex.map(([t, h]) => el("li", {}, el("a", { href: h }, t), " ", el("code", {}, h)))),
  );
}

function renderProblems(r, hash) {
  info.append(
    el("h1", {}, "リンクの内容を読み取れませんでした"),
    notes("err", r.problems),
    el("p", {}, "位置が届かないと、別の場所を開く恐れがあるので、何も開いていません。チャットでは、リンクの # 以降が途中で切れることがあります。リンクをもう一度コピーするか、エージェントに聞き直してください。"),
    el("h2", {}, "届いた内容"),
    el("p", {}, el("code", {}, hash || "（空）")),
  );
}

function showFrame(url) {
  let f = frameBox.firstChild;
  if (!f) {
    f = el("iframe", {
      title: "地理院地図",
      referrerpolicy: "no-referrer",
      sandbox: "allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-downloads allow-forms",
    });
    frameBox.append(f);
  }
  if (f.getAttribute("src") !== url) f.setAttribute("src", url);
}

// 画面を描き、フレームに表示する URL を返す（表示しないときは undefined）
function renderInner() {
  if (location.hash.length <= 1) return renderAbout();
  const r = parseGenkan(location.href);
  if (!r.intent) return renderProblems(r, location.hash);

  const opts =
    tableState === "ready"
      ? { lookup: (id) => lower.get(id.toLowerCase()), title: (id) => table[id]?.[0], range: (id) => (table[id]?.[1] != null ? [table[id][1], table[id][2]] : undefined) }
      : {};
  const sum = summarize(r.intent, opts);
  const url = buildGsiUrl(toGsiIntent({ ...r.intent, overlays: sum.canonicalOverlays }));
  if (!url.startsWith(GSI)) return renderProblems({ problems: ["内部エラー: 開く先が地理院地図ではありません"] }, location.hash);

  const mode = r.intent.mode ?? "p";
  if (mode === "g") {
    if (tableState === "loading" && !waitedForTable) {
      waitedForTable = true;
      setTimeout(() => {
        if (tableState === "loading") tableState = "failed"; // 待ちきれなければ、表なしで進む
        render();
      }, 1500);
    }
    if (tableState !== "loading" && sum.unknownIds.length === 0) {
      location.replace(url);
      info.append(el("p", {}, "地理院地図へ移動しています…"));
      return;
    }
    if (tableState === "loading") {
      info.append(el("p", {}, "確認しています…"));
      return;
    }
  }

  const lines = [...r.warnings, ...sum.notes];
  if (sum.unknownIds.length > 0) lines.push(`地理院地図の図の表に無い ID があります: ${sum.unknownIds.join(", ")}（その図は表示されないかもしれません）`);
  if (tableState === "failed") lines.push("図の表を読み込めなかったので、ID の確認はしていません。");

  const input = el("input", { class: "url", readonly: true, value: url, "aria-label": "地理院地図の URL" });
  info.append(
    el("h1", {}, sum.text),
    notes("warn", lines),
    el("div", { class: "actions" }, el("a", { class: "btn", href: url, target: "_blank", rel: "noopener noreferrer" }, "地理院地図で開く"), copyButton("地理院地図の URL をコピー", url, input)),
    el("details", {}, el("summary", {}, "地理院地図の URL"), input),
  );
  return mode !== "n" ? url : undefined;
}

function render() {
  info.replaceChildren();
  const url = renderInner();
  if (url) showFrame(url);
  else frameBox.replaceChildren();
}

window.addEventListener("hashchange", render);
render();
loadTable();
