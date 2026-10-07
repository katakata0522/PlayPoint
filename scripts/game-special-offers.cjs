'use strict';

const { SOURCES } = require('./game-seo-data.cjs');
const REVIEWED_AT = '2026-10-07';
// 調査日と、Google Play価格の確認を分ける。別ストア・古い攻略価格は計算値にしない。
const official = (url) => ({ url, label: '公式情報' });
const guide = (url, label) => ({ url, label });
const item = (id, name, kind, detail, source, productId) => ({ id, name, kind, detail, source, productId });
const SPECIAL_OFFERS = {
  genshin: {
    lead: '毎日遊ぶなら空月、育成素材や武器まで欲しいなら紀行から。今すぐ必要な原石は、後でもらう分と分けて考えましょう。',
    items: [
      item('welkin', '空月の祝福', '30日間・毎日受取', '購入時に創世結晶300個、ログインした日に原石90個。休んだ日の分は後から受け取れません。', official(SOURCES.genshinWelkinReference)),
      item('battle-pass', '天空紀行／真珠の歌', 'シーズン制・進行報酬', '紀行を進めて武器や育成素材を受け取る商品。真珠の歌は追加特典付き。残り期間と今の紀行レベルを見て選びましょう。', guide('https://gamewith.jp/genshin/article/show/230355', 'GameWithの比較')),
      item('miliastra', '千界遊記／千界の詩', '星々の幻境・進行報酬', '星々の幻境のおしゃれアイテムなどが目当ての人向け。紀行と購入順による割引があるので、両方欲しいなら先に組み合わせを確認。', guide('https://game8.jp/genshin/733548', 'Game8の解説'))
    ],
    note: '攻略記事でもAndroid・iOS・PSの料金が異なります。Google Playで表示された金額を入力してください。'
  },
  starrail: {
    lead: '毎日の星玉を増やすなら列車補給標章。光円錐や育成素材も欲しいなら、ナナシの勲功をどこまで進められるかも見てみましょう。',
    items: [
      item('supply-pass', '列車補給標章', '30日間・毎日受取', '購入時に往日の夢華300個、毎日星玉90個。ログインしなかった日の星玉は取り戻せません。', official(SOURCES.starrailSupplyPassReference)),
      item('nameless', 'ナナシビトの褒章／ナナシビトの勲章', 'シーズン制・進行報酬', '勲功レベルを上げて育成素材や光円錐関連の報酬を受け取ります。勲章はレベル上昇などの追加特典付き。', guide('https://game8.jp/houkaistarrail/525024', 'Game8の比較'))
    ]
  },
  zzz: {
    lead: '少しずつガチャに備えるならインターノット会員。始めたばかりなら一度きりのギフト、育成も進めたいならエリーファンドを見てから決めましょう。',
    items: [
      item('membership', 'インターノット会員', '30日間・毎日受取', '購入時にモノクローム300個、毎日ポリクローム90個。受け取らなかった日の分は持ち越せません。', guide('https://gamewith.jp/zenless/456959', 'GameWithの解説')),
      item('welcome', '「ウェルカム・エリー」ギフトボックス', '一度きりのパック', 'マスターテープ2種類と音動機4択ギフトボックス。ガチャ石だけでなく、欲しい音動機があるかも確認。', guide('https://gamewith.jp/zenless/456377', 'GameWithの商品一覧')),
      item('fund', 'エリーファンド 成長プラン／プレミアムプラン', 'シーズン制・進行報酬', 'プレイしてレベルを上げ、音動機や育成素材などを受け取るパス。購入だけで全報酬が揃うわけではありません。', guide('https://gamewith.jp/zenless/456194', 'GameWithの解説'))
    ]
  },
  bluearchive: {
    lead: '青輝石をまとめて買う前に、毎日の受け取りと育成を助けるパッケージもチェック。通常版・ハーフ・AP用は、それぞれ別の商品です。',
    items: [
      item('monthly', 'マンスリーパッケージ', '30日間・毎日受取', '購入時と毎日の青輝石に、指名手配・学園交流会チケットなどが付くパッケージ。', guide('https://appmedia.jp/blue_archive/78140522', 'AppMediaの比較')),
      item('monthly-half', 'マンスリーパッケージ（ハーフ）', '30日間・毎日受取', '通常版より少額で、青輝石やチケットの数量も少ない別商品。毎日遊ぶ予定と予算に合わせて。', guide('https://appmedia.jp/blue_archive/78140522', 'AppMediaの比較')),
      item('stamina', '2weeksスタミナパッケージ', '14日間・AP補充', '毎日AP150を受け取る育成・周回向けの商品。青輝石中心のマンスリーとは目的が違います。', guide('https://appmedia.jp/blue_archive/78140522', 'AppMediaの比較'))
    ]
  },
  pokepoke: {
    lead: '毎日パックを開けるなら、ポケゴールドを買い足す前にプレミアムパスを確認。今すぐたくさん開けたい場合とは使い方が違います。',
    items: [item('premium', 'プレミアムパス', '月額・自動更新', '毎日追加で1パックを開封でき、プレミアムミッションの報酬も獲得できます。初回14日無料体験後は有料の自動更新。', guide('https://game8.jp/pokemon-tcg-pocket/642944', 'Game8の解説'))],
    officialSource: official(SOURCES.pokepokePremiumPass)
  },
  umamusume: {
    lead: 'ジュエルや日々の育成を助けたいならウマスク。継承の機能が欲しいならウマプラン。名前が似ていても、別契約で特典も違います。',
    productIds: ['umasuku', 'umaplan']
  },
  fgo: {
    lead: 'FGOは有償石を使う召喚の条件から。福袋は開催期間があるので、普段買える月額パスのようには扱いません。',
    items: [item('lucky-bag', '福袋などの有償限定召喚', '開催時のみ・有償石で召喚', '2026年11周年の福袋は開催終了。次の開催時は有償石の必要数と対象を確認し、今ある有償石を差し引いて購入額を考えましょう。', official(SOURCES.fgoLuckyBag2026))],
    note: '今回の公開情報調査では、常設の月額パスは確認できませんでした。聖晶石の商品表は下で選べます。'
  },
  monst: {
    lead: 'オーブを買い足す前に、モンパスの便利機能が自分に必要かもチェック。プレミアムの月額料金と会員限定パックの代金は別です。',
    productIds: ['monpass', 'monpass-premium', 'premium-monthly-pack', 'starter-premium', 'first-acquisition', 'ability', 'collab-starter']
  },
  wutheringwaves: {
    lead: '毎日遊ぶなら月相観測パス、武器や育成素材も欲しいなら先駆ラジオの有料枠を先に確認しましょう。',
    items: [
      item('lunite-pass', '月相観測パス', '30日間・毎日受取', '購入時に月相300個、30日間毎日星声90個。購入時の月相と、後日受け取る星声は分けて考えましょう。', official('https://store.playstation.com/ja-jp/product/EB1238-PPSA24686_00-0039297268247085')),
      item('radio', 'ユニバースチャンネル（先駆ラジオ）', 'シーズン制・進行報酬', '通常版とプレミアム版があり、ラジオレベルに応じて武器や育成素材などを獲得。残り期間と進行度が選ぶ目安です。', guide('https://game8.jp/meicho/611078', 'Game8の比較'))
    ],
    note: '公式ストアの参照先はPS版の商品内容です。PS版の料金はGoogle Playの計算に使いません。'
  },
  gakumas: {
    lead: '学マスで継続して遊ぶなら、まずプレミアムミッションパスの進み具合を確認。ジュエルだけでなく、衣装や育成素材が欲しい人にも候補になります。',
    items: [item('premium-mission', 'プレミアムミッションパス', '月ごとのミッション報酬', 'ミッションを進めてジュエル、衣装パーツ、育成素材などを受け取ります。買った時点で全報酬がもらえる商品ではありません。', guide('https://game8.jp/gakuen-idolmaster/797151', 'Game8の解説'))]
  },
  nikke: {
    lead: '毎日の募集用ジュエルなら30-DAY補給品。衣装や募集チケットが目当てならミッションパスと、欲しいものから選びましょう。',
    items: [
      item('supply', '30-DAY補給品', '30日間・毎日受取', '購入時に有償ジュエル330個、ログイン時に無償ジュエル100個を30日間受け取る商品。', guide('https://game8.jp/nikke/492743', 'Game8の商品比較')),
      item('mission', 'ミッションパス（有料報酬）', 'シーズン制・進行報酬', 'ミッションを進めて募集チケットや衣装などを受け取ります。衣装・報酬・販売期間はシーズンごとに確認。', guide('https://game8.jp/nikke/541806', 'Game8の解説')),
      item('campaign', 'キャンペーンパック', 'ストーリー進行報酬', 'チャプターを進めて無償ジュエルを受け取る商品。今すぐ使える有償ジュエルとは別です。', guide('https://game8.jp/nikke/492743', 'Game8の商品比較'))
    ]
  },
  dokkan: {
    lead: '龍石の通常購入より先に、デイリー龍石と開催中のセールをチェック。受取日数やセール内容が変わるので、古い30日分の説明で選ばないようにしましょう。',
    items: [item('daily-stones', 'デイリー龍石', '日数限定・毎日受取', '2026年に商品内容が変更され、10月は5日間の商品の告知もあります。購入時の分・毎日の分・販売終了日を今の画面で確認。', guide('https://jpn.dbz-dokkanbattle.com/announcements/0/1', 'ゲーム内告知の保存サイト'))],
    officialSource: official(SOURCES.dokkanWebStoreUsage),
    note: 'Web Storeの龍石・独自ポイントはGoogle Play購入と別です。公開情報だけでは現行Google Play価格を確定できませんでした。'
  },
  arknights: {
    lead: '毎日の合成玉と理性回復剤が欲しいなら月パス。すぐスカウトしたいなら月間スカウトパックと、受け取るタイミングで選びましょう。',
    items: [
      item('monthly', '月パス', '30日間・毎日受取', '購入時に有償純正源石6個、毎日合成玉200個と初級理性回復剤1個。理性回復剤には使用期限があります。', official(SOURCES.arknightsMonthlyPass)),
      item('scout', '月間スカウトパック', '月ごとのパック購入', '10回スカウト券と純正源石が入るパック。毎日受け取る月パスとは別商品です。', guide('https://gamewith.jp/arknights/article/show/183614', 'GameWithの商品比較'))
    ],
    note: '参照した攻略記事の旧価格は採用せず、Google Play購入画面の金額で計算します。エンドフィールドの商品も混ぜません。'
  },
  pad: {
    lead: '魔法石を買い足す前に、毎日の専用ダンジョンや便利機能を使いたいかでパズドラパスも検討。単品の魔法石購入とは別の商品です。',
    productIds: ['pad-pass']
  },
  mementomori: {
    lead: '毎日の報酬なら月間ブースト、便利機能なら盟約特権、クエストを進めているなら達成パックから。名前や契約期間も分けて選びましょう。',
    items: [
      item('monthly-boost', '月間ブースト', '30日間・毎日報酬と特権', '購入時の報酬に加え、30日間専用の毎日報酬と特権が有効に。前日に受け取らなかった報酬はプレゼントボックスへ届きます。', official('https://mementomori.zendesk.com/hc/ja/articles/44102448913049-月間ブーストについて')),
      item('covenant-week', '盟約特権（1週間）', '7日間・自動更新', '全ワールド共通の特権。1か月版と同時加入はできません。VIP経験値やゲーム内チャージイベントの達成には加算されない別契約です。', official('https://mementomori.zendesk.com/hc/ja/articles/44102609445785-盟約特権について-iOS-Android')),
      item('covenant-month', '盟約特権（1か月）', '30日間・自動更新', '1週間版より長い契約期間。同じ期間で自動更新され、初回3日無料体験もあります。無料期間で終える場合は終了24時間以上前の解約が必要です。', official('https://mementomori.zendesk.com/hc/ja/articles/44102609445785-盟約特権について-iOS-Android')),
      item('achievement', '達成パック', 'クエスト進行報酬', 'クエストの達成状況に応じて報酬を受け取るタイプ。自分の進行度で、どこまで回収できるかを見て選びましょう。', guide('https://altema.jp/mememori/osusumepack', 'アルテマの商品比較'))
    ]
  },
  proseka: {
    lead: '毎日のクリスタル、ライブの衣装、マイセカイの遊びやすさ。欲しい特典に合わせてパスを選べます。全部が同じ月額サービスというわけではありません。',
    items: [
      item('colorful-basic', 'カラフルパス BASIC', '期間制・毎日受取', 'カラフルパスの基本プラン。毎日のクリスタルや期間中の特典を、上位プランと比較して選びましょう。', official(SOURCES.prosekaFaq)),
      item('colorful-deluxe', 'カラフルパス DELUXE', '期間制・毎日受取', 'BASICとは内容・料金が別のプラン。追加特典を使うかで選び、同じ商品の追加購入として計算しないようにしましょう。', official(SOURCES.prosekaFaq)),
      item('colorful-precious', 'カラフルパス PRECIOUS', '期間制・毎日受取', 'カラフルパスの上位プラン。欲しい特典とGoogle Playに表示される料金を確認してから選べます。', official(SOURCES.prosekaFaq)),
      item('premium-mission', 'プレミアムミッションパス', '月ごとのライブ報酬', 'ライブPの進行に応じて、有料枠の報酬を受け取ります。月末に買うなら今のライブPを先に確認。', official(SOURCES.prosekaFaq)),
      item('mysekai-mission', 'マイセカイミッションパス', '月ごとのミッション報酬', 'マイセカイ用のミッションパス。ライブ向けのプレミアムミッションパスとは別商品です。', official(SOURCES.prosekaWebStore)),
      item('world', 'ワールドパス', '期間制・マイセカイ特典', '招待状、スタミナやヘンカンマシンの強化など、マイセカイを遊びやすくする商品。', guide('https://game8.jp/pjsekai/663335', 'Game8の解説'))
    ],
    note: '公式Web Storeでも商品を確認できますが、その価格・特典はGoogle Play購入とは別です。'
  },
  hbr: {
    lead: 'クォーツをまとめて買う前に、ライトパスとプレミアムパスの継続特典を比較。ミッションで手に入る無償クォーツは、有償限定ガチャには使えません。',
    items: [
      item('light', 'ライトパス', '月額・自動更新', 'マンスリーミッションのクォーツやピース、継続時のガチャチケットなどが特典。初月と継続月では内容が異なります。', guide('https://game8.jp/heavenburnsred/447657', 'Game8の比較')),
      item('premium', 'プレミアムパス', '月額・自動更新', 'ライトとは別契約で、SS確定チケットのカケラなどが付くプラン。2種類は同時加入できます。', guide('https://game8.jp/heavenburnsred/447657', 'Game8の比較')),
      item('one-coin', 'ワンコインSS確定ガチャチケットセット', '条件達成後・72時間限定', 'Ver.6.6.0以降の初回起動から72時間以内に買える商品。対象のSSスタイルと、自分の残り購入時間を確認しましょう。', guide('https://game8.jp/heavenburnsred/447657', 'Game8の商品一覧')),
      item('chapter-one', '第一章クリア記念 SS確定＆ピースセット', '条件達成後・72時間限定', '第一章クリア後の初回起動から72時間以内が購入期間。ワンコインセットとは別の商品です。', guide('https://game8.jp/heavenburnsred/447657', 'Game8の商品一覧')),
      item('start-dash', 'スタートダッシュセレクトチケットパック', '条件達成後・7日間限定', 'Ver.6.6.0以降の初回起動から7日以内が購入期間。セレクト対象のSSスタイルに欲しいものがあるかを先に確認。', guide('https://game8.jp/heavenburnsred/447657', 'Game8の商品一覧'))
    ]
  },
  phantomparade: {
    lead: '毎月ミッションを進めるならファンパレパスから。プレミアムプラスは、別の高額パスではなく連続購入に関係する追加報酬です。',
    items: [item('premium', 'ファンパレパス プレミアム', '月ごとのミッション報酬', 'パスランクを上げて廻珠や育成素材を獲得。前月も購入している場合のプレミアムプラス報酬は、通常の有料枠と区別して確認しましょう。', guide('https://game8.jp/jujutsuphanpara/606933', 'Game8の解説'))]
  },
  reverse1999: {
    lead: '毎日の召喚用の雫なら咆哮のひと月、衣装や育成素材ならジュークボックス。石の数だけでなく、欲しい報酬から選びましょう。',
    items: [
      item('roaring-month', '咆哮のひと月', '30日間・毎日受取', '購入時に純雨の雫300個、毎日雨の雫90個と苦目キャンディを受け取る商品。', guide('https://gamerch.com/reverse1999/804714', 'Gamerchの商品比較')),
      item('jukebox', 'ほえほえジュークボックス（有料報酬）', 'シーズン制・進行報酬', 'ミッションを進めて衣装や育成素材などを受け取ります。雫をすぐ買う商品とは目的が違います。', guide('https://gamerch.com/reverse1999/804714', 'Gamerchの商品比較'))
    ],
    note: '参照した攻略ページには古い開催情報も残っています。今期の衣装・期限・Google Play価格は購入画面で確認してください。'
  },
  honkai3rd: {
    lead: '毎日の水晶なら月パス、バージョンごとの育成報酬なら作戦標章。ギフトコインの消費と実際の円の支払いは分けて計算します。',
    items: [
      item('monthly', '月パス', '期間制・毎日受取', '購入時の水晶に加え、ログイン時に毎日の水晶を受け取ります。重ねて買っても毎日の数量ではなく期間が延びる仕組み。', guide('https://wikiwiki.jp/houkai/用語集', '攻略Wikiの解説')),
      item('battle-pass', '作戦標章 上級／精鋭', 'シーズン制・進行報酬', '任務を進めて有料枠の報酬を受け取ります。ギフトコインでの解放額をそのまま円の課金額に換算しないでください。', guide('https://wikiwiki.jp/houkai/作戦標章', '攻略Wikiの解説'))
    ],
    officialSource: official('https://steamcommunity.com/app/1672740/allnews/?l=japanese'),
    note: '日本Google Play版の最新価格・今期の報酬までは公開情報で確定できませんでした。下の計算には実際に支払う金額を入力します。'
  },
  shadowversewb: {
    lead: 'カードパックを買う前に、バトルパスの有料報酬も見てみましょう。こちらはクリスタルで解放するため、パスの解放と円の支払いは別です。',
    items: [item('premium', 'バトルパス プレミアムパス', 'シーズン制・クリスタルで解放', '対戦やミッションでパスレベルを上げ、追加報酬を獲得します。手持ちのクリスタルを使うだけなら、新しいGoogle Play課金は発生しません。', guide('https://gamerch.com/shadowverse-wb/927645', 'Gamerchの解説'))],
    officialSource: official('https://shadowverse-wb.com/ja/help/'),
    note: '更新停止中の攻略サイトの旧円価格は採用していません。課金する場合はクリスタル購入の支払額で計算します。'
  },
  'prospi-a': {
    lead: 'プロスピAは、まず開催中のエナジー増量セールから。月額パスがある前提で選ぶより、今買えるエナジーの内容を比較しましょう。',
    items: [item('sale', 'エナジー増量セール', '開催時のみ・購入回数制限', '通常購入と数量が違うセール商品。対象パック・増量分・購入上限を確認して、今回のGoogle Play支払額で計算できます。', guide('https://game8.jp/prospi_a/540492', 'Game8の解説'))],
    officialSource: official(SOURCES.prospiAGooglePlayPurchase),
    note: '今回の公開情報調査では、常設の月額パスは確認できませんでした。KONAMIのストア特典はGoogle Play外の別条件です。'
  },
  'pokemon-go': {
    lead: '今月のタスクを進めるならGOパスデラックス、レイド中心なら開催中のチケットを先にチェック。GOポイントはPlayポイントとは別です。',
    items: [
      item('deluxe', 'GOパスデラックス', '期間制・進行報酬', '無料GOパスの追加報酬を解放。2026年10月版は10月6日〜11月3日で、報酬受取は11月5日10時まで。', official('https://pokemongo.com/ja/news/go-pass-october-2026')),
      item('deluxe-plus', 'GOパスデラックス ＋10ランク', '期間制・進行を補助', '有料枠の解放に加え、10ランク分のGOポイントが付く商品。通常のデラックス、レイド用のプレミアムバトルパスとは別です。', official('https://pokemongo.com/ja/news/go-pass-october-2026'))
    ],
    note: '公式告知の米ドル表記を円へ換算して固定しません。日本のGoogle Play支払額で計算し、Web Store限定特典は別に比較してください。'
  },
  efootball: {
    lead: '選手や監督を狙っているなら、コイン購入の前にパックの中身を確認。試合で進める報酬はキャンペーンハブでチェックできます。',
    items: [item('pack', '選手・マネージャーパック', 'ラインナップ・販売期間ごとの商品', '欲しい選手・監督と育成アイテムを確認して選ぶ商品。コイン消費だけなら新しい円の支払いはなく、コインを買い足す額でポイントを計算します。', official('https://www.konami.com/games/corporate/ja/news/topics/20260817/'))],
    officialSource: official('https://www.konami.com/efootball/ja/page/v5/versioninfo_v5-00'),
    note: '従来のマッチパスはv5.0.0でキャンペーンハブへ変更済み。旧バリュー／プレミアムマッチパスの価格は現行商品として掲載しません。'
  }
};

function getSpecialOffers(gameId, products) {
  const record = SPECIAL_OFFERS[gameId];
  if (!record) throw new Error(`特別商品の調査記録がありません: ${gameId}`);
  const items = record.productIds ? record.productIds.map(id => {
    const product = products.find(p => p.id === id);
    if (!product) throw new Error(`確認済み商品がありません: ${gameId}/${id}`);
    const name = (product.tableName || product.name).replace(/[（(](?:月額)?[\d,]+円[）)]/g, '').trim();
    return { id, name, kind: product.billing === 'subscription' ? '月額・自動更新' : 'パック購入', detail: product.detail, source: official(product.source), productId: id, price: product.price };
  }) : record.items;
  return { ...record, items, reviewedAt: REVIEWED_AT };
}

module.exports = { REVIEWED_AT, SPECIAL_OFFERS, getSpecialOffers };
