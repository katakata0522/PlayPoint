# 最終ファクトチェック（2026-11-28）

対象 PR #857、監査開始head 049f5cbc8383e281a8b9f4473d22ba381aadfb13、main 068e59887d4d45f3414f81fd0b6ccf1a8321fffd。7記事の公開情報・本文・表・計算・期限を再照合した。公式検索結果の取得本文も使用。一部URLの直接取得はキャッシュミス/429。ログイン後の日本版商品画面・決済・実機は未確認。未知の値は推測で埋めず、公式掲載例・二次資料・仮定を区別する。

## 修正・照合結果
| 対象 | 最終確認と修正 | 未確認 |
| --- | --- | --- |
| にゃんこ課金比較 | 公式利用ガイドの1pt未満切捨て、1pt=税抜1円、最新確定日からの有効期限、全額ポイント払い不可、クーポン対象外、カードのみ。税込1万円・税10%なら90ptと仮定した試算。Web還元90円相当は付与数とは区別。初回ゴールド会員無料・30日期限延長なし・スキップ消費1個を明確化。タイトルを確定情報の範囲に合わせた。 | 同一商品の実売価格・数量、会員価格、実際の付与・決済画面 |
| にゃんこ14周年 | 第1・2弾公式告知を照合。スロット最低1014、第2期11/28 11:00〜12/12 10:59、レジェンド12/25 10:59、ミッション12/25 23:59（既クリア者も対象）、日替わり20・全期間最大880ネコカン、30日スタンプの期限3/16。第1期の参考価格と継続商品の報告を二次情報として区別。 | 第2期の実売内容・価格・回数 |
| MHO | 日本語/英語詳細FAQの7商品数量、Web日本円7価格を再取得。米ドルFAQの通常8080対Web8280、日本語通貨ガイドの6480対8280が実際に矛盾。英語チャージガイドの標準数量を「ゲーム内実売」とみなさず、日本語の明示表を比較出典へ。 | 日本の現行ゲーム内数量と価格、初回共有、資料差の解消 |
| ロマサガRS | 公式告知のログイン3企画・ミッション・販売期限・チケット対象ガチャを照合。2周目ステップ7のみ未所持確定と明確化。Webのプレゼントボックス200件超で表示されない点を修正。段階価格とWeb円価格は二次資料の掲載値に一致。 | 一次商品画面、無料枠共有、全ステップ価格 |
| P5X | 公式ブラックフライデー告知、Ver4.14、公式ストアを照合。95枚＋800→400、60000＋5000→2500、選択券/箱各1、ゴールドチケット20、自在結晶240、7日ログイン7枚、無料プレゼント5枚。終了後の販売継続・再販を保証しない。ストアの18時表示は確認できるが実際の開始はメンテ後表記を優先。1.5周年は2027/11/26までの初回ログインから45日、内容は未発表。 | 日本円価格、実際の開始時刻、12/1追加内容 |
| デュエプレ | 新弾通常150/日替100、専用1500ジェム・上限3回、選択300/200、無料15枚、SR券1枚、公式決済法表示、800ジェム/40チップのマット期限を再照合。有料セット告知のSR以上と無料配布告知のSR表記の差を明示し実券詳細を優先。AndApp資料は2020年付と明記。 | 現行円建てジェム価格、次弾日時、券の実際の提供対象 |
| ホワサバ | 総合案内とイベントFAQを別資料として示す。星の必要数とチャージポイントを同価格枠で対応。月間最高到達ランクのみ、星購入/メール受取/有料パック使用を区別。豊穣の祝福7種類と回数、UTCからJST換算を確認。 | Web星販売価格・増量率、各王国表示、個別月間報酬数 |
| ファンパレ（保留） | 公式11/15発表の第2弾ガチャ11/30、第3弾12/8を再確認。セレクトパックの正式商品告知は未取得のため従来どおり保留。 | 商品内容・価格・使用期限 |

