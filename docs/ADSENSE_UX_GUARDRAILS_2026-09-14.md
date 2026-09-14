# AdSense UX guardrails (2026-09-14)

PlayPoint は「計算ツール」と「攻略記事」の両方を持つため、広告収益より先に主要操作と回答本文を保護する。

## コード側で保証すること

- ブログ一覧の主要コンテンツは JavaScript / IntersectionObserver の成功を表示条件にしない。
- 手動広告枠は既存の `.adsbygoogle` 境界で管理し、計算フォームや FAQ の途中へ新しい手動枠を追加しない。
- CSP は AdSense 本体に加えて広告品質確認 iframe (`https://*.adtrafficquality.google`) を `frame-src` で許可する。

## AdSense 管理画面で固定すること

Google 公式の Auto ads 設定はコードだけでは完全に制御できないため、次をサイト設定として維持する。

1. **全画面広告 > 追加のトリガーを許可する: OFF**
   - タブ復帰、一定時間操作なし後の操作など、計算途中のユーザー操作で全画面広告が出る経路を止める。
2. **ページ内自動広告 > 除外エリア**
   - トップ計算機: `.tab-switch`, `#mainMode`, `#reverseMode`, `#diaryMode`
   - 記事: `.hero`, `.answer-box`, `.inpage-toc`, `.faq-section`, `.reading-tools`
   - ブログ一覧: `.hero-section`, `.search-sort-row`, `#article-grid` の先頭導線を優先して確認する。
3. **アンカー広告**
   - 実機で本文末・FAQ・日記集計を覆う場合はアンカー広告を OFF にする。CSS で広告サイズを推測して余白を足す回避策は採用しない。
4. 設定変更後は AdSense プレビューだけでなく、モバイル実機で「計算 → タブ切替 → 記事閲覧 → FAQ末尾」まで確認する。

## 判断基準

広告が主要操作を中断する、回答を分断する、閉じないと次の操作へ進めない場合は UX 事故として扱う。収益差は GA4 / AdSense で後から比較し、操作阻害を許容して短期表示回数を優先しない。
