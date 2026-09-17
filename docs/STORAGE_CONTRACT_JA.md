# ブラウザ保存データ契約

この文書は `docs/STORAGE_CONTRACT.md` の日本語運用要約です。正本のキー一覧・schema・retention・Analytics境界は英語版を参照します。

## 原則

- 読み込み失敗と、正常な空データを同じ状態として扱わない。
- JSON破損、不正schema、将来versionを、空データで黙って上書きしない。
- 現行schemaの値を書き込む前に、既存raw値をversion付きrecovery envelopeへそのまま退避する。
- 別のraw値を含むrecoveryが既にある場合は、そのrecoveryを上書きせず新しい書き込みを止める。
- 金額、必要ポイント、日記内容、保存記事名、storage dumpをAnalyticsへ送らない。
- sessionStorageの一時マーカーとService Worker Cache Storageは、利用者バックアップ対象と混同しない。

## 第1段階の実装範囲

通常計算・日記利用中に自動で書き換わり得る次の2キーを先に保護します。

- `hokuhokuDiaryData`
- `playpointLastMainCalculationV1`

`playpoint_reading_library_v1` と `katakata_blog_settings` は棚卸し済みですが、記事runtimeの大きな差分を同じPRへ混ぜないため、次の小分けPRで同じ非破壊契約を適用します。
