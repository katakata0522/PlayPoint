# Google Playデジタルギフト記事：SEO・画像・公開受入チェック

対象Draft PR: https://github.com/katakata0522/PlayPoint/pull/622  
最終更新: 2026-10-23

## 実装済み

- [x] 新記事HTML: `articles/2026-10-23-google-play-digital-gift-campaign.html`（PR上のみ）
- [x] タイトル・description・canonicalを対象キャンペーンの検索意図に最適化
- [x] H1/H2：対象・11/30締切・金額別特典・応募方法・Play Pointsの違い・注意事項
- [x] 目次、各見出しのアンカー、FAQと一次資料へのリンク
- [x] Article / BreadcrumbList JSON-LD、SNS用画像メタ、Google公式との非提携を明示する既存サイト表示を継承
- [x] 常設の記事 `2026-06-20-discount-gift-cards.html` から新記事に文脈に沿った内部リンクを追加
- [x] 専用OGP 1200×630 JPEG実体と、正方形WebP 256×256を会話の成果物として生成・目視確認

## 画像の正式配置（GitHubには未反映）

1. `articles/ogp/2026-10-23-google-play-digital-gift-campaign.png`
   - バイナリのマジックナンバーはJPEG、画像サイズ1200×630、1200px幅。
   - 記事に専用のog:image、og:image:alt、og:image:type=image/jpeg、twitter:image。
2. `articles/thumbnails/2026-10-23-google-play-digital-gift-campaign-square-v1.webp`
   - 256×256、WebP、記事一覧と関連記事カード用。
3. 上記2点は会話でZIPにまとめて生成済み。GitHub連携のテキスト書き込み機能からバイナリを格納できていないので、**このPRは画像未配置・マージ不可**。

## 未完了（公開ゲート）

- [ ] キャンペーン主催者ページ/規約/FAQ（vdpro.jp）の再取得と、特典額・応募対象13種類・注文番号・期限を直接照合
- [ ] 「100〜1,999円で100円分」と「最大10％」の矛盾を確認。正確な内容が分かるまでは少額の高率還元を推奨しない
- [ ] 画像バイナリ2点を上記の正式パスへ配置し、OGP MIME契約・サムネイル寸法と個別一意性をチェック
- [ ] 記事台帳 `blog/articles.json` と画像ロール `scripts/article-image-assets.json` へ追加（公開に向けた切替時）
- [ ] 共通生成処理でブログ一覧、検索索引、feed、サイトマップ、パンくず、関連記事と日付を同期
- [ ] PR Gate、OGP / SEO監査、320px/390px・PC実ブラウザで表、画像、見出し、リンクを検証
- [ ] 公開前に社外応募リンクに不適切な属性や個人情報収集がないか点検
- [ ] 期限後の「開催中」の表記を終了案内に置換する運用を決める
- [ ] 全チェック後にマージ、本番のHTTP/OGP/canonical/記事一覧からの流入を確認

## 編集意図

- 常設記事：複数の購入先・還元を比較して判断する（恒久的な検索意図）。
- 本記事：2026年10月23日開始、11月30日終了のキャンペーン条件・応募方法にすばやく答える（時限的な検索意図）。
- Google Play Pointsと特典コードの混同を避ける。イベント専用記事へ無関係なゲームランキング・計算機CTAを増やさない。
- Googleの一般購入機能は公式ヘルプを根拠にする。今回のキャンペーンに自動的に適用されると推定しない。
