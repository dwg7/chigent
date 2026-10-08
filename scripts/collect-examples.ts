/**
 * 公開ウェブページに埋め込まれた maps.gsi.go.jp/# への直リンクを集める(CLAUDE.md「事例の集め方」)。
 *
 *   node scripts/collect-examples.ts data/seeds/NN-name.json [data/examples/NN-name.jsonl]
 *
 * - X(旧 Twitter)は使わない。種(seed)は人が選んだ公開ページの URL と、その出どころの種類。
 * - robots.txt に従い(text/plain で返るときだけ解釈する)、同じホストへは間隔を空ける。
 * - ページ本文は貯めない。残すのは、リンク文字・ページの題名・直前の見出し・URL・出どころの種類だけ。
 * - seed の follow(正規表現)に合う同一ホストのリンクは 1 段だけ辿る。
 */
import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { promisify } from "node:util";

const run = promisify(execFile);

const UA = "chigent-research/0.1 (dwg7 activity; +https://github.com/dwg7/chigent)";
const DELAY_MS = 3000;

type SourceType = "product" | "explanatory" | "listing";
interface Seed { url: string; sourceType: SourceType; note?: string; follow?: string; maxFollow?: number }
interface Example {
  url: string;
  linkText: string;
  heading: string;
  pageTitle: string;
  pageUrl: string;
  sourceType: SourceType;
  fetchedAt: string;
}

interface Resp { status: number; contentType: string; url: string; body: Buffer }

const lastFetch = new Map<string, number>();
/**
 * 間隔を空けて取得する。Node の fetch は www.gsi.go.jp の古い TLS 設定(レガシー再ネゴシエーション)を
 * 拒否するので curl を使う(Node 側の安全設定は緩めない)。
 */
async function politeFetch(url: string): Promise<Resp> {
  const host = new URL(url).host;
  const wait = (lastFetch.get(host) ?? 0) + DELAY_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastFetch.set(host, Date.now());
  let stdout: Buffer;
  try {
    ({ stdout } = (await run(
      "curl",
      ["-sL", "-m", "30", "-A", UA, "-w", "\n%{http_code}\n%{content_type}\n%{url_effective}", url],
      { encoding: "buffer", maxBuffer: 64 * 1024 * 1024 },
    )) as unknown as { stdout: Buffer });
  } catch {
    // タイムアウトなど。1 ページの失敗で全体を止めない。
    return { status: 0, contentType: "", url, body: Buffer.alloc(0) };
  }
  // 末尾 3 行が -w の出力
  const text = stdout;
  let end = text.length;
  const tail: string[] = [];
  for (let i = 0; i < 3; i++) {
    const nl = text.lastIndexOf(0x0a, end - 1);
    tail.unshift(text.subarray(nl + 1, end).toString("utf8"));
    end = nl;
  }
  return { status: +tail[0], contentType: tail[1], url: tail[2], body: text.subarray(0, end) };
}

const robotsCache = new Map<string, string[]>();
async function allowed(url: string): Promise<boolean> {
  const u = new URL(url);
  if (!robotsCache.has(u.host)) {
    const disallow: string[] = [];
    try {
      const r = await politeFetch(`${u.protocol}//${u.host}/robots.txt`);
      if (r.status === 200 && r.contentType.startsWith("text/plain")) {
        let applies = false;
        for (const raw of r.body.toString("utf8").split(/\r?\n/)) {
          const line = raw.replace(/#.*/, "").trim();
          const m = /^([^:]+):\s*(.*)$/.exec(line);
          if (!m) continue;
          const k = m[1].toLowerCase();
          if (k === "user-agent") applies = m[2] === "*" || UA.toLowerCase().includes(m[2].toLowerCase());
          else if (k === "disallow" && applies && m[2]) disallow.push(m[2]);
        }
      }
    } catch { /* robots.txt が取れないときは制限なしとみなす */ }
    robotsCache.set(u.host, disallow);
  }
  return !robotsCache.get(u.host)!.some((p) => (u.pathname + u.search).startsWith(p));
}

const decodeEntities = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&nbsp;/g, " ");
const textOf = (html: string) => decodeEntities(html.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();

async function getHtml(url: string): Promise<{ html: string; finalUrl: string } | null> {
  if (!(await allowed(url))) { console.error("robots.txt disallows:", url); return null; }
  const r = await politeFetch(url);
  if (r.status !== 200 || !r.contentType.includes("html")) { console.error(r.status, r.contentType, url); return null; }
  const head = new TextDecoder("latin1").decode(r.body.subarray(0, 2048));
  const cs = /charset=["']?([\w-]+)/i.exec(r.contentType)?.[1] ?? /charset=["']?([\w-]+)/i.exec(head)?.[1] ?? "utf-8";
  return { html: new TextDecoder(cs).decode(r.body), finalUrl: r.url };
}

const MAPS = /maps\.gsi\.go\.jp\/#/;

function extract(html: string, pageUrl: string, sourceType: SourceType, fetchedAt: string) {
  const pageTitle = textOf(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "");
  const examples: Example[] = [];
  const links: string[] = [];
  let heading = "";
  // 見出しとリンクを出現順にたどる
  const re = /<(h[1-6])\b[^>]*>([\s\S]*?)<\/\1>|<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  for (let m; (m = re.exec(html)); ) {
    if (m[1]) { heading = textOf(m[2]); continue; }
    const href = /href\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(m[3])?.slice(1).find((x) => x !== undefined);
    if (!href) continue;
    const abs = decodeEntities(href).trim();
    if (MAPS.test(abs)) {
      examples.push({
        url: abs.startsWith("//") ? "https:" + abs : abs,
        linkText: textOf(m[4]), heading, pageTitle, pageUrl, sourceType, fetchedAt,
      });
    } else {
      try { links.push(new URL(abs, pageUrl).href.split("#")[0]); } catch { /* 無効な href */ }
    }
  }
  return { examples, links };
}

const seedsPath = process.argv[2] ?? "data/seeds/01-initial.json";
const outPath = process.argv[3] ?? seedsPath.replace("data/seeds/", "data/examples/").replace(/\.json$/, ".jsonl");
const seeds: Seed[] = JSON.parse(await readFile(seedsPath, "utf8"));
const out: Example[] = [];
const visited = new Set<string>();

async function visit(url: string, seed: Seed, depth: number) {
  if (visited.has(url)) return;
  visited.add(url);
  const page = await getHtml(url);
  if (!page) return;
  const { examples, links } = extract(page.html, page.finalUrl, seed.sourceType, new Date().toISOString());
  console.log(`${examples.length}\t${url}`);
  out.push(...examples);
  if (depth === 0 && seed.follow) {
    const re = new RegExp(seed.follow);
    let n = 0;
    for (const l of new Set(links)) {
      if (n >= (seed.maxFollow ?? Infinity)) break;
      if (new URL(l).host === new URL(url).host && re.test(l) && !visited.has(l)) { n++; await visit(l, seed, 1); }
    }
  }
}
for (const s of seeds) await visit(s.url, s, 0);

await writeFile(outPath, out.map((e) => JSON.stringify(e)).join("\n") + (out.length ? "\n" : ""));
console.log(`${out.length} links from ${visited.size} pages -> ${outPath}`);
