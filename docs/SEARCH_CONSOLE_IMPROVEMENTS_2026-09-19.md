# Search Console 改善メモ — Issue #181 最終レビュー

記録日: 2026-09-19

## 比較条件

- Search Console property: `sc-domain:playpoint-sim.com`
- Search type: `web`
- Data state: `FINAL`
- Current: **2026-08-20〜2026-09-16**
- Previous: **2026-07-23〜2026-08-19**
- 各28日、非重複
- Raw: query × exact URL / `byPage`
- Normalized: query × base URL
- Property Total: dimensionなし / `byProperty`
- 次回確認日: **2026-09-25**
- 変更方針: 2026-09-25までは既存の観察ガードレールを維持し、このメモだけを根拠に即時改稿しない。実装する場合は対象ごとに最小差分PRへ分ける。

## 改善候補 1 — 日本語ホームの「ダイヤモンド必要額」検索スニペット

### 基本情報

- 対象URL: `/`
- 対象地域/言語: JP
- 対象期間: current 28d vs previous 28d
- 次回確認日: 2026-09-25

### Search Console 根拠

| 対象クエリ | 現Imp. | 現Click | 現CTR | 現Pos | 前Imp. | 前Click | 前CTR | 前Pos |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `google プレイ ダイヤモンド いくら` | 83 | 1 | 1.20% | 3.90 | 28 | 1 | 3.57% | 5.11 |
| `google play ダイヤモンド いくら` | 54 | 2 | 3.70% | 3.81 | 11 | 0 | 0.00% | 6.18 |
| `グーグルプレイ ダイヤモンド 課金額` | 44 | 0 | 0.00% | 4.09 | 32 | 0 | 0.00% | 5.59 |

Country / Deviceでも主因は日本・モバイル。
`google プレイ ダイヤモンド いくら` は Japan 84 Imp. / 1 Click / CTR 1.19% / Pos 4.81、Mobile 73 Imp. / 1 Click / CTR 1.37% / Pos 3.89。
`グーグルプレイ ダイヤモンド 課金額` は Japan 44 Imp. / 0 Click / Pos 4.09、Mobile 39 Imp. / 0 Click / Pos 4.31。

### 問題の分類

- 表示回数はあるがCTRが低い
- 高順位低CTR
- 実際に選ばれているURLがホームで、専用 `/status/diamond/` は主要「いくら」クエリのownerになっていない

### 仮説

- 変更前の問題:
  - ホームのtitleは「ランクアップ」「必要課金額」までは含むが、検索語で強く使われている「ダイヤモンド」を明示していない。
  - 検索順位自体は十分高いため、順位を取りに行く大改稿よりスニペット整合を先に見る余地がある。
- ユーザーが検索時に期待していること:
  - 「ダイヤモンドまでいくら必要か」を検索結果の時点で即判断できること。
- 今回の変更で改善する理由:
  - ホームの主機能を変えず、title / descriptionでプラチナ・ダイヤモンドの必要額を明示すれば、現在獲得している3〜4位の表示に対して検索意図との一致を上げられる可能性がある。

### 変更内容候補

- title:
  - 変更候補。現在の汎用性を壊さない範囲で「プラチナ・ダイヤモンド」を明示する短い案を比較する。
- description:
  - 「プラチナ・ダイヤモンドまであといくら必要か」を明示する案を第一候補にする。
- H1/H2:
  - 変更しない。
- ファーストビュー:
  - 変更しない。
- 本文追記:
  - 変更しない。
- 内部リンク:
  - 現在の `/status/diamond/` 導線は維持。
- CTA:
  - 変更しない。
- canonical / hreflang / sitemap:
  - 変更しない。

### 変更しないもの

- 計算ロジック
- 入力UI
- Analyticsイベント
- 広告枠
- 多言語ページ

---

## 改善候補 2 — 「Play Pointsが反映されない」記事の検索語整合

### 基本情報

- 対象URL: `/articles/2026-03-10-play-points-reflection-timing.html`
- 対象地域/言語: JP
- 対象期間: current 28d vs previous 28d
- 次回確認日: 2026-09-25

### Search Console 根拠

| 対象クエリ | 現Imp. | 現Click | 現CTR | 現Pos | 前Imp. | 前Click | 前CTR | 前Pos |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `グーグルプレイポイント 反映されない` | 50 | 0 | 0.00% | 5.88 | 6 | 0 | 0.00% | 6.83 |
| `プレイポイント 反映されない` | 36 | 2 | 5.56% | 5.42 | 10 | 0 | 0.00% | 6.80 |
| `google play ポイント 反映 されない` | 24 | 1 | 4.17% | 6.33 | 1 | 0 | 0.00% | 7.00 |
| `googleプレイポイント 反映されない` | 20 | 0 | 0.00% | 5.85 | 5 | 0 | 0.00% | 8.20 |

最大の `グーグルプレイポイント 反映されない` は Mobile 44 Imp. / 0 Click / CTR 0% / Pos 5.70。

### 問題の分類

