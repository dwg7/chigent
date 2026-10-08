/**
 * MapIntent(地理院方言)。
 *
 * 地理院地図の URL ハッシュを、その文法のまま忠実に写した中間表現。
 * 文法の根拠は docs/url-grammar.md を参照。
 *
 * 「地図の意図」(map) と「画面の状態」(screen) を分けて持つ。
 * 問い(自然言語)との対応づけに使うのは map だけ。screen は往復のために保持する。
 */

export interface GsiLayer {
  /** layers.txt 上のレイヤー ID。ls= の `|` 区切りの 1 要素目(`,` より前)。 */
  id: string;
  /** 0.0〜1.0。ls= で `id,0.5` のように書かれる。省略時は 1。 */
  opacity: number;
  /** disp= の対応する桁が `0` なら true。 */
  hidden: boolean;
}

export interface GsiMapView {
  zoom: number;
  lat: number;
  lon: number;
}

/** 地図の意図: 何を、どこで、どう重ねて見せるか。 */
export interface GsiMapPart {
  view: GsiMapView;
  /** base= 。背景地図の ID(layers0.txt の std / pale / blank / english / ort)。 */
  base?: string;
  /** base_grayscale=1 。 */
  baseGrayscale?: boolean;
  /** ls= + disp= 。下(背景)から上へ。 */
  layers: GsiLayer[];
}

/**
 * 画面の状態: 往復のために保持するが、問いとの対応づけには使わない。
 * 値は URL 上の文字列のまま(デコード済み)持つ。解釈は vsFlags() などの補助関数で行う。
 */
export interface GsiScreenPart {
  /** lcd= 。左パネルで開いているレイヤー/フォルダ ID。 */
  lcd?: string;
  /** hc= 。隠す UI 部品。 */
  hc?: string;
  /** vs= 。表示設定。`c1j0h0...` のように 英字1字+値1字 の繰り返し。 */
  vs?: string;
  /** d= 。ダイアログ/左パネル。`v` `l` `m` の組み合わせ。 */
  d?: string;
  /** blend= 。ls の 2 番目以降のレイヤーごとに `0`/`1`。文字列のまま持つ。 */
  blend?: string;
}

export interface GsiMapIntent {
  dialect: "gsimaps";
  map: GsiMapPart;
  screen: GsiScreenPart;
  /**
   * 未モデル化のパラメータ(2 画面用の *2 系、url1〜5、reliefdata、tpos、hpos、sync など)。
   * 出現順のまま保持する。値のないキー(`&foo`)は null。
   */
  extra: Array<[key: string, value: string | null]>;
}

export interface ParseResult {
  intent: GsiMapIntent;
  /** 地理院地図が黙って受け流す入力など、往復で意味が変わりうる点。 */
  warnings: string[];
}

export class GsiUrlError extends Error {}
