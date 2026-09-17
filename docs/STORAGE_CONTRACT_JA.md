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

通常操作で自動的に書き換わり得る、PlayPoint管理下の4つの永続JSON領域を非破壊化します。

- `hokuhokuDiaryData`
- `playpointLastMainCalculationV1`
- `playpoint_reading_library_v1`
- `katakata_blog_settings`

計算機・日記の2領域は `js/language-suggestion.js`、あとで読む・閲覧履歴とブログ設定は `js/reading-library.js` の保存ガードが担当します。

記事保存の旧データに重複や旧URL表記などが含まれていても、表示時の既存正規化は維持します。ただし、その正規化結果を初めて保存する直前に、元のraw値を `playpointReadingLibraryRecoveryV1` へ退避します。

ブログ設定が壊れたJSON、不正schema、将来versionだった場合は、現行UIには既定値として見せます。テーマや並び順を次に正常保存する際、元のraw値を `katakataBlogSettingsRecoveryV1` へ退避してから置換します。異なるrecoveryが既に存在する場合は自動上書きせず、新しい書き込みを拒否します。

ページ読み込みだけで元データを移行・削除することはありません。UI、計算式、正常な保存形式、Analytics送信内容は変更しません。