## 数値再計算
- Google Play: 税抜対象額に獲得率を掛け、最も近い整数へ四捨五入。ダイヤモンド通常2pt/100円。単一対象購入・税10%の仮定で10,000円→182pt、15,000円→273pt、800円→15pt。獲得ポイントの将来価値は現金値引きではない。
- にゃんこ: 税抜1%切捨ての仮定例90pt。比較式 P_g−(P_w−R_w)×Q_g/Q_w。Web増量3/5/8/10%、各1万円、Web利用価値0円→292/477/741/910円、90円相当→379/562/825/991円（整数円切上げ）。7%割引と182円相当なら支払9,300円、実質9,118円、4,000個で2.2795円。Webの仮定9,910円÷4,200＝2.3595円。価格・個数は架空。
- MHO: 7円価格合計32,910、初回Web数量合計29,155。1,800÷6,480≈27.78%、200÷8,080≈2.48%、200÷12,960≈1.54%。同額15,000円仮定の分岐点初回228円、通常FAQ363円、通貨ガイド3,261円（整数円切上げ）。
- RS: 45,000+3,000+200=48,200、ミッション5,000込み53,200。別途メンテ300は含めない。参考段階価格0+1000+2000+3000+3000=9000。990÷1500=9900÷15000=0.66円。
- P5X: 800−400=400、5000−2500=2500。商品全体が2倍になるわけではない。
- デュエプレ: 1500−50n、n=0/1/3/5/10で1500/1450/1350/1250/1000、10日で500ジェム（33.3%）。同一商品でないSRチケットの価値は別。
- ホワサバ: 800÷499≈1.6032、785÷499≈1.5731円/個。星を購入する総額と499個消費の費用は別。仮の5%増量に必要な割引率1−1/1.05≈4.7619%。UTC 11/29 23:59:59＝JST11/30 8:59:59。

## 期限データ
22→23行。にゃんこ記念ミッションの独立期限を追加。P5Xの18時ストア表示と開始未確定を区別、増量終了後の販売保証を削除。ロマサガRSメンテのログイン対象期限と受取期限の意味を修正、ホワサバの有料枠6種、デュエプレの次弾日時未確定を明示。ID一意、期間順、開始・終了境界、日時不明、埋込JSONと静的表の一致を確認。期限は公式予定であって、全アカウントの開催を保証しない。正式なカレンダーUI・公開経路は決めていない。

## 再照合した主な資料
- https://www.nyanko-daishoten.jp/Page/guide_faq.aspx
- https://www.nyanko-daishoten.jp/Page/guide.aspx
- https://battlecats.club/news/game/news_4558/
- https://battlecats.club/news/game/20261126_14th-event/
- https://battlecats.club/news/game/20261112_14th/
- https://battlecats.club/news/game/20261106_14th/
- https://ponosgames.com/information/appli/battlecats/help/index.html
- https://ponosgames.com/information/appli/battlecats/club/index.html
- https://event.rakuten.co.jp/computer/gpgiftcard/
- https://www.midasbuy.com/midasbuy/jp/article/monster-hunter-outlanders-top-up-faq-news_hdpsuw
- https://www.midasbuy.com/midasbuy/jp/article/monster-hunter-outlanders-crimson-crest-coins-news_pgywrs
- https://www.midasbuy.com/midasbuy/jp/buy/monster-hunter-outlanders?from=__mds_buy_mho.socialmedia_global%2F
- https://games.aktsk.jp/news/62839/
- https://www.jp.square-enix.com/saga_reuniverse/notice/webjewelshop/
- https://gamerch.com/saga-reuniverse/1036836 （二次資料）
- https://game8.jp/battlecats/834240 （二次資料）
- https://p5x.jp/news/details/0015330WPp2yAY.html
- https://p5x.jp/news/details/001521jd9qwFR0.html
- https://p5xjp-store.sega.com/
- https://dmps.takaratomy.co.jp/news/16646
- https://dmps.takaratomy.co.jp/news/16648
- https://dmps.takaratomy.co.jp/payment/
- https://dmps.takaratomy.co.jp/news/445
- https://dmps.takaratomy.co.jp/news/16690
- https://dmps.takaratomy.co.jp/news/16652
- https://www.whiteoutsurvival.wiki/ja/vip-post/%E7%B7%8F%E5%90%88%E6%A1%88%E5%86%85/
- https://www.whiteoutsurvival.wiki/ja/vip-post/%E8%B1%8A%E7%A9%A3%E3%81%AE%E5%AE%B4%E3%80%80faq/
- https://support.google.com/googleplay/answer/9077192?co=GENIE.CountryCode%3DJP&hl=ja
- https://support.google.com/googleplay/answer/9080348?co=GENIE.CountryCode%3DJP&hl=ja
- https://support.google.com/googleplay/answer/16805335?hl=ja
- https://sumzap.co.jp/2026/11/15/f84c781794913122/

## リリース状態
7記事の本文とHTML候補を更新し、メタ情報・台帳を同期。未取得の条件を明示したまま、記事の主題を満たすものから公開判断できる。全8記事は公開前。画像実体・画像権利、生成物、実ブラウザ、CIの検証は未実施。公開ルートや既存CSS、サイドバー、広告、mainへの直接変更は行っていない。ここでいうファクトチェック完了は取得できた資料の範囲での確認・修正であり、全実売・個別表示・将来の販売の保証ではない。
