# OGP画像およびメタタグ標準運用方針

## 1. 標準規格
- **画像寸法**: 1200 × 630 px（アスペクト比 1.91:1）
- **Discover 最適化**: Google Discover 推奨規格である「幅 1200px 以上」「大画像表示要件」に完全準拠する。
- **配置ディレクトリ**:
  - 記事専用 OGP: `articles/ogp/<記事スラッグまたは日付-スラッグ>.png`
  - サイト共通 OGP: `ogp.png`（ルート直下）

## 2. 記事ごとの一意性（重複の禁止）
- 各記事は必ず**個別の専用 OGP 画像**を持ち、記事内容を表すビジュアル・タイトル・要点を配置する。
- サイト共通の `ogp.png` や汎用画像（`campaign.png` 等）を複数記事で使い回す重複を禁止する。

## 3. MIME Type 配信契約（重要）
- `articles/ogp/` 内の画像ファイルは、拡張子が `.png` であっても実体は **JPEG バイナリ**（マジックナンバー `0xFF 0xD8 0xFF`）とする。
- これは Apache の `.htaccess` 設定（`<FilesMatch "\.png$"> ForceType image/jpeg </FilesMatch>`）および既存の配信契約（`tests/ogp-mime-contract.test.cjs`）に準拠するためである。
- ルート直下の `ogp.png` は PNG 実体（MIME: `image/png`）とする。

## 4. 必須 HTML メタタグ要件
全記事ページおよび共通ページの `<head>` 内には以下のタグを完備すること:
```html
<meta property="og:image" content="https://playpoint-sim.com/articles/ogp/<filename>.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="<記事タイトルまたは具体的説明> OGP画像">
<meta property="og:image:type" content="image/jpeg"> <!-- 記事OGPの場合 -->
<meta property="og:locale" content="ja_JP">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://playpoint-sim.com/articles/ogp/<filename>.png">
```

## 5. 自動監査と品質ガード
- `scripts/seo-head-audit.cjs`: 全ページの OGP メタタグの完全性、画像ファイルのローカル存在、実画像寸法（1200×630）を静的監査する。
- `tests/ogp-standardization.test.cjs`: CI 自動テストで全記事の一意性、寸法、MIME型契約を検証する。
