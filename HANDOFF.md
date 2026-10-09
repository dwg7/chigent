# HANDOFF — chigent の作業の引き継ぎ(2026-10-09 時点)

compact などでセッションが切れたあとに、ここから再開する。決めたことと理由は `DECISIONS.md`(D-001〜D-020)、作業規則は `CLAUDE.md`、文法は `docs/url-grammar.md`。この文書は「いま何がどこまで済んでいて、次に何をするか」だけを書く。

## 1. これは何か

chigent = 問いに対して地理院地図の URL を返すエージェント。**最終形は Microsoft 365 Copilot(ウェブアクセスあり)のプロンプト**(`prompt/chigent.md`、約 5,900 字)。コードは、プロンプトの出力を採点する基準と、プロンプトに載せる知識(索引)の生成器。

- リポジトリ: <https://github.com/dwg7/chigent>(2026-10-09 に public)。`main` に push 済み。
- 索引の公開: <https://dwg7.unopengis.org/chigent/index/router.txt>(GitHub Pages、`main` の `/docs`)。`dwg7.github.io/...` は別ホストへ 301 なので使わない。
- Node ≥ 22.18、依存なし。`npm test`(いま 58 件)。CI は `.github/workflows/test.yml`。

## 2. できていること

- URL ⇄ MapIntent の変換と往復テスト(`src/gsi-url.ts`、`tests/roundtrip/`)。
- レイヤー索引(`data/layers-index.json`、13,840 ID)。layers-martin 由来。小文字化された ID の復元、LayerGroup、GeoJSON を補っている(D-010)。
- 公開用の小さな索引 `docs/index/`(`router.txt` + 節 `S01〜S34.txt`、各 8,000 字以内。D-017)。
- プロンプト `prompt/chigent.md` と、その検査(`src/prompt-check.ts`:文字数、例の URL、表の ID の実在と大文字小文字)。
- 問い 25 件の採点(`tests/questions/cases.json`、`src/grade.ts`、`scripts/grade.ts`)。
- Claude のサブエージェントでの検証(D-015〜D-019): 24 問の全回帰で 23/24(失敗は新潟の「問われていない図を足した」1 件、規則を足して対処)、索引でしか見つからない 7 問で 7/7、haiku で 25 問 25/25、難しい 4 問×3 回で 11/12(失敗は取得側の要約が行を落としたため)。

## 3. 未完了(次にやること)

### 3-1. 図の整備範囲の実測(課題 5。**実行中**)
- `scripts/probe-coverage.ts` が地理院のタイルサーバーに低頻度(1 秒に 3 回以下)で問い合わせ、`data/coverage/<ID>.json` に「図があるズーム 9 のタイル」を保存する。既定の対象: `afm lcmfc2 ccm1 ccm2 ort_USA10 ort_riku10 ort_old10 ort_1928 lcm25k_2012 swale`。1 レイヤー約 5〜10 分。
- 再開: `node scripts/probe-coverage.ts`(済んだレイヤーは飛ばす。途中だったレイヤーは最初からやり直す)。ログはバックグラウンド実行時の標準出力。
- 済んだら: `node scripts/build-search-index.ts` → `docs/index/coverage.txt`(図がある範囲 `[西,南,東,北]` の一覧)が作られ、router.txt が coverage.txt に触れる。`npm test` が生成物との一致を確かめる。
- そのあと **プロンプトに coverage.txt の使い方を足す**(まだ書いていない)。例:「活断層図・治水地形分類図・沿岸海域土地条件図などは、`…/index/coverage.txt` の範囲に問いの場所が入るかを確かめる。入らなければ『図は無い可能性が高い』と答える」。足したら、熊本の活断層(afm)、新潟の治水地形分類図(lcmfc2)、伊勢湾の沿岸(ccm1)でサブエージェントに確かめる。
- 結果と判断を DECISIONS.md に **D-020** として書く(まだ書いていない。`scripts/probe-coverage.ts` の冒頭コメントと `src/coverage.ts` が D-020 を参照している)。

### 3-2. 「音調津を見せて」型の問い(地名だけの問い)の検証
2026-10-09 にユーザーから依頼。主題の指定が無く、地名だけの問いで、いまのプロンプトが最良かを検証する(結果は DECISIONS.md に D-021 として)。進み具合はこの文書の末尾に追記する。

### 3-3. README を実態に合わせる(**ユーザーの指示: 一連の作業が終わったら**)
README の「現状」「使い方」を、いまの実態(CI、公開 URL、索引、coverage、検証結果、`scripts/` の一覧)に合わせて更新する。作業の最後に行う。

### 3-4. その他の候補(承認済みの範囲外)
- 2 画面表示(昔と今を並べる)への対応。文法は調査済み(`vs` の `s1`、`base2` `ls2` `disp2` ほか)。
- 採点の問いを増やす(曖昧な地名、複数の場所、誤字、英語、聞き返しが正解の問い)。聞き返しの期待値の表現が `src/grade.ts` に無い。
- 上流への報告の下書き(layers-martin の小文字化・LayerGroup の落ち・GeoJSON の除外、地理院ページの不具合)。
- Copilot 実機での検証(**ユーザーが行う**。`docs/copilot-setup.md` に手順)。

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

## 進み具合(追記 2026-10-09)
- 3-2(地名だけの問い)は完了。D-021 に記録。プロンプトに n=1 の例を追加、`npm test` 60件通過。
- 3-1: 実測は ort_old10 まで進行中。残りは `node scripts/probe-coverage.ts` で再開。
