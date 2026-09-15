# PlayPoint 本番計測監査 — 2026-09-15

## 目的

Issue #180（GA4本番計測）と #181（Search Console観察クエリ）について、推測ではなく取得済みの本番データだけで現在地を固定する。

この監査では、確認できない項目を完了扱いしない。特にGA4 DebugViewとSearch Consoleの非重複「前28日」比較は、取得できた証拠と区別する。

## Phase 2 — 変更前Baselineの固定

この文書と `scripts/measurement-baseline.cjs` を、2026-09-15以降の改善を比較するための変更前Baselineとする。Baseline IDは `phase2-pre-change-2026-09-15`。

比較時の契約は次のとおり。

- 共通の短期基準期間は **2026-09-01〜2026-09-07**。この7日間の値を後から上書きしない。
- ユーザー到達を測る主単位は **activeUsers**。`eventCount` は再計算・再クリックで膨らむため診断用とする。
- 取得できない値は `0` にせず **UNAVAILABLE** として扱う。
- Product North Starは Organic/Search landing から First Success までの成功計算率。収益サイトとして **Revenue / Successful Calculation** を同格のBusiness KPIとして持つ。
- Search Consoleは **Raw / Normalized / Property Total** を別レイヤーで保持する。Rawは query × exact URL（fragmentを保持）、Normalizedは query × base URL（fragmentを除去）、Property Totalは query dimensionなしのclick / impressionを使う。
- GSC totalとGA4 Organicを比較する場合、GA4 Organicは検索エンジン別に分解する。query rows合計だけをProperty Totalの代わりにしない。
- SEOの前後比較は同じ定義・同じ検索意図で行い、28日比較では前後期間を重複させない。
- 2026-08-27の `GA4 PV 42 / AdSense page views 630` は **ANOMALY_REVIEW**。原因確定前に自動補正・自動除外しない。
- 9月上旬のSEO変更は最低14日観察し、次回レビュー日は **2026-09-25** とする。
- DebugView、`app_display_mode` Custom Dimension登録、非重複の前28日Search Console raw比較は、実データで確認できるまで未完了のまま残す。

このBaselineの目的は「改善を大きく見せるために期間・分母・異常値処理を後から変える」ことを防ぐことであり、将来の新しい実測値を固定することではない。新しい観測値は別スナップショットとして追加し、Baseline自体は保存する。

## データ鮮度

`PlayPoint Analytics` のシステム状態を 2026-09-15 に確認した。

- GA4 Realtime 最終更新: 2026-09-15 01:01 JST
- Search Console 速報最終更新: 2026-09-14
- Search Console 確定スナップショット: 2026-08-13〜2026-09-11
- GA4 30日スナップショット: 2026-08-15〜2026-09-13
- システム連続失敗: 0

深夜時点のRealtime 0ユーザー / 0イベントは障害判定に使わない。

## GA4本番設定監査

`trend-reporter` のread-only GA4 Admin / Data API監査（生成日時 2026-09-10、対象 2026-09-01〜2026-09-07）で以下を確認済み。

| 項目 | 結果 |
| --- | --- |
| `calculation_completed` Key event | OK |
| `reverse_calculation_completed` Key event | 任意・未登録 |
| `entry_source_path` custom dimension | OK |
| `entry_link_context` custom dimension | OK |
| `calculator_preset` custom dimension | OK |
| `calculator_form_started` | 36 events |
| `calculation_completed` | 70 events |
| `reverse_calculation_completed` | 7 events |
| `calculator_funnel_completed` | 28 events |

したがって、`docs/ANALYTICS.md` の 2026-08-11 時点で「GA4プロパティ側のキーイベント指定が未確認」としていた状態のうち、`calculation_completed` のKey event登録はAPIで確認済みに進んだ。

### まだ完了扱いにしない項目

Admin / Data APIでは、ブラウザから送った単発イベントがDebugViewへどのように現れたかは証明できない。Issue #180は次を管理画面で確認するまでopenのままとする。

- 通常計算・逆算・共有・関連記事・判断導線をDebugViewで実操作確認
- 生の課金額、必要ポイント、獲得ポイント、日記内容がイベントパラメータに含まれないことをDebugViewで確認
- 同意前 / 拒否後に送信されないことをDebugViewで確認

コード側のallowlist、同意境界、raw値抑止は回帰テストで保護されているが、これはDebugView実測の代替とはしない。

## Search Console観察クエリ監査

### 保存済みスナップショット

週次Archiveから次の2つのFINALスナップショットを確認した。

- 旧: 2026-08-06〜2026-09-04
- 新: 2026-08-13〜2026-09-11

両方ともローリング30日で7日ずつ重なるため、以下の差分は「直近1週間を含めたローリング傾向」であり、Issue #181が要求する非重複の「過去28日 vs 前28日」そのものではない。

### 主対象URLのローリング傾向

