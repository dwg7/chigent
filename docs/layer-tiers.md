# レイヤーの段(核/周辺/対象外)— 仮判定 v0

`scripts/build-tiers.ts` が `data/examples/` から作る(DECISIONS.md D-011)。**事例が少なく、地理院自身のサイトに偏っているため、暫定**。

- 事例: 1258 リンク / 76 ページ(種類別: product 502、explanatory 142、listing 614)
- 証拠のある ID: 611(核 367、周辺 244)。証拠のない ID 13232 は周辺(検索で引く)。

## 核

### 背景地図

- `std` 標準地図
- `pale` 淡色地図
- `blank` 白地図
- `english` English
- `ort` 電子国土基本図（オルソ画像）（2007年～）
- `seamlessphoto` 全国最新写真（シームレス）

### 族(製品)

| 族 | ID 数 | 製品型ページ | 解説型ページ | 例 |
|---|---|---|---|---|
| 災害対応(日付つきの個別ID) | 111 | 9 | 3 | `20160414kumamoto_jiware` `20160414kumamoto_ort_all` `20140828dol` |
| 沿岸海域土地条件図 | 2 | 9 | 0 | `ccm1` `ccm2` |
| 治水地形分類図 | 1 | 6 | 1 | `lcmfc2` |
| デジタル標高地形図 | 175 | 4 | 0 | `d1-no805` `d1-no807` `d1-no808` |
| 活断層図 | 2 | 3 | 0 | `afm` `afm_spec` |
| 火山土地条件図 | 36 | 3 | 1 | `vlcd_esn` `vlcd_chokai` `vlcd` |
| 地形分類(ベクトルタイル) | 2 | 3 | 7 | `experimental_landformclassification1` `experimental_landformclassification2` |
| 火山基本図 | 3 | 2 | 0 | `vbmd_bm` `vbmd_colorrel` `vbmd_pm` |
| 土地条件図(数値地図25000) | 3 | 2 | 0 | `lcm25k_2012` `lcm25k` `lcm25k_spec` |
| 年代別の写真 | 7 | 1 | 4 | `toho4` `toho3` `toho2` |
| 自然災害伝承碑 | 8 | 1 | 4 | `disaster_lore_all` `disaster_lore_0` `disaster_lore_1` |
| relief_free | 1 | 1 | 5 | `relief_free` |
| 指定緊急避難場所 | 8 | 0 | 5 | `skhb01` `skhb02` `skhb03` |
| hillshademap | 1 | 0 | 8 | `hillshademap` |
| relief | 1 | 0 | 3 | `relief` |

## 周辺(証拠はあるが核の基準に届かない族)

