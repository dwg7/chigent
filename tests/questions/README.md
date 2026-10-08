# tests/questions

「問い → 期待される URL(または許される範囲)」の組。仕様の本体の一つ(CLAUDE.md 柱 7)。

- `cases.json`: 問い(`question`)、根拠(`basis`: 製品型の事例か、判断か)、期待(`expect`)。
  - `center`(中心と許す距離 km)、`zoom`(範囲)、`layersAll` / `layersAny` / `layersForbid`、`maxOverlays`、
    `noUrl`(URL を返してはいけない)/ `orNoUrl`(返さなくてもよい)。
  - 書式の規約(`blend` の桁数など)は、期待ではなく採点コード(`src/grade.ts`)が常に見る。
- 使い方: Copilot やサブエージェントの答えを `{ "問いのid": "URL" }`(URL を返さなければ `null`)にまとめ、
  `node scripts/grade.ts answers.json` で採点する。採点は URL の形式・ID の実在・場所・ズーム・重ねる枚数を見る。
  地図が問いに実際に答えているかは見ない(人の目)。
- 新しい問いを足すときは、期待する ID が `data/layers-index.json` に実在することを `npm test` が確かめる。
