# 地理院地図 URL の文法

地理院地図(maps.gsi.go.jp)の URL ハッシュの文法を、**ソースコードから**まとめたもの。観察した URL から推測した事項は含めない(含める場合は「観察」と明記する)。

## 根拠にしたソース

- リポジトリ: <https://github.com/gsi-cyberjapan/gsimaps>
- コミット: `a5ad2a47b81a85b7d6a045da8ca4d47dcdb00203`(2026-10-08 時点の最新)
- 以下 `gsimaps.js` = `js/gsimaps.js`、`setting.js` = `js/setting.js`。行番号は上記コミットのもの。

取得方法(再現用): `git clone --depth 1 https://github.com/gsi-cyberjapan/gsimaps.git` し、上記コミットを確認する。ソースはこのリポジトリに複製しない。

URL を読む側と書く側が別の場所にある。**書く側**(アプリが `location.hash` に書き出す形)を正準形とみなし、**読む側**(受け付ける形)はそれより広い。

| 役割 | 場所 |
|---|---|
| 書き出し: 全体の組み立て | `GSI.HashOptions.HashCreate` / `HashCreateProc` — `gsimaps.js:35574` / `:35604` |
| 書き出し: 各パラメータ | `getBaseLayerQueryString` `:10675`、`getLayersQueryString` `:10718`、`getTileViewSetting` `:11050`、`getCurrentPathQueryString` `:10621`、`getQueryParams` `:10957` |
| 読み取り: 位置 | `L.Hash.parseHash` — `js.lib/leaflet-plugin/leaflet-hash/leaflet-hash-gsi.js:15` |
| 読み取り: オプション | `GSI.QueryParams` — `gsimaps.js:36172`(`_parse` `:37009`) |
| パラメータ名・接頭辞の定義 | `setting.js:686`(`PARAMETERNAMES`)、`:713`(`QUERYPARAMETER`)、`:794`(`HIDDENCONTROLPARAMETER`)、`:803`(`DIALOGPARAMETER`) |

## 全体の形

```
https://maps.gsi.go.jp/#<zoom>/<lat>/<lon>/&<key>=<value>&<key>=<value>...
```

- ハッシュは `/&` で**位置**と**オプション**に分かれる(`gsimaps.js:35579`、`:36219`)。`/&` が無ければオプションは無い。`/&` が 2 回以上あると、オプションは全部無視される(`vHash.length == 2` の判定、`:36220`)。
- 位置は `/` で 3 つに割る。`zoom` は `parseInt`、`lat` `lon` は `parseFloat`(`leaflet-hash-gsi.js:15-34`)。いずれかが数でなければ位置は無かったことになる。
- アプリ自身は緯度経度を `toFixed(6)` で書く(`leaflet-hash-gsi.js:37-49`)。位置の直後には必ず `/` が付く(`HashCreateProc` は `"/"` から始まる、`:35611`)。
- オプションは `&` 区切りの `key=value`。`key` も `value` も `decodeURIComponent` される(`_parse`、`:37018-37022`)。したがって **`|` と `%7C`、`,` と `%2C` は同じ意味**。同じキーが複数あれば**後のものが勝つ**。
- アプリが書くときは値を `encodeURIComponent` する。よって `ls` の区切りは `%7C`、不透明度の区切りは `%2C` になる。

## パラメータ

書き出し順(= アプリが書く順序)に並べる。MapIntent への対応は `src/mapintent.ts`。

### `base` — 背景地図

- 背景地図のレイヤー ID。layers0.txt にある `std` `pale` `blank` `english` `ort`(`CONFIG.layerBase = layers0.txt`、`setting.js`)。
- 書き出し: 背景地図が**表示中のときだけ**書く(`getBaseLayerQueryString`、`:10675-10693`)。背景地図を非表示にした URL には `base=` が無い。さらに、`hashchange` 時に背景地図が非表示なら `&base=...` を取り除く(`baseHashCheck`、`:36085`)。
- 読み取り: `base` があればそれを使う。無ければ、`ls` の中の背景地図 ID と `disp` から推定する(`_initBaseMap`、`:36452-36477`)。どちらも無ければ `std`(`CONFIG.layerBaseDefaultID`)。
- MapIntent: `map.base`。

### `base_grayscale`

- `1` なら背景地図をグレースケールにする。`ls` の直前に書かれる(`getLayersQueryString`、`:10792-10816`)。
- MapIntent: `map.baseGrayscale`。

### `ls` — レイヤー列