| 族 | ID 数 | 製品型ページ | 解説型ページ | 例 |
|---|---|---|---|---|
| 1509typhoon18_shinsui_joso_150911_2 | 1 | 0 | 2 | `1509typhoon18_shinsui_joso_150911_2` |
| history | 1 | 0 | 1 | `history` |
| river | 1 | 0 | 1 | `river` |
| volcano | 1 | 0 | 1 | `volcano` |
| literary | 1 | 0 | 1 | `literary` |
| geo | 1 | 0 | 1 | `geo` |
| map-symbol | 1 | 0 | 1 | `map-symbol` |
| movie-earthquake | 1 | 0 | 1 | `movie-earthquake` |
| movie-flood | 1 | 0 | 1 | `movie-flood` |
| movie-volcano | 1 | 0 | 1 | `movie-volcano` |
| landform1_mono | 1 | 0 | 1 | `landform1_mono` |
| swale | 1 | 0 | 1 | `swale` |
| did2015 | 1 | 0 | 1 | `did2015` |
| active_volcanoes | 1 | 0 | 1 | `active_volcanoes` |
| 1509typhoon18_nanamel_joso_150916_1 | 1 | 0 | 1 | `1509typhoon18_nanamel_joso_150916_1` |
| slopemap | 1 | 0 | 1 | `slopemap` |
| vbm | 1 | 0 | 0 | `vbm` |
| lakedata | 1 | 0 | 0 | `lakedata` |
| lake1 | 1 | 0 | 0 | `lake1` |
| lakedata_spec | 1 | 0 | 0 | `lakedata_spec` |
| tenkei_chikaku | 1 | 0 | 0 | `tenkei_chikaku` |
| tenkei_kazan | 1 | 0 | 0 | `tenkei_kazan` |
| tenkei_chishitsu | 1 | 0 | 0 | `tenkei_chishitsu` |
| tenkei_kasen | 1 | 0 | 0 | `tenkei_kasen` |
| tenkei_umi | 1 | 0 | 0 | `tenkei_umi` |
| tenkei_hyoga | 1 | 0 | 0 | `tenkei_hyoga` |
| tenkei_sonota | 1 | 0 | 0 | `tenkei_sonota` |
| lum4bl_capital2005 | 1 | 0 | 0 | `lum4bl_capital2005` |
| lum4bl_capital2000 | 1 | 0 | 0 | `lum4bl_capital2000` |
| lum4bl_capital1994 | 1 | 0 | 0 | `lum4bl_capital1994` |
| lum4bl_capital1989 | 1 | 0 | 0 | `lum4bl_capital1989` |
| lum4bl_capital1984 | 1 | 0 | 0 | `lum4bl_capital1984` |
| lum4bl_capital1979 | 1 | 0 | 0 | `lum4bl_capital1979` |
| lum4bl_capital1974 | 1 | 0 | 0 | `lum4bl_capital1974` |
| lum4bl_chubu2003 | 1 | 0 | 0 | `lum4bl_chubu2003` |
| lum4bl_chubu1997 | 1 | 0 | 0 | `lum4bl_chubu1997` |
| lum4bl_chubu1991 | 1 | 0 | 0 | `lum4bl_chubu1991` |
| lum4bl_chubu1987 | 1 | 0 | 0 | `lum4bl_chubu1987` |
| lum4bl_chubu1982 | 1 | 0 | 0 | `lum4bl_chubu1982` |
| lum4bl_chubu1977 | 1 | 0 | 0 | `lum4bl_chubu1977` |
| lum4bl_kinki2008 | 1 | 0 | 0 | `lum4bl_kinki2008` |
| lum4bl_kinki2001 | 1 | 0 | 0 | `lum4bl_kinki2001` |
| lum4bl_kinki1996 | 1 | 0 | 0 | `lum4bl_kinki1996` |
| lum4bl_kinki1991 | 1 | 0 | 0 | `lum4bl_kinki1991` |
| lum4bl_kinki1985 | 1 | 0 | 0 | `lum4bl_kinki1985` |
| lum4bl_kinki1979 | 1 | 0 | 0 | `lum4bl_kinki1979` |
| lum4bl_kinki1974 | 1 | 0 | 0 | `lum4bl_kinki1974` |
| ndvi_250m_2012_12 | 1 | 0 | 0 | `ndvi_250m_2012_12` |
| ndvi_250m_2012_11 | 1 | 0 | 0 | `ndvi_250m_2012_11` |
| ndvi_250m_2012_10 | 1 | 0 | 0 | `ndvi_250m_2012_10` |
| ndvi_250m_2012_09 | 1 | 0 | 0 | `ndvi_250m_2012_09` |
| ndvi_250m_2012_08 | 1 | 0 | 0 | `ndvi_250m_2012_08` |
| ndvi_250m_2012_07 | 1 | 0 | 0 | `ndvi_250m_2012_07` |
| ndvi_250m_2012_06 | 1 | 0 | 0 | `ndvi_250m_2012_06` |
| ndvi_250m_2012_05 | 1 | 0 | 0 | `ndvi_250m_2012_05` |
| ndvi_250m_2012_04 | 1 | 0 | 0 | `ndvi_250m_2012_04` |
| ndvi_250m_2012_03 | 1 | 0 | 0 | `ndvi_250m_2012_03` |
| ndvi_250m_2012_02 | 1 | 0 | 0 | `ndvi_250m_2012_02` |
| ndvi_250m_2012_01 | 1 | 0 | 0 | `ndvi_250m_2012_01` |
| ndvi_250m_2011_12 | 1 | 0 | 0 | `ndvi_250m_2011_12` |
| ndvi_250m_2011_11 | 1 | 0 | 0 | `ndvi_250m_2011_11` |
| ndvi_250m_2011_10 | 1 | 0 | 0 | `ndvi_250m_2011_10` |
| ndvi_250m_2011_09 | 1 | 0 | 0 | `ndvi_250m_2011_09` |
| ndvi_250m_2011_08 | 1 | 0 | 0 | `ndvi_250m_2011_08` |
| ndvi_250m_2011_07 | 1 | 0 | 0 | `ndvi_250m_2011_07` |
| ndvi_250m_2011_06 | 1 | 0 | 0 | `ndvi_250m_2011_06` |
| ndvi_250m_2011_05 | 1 | 0 | 0 | `ndvi_250m_2011_05` |
| ndvi_250m_2011_04 | 1 | 0 | 0 | `ndvi_250m_2011_04` |
| ndvi_250m_2011_03 | 1 | 0 | 0 | `ndvi_250m_2011_03` |
| ndvi_250m_2011_02 | 1 | 0 | 0 | `ndvi_250m_2011_02` |
| ndvi_250m_2011_01 | 1 | 0 | 0 | `ndvi_250m_2011_01` |
| ndvi_250m_2010_12 | 1 | 0 | 0 | `ndvi_250m_2010_12` |
| ndvi_250m_2010_11 | 1 | 0 | 0 | `ndvi_250m_2010_11` |
| ndvi_250m_2010_10 | 1 | 0 | 0 | `ndvi_250m_2010_10` |
| ndvi_250m_2010_09 | 1 | 0 | 0 | `ndvi_250m_2010_09` |
| ndvi_250m_2010_08 | 1 | 0 | 0 | `ndvi_250m_2010_08` |
| ndvi_250m_2010_07 | 1 | 0 | 0 | `ndvi_250m_2010_07` |
| ndvi_250m_2010_06 | 1 | 0 | 0 | `ndvi_250m_2010_06` |
| ndvi_250m_2010_05 | 1 | 0 | 0 | `ndvi_250m_2010_05` |
| ndvi_250m_2010_04 | 1 | 0 | 0 | `ndvi_250m_2010_04` |
| ndvi_250m_2010_03 | 1 | 0 | 0 | `ndvi_250m_2010_03` |
| ndvi_250m_2010_02 | 1 | 0 | 0 | `ndvi_250m_2010_02` |
| ndvi_250m_2010_01 | 1 | 0 | 0 | `ndvi_250m_2010_01` |
| ndvi_250m_2009_12 | 1 | 0 | 0 | `ndvi_250m_2009_12` |
| ndvi_250m_2009_11 | 1 | 0 | 0 | `ndvi_250m_2009_11` |
| ndvi_250m_2009_10 | 1 | 0 | 0 | `ndvi_250m_2009_10` |
| ndvi_250m_2009_09 | 1 | 0 | 0 | `ndvi_250m_2009_09` |
| ndvi_250m_2009_08 | 1 | 0 | 0 | `ndvi_250m_2009_08` |
| ndvi_250m_2009_07 | 1 | 0 | 0 | `ndvi_250m_2009_07` |
| ndvi_250m_2009_06 | 1 | 0 | 0 | `ndvi_250m_2009_06` |
| ndvi_250m_2009_05 | 1 | 0 | 0 | `ndvi_250m_2009_05` |
| ndvi_250m_2009_04 | 1 | 0 | 0 | `ndvi_250m_2009_04` |
| ndvi_250m_2009_03 | 1 | 0 | 0 | `ndvi_250m_2009_03` |
| ndvi_250m_2009_02 | 1 | 0 | 0 | `ndvi_250m_2009_02` |
| ndvi_250m_2009_01 | 1 | 0 | 0 | `ndvi_250m_2009_01` |
| ndvi_250m_2008_12 | 1 | 0 | 0 | `ndvi_250m_2008_12` |
| ndvi_250m_2008_11 | 1 | 0 | 0 | `ndvi_250m_2008_11` |
| ndvi_250m_2008_10 | 1 | 0 | 0 | `ndvi_250m_2008_10` |
| ndvi_250m_2008_09 | 1 | 0 | 0 | `ndvi_250m_2008_09` |
| ndvi_250m_2008_08 | 1 | 0 | 0 | `ndvi_250m_2008_08` |
| ndvi_250m_2008_07 | 1 | 0 | 0 | `ndvi_250m_2008_07` |
| ndvi_250m_2008_06 | 1 | 0 | 0 | `ndvi_250m_2008_06` |
| ndvi_250m_2008_05 | 1 | 0 | 0 | `ndvi_250m_2008_05` |
| ndvi_250m_2008_04 | 1 | 0 | 0 | `ndvi_250m_2008_04` |
| ndvi_250m_2008_03 | 1 | 0 | 0 | `ndvi_250m_2008_03` |
| ndvi_250m_2008_02 | 1 | 0 | 0 | `ndvi_250m_2008_02` |
| ndvi_250m_2008_01 | 1 | 0 | 0 | `ndvi_250m_2008_01` |
| ndvi_250m_2007_12 | 1 | 0 | 0 | `ndvi_250m_2007_12` |
| ndvi_250m_2007_11 | 1 | 0 | 0 | `ndvi_250m_2007_11` |
| ndvi_250m_2007_10 | 1 | 0 | 0 | `ndvi_250m_2007_10` |
| ndvi_250m_2007_09 | 1 | 0 | 0 | `ndvi_250m_2007_09` |
| ndvi_250m_2007_08 | 1 | 0 | 0 | `ndvi_250m_2007_08` |
| ndvi_250m_2007_07 | 1 | 0 | 0 | `ndvi_250m_2007_07` |
| ndvi_250m_2007_06 | 1 | 0 | 0 | `ndvi_250m_2007_06` |
| ndvi_250m_2007_05 | 1 | 0 | 0 | `ndvi_250m_2007_05` |
| ndvi_250m_2007_04 | 1 | 0 | 0 | `ndvi_250m_2007_04` |
| ndvi_250m_2007_03 | 1 | 0 | 0 | `ndvi_250m_2007_03` |
| ndvi_250m_2007_02 | 1 | 0 | 0 | `ndvi_250m_2007_02` |
| ndvi_250m_2007_01 | 1 | 0 | 0 | `ndvi_250m_2007_01` |
| ndvi_250m_2006_12 | 1 | 0 | 0 | `ndvi_250m_2006_12` |
| ndvi_250m_2006_11 | 1 | 0 | 0 | `ndvi_250m_2006_11` |
| ndvi_250m_2006_10 | 1 | 0 | 0 | `ndvi_250m_2006_10` |
| ndvi_250m_2006_09 | 1 | 0 | 0 | `ndvi_250m_2006_09` |
| ndvi_250m_2006_08 | 1 | 0 | 0 | `ndvi_250m_2006_08` |
| ndvi_250m_2006_07 | 1 | 0 | 0 | `ndvi_250m_2006_07` |
| ndvi_250m_2006_06 | 1 | 0 | 0 | `ndvi_250m_2006_06` |
| ndvi_250m_2006_05 | 1 | 0 | 0 | `ndvi_250m_2006_05` |
| ndvi_250m_2006_04 | 1 | 0 | 0 | `ndvi_250m_2006_04` |
| ndvi_250m_2006_03 | 1 | 0 | 0 | `ndvi_250m_2006_03` |
| ndvi_250m_2006_02 | 1 | 0 | 0 | `ndvi_250m_2006_02` |
| ndvi_250m_2006_01 | 1 | 0 | 0 | `ndvi_250m_2006_01` |
| ndvi_250m_2005_12 | 1 | 0 | 0 | `ndvi_250m_2005_12` |
| ndvi_250m_2005_11 | 1 | 0 | 0 | `ndvi_250m_2005_11` |
| ndvi_250m_2005_10 | 1 | 0 | 0 | `ndvi_250m_2005_10` |
| ndvi_250m_2005_09 | 1 | 0 | 0 | `ndvi_250m_2005_09` |
| ndvi_250m_2005_08 | 1 | 0 | 0 | `ndvi_250m_2005_08` |
| ndvi_250m_2005_07 | 1 | 0 | 0 | `ndvi_250m_2005_07` |
| ndvi_250m_2005_06 | 1 | 0 | 0 | `ndvi_250m_2005_06` |
| ndvi_250m_2005_05 | 1 | 0 | 0 | `ndvi_250m_2005_05` |
| ndvi_250m_2005_04 | 1 | 0 | 0 | `ndvi_250m_2005_04` |
| ndvi_250m_2005_03 | 1 | 0 | 0 | `ndvi_250m_2005_03` |
| ndvi_250m_2005_02 | 1 | 0 | 0 | `ndvi_250m_2005_02` |
| ndvi_250m_2005_01 | 1 | 0 | 0 | `ndvi_250m_2005_01` |
| ndvi_250m_2004_12 | 1 | 0 | 0 | `ndvi_250m_2004_12` |
| ndvi_250m_2004_11 | 1 | 0 | 0 | `ndvi_250m_2004_11` |
| ndvi_250m_2004_10 | 1 | 0 | 0 | `ndvi_250m_2004_10` |
| ndvi_250m_2004_09 | 1 | 0 | 0 | `ndvi_250m_2004_09` |
| ndvi_250m_2004_08 | 1 | 0 | 0 | `ndvi_250m_2004_08` |
| ndvi_250m_2004_07 | 1 | 0 | 0 | `ndvi_250m_2004_07` |
| ndvi_250m_2004_06 | 1 | 0 | 0 | `ndvi_250m_2004_06` |
| ndvi_250m_2004_05 | 1 | 0 | 0 | `ndvi_250m_2004_05` |
| ndvi_250m_2004_04 | 1 | 0 | 0 | `ndvi_250m_2004_04` |
| terrainclassification1 | 1 | 0 | 0 | `terrainclassification1` |
| landuseclassification1 | 1 | 0 | 0 | `landuseclassification1` |
| landuseclassification2 | 1 | 0 | 0 | `landuseclassification2` |
| 土地履歴(災害履歴図) | 78 | 0 | 0 | `DisasterHist_flood_tokyo` `DisasterHist_flood_saitamaChiba1` `DisasterHist_flood_saitamaChiba2` |
| shinsaidenshoushisetsu | 1 | 0 | 0 | `shinsaidenshoushisetsu` |
| fukkokizu | 1 | 0 | 0 | `fukkokizu` |
| geography_flood | 1 | 0 | 0 | `geography_flood` |
| landform2_mono | 1 | 0 | 0 | `landform2_mono` |
| kokuarea | 1 | 0 | 0 | `kokuarea` |
| kokuarea_kanseikentou | 1 | 0 | 0 | `kokuarea_kanseikentou` |
| kokuarea_tokubetsukanseiku | 1 | 0 | 0 | `kokuarea_tokubetsukanseiku` |
| kokuarea_shinnyuukanseiku | 1 | 0 | 0 | `kokuarea_shinnyuukanseiku` |
| kokuarea_minkankunren | 1 | 0 | 0 | `kokuarea_minkankunren` |
| earthhillshade | 1 | 1 | 0 | `earthhillshade` |
| red | 1 | 1 | 0 | `red` |

