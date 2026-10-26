# 実機測定の手順(2026-11、Microsoft 365 Copilot と源内)

サブエージェント(Claude)での検証は、プロンプトの出来を測りました。実機で測るのは、**リンクが利用者の手に無事に届くか**と、**その環境でプロンプトが使えるか**です。結果で、コア(完全な地理院の URL)と genkan(短い契約のリンク)の、どちらをどの環境の主にするかを決めます(D-028)。

源内の仕様(外部 URL の取得、リンクの描画、指示文の長さの上限)は、私は確認できていません。下の手順は、それを確かめるためのものです。

## 0. 準備

1. プロンプトを 2 本用意する。
   - コア: [`prompt/chigent.md`](../prompt/chigent.md)(完全な地理院の URL を返す)
   - genkan: [`prompt/genkan.md`](../prompt/genkan.md)(`https://dwg7.unopengis.org/chigent/genkan/#…` を返す)
   - 文字数の上限は未確認。貼れなかったら、入った文字数を記録する(C1)。
2. 知識として、次の場所を取得できるように設定する(設定の手順は [`docs/copilot-setup.md`](copilot-setup.md))。
   - `https://dwg7.unopengis.org/chigent/index/`(`router.txt`、`S04.txt`、`coverage.txt` など)
   - `https://msearch.gsi.go.jp/`(地名検索。任意)
3. 記録表を作る。
   ```sh
   node scripts/field-sheet.ts short          # 能力の確認 + 短縮 8 問の表(Markdown)
   node scripts/field-sheet.ts full           # 全 14 問
   node scripts/field-sheet.ts short --csv    # 表計算ソフト用
   ```
4. 先に、genkan のページを、測定に使うブラウザで開いておく。
   <https://dwg7.unopengis.org/chigent/genkan/#14/36.228823/137.586174/&l=vlcd_yakedake>
   地図が見えれば、ページとフレームは通っている(C10・C11)。

## 1. 能力の確認(約 30 分)

環境ごとに、記録表の「能力の確認」(C1〜C12)を埋める。プロンプトを貼ったエージェントに、次のように頼んで確かめる。

- C2: 「`https://dwg7.unopengis.org/chigent/index/router.txt` を取得して、S○○.txt で始まる全行を一覧にして」
- C3: 「S04.txt から、タイトルに『栗駒』を含む行を、ID・タイトル・タグのまま書き写して」
- C4: 「`…/index/coverage.txt` の『## afm』の下の全行を、一行ずつ書き出して」
- C5: 「`https://msearch.gsi.go.jp/address-search/AddressSearch?q=音調津` の結果を書き写して」
- C8・C9: 後の問いの回答で確かめる(下の 2)。
- C12: genkan のリンクに `&m=g` を足して開く。

**要約で返るか、原文が返るか**を、必ず記録する。Claude 系の取得は、本文を要約して返しました(D-018、D-019)。同じかどうかが、索引と coverage の使い方を左右します。

## 2. リンクの生存(約 1.5 時間)

環境 × プロンプト(2 × 2)ごとに、**短縮 8 問**を聞く。1 問ごとに、新しい会話にする。

回答のたびに、次を記録する。

1. **表示された回答のリンク**を、そのまま記録表に貼る。
2. **コピー&ペースト後も同じか。** 回答のリンクをコピーして、ブラウザのアドレス欄に貼り、元の文字列(特に `#` 以降、`%7C`)と見比べる。
3. **開けたか。** 開いたあとの地図が、問いに合っているか(場所、重なる図)。
4. 外部の取得をしたか(索引、coverage、msearch、検索)と、取得の結果。
5. 気になったことは、メモに書く。**違和感は、TRACKS に残す**(観察だけを書く。CLAUDE.md を参照)。

問いは、結果が割れやすいものを選んである。

