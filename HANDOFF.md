# HANDOFF — chigent の作業の引き継ぎ(2026-10-09 時点)

compact などでセッションが切れたあとに、ここから再開する。決めたことと理由は `DECISIONS.md`(冒頭に目次)。観察は `TRACKS.md`、作業規則は `CLAUDE.md`、文法は `docs/url-grammar.md`。この文書は「いま何がどこまで済んでいて、次に何をするか」だけを書く。

## 1. これは何か

chigent = 問いに対して地理院地図の URL を返すエージェント。**最終形は Microsoft 365 Copilot(ウェブアクセスあり)のプロンプト**(`prompt/chigent.md`、文字数は `npm test` が検査する)。コードは、プロンプトの出力を採点する基準と、プロンプトに載せる知識(索引)の生成器。

- リポジトリ: <https://github.com/dwg7/chigent>(2026-10-09 に public)。`main` に push 済み。
- 索引の公開: <https://dwg7.unopengis.org/chigent/index/router.txt>(GitHub Pages、`main` の `/docs`)。`dwg7.github.io/...` は別ホストへ 301 なので使わない。
- Node ≥ 22.18、依存なし。`npm test`。CI は `.github/workflows/test.yml`。

## 2. できていること

- URL ⇄ MapIntent の変換と往復テスト(`src/gsi-url.ts`、`tests/roundtrip/`)。
- レイヤー索引(`data/layers-index.json`、13,840 ID)。layers-martin 由来。小文字化された ID の復元、LayerGroup、GeoJSON を補っている(D-010)。
- 公開用の小さな索引 `docs/index/`(`router.txt` + 節 `S01〜S34.txt`、各 8,000 字以内。D-017)。
- プロンプト `prompt/chigent.md` と、その検査(`src/prompt-check.ts`:文字数、例の URL、表の ID の実在と大文字小文字)。
- 問いの採点(`tests/questions/cases.json`、`src/grade.ts`、`scripts/grade.ts`)。
- Claude のサブエージェントでの検証(D-015〜D-019): 24 問の全回帰で 23/24(失敗は新潟の「問われていない図を足した」1 件、規則を足して対処)、索引でしか見つからない 7 問で 7/7、haiku で 25 問 25/25、難しい 4 問×3 回で 11/12(失敗は取得側の要約が行を落としたため)。

## 3. 未完了(次にやること)

2026-10-21 のリポジトリ全体レビューで合意した順(ユーザー承認済み): **A → C → B**。

- **A(済)** ※coverage.txt の1範囲1行は C の回で再検証済み(全行が返った)。  古い数字の文書を直す / coverage.txt を 1 範囲 1 行にする(D-020 の限界(2)への対処。**再検証はまだ**: 公開後にサブエージェントで afm・lcmfc2 の内外 6 問を解かせる) / DECISIONS.md に目次を付け D-020・D-021 の並びを直す。
- **C(済、D-026)** 採点を回答文に広げた(URL が先 / 説明の長さ / 聞き返しの中身 / 「ない」と言う)。D-022〜D-024 を測る問い 8 件を足し(計 40 件。B の回で火山 3 件を足して 43 件)、サブエージェントで回した。写真は背景ではなく重ねる図(`std|seamlessphoto`)というプロンプトの誤りを直した。**未決**: 英語の問いに英語で答えるか、年代の指定が無い写真の問いで聞き返すかは、指示に無い(サブエージェントごとに判断が分かれた)。決めるなら TRACKS → Issue → Decision の順。
- **B(済、D-027)** 火山の一覧を 8 火山に絞り、残りは索引で引く。6,626 → 約 6,200 字(77%)。重複はほとんど無く、これ以上の大きな塊は無い(残る候補: 災害の日付 ID の規則 約 360 字)。
- D(運用): coverage の実測は手動(年 1 回程度。`node scripts/probe-coverage.ts`、地理院に負荷をかけるので CI にしない)。スクリプトの純粋関数に単体テストを足す。
- E(要承認): 2 画面表示、layers-martin への上流報告の下書き。
- Copilot 実機での検証は**ユーザーが行う**(`docs/copilot-setup.md`)。
- 週次の索引更新ワークフローが PR を作れるよう、リポジトリ設定 "Allow GitHub Actions to create and approve pull requests" をユーザーが有効にする(または PR を手で開く)。