## 製品型の事例から見た「見せ方」の型

製品型ページのリンクを族ごとに束ね、同じ構造のものを数えた(`<族>` はその族の ID が入る位置)。「この製品を、この場所で、この枠で見る」の正解例の要約。

### 活断層図

- 249 リンク / 1 ページ、ズーム 14: `ls=std|<活断層図>|<活断層図> blend=- lcd=- d=-`
  - 例: https://maps.gsi.go.jp/#14/37.13333/136.76111/&base=std&ls=std%7Cafm%7Cafm_spec
- 2 リンク / 2 ページ、ズーム 6: `ls=std|<活断層図>|<活断層図> blend=0 lcd=<活断層図> d=m`
  - 例: https://maps.gsi.go.jp/#6/38.419166/137.548828/&base=std&ls=std%7Cafm%7Cafm_spec&blend=0&disp=111&lcd=afm_spec&vs=c1g1j0h0k0l0u0t0z0r0s0m0f1&d=m
- 1 リンク / 1 ページ、ズーム 11: `ls=std|<活断層図> blend=0 lcd=<活断層図> d=m`
  - 例: https://maps.gsi.go.jp/#11/32.600048/130.700226/&base=std&ls=std%7Cafm&blend=0&disp=11&lcd=afm&vs=c1g1j0h0k0l0u0t0z0r0s0m0f1&d=m