- レイヤー ID を `|` で区切る。**下(背景)から上**の順(書き出しは配列を逆順にたどる、`:10740`)。
- 各要素は `id` または `id,不透明度`。不透明度は 0〜1 の数で、範囲外や非数は黙って無視され 1 になる(`_initLayerList`、`:36680-36687`)。書き出しは不透明度が 1 のときは省略し、そうでなければ `toFixed(2)` の末尾の `0` を 1 つだけ落とす(`0` は `0`、`0.50` → `0.5`、`0.25` → `0.25`、`:10755-10758`)。
- 空の要素(`a||b`)は読み飛ばされるが、`disp` の添字は元の位置のまま進む(`:36623-36624`、`:36637`)。
- 書き出しには、タイルレイヤー(`getTileList`)の後に、タイルでないレイヤー(`getList`、GeoJSON 系など)が続く(`:10731-10790`)。範囲外(`_isOutside`)のものは含まれない。
- **背景地図 ID の扱い**: `ls` の要素のうち、背景地図の ID(`CONFIG.BASETILES`)に当たるものは、実際に使う背景地図(`base`)に**置き換えられる**(`:36653-36658`)。`base` が `ls` のどの要素にも対応しなかった場合は、`base` が `ls` の先頭に補われる(`:36692-36698`)。このとき `disp` の添字は補われた 1 つ分ずれる。**MapIntent は、`ls` の先頭に背景地図を置いた形で作る**こと(chigent の builder はこの形を前提とし、`validate` で確かめる)。
- 特別扱い: ID が `skhb` で始まるレイヤー(指定緊急避難場所)を含むとき、アプリは確認ダイアログを経由し、そのとき `ls` を**文字列 `%7C` で**割る(`forEvacuation`、`:35954-35986`、`CONFIG.layerEvacuationHeader`、`setting.js:368`)。区切りが `|` のままでは、この経路が正しく動かない可能性がある。chigent の builder は常に `%7C` を書く(DECISIONS.md D-004)。
- MapIntent: `map.layers[].id` `.opacity`。

### `blend` — 合成

