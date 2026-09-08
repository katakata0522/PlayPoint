# Test contract audit — 2026-09-08

PlayPoint のテスト全体を、**「本当に壊してはいけない契約を守るか」**という観点で再監査した記録。

目的はテストを弱くすることではない。正しい変更で落ちるテスト摩擦を減らし、実際の回帰だけをより明確に検出すること。

## 判断基準

### 1. 現在の事実は一つの owner だけが持つ

公開ページの編集日・公式確認日など、時間とともに正しく変わる値を feature test に複製しない。

- 良い: ページの `last-modified` と記事台帳 / JSON-LD / sitemap が同じ owner から導出され、一致することを検証する
- 悪い: ページ・設定・複数テストへ `2026-09-03` のような同じ live date をそれぞれ直書きする

日付そのものの整合は `article-date-contract` など専用 owner に任せ、検索意図や本文仕様のテストは本文仕様だけを持つ。

### 2. 合成 fixture の固定値は残す

固定値を一律に削除しない。境界条件を再現するための値は決定論的であるべき。

例:
- 14日超の鮮度判定を再現する過去日
- うるう年の 2/29
- 3回目で成功する retry fixture
- 並び順を検証するための架空の記事日付

これらは現在のサイト状態を固定しているのではなく、入力条件を固定している。

### 3. 過去の作業記録を永続 CI 契約にしない

監査時点の記事総数、wave 名、当時の優先度分類、当時の編集日などは履歴であり、現在仕様ではない。

- `102記事であること`
- `wave4 で observe 判定だったこと`
- `9/3 に編集したこと`

のようなスナップショットは docs には残せるが、通常の feature CI を失敗させる条件にはしない。

### 4. テストが別のテスト実装を監視しない

「テスト A のソースにこの regex / 関数名があること」をテスト B が検査する構造は作らない。

保証を共有したい場合は、共通 helper / production contract / 異なる層の integration・browser test へ寄せる。

### 5. generator の書き方より生成結果を守る

配列の宣言位置、private 関数名、正規表現で切り出せるソース形状ではなく、生成された公開結果を検証する。

例:
- game generator の `GAMES_DATA` の書式ではなく、全 locale に同じ game set が生成されること
- PAD の内部 preset 定義ではなく、公開ページに 980円プリセットが存在すること
- Service Worker の `const CACHE_NAME = ...` ではなく、実際に open / activate される cache の挙動

### 6. チューニング値は exact snapshot ではなく安全範囲を守る

retry 間隔や timeout など、運用上調整してよい値は exact value を契約にしない。

例:
- `2500ms でなければ失敗` ではなく、retry が存在し、timeout が正で、全 retry budget がジョブ予算を超えないこと

ただし外部 API / 法令 /料金 /ユーザー仕様として exact value 自体に意味がある場合は固定してよい。

### 7. HTML のバイト数・見出し数を品質の代理指標にしない

`html.length >= 7000` のような実装量は、CSS整理やマークアップ圧縮だけでも変わる。

本文の品質は、可能な限り以下の意味的なシグナルで検証する。

- 回答・説明文がある
- 一次情報へのリンクがある
- canonical / hreflang / author / structured data がある
- intent 固有の必要事実を含む
- 関連導線がある
- FAQ が表示されるなら構造化データと一致する

### 8. static guard は破壊境界に限定して残す

すべての source check が悪いわけではない。以下は静的 guard が妥当。

- deploy が秘密・運用ファイルを公開しない
- GitHub Actions の trigger / deploy mode / preflight が外れない
- Analytics / Consent の共通境界を迂回しない
- 手書き公開ページを generator が破壊的に上書きしない
- CSP / canonical / hreflang など成果物自体が契約

static guard を残す場合は、**なぜ runtime test だけでは守れない境界なのか**が説明できること。

## 今回の主な変更

- 国際 demand-content の rollout wave 4本を 1つの semantic owner に統合
- live `official-verified` 日付の重複固定を feature test から除去
- 9/3 時点 102記事という inventory snapshot を通常 CI から除去
- audit report の過去分類を CI 契約にしていたテストを除去
- game tests を generator source parsing から generated-output contract へ変更
- Service Worker の cache 名取得を source regex から実行時観測へ変更
- article / LP の更新日は exact literal ではなく owner / 公開 metadata との整合を検証
- 国際記事の raw HTML size threshold を semantic quality check へ変更
- deploy revision の retry defaults は exact tuning snapshot ではなく bounded-budget contract へ変更
- test source を別 test が監視していた meta-test を除去

## 今後のレビュー質問

新しいテストを追加するときは、次を順に確認する。

1. これはユーザー・公開成果物・セキュリティ・CI境界のどの契約を守るのか？
2. その値は将来変わってよい設定か、それ自体が仕様か？
3. 同じ事実を既に別 owner が持っていないか？
4. 実際にコードを動かして確認できないか？
5. 安全なリファクタリングでも落ちる書き方になっていないか？
6. 失敗したとき Product regression / Test brittleness / Generated artifact drift のどれかが分かるか？

この6問に答えられないテストは、追加前に contract を再定義する。