### 災害対応(日付つきの個別ID)

- 56 リンク / 7 ページ、ズーム 10〜15: `ls=std|<災害対応(日付つきの個別ID)> blend=- lcd=<災害対応(日付つきの個別ID)> d=m`
  - 例: https://maps.gsi.go.jp/#12/37.412710/137.066803/&base=std&ls=std%7C20240923rain_wajima_0923suichoku_sokuho&disp=11&lcd=20240923rain_wajima_0923suichoku_sokuho&vs=c1g1j0h0k0l0u0t0z0r0s0m0f1&d=m
- 33 リンク / 9 ページ、ズーム 10〜14: `ls=std|<災害対応(日付つきの個別ID)> blend=0 lcd=<災害対応(日付つきの個別ID)> d=m`
  - 例: https://maps.gsi.go.jp/#12/37.391709/137.040710/&base=std&ls=std%7C20240923rain_wajima_0923do_sokuho&blend=0&disp=11&lcd=20240923rain_wajima_0923do_sokuho&vs=c1g1j0h0k0l0u0t0z0r0s0m0f1&d=m
- 8 リンク / 2 ページ、ズーム 11,12: `ls=std|<災害対応(日付つきの個別ID)> blend=- lcd=<災害対応(日付つきの個別ID)> d=-`
  - 例: https://maps.gsi.go.jp/#11/37.309560/137.088776/&base=std&ls=std%7C20240923rain_syamenhoukai_dosekiryu_taiseki&disp=11&lcd=20240923rain_syamenhoukai_dosekiryu_taiseki&vs=c0g1j0h0k0l0u0t0z0r0s0m0f1