- `ls` の **2 番目以降**のレイヤーについて、1 桁ずつ `0`/`1`(`i` 番目のレイヤーは `blend[i-1]`、`:36629-36635`)。意味(合成方法)は未確認。
- 書き出しは、タイルレイヤーが 2 つ以上あるときに常に付ける(`:10798-10800`)。
- **`blend` が無いときの既定**: 2 番目以降のレイヤーのうち、ID に `relief` を含むものだけ `1`、それ以外は `0`(`:36633-36634`)。したがって「`blend` が無い」と「`blend=00...`」は**意味が違いうる**。MapIntent は `blend` を文字列のまま保持し、実効値は `effectiveBlend()` で求める。
- 観察: 観察済みの URL には `blend` があるもの(#1、#4)と無いもの(#2、#3)がある。
- MapIntent: `screen.blend`(画面の状態として扱う)。

### `disp` — 表示・非表示

- `ls` の各要素に 1 桁ずつ対応。`0` なら非表示、それ以外は表示(`:36637-36644`)。`disp` が `ls` より短ければ、足りない分は表示。
- 書き出しは `ls` と同じ順序・同じ要素数(`getTileViewSetting`、`:11050-11086`)。
- MapIntent: `map.layers[].hidden`。builder は `ls` があれば常に `disp` を書く。

### `lcd` — 左パネルで開いている階層

- 開いているレイヤー(またはフォルダ)の ID。書き出しは、その ID が選択中のレイヤーに実在するときだけ(`getCurrentPathQueryString`、`:10621-10644`)。
- MapIntent: `screen.lcd`。

### `hc` — 隠す UI 部品

- 1 字ずつ: `i` 情報メニュー、`f` 機能メニュー、`h` ヘッダー、`c` コンテキストメニュー、`b` 背景地図セレクター。`all` は全部(`HIDDENCONTROLPARAMETER`、`setting.js:794`、`_initControlSetting`、`:36801-36843`)。
- 通常のアプリ操作では書き出されない(`hcList` は空、`:35641`)。埋め込み用途の URL にだけ現れる。
- MapIntent: `screen.hc`。

### `vs` — 表示設定

- **英字 1 字 + 値 1 字**の繰り返し(`_initViewSetting`、`:36844-36871`)。奇数長の末尾 1 字は捨てられる。
- 書き出し順は `CONFIG.QUERYPARAMETER` の定義順(`setting.js:713-790`)から、`clickmove` `cocotile` `minimap` を除いたもの(`skips`、`:35643-35646`)。

  | 英字 | 設定 | 備考 |
  |---|---|---|
  | `c` | 中心十字線 | `centercross` |
  | `g` | 表示ズームの案内 | `zoomguide` |
  | `j` | 磁北線 | `jihokuline` |
  | `h` | 方位線 | `houiline` |
  | `k` | 等距圏 | `toukyoken` |
  | `l` | 緯度経度グリッド | `latlnggrid` |
  | `u` | UTM グリッド | `utmgrid` |
  | `t` | タイル座標 | `tilegrid`(`cocotile` も接頭辞 `t` だが、読み取りは先に定義された `tilegrid` に当たる) |
  | `z` | 図郭 | `t25000grid` |
  | `r` | 地域メッシュ | `chiikimesh` |
  | `s` | **2 画面表示** | `splitwindow` |
  | `m` | **比較表示** | `comparemap`(`minimap` も `m` だが、先に定義された `comparemap` に当たる) |
  | `f` | フッター | `0` / `1` / `2`(表示モード)。他の英字は `0`/`1` |

- **`s1` `m1` は画面の分割・比較を起こす**(`HashSetProc_sub`、`:35897-35908`)。「画面の状態」だが、地図の見え方を大きく変える。`vs2` `d2` などの `*2` 系パラメータと対になる(後述)。
- 食い違い: ソース中のコメントには `vs=a`(国土基本図図郭)とあるが、`QUERYPARAMETER` に `a` の定義は無く、書き出しも読み取りもされない。
- 食い違い(観察): ソースは `g` を書き出すが(`c` の次)、観察済みの URL #1〜#3 には `g` が無く、#4 にはある。事例を増やすと(`docs/layer-tiers.md`)、`g` が無いのは古い URL、新しい製品型ページの URL には `g1`/`g0` が入っている(DECISIONS.md D-012)。URL を作った時期の違いと見てよい。MapIntent は `vs` を文字列のまま保持するので、どちらも往復できる。さらに古い URL は `vs=c1j0l0u0f0` のように短い。
- MapIntent: `screen.vs`(補助: `vsPairs()`)。

### `d` — ダイアログ・左パネル

- 1 字ずつ: `v` 情報リスト(選択中の情報)、`l` レイヤーツリー、`m` 左パネル(`DIALOGPARAMETER`、`setting.js:803`、`_initDialogSettings`、`:36898-36957`)。
- 観察済みの値 `v` `vl` `m` は、いずれもこの定義から説明できる。`m` が無いときは `v` か `l` があれば左パネルを開く(`:36928-36930`)。
- 書き出しは、左パネルが開いていれば `m`(`visibleDialogs[LEFTPANEL]`、`:35669`)。
- MapIntent: `screen.d`。

## 未モデル化のパラメータ(`extra` に出現順で保持)

| パラメータ | 意味 | 根拠 |
|---|---|---|
| `base2` `ls2` `disp2` `lcd2` `blend2` `vs2` `d2` `base_grayscale2` `ll2` `sync` `reliefdata2` | 2 画面表示・比較表示の右(副)画面 | `HashCreateProc`、`:35716-35755` |
| `url1`〜`url5` | 読み込む GeoJSON / KML の URL | `:35703-35708`、`_initLayerList` `:36613` |
| `reliefdata` | 自由な色別標高図の設定 | `getFreeReliefQueryString`、`:11127` |
| `relief` | 共有用 URL で付く標高データ | `getLayersQueryString`(`withRelief`)、`:10804-10808` |
| `tpos` `hpos` | 等距圏・方位線の中心 | `:35758-35770` |
| `ll` `z` `z2` | 位置を直接指定する旧式の書き方(`ll=lat,lon[,zoom]`、`z` は 1〜18) | `_initPosition`、`:36376-36432` |

これらを MapIntent の第一級のフィールドにするのは、問いと対応づける必要が出たときにする(DECISIONS.md D-003)。それまでは、読んだ順のまま保持して書き戻す。

## アプリの挙動で、URL の解釈に影響するもの

- **Cookie**: `CONFIG.USECOOKIE` が真のとき、ハッシュが空か既定値(`CONFIG.DEFAULTHASH`、`setting.js:5`)なら、前回の状態(Cookie)で上書きされる(`QueryParams.initialize`、`:36206-36211`)。chigent が返す URL にはオプションを必ず付けるので、通常は問題にならない。
- **自己書き換え**: アプリは起動後、約 1.5 秒ごとに `location.hash` を正準形で書き直す(`HashCreate`)。観察済みの URL は、利用者のブラウザのアドレスバーから取られたものが多く、この書き直しを経ている。
- 既定の中心・ズーム: `[36.104611, 140.084556]`、ズーム 5(`CONFIG.DEFAULT`、`setting.js:547`)。

## 往復の方針

- `URL → MapIntent → URL` で意味を失わない。表記の揺れ(`|` と `%7C`、`,` と `%2C`、緯度経度の桁数、パラメータの順序、`disp` の省略)は正規化してよい。
- ただし、**意味が変わりうる省略は正規化しない**: `blend` の有無(上述)、`vs` の内容、`extra`。
- 正準形はアプリの書き出しに合わせる: 順序は `base, base_grayscale, ls, blend, disp, lcd, hc, vs, d, その他`、区切りは `%7C` `%2C`。
- gsimaps が黙って受け流す入力(範囲外の不透明度、空の `ls` 要素、`/&` の無い `&`、重複キー)は、パース時に `warnings` で報告する。
