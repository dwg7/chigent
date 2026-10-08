# Microsoft 365 Copilot のエージェントに載せる

プロンプトの本体は [`prompt/chigent.md`](../prompt/chigent.md)(約 5,700 字)。これをエージェントの「指示」に貼る。

## 設定

- **指示:** `prompt/chigent.md` の全文。**文字数の上限は未確認**(8,000 字前後という情報があるが、製品・設定で異なりうる。D-009)。現状は上限の 7 割ほど。`npm test` が、上限の 95% を超えると失敗する。
- **知識(ウェブ):** エージェントが次のサイトを取得できるようにする。取得できないと、座標とレイヤーを自分の知識で決めることになる。
  - **`https://dwg7.github.io/chigent/index/`(検索用の索引。公開が必要。下の「索引の公開」)**
  - 座標は Copilot 自身の知識とウェブ検索で決める(D-014)。取得できれば、次は住所・市区町村の裏取りに使う任意の参照: `https://msearch.gsi.go.jp/`
  - `https://hfu.github.io/layers-martin/`(catalog と TileJSON)
  - `https://maps.gsi.go.jp/`(任意。URL の確認用)
- **会話の開始例:** 「地理院地図で見たい場所と、知りたいことを教えてください。」

## 実機で確かめること(未確認)

1. 指示文の文字数の上限。
2. 任意の URL(GitHub Pages の JSON)を取得できるか。`catalog`(約 565 KB)を全部読めるか、途中で切れるか。
3. (任意)`msearch.gsi.go.jp` の API(JSON)を取得できるか。必須ではない。
4. 回答に出した URL がリンクとして開けるか(`|` が `%7C` のままか、`#` 以降が保たれるか)。
5. Copilot が URL の `/&`(位置の直後)を落としたり、緯度と経度を取り違えたりしないか。
6. Copilot が決める座標の精度。採点の `center.withinKm` が見る。
7. catalog(約 565 KB)が途中で切れないか。Claude 系サブエージェントの WebFetch では切れた(D-016)。日付つきの災害 ID の探索に影響する。
8. `www.gsi.go.jp`(災害情報ページ)を取得できるか(TLS の設定が古い)。

## 採点

1. `tests/questions/cases.json` の問い(13 件)を 1 件ずつ Copilot に聞く。
2. 返ってきた URL を `answers.json` に `{ "問いのid": "URL" }` で集める(URL を返さなかったら `null`)。
3. `node scripts/grade.ts answers.json`

採点は、URL が gsimaps で意図どおりに読めること(`/&` など)、レイヤー ID の実在と大文字小文字、ズームの範囲、場所、重ねる枚数、問いに合った主題を見る。人の目で見るべきこと(地図が実際に問いに答えているか)は採点しない。


## Claude のサブエージェントでの予備検証(2026-10-09、D-015・D-016)

Copilot の前に、指示だけを渡した新しい Claude のサブエージェントに 1 問ずつ解かせた。3 ラウンドで 36 回の回答を採点し、プロンプトを直した。最終版に近い版での直近のラウンドは 9/9。Copilot で同じ問いを聞くときは、同じ問いを複数回聞いて、ばらつきも見る。


## 索引の公開(GitHub Pages)

1. このリポジトリを `dwg7/chigent` に push し、Settings → Pages で、ブランチ(main)の `/docs` フォルダを公開する。`docs/.nojekyll` は置いてある。
2. `https://dwg7.github.io/chigent/index/router.txt` が開くことを確かめる(プロンプトはこの URL を書いている。違う場所なら `src/search-index.ts` の `INDEX_BASE_URL` と `prompt/chigent.md` を直し、`npm test` で一致を確かめる)。
3. 索引は layers-martin / layers.txt が更新されたら作り直す: `node scripts/build-layer-index.ts && node scripts/build-search-index.ts`、コミットして push。
4. Copilot で、router.txt と節ファイル(例: `S10.txt`)が取得でき、途中で切れないかを確かめる。1 ファイルは 8,000 字以内に収めてある。