### 火山基本図

- 14 リンク / 1 ページ、ズーム 15: `ls=std|<火山基本図> blend=0 lcd=- d=m`
  - 例: https://maps.gsi.go.jp/#15/43.612503/144.433754/&base=std&ls=std%7Cvbmd_bm&blend=0&disp=11&vs=c1g1j0h0k0l0u0t0z0r0s0m0f1&d=m
- 8 リンク / 1 ページ、ズーム 15: `ls=blank|<火山基本図> blend=0 lcd=<火山基本図> d=vl`
  - 例: https://maps.gsi.go.jp/#15/36.633248/138.537126/&base=blank&ls=blank%7Cvbmd_bm&blend=0&disp=11&lcd=vbmd_bm&vs=c1j0h0k0l0u0t0z0r0s0m0f0&d=vl
- 6 リンク / 1 ページ、ズーム 15: `ls=std|<火山基本図> blend=0 lcd=<火山基本図> d=m`
  - 例: https://maps.gsi.go.jp/#15/42.063504/140.677142/&base=std&ls=std%7Cvbmd_bm&blend=0&disp=11&lcd=vbmd_bm&vs=c0g0j0h0k0l0u0t0z0r0s0m0f1&d=m

### 治水地形分類図

- 24 リンク / 5 ページ、ズーム 8,9,10,11: `ls=std|<治水地形分類図> blend=0 lcd=<治水地形分類図> d=m`
  - 例: https://maps.gsi.go.jp/#10/36.923218/138.576874/&base=std&ls=std%7Clcmfc2&blend=0&disp=11&lcd=lcmfc2&vs=c1g1j0h0k0l0u0t0z1r0s0m0f1&d=m
