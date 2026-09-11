# 記事の読みやすさ・内容レビュー（2026-09-12）

ユーザー指定: サブエージェント不使用。広告の位置・設定・広告枠は今回の対象外。既存のArticle Design System 2.0を土台に、本文の編集も明示的に許可された変更。

## 編集判断

- 「この記事で分からないこと」を定型の二列カードで先回りさせない。必要な制約は、読者の判断に関係する場所で理由と一緒に説明する。
- 表は同じ軸で選択肢を比べる用途に残す。単なる二種類の情報の並列表示は文章へ戻す。
- マーカーは判断が変わる条件へ限定。全strongや全段落を一括装飾しない。
- 厚みは、理由・条件・具体例・次の手順で作る。文字数の下限や定型文追加で水増ししない。
- 日本語・英語・韓国語・繁体字に同じ編集基準を使う。通貨・地域のルールを日本の数字へ置換しない。

## 今回の範囲と限界

公開対象は159記事（日本語57、英語・韓国語・繁体字各34）。全体の導入・見出し構造を確認し、問題箇所を選んで編集した。全文の最新事実確認や全外国語のネイティブ校閲が完了したという意味ではない。

日本語38記事のknowledge-boundary二列ブロックを、固有の見出しと文章へ変更。ゲーム3記事は本文を精読して根拠のない一人称体験、断定的なお得表現、現在の販売条件と誤認させる記述を整理。仮定の例には仮定と明記。海外11記事は回答と条件・例を個別に補強。別途、旧日本語記事1件でタイトルより先に出る計算CTAを修正した。

特にパズドラの月額・自動更新・特典受け取りは公式のパスページとFAQを確認した。
- https://pad.gungho.jp/member/pdpass/
- https://pad.gungho.jp/member/pdpass/faq.html

編集日は更新するが、全文の公式情報を再検証していない記事の「公式情報確認日」は進めない。ほくほくリワード日記は保持。非掲載2記事は公開促進の対象にしない。

## 再生成と検証

- 生成される日本語4記事はarticle-editorial-structure.cjsの正本も変更。
- 個別編集する韓国語・繁体字6記事は、既存manual-intl-articles.cjsの手動管理に移行して上書きを防ぐ。
- 共通CSSのハッシュ更新に伴う他ページ差分は参照同期。本文改訂を意味しない。
- 全159記事の広告ins要素を作業開始時HEADと比較し、変更なし。
- ARTICLE_REVIEW_ALL=1で全記事を1280/390/320pxで順次確認可能。通常CIの代表4記事の厳密なデザイン契約は維持。
- 全件ブラウザ検証はJS無効・外部配信無効の本文表示テスト。広告配信と実トラフィックの効果は評価しない。
- 実行結果はPR本文に記録する。ローカルスクリーンショットをリポジトリへコミットしない。

## 記事別の確認・編集範囲

以下は確認の深さを区別した台帳。維持した記事まで全文書き直したとは扱わない。

