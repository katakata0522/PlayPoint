# 挙動を保つ段階的リファクタリング

## 不変条件

計算機は計算と短い要点に集中し、詳細解説は記事側へ配置する。内部整理と、記事本文・公式用語・価格・URL・広告配置・計算結果の変更を同じPRに混ぜない。日記・保存記事・閲覧履歴のstorage key/データ形式とService Workerの契約を保つ。

「コードを戻せる」と「本番を即座に戻せる」は別。現在のXserver公開はrsyncの差分再配信で、原子的なリリース切替や自動rollbackはまだない。未知のサーバー設定・秘密情報・公開範囲は変更しない。

## build内部変更の独立した比較

`refactor/build-`で始まるPRでは、通常のPR Gate内で変更前のbase SHAと候補commitを別々の一時ディレクトリへ展開し、同じコンテンツ日付・キャッシュ版でbuildする。新旧公開ファイルの集合とSHA-256を比較し、候補を再buildしたときの差分も検査する。HTMLだけでなくCSS/JS/画像/sitemap/設定を既存public-impact境界で保守的に列挙する。公開出力の差分を無視するallowlistは置かない。

これは現HEADの生成物再現性検査を置き換えない。前者は「旧版と同じか」、後者は「コミットと生成結果が同じか」を別々に保証する。既存の事実回帰・意味・ブラウザ検証も残す。正本データからテストの期待値まで自動導出して、誤りを同時に正当化しない。

CLI例:

```sh
node scripts/verify-refactor-output.cjs --base <確認済みの40桁SHA> --evidence-dir <リポジトリ外の保存先>
```

元の作業ツリー・未コミット作業は変更しない。Git管理下の入力アーカイブ、実行ログ、新旧公開ファイルmanifest、固定した環境と比較結果を通常のPR証跡へ7日間保存する。入力アーカイブは再現用であり、圧縮済みの本番リリースや利用者データのバックアップと呼ばない。秘密情報はGitへコミットしない。

主担当: `tests/refactor-output-equivalence.test.cjs`。内部名称や関数の並びではなく、実際の変更・削除・追加・非冪等出力の検出と作業ツリー保護を検証する。

## 段階と終了条件

1. 新旧比較を実際の現行buildで通し、基準SHAを記録する。
2. 生成の副作用・複数writerを機能単位で整理する。Waveの名称変更だけや巨大な独自runnerを目的にしない。
3. 事実データ/描画処理の分離は、旧版の出力・独立した事実テストとの一致を確認してから進める。言語と市場を同一視しない。未確認の地域価格を自動補完しない。
4. runtime/CSSの変更は別の復旧単位とし、対象の挙動・画面・既存storageとの互換を確認する。実ファイルが変わるため、build内部変更のバイト一致契約とは分ける。
5. 旧実装の呼び出し元がなくなり、同等以上の出力/挙動検査が成立してから旧層を削除する。

## 復旧

各PRにbase SHAと検証結果を残し、現HEADのPR Gate成功後にマージする。問題が起きた場合は対象squash commitのrevertを新しい作業ブランチで作成し、PR Gate・公開影響・配信後revisionを再確認する。mainのreset/force pushは使わない。内部build変更で公開物差分がなければ、直前の検証済み本番配信はそのまま維持される。

runtimeを将来変更する場合、サーバー側の復元だけでPWAキャッシュやユーザーの保存データまで即時復旧できるとは扱わない。破壊的storage移行を避け、新旧コードの読み書き互換とキャッシュ更新を別途検証する。

## 判断の根拠

- https://martinfowler.com/books/refactoring.html : 挙動を保つ小さな変換を積み重ねる。
- https://reproducible-builds.org/docs/definition/ : 入力・環境を固定し、成果物をバイト比較する。
- https://sre.google/workbook/canarying-releases/ : 再現可能な成果物と、小さく独立した公開・復旧単位を重視する。

## 2026-09-14: 記事生成I/Oと工程境界の整理

- 記事の本文変換・検索レコード作成を `prepareDiscoveryArticle` としてI/Oから分離。公開時の本文・アンカー・ロケール固有表現は維持する。
- 検索/保存機能の同期は記事HTMLを2回読み直さず、1回読んで最終結果だけ書く。共有する3アセットも工程内で一度だけ読む。
- 公開アセットの内容ハッシュは1回の同期内だけ再利用する。プロセス全体の恒久キャッシュにせず、圧縮や編集の後の実行では必ず再計算する。
- ゲームSEOの安全補正は3種類の説明を順番を保って1走査で処理し、保存直前の同じファイルの読み直しも省く。公式確認済みの文字列・価格・fail-closed条件は変更しない。
- 地域別レート補正から日本語記事ハブ登録を切り離し、`build-html.js` の正式な引き渡し工程へ移す。地域の補正を単独で試すために全記事環境を用意する必要はない。
- `prepare-pr` の2回目の関連記事正規化は削除。正式build内の同処理と公開前のcheck-only監査は維持する。

