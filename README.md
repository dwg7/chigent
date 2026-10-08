# chigent

> **dwg7 の活動であり、国土地理院の公式な製品ではありません。**
> 地理院地図(maps.gsi.go.jp)の公開された URL の仕組みを利用します。

chigent(chizu + agent)は、**問いに対して、地理院地図の URL を返すエージェント**です。

## 位置づけ

dwg7 の Staccato Architecture では、地図サービスを四つの役割で考えます。

| 役割 | 仕事 |
|---|---|
| User | 問いを持つ人 |
| **Staff** | 人の言葉を受け取り、どの地図をどう見せるかを決めて、URL として渡す |
| Cartographer | URL を受け取って地図を表示するだけ |
| Library | どんな地図があり、どう見せるかという知識を持つ |

chigent は **Staff** の実装です。Cartographer には、現世代の地理院地図をそのまま使います。姉妹プロジェクトの dwg7/evergreen は Cartographer を未来志向で作り直すもので、chigent はそれと直交する、現実主義のプロジェクトです。

## 設計

```
問い ⇄ MapIntent(地理院方言) ⇄ 地理院地図の URL
```

- URL と MapIntent の変換は、AI に推測させず、決定的なコードで書く。文法の根拠は gsimaps のソース([docs/url-grammar.md](docs/url-grammar.md))。
- 言葉の理解だけを AI に任せる。最終形は Microsoft Copilot(ウェブアクセスあり)で動くプロンプトで、コードはその出力を採点する基準と、プロンプトに載せる知識の生成器になる(D-009)。
- 仕様の本体はテスト(`tests/roundtrip/`、`tests/questions/`)。

詳しい方針は [CLAUDE.md](CLAUDE.md)、決めたことと理由は [DECISIONS.md](DECISIONS.md)。

## 現状

- [x] URL ⇄ MapIntent(地理院方言)の変換と往復テスト
- [x] レイヤーの索引(layers-martin、13,839 件)と `searchLayers` `validate`
- [x] Copilot 用プロンプト(`prompt/chigent.md`。Claude のサブエージェントで 3 ラウンド検証済み、Copilot の実機では未検証)
- [x] 検索用の小さな索引(`docs/index/`、34 ファイル。GitHub Pages で公開する想定。公開は未実施)
- [ ] 索引の公開(GitHub Pages)と、Copilot の実機での検証・採点(`docs/copilot-setup.md`)
- [ ] 事例の収集と、レイヤーの「核」の抽出
- [ ] `geocode` `find_examples`

## 使い方

Node.js 22.18 以上が必要です(TypeScript を Node 自身が実行します。ビルドも依存パッケージもありません)。

```sh
npm test
```

```ts
import { parseGsiUrl, buildGsiUrl } from "./src/gsi-url.ts";

const { intent, warnings } = parseGsiUrl(
  "https://maps.gsi.go.jp/#5/36.104611/140.084556/&base=std&ls=std%7Crelief&blend=0&disp=11&lcd=relief&vs=c1j0h0k0l0u0t0z0r0s0m0f1&d=vl",
);
buildGsiUrl(intent); // 元の URL に戻る
```
