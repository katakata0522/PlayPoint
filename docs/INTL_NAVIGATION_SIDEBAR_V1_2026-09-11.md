# International Navigation / Sidebar Design System 1.0

Date: 2026-09-11

## Purpose

EN / KO / TW の記事シェルを、装飾の追加ではなく **読む → 現在地を理解する → 信頼する → 次の行動へ進む** ための情報設計として再構成する。

本文や検索意図を一括改稿する施策ではない。既存の Article Design System 2.0、Article Role、関連記事選定を保持したまま、ヘッダー・パンくず・右サイドバー・運営者導線の役割を明確にする。

## External design evidence

### Google Search Central — Helpful content / Who

https://developers.google.com/search/docs/fundamentals/creating-helpful-content

- コンテンツを誰が作ったかが読者に明確であること。
- 著者情報が期待されるページでは、著者ページなど背景情報へ辿れること。
- 信頼は品質評価の重要な中心要素。

PlayPointでは既存の locale 別 `author/katakata.html` と `ProfilePage / Person` 構造化データを捨てず、各記事から人間に見えるプロフィール導線へ昇格させる。

### U.S. Web Design System — Header / Navigation

https://designsystem.digital.gov/components/header/

- ナビゲーションは組織構造ではなく利用者需要で並べる。
- リンクは優先度順に置く。
- 現在のセクションを明確に強調する。
- キーボード利用者向けに main content への skip link を設ける。

PlayPointでは `Calculator / Guides / Troubleshooting / Earn & spend / Levels / Account` の task-first order を採用する。

### Nielsen Norman Group — Related Content Boosts Pageviews

https://www.nngroup.com/articles/related-content/

- 読者は本文と文脈的に近い関連記事へ進む。
- 記事末や関連領域に次のコンテンツを提示することは回遊に有効。
- 右レールが広告・販促のように見えると無視されやすい。

PlayPointでは汎用的な「Before you buy」「Quick rule」等を常設するより、`Popular / Contextual related / Operator / Browse` に整理する。

### Baymard — Navigation clarity / Current scope

https://baymard.com/blog/main-navigation

- ナビゲーションは現在地と主要な行き先を理解できる必要がある。
- 現在のスコープは視覚的に区別する。
- 現在ページへ戻るだけの自己リンクは避ける。

PlayPointでは active nav、カテゴリ付き breadcrumb、人気記事ランキング内の current page 非リンク表示を採用する。

## PlayPoint demand evidence

Popular Guides はリアルタイムランキングのように見せない。

SSOT: `scripts/intl-popular-guides.cjs`

Source: `docs/INTL_CONTENT_AUDIT_2026-09-03.md`

- GA4 landing/page window: 2026-08-04〜2026-09-02
- 7日間では小規模サイトで順位が振れやすいため、約30日窓のセッション実績を採用。
- UIにはセッション数を出さず、`Recent readership snapshot` 相当の説明だけを表示。
- 分析スナップショットを更新した時だけ順位SSOTも更新する。

### EN Top 5

1. Google Play Quests
2. Cash conversion
3. Country differences
4. Points not showing
5. Levels

### KO Top 5

1. Cash conversion
2. Expiration
3. Super Weekly Reward
4. Levels
5. Use coupons

### TW Top 5

1. Coupon not applied
2. Platinum / Diamond cost
3. Levels
4. Weekly Reward
5. Quests

## Header contract

### Top row

- Site identity / Calculator home
- `About Katakata`
- native `<details>` Play Country switcher
  - Japan
  - United States
  - Korea
  - Taiwan

地域切替は「Language」ではなく **Play country** として表現する。PlayPointのルールは表示言語より Play country / account の条件に依存するため。

### Global navigation

1. Calculator
2. Guides
3. Troubleshooting
4. Earn & spend
5. Levels & rewards
6. Account & basics

既存の上段 `Guides` と下段 `Guides` の重複を解消し、上段は identity / operator / region に集中させる。

### Breadcrumb

Article:

`Calculator > Guides > Category > Current article`

Hub:

`Calculator > Guides`

Operator page:

`Calculator > About Katakata`

## Sidebar contract

Desktop order:

1. Article Role aware next step
2. Popular Guides 1–5
3. Contextual Related Guides x3
4. Katakata mini profile
5. Browse Guides

Operator profile page itselfは 4 を表示しない。自己紹介ページで自己紹介カードを重複させない。

### Article Role mapping

| Role | Sidebar primary job |
| --- | --- |
| `calculator_bridge` | 個別条件の計算へ進める |
| `decision_support` | 比較・判断クラスターへ進める |
| `troubleshooting` | 問題解決クラスターへ進める |
| `retention` | 更新性の高いガイドへ戻る理由を作る |
| `game_decision` | ゲーム課金を計算へ接続する |
| `reference` | 文脈関連記事へ進める |
| `hold` | 検証済み公開ガイドへ戻す |

Role SSOT は `scripts/article-role-registry.cjs` をそのまま利用し、サイドバー専用の別分類は作らない。

## Operator trust design

Mini profile:

- Katakata
- PlayPoint operator / editor
- Google first-party sourcesを優先する検証方針を1文で説明
- locale 別 operator profile
- KatakataLab profile

詳細な経歴や方針は既存の `/{locale}/author/katakata.html` を正本とする。記事サイドバーに長い自己紹介を複製しない。

記事末の既存 author box にも `About Katakata / KatakataLab` の明示リンクを追加する。

## Visual rules

- 右レールの見出しを全面濃色帯にしすぎず、白背景＋細い境界線を基本にする。
- Primary next-stepだけ上辺アクセントで役割を示す。
- Popular ranking は `01–05` の番号を主な視覚記号にする。
- 不要なグラデーション・バッジ・カードの多重化を避ける。
- PopularとRelatedを分離し、「需要」と「文脈」を混同しない。
- KatakataLabは外部流出を主目的にせず、運営者理解の補助リンクとしてプロフィール内に置く。

## Mobile rules

Right sidebar を記事本文より上へ無理に移動しない。

- <= 860px: sidebar widgets を2列
- <= 700px: 1列
- primary article CTA は本文側の Article Design System を優先
- header toolは狭幅で折り返し、Play country switcher はネイティブ操作を維持

## Accessibility

- Skip to main content
- `main#main-content`
- native `<details>/<summary>` region switcher
- `aria-current` for current Play country
- active navigation
- current Popular item is text + `Reading now`, not a self-link
- keyboard focus stateを hover と同等に用意

## Out of scope for v1

### Site search

161記事あるため将来的な価値は高いが、検索インデックス・ランキング・0件UIまで別設計になる。Navigation / Sidebar v1に混ぜない。

### Real-time Popular API

サーバー/APIを増やしてまでリアルタイム化しない。PlayPointの現在規模では分析スナップショット更新の方が保守性と正確性のバランスが良い。

### “Was this helpful?”

将来の品質シグナル候補。ただしイベント定義・重複・同意・改善判断ルールまで決めてから実装する。UIだけ先に置かない。

## Regression contract

Tests must ensure:

- EN / KO / TW all use the task-first shell.
- Popular Top 5 targets exist and stay inside their locale.
- Current popular article is never linked to itself.
- Contextual related links remain unique, existing, same-locale, and current-page-free.
- Role-aware next action differs for reference / troubleshooting / calculator bridge.
- Author pages do not repeat the mini author card.
- Article bottom author box links to local profile and KatakataLab.
- Old generic sidebar blocks do not remain in the final generated HTML.