- 2 リンク / 1 ページ、ズーム 12: `ls=std|<治水地形分類図> blend=0 lcd=<治水地形分類図> d=-`
  - 例: https://maps.gsi.go.jp/#12/38.723769/140.183830/&base=std&ls=std|lcmfc2&blend=0&disp=11&lcd=lcmfc2&vs=c1g1j0h0k0l0u0t0z0r0s0m0f1

### デジタル標高地形図

- 11 リンク / 1 ページ、ズーム 10: `ls=std|<デジタル標高地形図> blend=0 lcd=<デジタル標高地形図> d=m`
  - 例: https://maps.gsi.go.jp/#10/33.554557/130.442047/&base=std&ls=std%7Cd1-no982&blend=0&disp=11&lcd=d1-no982&vs=c1j0h0k0l0u0t0z0r0s0m0f1&d=m
- 4 リンク / 1 ページ、ズーム 10: `ls=std|<デジタル標高地形図> blend=1 lcd=<デジタル標高地形図> d=-`
  - 例: https://maps.gsi.go.jp/#10/37.901949/139.023056/&base=std&ls=std%7Cd1-no957%2C0.65&blend=1&disp=11&lcd=d1-no957&vs=c1g1j0h0k0l0u0t0z0r0s0m0f0
- 2 リンク / 2 ページ、ズーム 11,14: `ls=std|<デジタル標高地形図> blend=0 lcd=<デジタル標高地形図> d=vl`
  - 例: https://maps.gsi.go.jp/#14/36.208754/140.219793/&base=std&ls=std%7Cd1-no892&blend=0&disp=11&lcd=d1-no892&vs=c1j0h0k0l0u0t0z0r0s0f1&d=vl