担当テスト: `tests/build-io-boundaries.test.cjs` は実ファイルのI/O回数・次の実行でのキャッシュ更新・副作用の範囲・純粋変換を検証する。工程の接続順は既存の `tests/build-pipeline-simplification.test.cjs`、全体の公開バイト一致と再build差分は `verify-refactor-output.cjs` で確認する。

### 実測と限界

同じ基準ツリー（`5898b2fa8360ec6dd205f5d721982049f266998c`）の公開物を使い、各工程の `fs.readFileSync` を計測した結果:

| 工程内の処理 | 変更前 | 変更後 |
| --- | ---: | ---: |
| 記事検索/保存同期のHTML読み込み | 458 | 231 |
| 同工程のCSS/JS読み込み・ハッシュ計算 | 693 | 3 |
| 公開アセット同期のCSS/JS読み込み・ハッシュ計算 | 2,970 | 52 |

記事の検索・一覧対象は227記事＋4ハブ。全公開物や確認日監査の件数とは異なる。これは処理回数の比較であり、サイト表示速度や売上の改善率を表すものではない。単発実行時間はOSキャッシュの影響があるため成果の保証値にしない。

単独同期時の既存の改行増加については、今回の厳密な旧公開出力一致と分けて扱う。改行整理を混ぜると公開HTMLに差分が出たため、このPRでは見送った。完全buildの繰り返しは差分ゼロを維持し、検証のallowlist追加や既存テストの除去で通さない。

### 今回拡大しない範囲

既存の `CALC_PURE` / `DIARY_PURE`、購入単位の丸めテストは存在する。ファイルサイズだけを根拠に計算ロジックやstorageを再編しない。Wave群のゲーム事実データの統合、全ロケール台帳の全面移行、生成器そのものの全面置換は、今回のI/Oと所有権改善とは別の作業。静的/PWA配信を重いフレームワークへ置換しない。

## Runtime refactoring without changing the user experience

Use `refactor/runtime-` for structural browser changes that intentionally change
JavaScript bytes or Service Worker cache revisions. This is not an exemption from
behavior checks and does not relax the `refactor/build-` byte-equivalence gate.

- `js/region-rules.js` owns calculation-only country rules. Derive compatible maps
  for the existing runtime and relevant game generators; keep UI wording separate.
  A data relocation is not an official-information re-verification.
- `js/calculator-core.js` owns pure arithmetic/calendar functions;
  `js/calculator-result-view.js` returns result HTML. `calculator.js` keeps input
  validation, DOM application, sharing and analytics order, and its existing API.
- Game generators share required-edit failure behavior and common guide shells.
  Game-specific verification policy, unverified-price handling, and distinct
  listing/search descriptions remain explicit. Do not merge unrelated facts just
  because they were originally implemented in the same numbered wave.
- Existing discovery asset/diary blocks are updated in place. Repeated standalone
  synchronization must not introduce whitespace churn or write unchanged files.
- Every new runtime dependency must participate in the app-module fingerprint and
  Service Worker precache, not merely exist in the repository.

The runtime PR browser job extracts the actual base SHA without credentials and
runs `refactor-runtime-compatibility.cjs` and `refactor-visual-smoke.cjs`. The first
compares full regional configs, storage constants, returned HTML, numeric datasets
and analytics call order on normal dates, December 31 and February 29. Its browser
services are adapters: it does not claim to prove real ESM or browser execution.
The existing Chromium gate remains required. The second compares 46 screenshots
(6 regions x 2 widths x main/reverse/diary, plus 5 articles x 2 widths), without
masking app content, and tests an old-to-new PWA cache upgrade with existing diary
data. Both sides use the same Chromium/fonts/timezone/date. External advertising
and analytics scripts are replaced in this local comparison only; real ad delivery
or revenue is not certified by screenshot equality. Evidence is stored with the
existing 7-day browser artifact. Missing, failed or incomplete checks are failures.

Recovery is a normal reviewed revert and deployment through the existing gate;
do not rewrite main, change storage keys, disable checks, or promise instant
rollback of already-open browser sessions. Keep source rollback and user-data
recovery distinct.