- 表示回数はあるがCTRが低い
- 掲載順位5〜20位で改善余地がある
- 検索語は「Google Play Points」明示が多い一方、現title/H1は `Play Pointsが反映されない・遅い時は？...` から始まる

### 仮説

- 変更前の問題:
  - 記事テーマ自体は一致し、順位も改善しているが、最も伸びた日本語表記の検索語でCTR 0%。
- ユーザーが検索時に期待していること:
  - Google Play Pointsの反映トラブルを扱うページだと即分かること。
- 今回の変更で改善する理由:
  - title/H1先頭を `Google Play Points` に揃えるだけなら内容・構造を変えずに検索語との表層一致を高められる。

### 変更内容候補

- title:
  - `Google Play Pointsが反映されない・遅い時は？いつ付くかと確認する順番` を候補にする。
- description:
  - 冒頭を `Google Play Pointsが反映されない時...` に揃える候補。
- H1/H2:
  - H1のみtitleと同じブランド表記へ揃える候補。
- ファーストビュー:
  - 内容は変えない。
- 本文追記:
  - しない。
- 内部リンク:
  - 変更しない。
- CTA:
  - 変更しない。
- canonical / hreflang / sitemap:
  - 変更しない。

### 変更しないもの

- 記事本文の手順・事実関係
- 計算機
- Analyticsイベント
- 広告枠

---

## 改善候補 3 — 「ダイヤモンド維持」検索意図のowner整理

### 基本情報

- 主対象URL候補: `/maintenance/diamond/`
- 現在表示されているURL:
  - `/`
  - `/articles/2025-12-25-playpoints-rank-maintenance.html`
- 対象地域/言語: JP
- 対象期間: current 28d vs previous 28d
- 次回確認日: 2026-09-25

### Search Console 根拠

`google play ダイヤモンド 維持`

| URL | 現Imp. | 現Click | 現CTR | 現Pos | 前Imp. | 前Click | 前CTR | 前Pos |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | 46 | 1 | 2.17% | 6.00 | 10 | 0 | 0.00% | 7.40 |
| `/articles/2025-12-25-playpoints-rank-maintenance.html` | 15 | 1 | 6.67% | 5.80 | - | - | - | - |
| `/maintenance/diamond/` | 主要exact queryでは現期間の表示なし |  |  |  |  |  |  |  |

派生 `google play ダイヤモンド 維持 いくら` はホームが 28 Imp. / 3 Click / CTR 10.71% / Pos 2.54。
専用 `/maintenance/diamond/` は前期間に 2 Imp. / 1 Click / Pos 2.00 があるが、現期間では主要ownerになっていない。

### 問題の分類

- 同じ意図で複数URLが競合している
- 専用ページが検索意図ownerになっていない

### 仮説

- 変更前の問題:
  - ホームと総合ランク維持記事が同じexact queryで表示され、専用maintenanceページへのシグナルが弱い。
- ユーザーが検索時に期待していること:
  - ダイヤモンド維持に必要な残りポイント・課金額・年末までの目安へ直接移動できること。
- 今回の変更で改善する理由:
  - canonicalやredirectを触らず、ホーム・総合維持記事・statusページから専用maintenanceページへの内部リンクを明示してownerを整理できる。

### 変更内容候補

- title:
  - `/maintenance/diamond/` は現titleが検索意図に一致しているため変更しない。
- description:
  - 変更しない。
- H1/H2:
  - 変更しない。
- ファーストビュー:
  - 変更しない。
- 本文追記:
  - しない。
- 内部リンク:
  - ホームまたはランク導線に `ダイヤモンド維持はいくら必要？` の専用導線を追加候補。
  - `/articles/2025-12-25-playpoints-rank-maintenance.html` から `/maintenance/diamond/` を明示的ownerとしてリンクする候補。
  - `/status/diamond/` から維持ページへの関連導線も確認する。
- CTA:
  - 変更しない。
- canonical / hreflang / sitemap:
  - 変更しない。

### 変更しないもの

- redirect
- canonical
- 計算ロジック
- ランク条件本文
- 多言語URL

---

# 今回は変更対象にしない観察クエリ

| 対象 | 判定 | 根拠 |
| --- | --- | --- |
| 2倍キャンペーン | 変更しない | `google play ポイント増量キャンペーン 予定 2026` は 79 Click / 668 Imp. / CTR 11.83% / Pos 3.73。前期間は 0 / 55 / 0% / 10.51。Mobileも 68 / 531 / 12.81% / 3.72 と強く伸長。 |
| Play Points 1万円 | 変更しない | `/amount/10000/` は現期間で合計数Imp.程度、しかも主にプラチナ/ダイヤモンド派生検索。1万円意図の実測が不足。 |
| プラチナ維持 | 変更しない | exact `google play プラチナ 維持` はホーム1 Imp.、総合維持記事1 Imp.。母数不足。 |
| Play Points 有効期限 | 変更しない | 専用expiration記事は各query 1 Imp.程度。母数不足。 |
| JP ギフトカード ポイント | 変更しない | 観察対象意図に対応する十分なquery×URL実測がない。 |
| EN Diamond cost | 変更しない | `/en/status/diamond/` に対象queryの実測がない。 |
| EN 2x promotion | 変更しない | `/en/campaign/2x/` に対象queryの実測がない。 |
| EN not showing | 観察継続 | `google play points not showing up` 26 Imp. / 0 Click / Pos 6.77、関連4表現で約47 Imp.だが、前期間データがほぼなく現titleも検索語へ一致している。新規伸長をもう1窓見る。 |
| EN gift cards | 観察継続 | `how do play points become gift cards?` は 34 Imp. / 0 Click / Pos 10.15、前期間 9 Imp. / 0 Click / Pos 9.89。伸長中だが母数がまだ小さく、順位も約10位。 |