### 火山土地条件図

- 9 リンク / 1 ページ、ズーム 14,15: `ls=std|<火山土地条件図>|<火山土地条件図> blend=10 lcd=<火山土地条件図> d=m`
  - 例: https://maps.gsi.go.jp/#14/39.099360/140.048862/&base=std&ls=std%7Cvlcd_chokai%7Cvlcd&blend=10&disp=111&lcd=vlcd_chokai&vs=c1g1j0h0k0l0u0t0z0r0s0m0f1&d=m
- 4 リンク / 3 ページ、ズーム 12,14: `ls=std|<火山土地条件図> blend=1 lcd=<火山土地条件図> d=m`
  - 例: https://maps.gsi.go.jp/#14/41.804782/141.166420/&base=std&ls=std%7Cvlcd_esn&blend=1&disp=11&lcd=vlcd_esn&vs=c1g1j0h0k0l0u0t0z0r0s0m0f2&d=m
- 1 リンク / 1 ページ、ズーム 14: `ls=std|<火山土地条件図> blend=0 lcd=<火山土地条件図> d=m`
  - 例: https://maps.gsi.go.jp/#14/35.233184/139.021025/&base=std&ls=std%7Cvlcd&blend=0&disp=11&lcd=vlcd&vs=c1j0h0k0l0u0t0z0r0s0m0f1&d=m

### 沿岸海域土地条件図

- 9 リンク / 9 ページ、ズーム 6: `ls=std|<沿岸海域土地条件図>|<沿岸海域土地条件図> blend=- lcd=- d=-`
  - 例: http://maps.gsi.go.jp/#6/36.155618/134.912109/&base=std&ls=std%7Cccm1%7Cccm2&disp=111&vs=c1j0l0u0f0

### 地形分類(ベクトルタイル)

- 2 リンク / 1 ページ、ズーム 15: `ls=std|<地形分類(ベクトルタイル)> blend=- lcd=<地形分類(ベクトルタイル)> d=vl`
  - 例: https://maps.gsi.go.jp/#15/36.104665/140.086348/&base=std&ls=std%7Cexperimental_landformclassification1&disp=11&lcd=experimental_landformclassification1&vs=c1j0l0u0t0z0r0f0&d=vl