| id | 何を試すか | 短縮 |
|---|---|---|
| onchozu-place | 地名だけ(背景だけのリンク)。msearch で座標を確かめる | ○ |
| hakone-volcano | 表の ID を 1 枚重ねる基本形 | ○ |
| miyazaki-tsunami-on-photo | 写真(ort)を背景に、図を重ねる(`b` と `l` の併用) | ○ |
| tokyo-1960s | coverage.txt の取得と、過去の写真 | ○ |
| kurikoma-volcano | 索引(router.txt → S04.txt)の取得 | ○ |
| joso-flood | 索引で日付つきの ID を探す(要約で行が落ちやすい) | ○ |
| chuo-ku-ambiguous | 聞き返し(リンクを作らない) | ○ |
| moon-map | できない問い(リンクを作らない) | ○ |
| takaosan-place | 場所だけ(山)。「重ねたい地図があれば」の一言 | |
| kumamoto-castle-english | 英語の問いと、写真(ort) | |
| miyazaki-tsunami-typo | 表記ゆれ(ひらがな・旧字) | |
| afm-ishigaki-outside | 整備範囲の外(図を足さない) | |
| fuji-explain-me | 解説の誘い(URL が先、説明は短く) | |
| kesennuma-shelter-tsunami | 避難場所(skhb) | |

短縮 8 問のうち、聞き返し(chuo-ku-ambiguous)とできない問い(moon-map)は、リンクが出ないのが正解。リンクの生存の集計は、残りの 6 問で行う。

## 3. 採点

回答の全文を、`data/field/<日付>-<環境>-<プロンプト>/<問いのid>.txt` に保存する(例: `data/field/2026-11-05-copilot-genkan/onchozu-place.txt`)。「=== 回答 ===」の見出しは、付けても付けなくてもよい。その場で見えたままを保存する(コピー後の文字列ではなく、**表示された回答**)。

```sh
# コア(完全な URL)
node scripts/collect-answers.ts data/field/2026-11-05-copilot-core "" --text > /tmp/a.json
node scripts/grade.ts /tmp/a.json

# genkan(契約のリンク。受け手が直した点は、送り手の失敗になる)
node scripts/collect-answers.ts data/field/2026-11-05-copilot-genkan "" --genkan --text > /tmp/a.json
node scripts/grade.ts /tmp/a.json
```

採点は、リンクが仕様どおりか、位置・図・ズームが期待の範囲か、説明の形(URL が先、聞き返しなど)を見る。**地図が実際に問いに答えているか**は、人が見て、記録表の「位置と図は正しいか」で判断する。

## 4. 判断(案)

数字は案です。藤村さんが調整してください。

| 観察 | 解釈 |
|---|---|
| genkan のリンクの `#` 以降が、6 問中 5 問以上で、表示でもコピー後でも保たれる(両環境) | genkan を主にできる |
| 片方の環境で保たれない | その環境ではコア(完全な URL)を主にする。**環境ごとに主を選んでよい** |
| genkan のページが開かない、フレームが出ない、`&m=g` が許されない | ページ + フレーム・転送は使えない。リンクだけを渡す形(コア)に戻す。`&m=n`(フレームなし)で開けるかも見る |
| 索引・coverage が要約で返り、行が落ちる | 表と規則を増やすか、取得の頼み方を直す(D-019) |
| 指示文が入らない | 入った文字数を記録し、コアか genkan のどちらかを削る(D-027 の方向) |
| リンクの描画が違う(%7C が復号される、末尾が欠ける) | その形をコアの誤りとして記録する。genkan は影響を受けにくい |

## 5. 記録と注意

- 結果と判断は、DECISIONS.md に新しい項目として書く(私が手伝います)。環境の仕様(特に源内)は、公開リポジトリに書いてよい範囲を、先に確かめてください。
- 利用者の実際の問いや、組織内の情報は、記録表や `data/field/` に入れない(リポジトリは公開)。
- 能力の確認で分かったこと(上限の文字数、取得の挙動)は、`docs/copilot-setup.md` の「実機で確かめること」を更新する。