# 検証状態

- [x] 非重複28日 current / previous を取得
- [x] query × URLでClick / Imp. / CTR / Positionを確認
- [x] 高順位低CTR / 5〜20位候補を抽出
- [x] Country / Deviceで主要候補を切り分け
- [x] データ不足候補を変更対象から除外
- [x] 改善候補だけテンプレート形式で記録
- [x] 次回確認日を2026-09-25に設定

## 次の対応

2026-09-25に上の3候補を再確認し、同じ傾向が維持されていればそれぞれ別PRで最小差分を実装する。
一度に3対象を変更せず、どの変更がCTR/owner整理へ効いたか追えるようにする。

---

# PR #408 実装後の観察ロック

PR #408「SEO: 低CTRクエリの検索意図とページownerを最小差分で整理」は
**2026-09-19 13:56 JST** にmainへマージされ、
**2026-09-19 13:59 JST** にXserver Deployが成功した。

Search Console APIは `America/Los_Angeles` の日付を使うため、これは
**2026-09-18 21:59 PT** に相当する。
したがって 2026-09-18 PT は変更前後が混在するため、効果測定のpost期間には使わない。

- 変更前の固定ベースライン: **2026-08-20〜2026-09-16 PT**（28日、FINAL）
- mixed day: **2026-09-18 PT**（効果測定から除外）
- 変更後の最初の完全日: **2026-09-19 PT**
- 初期採用確認: **2026-09-25前後**
- 変更後28日が完全に揃う窓: **2026-09-19〜2026-10-16 PT**
- 本評価: 上記post 28日がFINALになってから

## #408変更前ベースライン

評価時はRawのfragment別行を合算せず、`🧹GSC 28日正規化` のbase URL単位を正本にする。

| 検索意図 / query | 変更前 Imp. | Click | CTR | Pos | 主な観察 |
| --- | ---: | ---: | ---: | ---: | --- |
| `スーパーウィークリーリワード` | 390 | 0 | 0.00% | 6.06 | title/H1「とは？」の採用とCTR |
| `google play クエスト 購入` | 205 | 0 | 0.00% | 4.33 | 「購入条件」明示後のCTR |
| `グーグルプレイポイント 反映されない` | 50 | 0 | 0.00% | 5.88 | Google Play Points表記後のCTR |
| `구글포인트 확인` | 326 | 0 | 0.00% | 9.29 | use-coupons → balance/historyページへのowner移行 |
| `google play ポイント交換` | 171 | 0 | 0.00% | 9.71 | cash-conversion → best-useへのowner整理 |

補助ベースライン:

- `google play ポイント交換 おすすめ` → `/articles/2025-12-25-best-use.html`
  - 344 Imp. / 7 Click / CTR 2.03% / Pos 7.55
- `google play ポイント交換 おすすめ` → cash-conversion
  - 75 Imp. / 1 Click / CTR 1.33% / Pos 9.23

## 評価ルール

### title/H1を変更した3群

CTRだけで成功判定しない。

1. CTR
2. 平均掲載順位
3. 表示回数
4. URL InspectionのLast crawl
5. Google canonical / User canonical

を同時に見る。

順位が大きく変わった場合は、CTR上昇をtitle/H1変更だけの効果とは扱わない。

### owner整理2群

CTRより先に、queryに対する **base URL別の表示シェア** を見る。

- 韓国語 `구글포인트 확인`
  - 旧owner: `/ko/articles/google-play-points-use-coupons.html`
  - 意図したowner: `/ko/articles/google-play-points-balance-history-progress.html`
- 日本語 `google play ポイント交換`
  - 現状owner: `/articles/2026-07-24-play-points-cash-conversion.html`
  - 交換先比較の意図したowner: `/articles/2025-12-25-best-use.html`

新ownerの表示シェアが増えているなら、クリック増加前でもowner整理の初期シグナルとして記録する。

## 変更凍結

#408対象ページは、事実誤認・制度変更・重大なUX不具合を除き、
**初期採用確認までは追加SEO改稿を重ねない**。

2026-09-25は「最終評価日」ではなく、
再クロール・title採用・owner移行が始まったかを見る最初の確認日にする。
28日効果判定はpost窓がFINALになってから行う。

