# PlayPoint Article Design System 2.0 — 2026-09-11

## 目的

SEOの文章量を増やすのではなく、検索流入した読者が「答え → 条件 → 次の行動」を短時間で拾える記事体験へ統一する。既存のCocoon風設計の良い部分は残し、歴史的に積み重なった重複カードと過剰な視覚重量を整理する。

## 継承するもの

- site header / global nav / breadcrumbs
- 2カラム + モバイル1カラム
- Hero、カテゴリー色、FAQ、著者情報
- 横スクロール可能な比較表
- callout / knowledge boundary
- Article Roleによる主導線の分離

## 復活・進化するもの

- 蛍光マーカー: marker-yellow / marker-blue / marker-red を共通契約として維持し、legacy introや直接回答の編集上重要なstrongにも限定適用する。
- 要点表示: answer-box を最も強い回答面、summary-box を小型の走査面へ整理する。
- 関連記事: Next Jobへのカード型ナビゲーションとして表示する。

## 整理するもの

旧記事では Answer Box → Intro → Summary Box が連続し、本文に入る前に大きな箱が3つ積まれる場合がある。本文や検索回答は削除せず、CSSの視覚階層だけを次のように変える。

1. Answer Box = 主回答
2. Intro = 補助説明（大きな背景カードを廃止）
3. Summary = コンパクトな「分かること」一覧
4. 本文H2 = 濃い全面帯ではなく、アクセント左線 + 淡い背景

## 強調ルール

蛍光マーカーは「重要だから太字」の代替ではない。1画面に何本も出さず、結論の数値・条件、誤解しやすい分岐、比較時に判断を変える条件へ限定する。警告は赤マーカーではなくwarning callout、補足はblue/info calloutを優先する。

## Article Roleとの接続

- calculator_bridge: 計算CTAが主行動。本文の比較・数値を読みやすくする。
- decision_support: 比較表と判断条件、関連記事Next Jobを優先。
- troubleshooting: 直接回答 → 切り分け → 公式確認/次の手順の順番を視覚的に守る。
- retention: 更新理由・今見るべき場所・次回戻る理由を見つけやすくする。
- game_decision: ゲーム固有の購入候補と計算を分けて見せる。
- reference: 直接回答と参照先を主役にし、計算CTAへ無理に寄せない。
- hold: 公開促進のデザイン最適化対象にしない。

## アクセシビリティ / モバイル

- JSなしでも見た目の階層が成立する。
- モバイル横overflowは1px以下を既存Browser smokeで維持する。
- 関連記事カードはモバイル1列。
- :focus-visible を明示する。
- prefers-reduced-motion を尊重する。
- 色だけに意味を依存しない。

## 旧資産の扱い

scripts/validate_articles.py は49記事時代・全記事計算CTA必須・ローカルWindows絶対パスという旧契約のため廃止する。現行の品質保証は、Article Role監査、Design System監査、Node回帰テスト、Chromium smokeを正本とする。

## 変更境界

この導入ではtitle / meta description / H1 / 記事本文の検索回答を意図的に書き換えない。変更するのは共通CSS、品質契約、検証コード、CSS content-hash参照である。

## 検証の境界

記事数は現行コーパスから取得し、固定件数や旧レイアウトの存続を要求しない。代表4記事を1280・390・320pxで、JavaScript無効・動きを減らす設定・キーボードフォーカス・関連記事の操作可能性まで検証する。日本語フォントを備えた環境で成功時も画像と計測結果を保存する。

本文セクションのcontent-visibility最適化は維持するが、関連記事ナビゲーションは仮高さを使わず常時描画する。狭い画面でスクロール直後のリンク位置とヒット領域がずれる問題を防ぐためであり、強制クリックで検証を通さない。