## 4. 作業の流儀(ユーザーの指示)

- 応答は日本語(敬語)。成果物の言語は読者に合わせる(このリポジトリの文書は日本語)。
- commit の author は `18297+hfu@users.noreply.github.com`(設定済み)。コミットメッセージは日本語、末尾に `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`。
- push・公開・設定変更は、ユーザーの承認の範囲で行う。承認済み: `dwg7/chigent` への push、リポジトリの public 化、Pages の有効化(`main` の `/docs`)、CI の追加、上記 1→2→3→5 の作業。
- 決定は `DECISIONS.md` に追記(消さない)。曖昧なところは推測で埋めず、質問する。
- 「検証は Claude のサブエージェントで。モデルを下げる(haiku)・同じ問いを複数回聞く」が、ユーザーの方針。Copilot の実機は後でユーザーが試す。

## 5. サブエージェント検証のやり方

1. `prompt/chigent.md` をスクラッチパッドにコピーする(エージェントはそのコピーだけを読む)。
2. 問いごとに 1 エージェントを起動する。本物の索引 URL を WebFetch させ、回答(`=== 回答 ===` と `=== 検証メモ ===`)を指定のファイルに Write で保存させる。同時に動かせるのは 20 まで。
3. `node scripts/collect-answers.ts <回答ファイルのディレクトリ> <接頭辞> > answers.json` → `node scripts/grade.ts answers.json`。
4. 新しい問いは `tests/questions/cases.json` に足す(期待する ID が `data/layers-index.json` に実在することを `npm test` が確かめる)。

## 6. 落とし穴(今回の学び)

- **WebFetch は本文を要約して返す。** 「原文のまま」は断られる。欲しい行を具体的に頼む。絞り込みで行が落ちることがある(D-018、D-019)。Copilot の取得が同じかは**未確認**。
- 利用上限(session limit)で WebFetch が失敗した回の回答は、推測で埋まっていることがあるので破棄して再実行する(D-019)。
- 地理院のサーバー: `www.gsi.go.jp` は古い TLS 設定で Node の `fetch` が拒否する → 収集スクリプトは `curl` を使う。`maps.gsi.go.jp` は問題ない。robots.txt は無い。
- msearch(地名検索)は住所・市区町村・施設名向け。駅・山・湾は取り違える。似た名前(木曽町と南木曽町)に注意し、県名と合う完全一致の行を採る(D-017)。
- ID は大文字小文字を区別する。layers-martin の catalog のキーは小文字(TileJSON の URL も小文字)。
- 利用者が見る URL は `blend` の桁数に注意: ls の要素数 n に対して `blend` は n−1 個、`disp` は n 個(D-016)。

## 7. 主なファイル

| 場所 | 中身 |
|---|---|
| `prompt/chigent.md` | Copilot に載せるプロンプト(本体) |
| `docs/url-grammar.md` | 地理院地図 URL の文法(gsimaps のソースから) |
| `docs/index/` | 公開する索引(`router.txt`、`S01〜S34.txt`、`coverage.txt`) |
| `docs/copilot-setup.md` | Copilot への載せ方と、実機で確かめること |
| `docs/layer-tiers.md` | 核・周辺の仮判定(事例から) |
| `src/` | `gsi-url.ts` `mapintent.ts` `layers.ts` `search-index.ts` `coverage.ts` `grade.ts` `prompt-check.ts` |
| `scripts/` | `build-layer-index` `build-search-index` `probe-coverage` `collect-examples` `analyze-examples` `build-tiers` `grade` `collect-answers` |
| `data/` | `layers-index.json` `layer-tiers.json` `coverage/` `examples/` `seeds/` |
| `tests/` | `roundtrip/` `questions/`(`cases.json`)ほか |
- **genkan(2026-10-24、D-028)**: 契約(`#z/lat/lon/&b=..&l=a,b`)と中継ページを試作。公開: `/chigent/genkan/`。サブエージェント 14/14。次は実機(Copilot・源内)での、フラグメントの生存率・フレーム・転送の確認(ユーザー)。`prompt/genkan.md` の複製のずれに注意。