| 記事 | 確認・編集範囲 |
|---|---|
| `articles/2026-08-25-pad-puzzle-and-dragons-play-points.html` | 本文を精読・再編集。比較条件と仮の計算例、メタ情報を整合 |
| `articles/2026-08-25-dokkan-battle-dragon-ball-play-points.html` | 本文を精読・再編集。比較条件と仮の計算例、メタ情報を整合 |
| `articles/2026-08-24-umamusume-half-anniversary-points.html` | 本文を精読・再編集。比較条件と仮の計算例、メタ情報を整合 |
| `articles/2026-08-19-play-points-locked.html` | 条件説明を記事固有の見出しと文章へ整理 |
| `articles/2026-08-19-install-offer-points-not-received.html` | 条件説明を記事固有の見出しと文章へ整理 |
| `articles/2026-08-19-redeemed-item-not-received.html` | 条件説明を記事固有の見出しと文章へ整理 |
| `articles/2026-08-19-web-store-external-billing-points.html` | 条件説明を記事固有の見出しと文章へ整理 |
| `articles/2026-08-19-play-points-google-store.html` | 条件説明を記事固有の見出しと文章へ整理 |
| `articles/2026-08-16-play-pass-worth-it.html` | 条件説明を記事固有の見出しと文章へ整理 |
| `articles/2026-08-16-pc-play-games-points.html` | 条件説明を記事固有の見出しと文章へ整理 |
| `articles/2026-08-16-fastest-gold.html` | 条件説明を記事固有の見出しと文章へ整理 |
| `articles/2026-08-16-fastest-platinum.html` | 条件説明を記事固有の見出しと文章へ整理 |
| `articles/2026-08-16-gold-platinum-worth-it.html` | 条件説明を記事固有の見出しと文章へ整理 |
| `articles/2026-08-16-premium-support.html` | 条件説明を記事固有の見出しと文章へ整理 |
| `articles/2026-08-16-payment-methods-points.html` | 条件説明を記事固有の見出しと文章へ整理 |
| `articles/2026-08-16-points-disappeared.html` | 条件説明を記事固有の見出しと文章へ整理 |
| `articles/2026-08-16-family-link-play-points.html` | 条件説明を記事固有の見出しと文章へ整理 |
| `articles/2026-08-16-play-points-day.html` | 条件説明を記事固有の見出しと文章へ整理 |
| `articles/2026-08-16-youtube-premium-play-points.html` | 条件説明を記事固有の見出しと文章へ整理 |
| `articles/2026-08-16-pixel-discount-coupon.html` | 条件説明を記事固有の見出しと文章へ整理 |
| `articles/2026-08-16-weekly-reward-not-showing.html` | 条件説明を記事固有の見出しと文章へ整理 |
| `articles/2026-08-16-january-rank-reset.html` | 条件説明を記事固有の見出しと文章へ整理 |
| `articles/2026-08-05-play-points-levels-guide.html` | 導入・見出し構造を確認。本文は維持 |
| `articles/2026-08-05-play-points-cannot-join.html` | 導入・見出し構造を確認。本文は維持 |
| `articles/2026-08-05-play-country-change-points.html` | 導入・見出し構造を確認。本文は維持 |
| `articles/2026-08-05-play-points-multiplier-stacking.html` | 導入・見出し構造を確認。本文は維持 |
| `articles/2026-08-05-fastest-silver.html` | 導入・見出し構造を確認。本文は維持 |
| `articles/2026-08-03-play-points-device-change.html` | 条件説明を記事固有の見出しと文章へ整理 |
| `articles/2026-07-31-super-weekly-reward.html` | 条件説明を記事固有の見出しと文章へ整理 |
| `articles/2026-07-31-google-play-quests.html` | 条件説明を記事固有の見出しと文章へ整理 |
| `articles/2026-07-25-play-points-coupon-not-applied.html` | 条件説明を記事固有の見出しと文章へ整理 |
| `articles/2026-07-25-play-credit-not-working.html` | 条件説明を記事固有の見出しと文章へ整理 |
| `articles/2026-07-24-play-points-cash-conversion.html` | 条件説明を記事固有の見出しと文章へ整理 |
| `articles/2026-07-24-play-points-1-value.html` | 条件説明を記事固有の見出しと文章へ整理 |
| `articles/2026-07-24-play-points-500-1000-value.html` | 条件説明を記事固有の見出しと文章へ整理 |
| `articles/2026-07-24-earn-play-points-free.html` | 条件説明を記事固有の見出しと文章へ整理 |
| `articles/2026-07-24-play-points-100-value.html` | 条件説明を記事固有の見出しと文章へ整理 |
| `articles/2026-06-20-discount-gift-cards.html` | 導入・見出し構造を確認。本文は維持 |
| `articles/2026-03-10-play-points-reflection-timing.html` | 条件説明を記事固有の見出しと文章へ整理 |
| `articles/2025-12-25-multiple-accounts.html` | 導入・見出し構造を確認。本文は維持 |
| `articles/2025-12-25-play-games.html` | 条件説明を記事固有の見出しと文章へ整理 |
| `articles/2025-12-25-movies-books.html` | 条件説明を記事固有の見出しと文章へ整理 |
| `articles/2025-12-25-expiration.html` | 導入・見出し構造を確認。本文は維持 |
| `articles/2025-12-25-promo-code.html` | 導入・見出し構造を確認。本文は維持 |
| `articles/2025-12-25-check-balance.html` | 導入・見出し構造を確認。本文は維持 |
| `articles/2025-12-25-refund.html` | 導入・見出し構造を確認。本文は維持 |
| `articles/2025-12-25-gift-card.html` | 導入・見出し構造を確認。本文は維持 |
| `articles/2025-12-25-family-sharing.html` | 導入・見出し構造を確認。本文は維持 |
| `articles/2025-12-25-subscription.html` | 条件説明を記事固有の見出しと文章へ整理 |
| `articles/2025-12-25-weekly-reward.html` | 導入・見出し構造を確認。本文は維持 |
| `articles/2025-12-25-getting-started.html` | 導入・見出し構造を確認。本文は維持 |
| `articles/2025-12-25-new-year-campaign.html` | 導入・見出し構造を確認。本文は維持 |
| `articles/2025-12-25-diamond-vip.html` | 導入・見出し構造を確認。本文は維持 |
| `articles/2025-12-25-campaign.html` | 条件説明を記事固有の見出しと文章へ整理 |
| `articles/2025-12-25-best-use.html` | 導入・見出し構造を確認。本文は維持 |
| `articles/2025-12-25-diamond-worth-it.html` | 導入・見出し構造を確認。本文は維持。旧div導入のCTA配置修正 |
| `articles/2025-12-25-playpoints-rank-maintenance.html` | 条件説明を記事固有の見出しと文章へ整理 |
| `en/articles/2026-06-20-discount-gift-cards.html` | 導入・見出し構造を確認。本文は維持 |
| `en/articles/google-play-balance-combine-payment.html` | 導入・見出し構造を確認。本文は維持 |
| `en/articles/google-play-games-vs-play-points.html` | 導入・見出し構造を確認。本文は維持 |
| `en/articles/google-play-points-100-value.html` | 本文確認。直接回答・誤解を防ぐ条件・マーカーを改訂 |
| `en/articles/google-play-points-500-1000-cost.html` | 導入・見出し構造を確認。本文は維持 |
| `en/articles/google-play-points-apps-books-purchases.html` | 導入・見出し構造を確認。本文は維持 |
| `en/articles/google-play-points-balance-history-progress.html` | 導入・見出し構造を確認。本文は維持 |
| `en/articles/google-play-points-cash-conversion.html` | 導入・見出し構造を確認。本文は維持 |
| `en/articles/google-play-points-country-change.html` | 導入・見出し構造を確認。本文は維持 |
| `en/articles/google-play-points-country-differences.html` | 導入・見出し構造を確認。本文は維持 |
| `en/articles/google-play-points-coupon-not-applied.html` | 導入・見出し構造を確認。本文は維持 |
| `en/articles/google-play-points-device-change.html` | 導入・見出し構造を確認。本文は維持 |
| `en/articles/google-play-points-discounts-promo-codes.html` | 導入・見出し構造を確認。本文は維持 |
| `en/articles/google-play-points-earn-free.html` | 導入・見出し構造を確認。本文は維持 |
| `en/articles/google-play-points-expiration.html` | 導入・見出し構造を確認。本文は維持 |
| `en/articles/google-play-points-family-sharing.html` | 導入・見出し構造を確認。本文は維持 |
| `en/articles/google-play-points-fastest-silver.html` | 導入・見出し構造を確認。本文は維持 |
| `en/articles/google-play-points-gift-cards.html` | 導入・見出し構造を確認。本文は維持 |
| `en/articles/google-play-points-join-eligibility.html` | 導入・見出し構造を確認。本文は維持 |
| `en/articles/google-play-points-level-maintenance-reset.html` | 導入・見出し構造を確認。本文は維持 |
| `en/articles/google-play-points-levels.html` | 導入・見出し構造を確認。本文は維持 |
| `en/articles/google-play-points-multiple-accounts.html` | 導入・見出し構造を確認。本文は維持 |
| `en/articles/google-play-points-not-showing.html` | 本文確認。直接回答・誤解を防ぐ条件・マーカーを改訂 |
| `en/articles/google-play-points-platinum-diamond-cost.html` | 導入・見出し構造を確認。本文は維持 |
| `en/articles/google-play-points-play-credit-not-working.html` | 導入・見出し構造を確認。本文は維持 |
| `en/articles/google-play-points-promotion-not-applied.html` | 導入・見出し構造を確認。本文は維持 |
| `en/articles/google-play-points-promotion-stacking.html` | 導入・見出し構造を確認。本文は維持 |
| `en/articles/google-play-points-refund.html` | 導入・見出し構造を確認。本文は維持 |
| `en/articles/google-play-points-rounding-tax.html` | 導入・見出し構造を確認。本文は維持 |
| `en/articles/google-play-points-subscriptions.html` | 導入・見出し構造を確認。本文は維持 |
| `en/articles/google-play-points-super-weekly-reward.html` | 本文確認。通常特典とパス特典の切り分け・要所の強調 |
| `en/articles/google-play-points-use-coupons.html` | 導入・見出し構造を確認。本文は維持 |
| `en/articles/google-play-points-weekly-reward.html` | 本文確認。通常特典とパス特典の切り分け・要所の強調 |
| `en/articles/google-play-quests.html` | 導入・見出し構造を確認。本文は維持 |
| `ko/articles/2026-06-20-discount-gift-cards.html` | 導入・見出し構造を確認。本文は維持 |
| `ko/articles/google-play-balance-combine-payment.html` | 導入・見出し構造を確認。本文は維持 |
| `ko/articles/google-play-games-vs-play-points.html` | 導入・見出し構造を確認。本文は維持 |
| `ko/articles/google-play-points-100-value.html` | 本文確認。直接回答・誤解を防ぐ条件・マーカーを改訂 |
| `ko/articles/google-play-points-500-1000-cost.html` | 導入・見出し構造を確認。本文は維持 |
| `ko/articles/google-play-points-apps-books-purchases.html` | 導入・見出し構造を確認。本文は維持 |
| `ko/articles/google-play-points-balance-history-progress.html` | 導入・見出し構造を確認。本文は維持 |
| `ko/articles/google-play-points-cash-conversion.html` | 導入・見出し構造を確認。本文は維持 |
| `ko/articles/google-play-points-country-change.html` | 導入・見出し構造を確認。本文は維持 |
| `ko/articles/google-play-points-country-differences.html` | 導入・見出し構造を確認。本文は維持 |
| `ko/articles/google-play-points-coupon-not-applied.html` | 導入・見出し構造を確認。本文は維持 |
| `ko/articles/google-play-points-device-change.html` | 導入・見出し構造を確認。本文は維持 |
| `ko/articles/google-play-points-discounts-promo-codes.html` | 導入・見出し構造を確認。本文は維持 |
| `ko/articles/google-play-points-earn-free.html` | 導入・見出し構造を確認。本文は維持 |
| `ko/articles/google-play-points-expiration.html` | 導入・見出し構造を確認。本文は維持 |
| `ko/articles/google-play-points-family-sharing.html` | 導入・見出し構造を確認。本文は維持 |
| `ko/articles/google-play-points-fastest-silver.html` | 導入・見出し構造を確認。本文は維持 |
| `ko/articles/google-play-points-gift-cards.html` | 導入・見出し構造を確認。本文は維持 |
| `ko/articles/google-play-points-join-eligibility.html` | 導入・見出し構造を確認。本文は維持 |
| `ko/articles/google-play-points-level-maintenance-reset.html` | 導入・見出し構造を確認。本文は維持 |
| `ko/articles/google-play-points-levels.html` | 導入・見出し構造を確認。本文は維持 |
| `ko/articles/google-play-points-multiple-accounts.html` | 導入・見出し構造を確認。本文は維持 |
| `ko/articles/google-play-points-not-showing.html` | 本文確認。直接回答・誤解を防ぐ条件・マーカーを改訂 |
| `ko/articles/google-play-points-platinum-diamond-cost.html` | 導入・見出し構造を確認。本文は維持 |
| `ko/articles/google-play-points-play-credit-not-working.html` | 導入・見出し構造を確認。本文は維持 |
| `ko/articles/google-play-points-promotion-not-applied.html` | 導入・見出し構造を確認。本文は維持 |
| `ko/articles/google-play-points-promotion-stacking.html` | 導入・見出し構造を確認。本文は維持 |
| `ko/articles/google-play-points-refund.html` | 導入・見出し構造を確認。本文は維持 |
| `ko/articles/google-play-points-rounding-tax.html` | 導入・見出し構造を確認。本文は維持 |
| `ko/articles/google-play-points-subscriptions.html` | 本文確認。直接回答・誤解を防ぐ条件・マーカーを改訂 |
| `ko/articles/google-play-points-super-weekly-reward.html` | 本文確認。通常特典とパス特典の切り分け・要所の強調 |
| `ko/articles/google-play-points-use-coupons.html` | 導入・見出し構造を確認。本文は維持 |
| `ko/articles/google-play-points-weekly-reward.html` | 本文確認。通常特典とパス特典の切り分け・要所の強調 |
| `ko/articles/google-play-quests.html` | 導入・見出し構造を確認。本文は維持 |
| `tw/articles/2026-06-20-discount-gift-cards.html` | 導入・見出し構造を確認。本文は維持 |
| `tw/articles/google-play-balance-combine-payment.html` | 導入・見出し構造を確認。本文は維持 |
| `tw/articles/google-play-games-vs-play-points.html` | 導入・見出し構造を確認。本文は維持 |
| `tw/articles/google-play-points-100-value.html` | 本文確認。直接回答・誤解を防ぐ条件・マーカーを改訂 |
| `tw/articles/google-play-points-500-1000-cost.html` | 導入・見出し構造を確認。本文は維持 |
| `tw/articles/google-play-points-apps-books-purchases.html` | 導入・見出し構造を確認。本文は維持 |
| `tw/articles/google-play-points-balance-history-progress.html` | 導入・見出し構造を確認。本文は維持 |
| `tw/articles/google-play-points-cash-conversion.html` | 導入・見出し構造を確認。本文は維持 |
| `tw/articles/google-play-points-country-change.html` | 導入・見出し構造を確認。本文は維持 |
| `tw/articles/google-play-points-country-differences.html` | 導入・見出し構造を確認。本文は維持 |
| `tw/articles/google-play-points-coupon-not-applied.html` | 導入・見出し構造を確認。本文は維持 |
| `tw/articles/google-play-points-device-change.html` | 導入・見出し構造を確認。本文は維持 |
| `tw/articles/google-play-points-discounts-promo-codes.html` | 導入・見出し構造を確認。本文は維持 |
| `tw/articles/google-play-points-earn-free.html` | 導入・見出し構造を確認。本文は維持 |
| `tw/articles/google-play-points-expiration.html` | 導入・見出し構造を確認。本文は維持 |
| `tw/articles/google-play-points-family-sharing.html` | 導入・見出し構造を確認。本文は維持 |
| `tw/articles/google-play-points-fastest-silver.html` | 導入・見出し構造を確認。本文は維持 |
| `tw/articles/google-play-points-gift-cards.html` | 導入・見出し構造を確認。本文は維持 |
| `tw/articles/google-play-points-join-eligibility.html` | 導入・見出し構造を確認。本文は維持 |
| `tw/articles/google-play-points-level-maintenance-reset.html` | 導入・見出し構造を確認。本文は維持 |
| `tw/articles/google-play-points-levels.html` | 導入・見出し構造を確認。本文は維持 |
| `tw/articles/google-play-points-multiple-accounts.html` | 導入・見出し構造を確認。本文は維持 |
| `tw/articles/google-play-points-not-showing.html` | 本文確認。直接回答・誤解を防ぐ条件・マーカーを改訂 |
| `tw/articles/google-play-points-platinum-diamond-cost.html` | 導入・見出し構造を確認。本文は維持 |
| `tw/articles/google-play-points-play-credit-not-working.html` | 導入・見出し構造を確認。本文は維持 |
| `tw/articles/google-play-points-promotion-not-applied.html` | 導入・見出し構造を確認。本文は維持 |
| `tw/articles/google-play-points-promotion-stacking.html` | 導入・見出し構造を確認。本文は維持 |
| `tw/articles/google-play-points-refund.html` | 導入・見出し構造を確認。本文は維持 |
| `tw/articles/google-play-points-rounding-tax.html` | 導入・見出し構造を確認。本文は維持 |
| `tw/articles/google-play-points-subscriptions.html` | 本文確認。直接回答・誤解を防ぐ条件・マーカーを改訂 |
| `tw/articles/google-play-points-super-weekly-reward.html` | 本文確認。通常特典とパス特典の切り分け・要所の強調 |
| `tw/articles/google-play-points-use-coupons.html` | 導入・見出し構造を確認。本文は維持 |
| `tw/articles/google-play-points-weekly-reward.html` | 本文確認。通常特典とパス特典の切り分け・要所の強調 |
| `tw/articles/google-play-quests.html` | 導入・見出し構造を確認。本文は維持 |
