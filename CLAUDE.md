# CLAUDE.md — chigent の作業規則

chigent(chizu + agent)は、問いに対して地理院地図(maps.gsi.go.jp)の URL を返すエージェント。dwg7(UN Smart Maps Group)の活動で、国土地理院の公式な製品ではない。Staccato Architecture の **Staff** の実装であり、Cartographer は現世代の地理院地図をそのまま使う。

応答は日本語(敬語)。成果物の言語は読者に合わせる(このリポジトリの文書は日本語)。決めたことは DECISIONS.md に追記する(消さない)。

## 設計の柱

1. **URL ⇄ MapIntent(地理院方言)は決定的なコード。** AI に推測させない。文法の根拠は gsimaps のソース(`gsi-cyberjapan/gsimaps`)で、まとめは `docs/url-grammar.md`。事例から文法を推測しない。最重要の性質は**往復で失われないこと**。
2. **MapIntent は「地図の意図」と「画面の状態」を分ける。** 地図の意図 = 中心・ズーム・`base`・`ls` とその表示/非表示(`src/mapintent.ts` の `map`)。画面の状態 = `lcd` `vs` `d` `blend` `hc`(`screen`)。画面の状態は往復のために保持するが、問いとの対応づけには使わない。
3. **レイヤーの知識は layers.txt(layers-martin)から。** 場所は藤村に聞く。
4. **プロンプトを短くする。** 実際の URL の事例から使用頻度を数え、レイヤーを 核(常にプロンプトへ)/ 周辺(検索の道具で引く)/ 対象外(理由を DECISIONS.md に) の三段に分ける。事例に出ないことは使われないことと同じではない(災害時だけのレイヤーなど)。単純に削らない。
5. **事例の集め方。** X(旧 Twitter)は使わない。公開ウェブページに埋め込まれた `maps.gsi.go.jp/#` への直リンクを集める。robots.txt に従い、間隔を空ける。投稿・記事の全文は貯めない(リンク文字、ページ題名、直前の見出し、URL、出どころの種類だけ)。出どころの種類を必ず付ける: **製品型**(最重要。地図製品ページの「地理院地図で見る」)/ **解説型** / **一覧型**(レイヤーが存在する根拠のみ。使用頻度には数えない。必ず分けて数える)。
6. **決定的にできることは、コードにして基準にする。** 最終形は Microsoft Copilot(ウェブアクセスあり)で動く**プロンプト**(D-009)。コード(`parse_gsi_url` `build_gsi_url` `search_layers` `validate` ほか)は、プロンプトの出力を採点する基準と、プロンプトに載せる知識の生成器。言葉の理解だけを AI に任せる。プロンプトは短く保つ。
7. **仕様の本体はテスト。** `tests/roundtrip/`(URL の往復)、`tests/questions/`(問い → 期待される URL または許される範囲)。あいまいなふるまいを見つけたら、先にテストを書いてから実装する。

## やらないこと

- X の収集
- 地理院地図そのものの改修、独自の地図表示
- 地理院地図の URL の文法を、ソースを確かめずに推測で決めること

## 開発

- Node.js ≥ 22.18。TypeScript は Node が直接実行する(型の剥ぎ取りのみ)。依存パッケージ・ビルド工程なし。
  - 使える構文は erasable なものだけ(`enum` `namespace` コンストラクタの引数プロパティは不可)。
  - 相対 import は拡張子付き(`./mapintent.ts`)。
- テスト: `npm test`
- gsimaps のソースはリポジトリに複製しない。`docs/url-grammar.md` にコミットと行番号を書く。ソースが更新されたら、コミットを更新して差分を確かめる。

## 共有リポジトリ

dwg7/evergreen と共有する概念(Staccato の役割、MapIntent の共通部分)が固まったら、薄い共有リポジトリ dwg7/staccato に上げる。規則は「**二つ以上のプロジェクトが必要としたものだけを上げる**」。今は chigent の中で育てる。

## 迷ったら

仕様があいまいなところ、判断が分かれるところは、推測で埋めずに藤村に質問する。

## 事例の収集と段の判定(手順)

1. 種を `data/seeds/NN-*.json` に書く(公開ページの URL、出どころの種類 `product`/`explanatory`/`listing`、必要なら `follow` と `maxFollow`)。
2. `node scripts/collect-examples.ts data/seeds/NN-*.json` → `data/examples/NN-*.jsonl`(3 秒間隔、robots.txt に従う。ページ本文は貯めない)。
3. `node scripts/analyze-examples.ts` で、パース・往復・`validate` の問題と使用頻度を確かめる。
4. `node scripts/build-tiers.ts` → `data/layer-tiers.json`、`docs/layer-tiers.md`。
5. レイヤー索引は `node scripts/build-layer-index.ts`(layers-martin から。D-008、D-010)。
6. 検索用の小さな索引(公開用)は `node scripts/build-search-index.ts` → `docs/index/`(D-017)。`data/layers-index.json` を更新したら作り直す。`npm test` が、生成物と公開ファイルの一致を確かめる。
7. プロンプトを直したら、`npm test`(例の URL・ID・文字数)→ サブエージェントに `tests/questions/cases.json` の問いを解かせる → `scripts/grade.ts` で採点(D-016、D-017)。