| 観察対象 | 主対象URL | 旧 Click / Imp. / CTR / Pos | 新 Click / Imp. / CTR / Pos | 判定 |
| --- | --- | --- | --- | --- |
| 2倍キャンペーン | `/campaign/2x/` | 0 / 0 / — / — | 0 / 0 / — / — | データ不足。変更しない |
| Play Points 1万円 | `/amount/10000/` | 0 / 0 / — / — | 0 / 3 / 0% / 26.67 | データ不足。変更しない |
| ダイヤモンド必要額 | `/status/diamond/` | 0 / 0 / — / — | 0 / 0 / — / — | データ不足。変更しない |
| プラチナ維持 | `/maintenance/platinum/` | 0 / 0 / — / — | 0 / 0 / — / — | データ不足。変更しない |
| ダイヤモンド維持 | `/maintenance/diamond/` | 1 / 3 / 33.33% / 5.00 | 0 / 0 / — / — | 母数が小さすぎる。変更しない |
| Play Points 反映 | `/articles/2026-03-10-play-points-reflection-timing.html` | 2 / 112 / 1.79% / 6.68 | 3 / 197 / 1.52% / 6.63 | 表示増。観察継続 |
| Play Points 有効期限 | `/articles/2025-12-25-expiration.html` | 0 / 8 / 0% / 2.75 | 0 / 8 / 0% / 2.75 | 母数不足。変更しない |
| Play Points ギフトカード | `/articles/2026-06-20-discount-gift-cards.html` | 3 / 258 / 1.16% / 10.57 | 6 / 315 / 1.90% / 10.44 | 表示・クリックとも増。変更しない |
| EN Diamond cost | `/en/status/diamond/` | 0 / 0 / — / — | 0 / 0 / — / — | データ不足。変更しない |
| EN 2x promotion | `/en/campaign/2x/` | 0 / 0 / — / — | 0 / 0 / — / — | データ不足。変更しない |
| EN not showing | `/en/articles/google-play-points-not-showing.html` | 0 / 9 / 0% / 5.67 | 0 / 39 / 0% / 6.38 | CTR候補だが観察継続 |
| EN gift cards | `/en/articles/google-play-points-gift-cards.html` | 0 / 30 / 0% / 9.93 | 0 / 29 / 0% / 10.28 | 横ばい・小規模。変更しない |

掲載順位はそのURLに記録されたquery行を表示回数で加重平均した値。

### クエリ単位で見えた候補

確定スナップショット 2026-08-13〜2026-09-11 では、次を確認した。

- `グーグルプレイポイント 反映されない` → 反映記事: 46 Imp. / 0 Click / Pos 6.15
- `プレイポイント 反映されない` → 反映記事: 38 Imp. / 2 Click / CTR 5.26% / Pos 5.76
- `google play ポイント 反映 されない` → 反映記事: 16 Imp. / 1 Click / CTR 6.25% / Pos 6.44
- `google play points not showing up` → EN not-showing: 15 Imp. / 0 Click / Pos 7.00
- `how do play points become gift cards?` → EN gift-cards: 29 Imp. / 0 Click / Pos 10.28

順位5〜20位または高順位低CTRの条件には一部該当するが、直近の改修観察期間中であり、単発の小さい母数を理由にtitle / description / 本文を再変更しない。

### 現時点のSEO判断

- 反映記事: 表示回数が増えており、順位もほぼ維持。今は変更しない。
- 日本語ギフト関連記事: 表示・クリック・CTRが改善。今は変更しない。
- EN not-showing: 低CTR候補として継続監視するが、39 Imp.だけで再編集しない。
- EN gift-cards: 順位10前後・CTR 0%だが29 Imp.。次回データを待つ。
- 2x / Diamond / maintenance系LP: 主対象URLに十分なqueryデータがないため、勘でSEO変更しない。

## Issue #181で残る唯一の取得条件

現在のApps Script週次Archiveはローリング30日スナップショットを保存しており、非重複の「前28日」query×URL rawを保存していない。このため、Issue #181の以下1条件だけは未完了のままにする。

- 過去28日と、その直前28日の非重複比較

Search Console API / UIでこの比較を取得できる実行環境から確認した後に #181 をcloseする。

## AdSense / 収益比較の扱い

収益最適化では、`Revenue / Organic Landing Session`、`Revenue / Successful Calculation`、`Publisher impressions / session` を主要な比較軸とする。

2026-08-27は GA4 page views 42 に対して AdSense page views 630 と前後日から明確に外れている。現時点では原因未確定なので `ANOMALY_REVIEW` として扱い、集計から勝手に消したり、推定値へ置き換えたりしない。将来のレポートでは「含む / 除外」の両方を確認できる状態を保つ。

## 次回確認

**2026-09-25** を次回レビュー日とする。

理由:

- 9月上旬の変更から最低14日の観察期間を確保できる。
- 現在伸びている記事を短期間に再編集する過剰最適化を避けられる。
- その時点でSearch Consoleの確定データも追加される。

## 結論

2026-09-15時点では、今回の実測を理由に公開SEO文言を変更しない。GA4のAPI確認済み項目と、DebugView / 非重複前28日比較という未確認項目を明確に分離して運用を継続する。