- 1 リンク / 1 ページ、ズーム 11: `ls=std|<地形分類(ベクトルタイル)>(hidden)|<地形分類(ベクトルタイル)> blend=- lcd=<地形分類(ベクトルタイル)> d=m`
  - 例: https://maps.gsi.go.jp/#11/32.600048/130.700226/&base=std&ls=std%7Cexperimental_landformclassification2%7Cexperimental_landformclassification1&disp=101&lcd=experimental_landformclassification1&vs=c1g1j0h0k0l0u0t0z0r0s0m0f1&d=m
- 1 リンク / 1 ページ、ズーム 5: `ls=std|<地形分類(ベクトルタイル)>|<地形分類(ベクトルタイル)> blend=- lcd=<地形分類(ベクトルタイル)> d=vl`
  - 例: https://maps.gsi.go.jp/#5/35.362222/138.731389/&base=std&ls=std%7Cexperimental_landformclassification1%7Cexperimental_landformclassification2&disp=111&lcd=experimental_landformclassification2&vs=c1j0l0u0t0z0r0f0&d=vl

### 土地条件図(数値地図25000)

- 1 リンク / 1 ページ、ズーム 5: `ls=std|<土地条件図(数値地図25000)> blend=- lcd=<土地条件図(数値地図25000)> d=vl`
  - 例: https://maps.gsi.go.jp/#5/35.362222/138.731389/&base=std&ls=std%7Clcm25k_2012&disp=11&lcd=lcm25k_2012&vs=c1j0l0u0f0&d=vl
- 1 リンク / 1 ページ、ズーム 5: `ls=std|<土地条件図(数値地図25000)> blend=0 lcd=<土地条件図(数値地図25000)> d=vl`
  - 例: https://maps.gsi.go.jp/#5/35.362222/138.731389/&base=std&ls=std%7Clcm25k&blend=0&disp=11&lcd=lcm25k&vs=c1j0l0u0t0z0r0f0&d=vl
- 1 リンク / 1 ページ、ズーム 6: `ls=std|<土地条件図(数値地図25000)> blend=- lcd=<土地条件図(数値地図25000)> d=v`
  - 例: https://maps.gsi.go.jp/#6/36.800488/137.197266/&base=std&ls=std%7Clcm25k_2012&disp=11&lcd=lcm25k&vs=c1j0l0u0f0&d=v

### 自然災害伝承碑

- 1 リンク / 1 ページ、ズーム 7: `ls=pale|<自然災害伝承碑> blend=- lcd=<自然災害伝承碑> d=m`
  - 例: https://maps.gsi.go.jp/#7/35.366656/138.735352/&base=pale&ls=pale|disaster_lore_all&disp=11&lcd=disaster_lore_all&vs=c1j0h0k0l0u0t0z0r0s0m0f0&d=m

### earthhillshade

- 1 リンク / 1 ページ、ズーム 4: `ls=std|relief_free|earthhillshade blend=11 lcd=relief_free d=vl`
  - 例: https://maps.gsi.go.jp/#4/-9.968851/-21.708984/&base=std&ls=std%7Crelief_free%7Cearthhillshade%2C0.7&blend=11&disp=111&lcd=relief_free&vs=c1j0h0k0l0u0t0z0r0s0f1&d=vl&reliefdata=20G003FADG64G409A57GC8G7FF500G1F4GFAE100G3E8GF59936G7D0GE64D0CGFA0G9C2F00GG611E02

### red

- 1 リンク / 1 ページ、ズーム 14: `ls=std|<火山基本図>|red blend=01 lcd=<火山基本図> d=vl`
  - 例: https://maps.gsi.go.jp/#14/31.907873/130.880642/&base=std&ls=std%7Cvbmd_bm%7Cred&blend=01&disp=111&lcd=vbmd_bm&vs=c1j0h0k0l0u0t0z0r0s0f1&d=vl


## 対象外

未判定。理由を DECISIONS.md に書ける候補が出たら追加する。
