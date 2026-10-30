'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { resolveGameThumbnail } = require('./game-thumbnail-assets.cjs');

const PUBLISHED_AT = '2026-09-13';
const MODIFIED_AT = '2026-10-08';

const GAME_GUIDE_ARTICLES = Object.freeze([
  {
    id: 'fgo-pity-cost-2026',
    modified: '2026-10-28',
    listDescription: "天井330回の必要数と2022年の公式価格を基にした購入例、終了した福袋の例とポイントの目安を紹介します。",
    title: "FGO天井330回の予算目安｜2022年公式価格の試算と福袋の例",
    category: '使い方',
    gameTitle: 'FGO',
    listTitle: "FGO天井330回の予算｜2022年価格の試算と福袋の例",
    tags: ['FGO', '聖晶石', '天井', '福袋', 'Play Points'],
    description: "FGOの確定召喚330回に必要な聖晶石を解説。2022年に告知された価格表を使った予算例と、終了した2026年11周年福袋の例を紹介します。現在のGoogle Play版の全価格は購入画面で確認してください。",
    file: '../games/fgo/pity-cost/index.html',
    related: [
      ["/articles/2026-08-05-play-points-multiplier-stacking.html","倍率キャンペーン時のPlay Pointsを確認する"],
      ["/articles/2026-06-20-discount-gift-cards.html","Google Playギフトコードの割引購入前に確認する"],
      ["/articles/2025-12-25-best-use.html","獲得ポイントをどこで使うか確認する"]
    ]
  },
  {
    id: 'genshin-welkin-value-2026',
    modified: '2026-10-29',
    listDescription: "原神の空月の祝福でもらえる創世結晶・原石と、10日・20日・30日の受取量を解説。ガチャの期限に合わせた選び方、Google Play Pointsと購入経路の違いも確認できます。",
    title: "原神「空月の祝福」で次のガチャに備える｜最大3,000原石相当と受取日数",
    category: '使い方',
    gameTitle: '原神',
    listTitle: "原神の空月の祝福｜次のガチャまでに何個受け取れる？",
    tags: ['原神', '空月の祝福', '月パス', 'Play Points'],
    description: "原神の空月の祝福でもらえる創世結晶・原石と、10日・20日・30日の受取量を解説。ガチャの期限に合わせた選び方、Google Play Pointsと購入経路の違いも確認できます。",
    file: '../games/genshin/welkin-value/index.html',
    related: [
      ["/articles/2025-12-25-subscription.html","定期購入でもPlay Pointsが貯まる条件を確認する"],
      ["/articles/2025-12-25-campaign.html","増量キャンペーンを待つべきか判断する"],
      ["/articles/2025-12-25-best-use.html","獲得ポイントをどこで使うか確認する"]
    ]
  },
  {
    id: 'monst-google-play-vs-webshop-2026',
    modified: '2026-10-29',
    listDescription: "Web商品のオーブ数と過去のアプリ内販売例を確認。ポイントの使い道も含めて購入先を選べます。",
    title: "モンストのオーブはどこで買う？WebショップとGoogle Playを比較",
    category: '使い方',
    gameTitle: 'モンスト',
    listTitle: "モンストの購入先早見表｜1万円でオーブ何個？",
    tags: ['モンスト', 'Webショップ', 'オーブ', 'Play Points'],
    description: "モンストのWebショップとGoogle Playを比較。商品の個数、Play Points、過去のアプリ内販売例を分けて購入先を選びます。",
    file: '../games/monst/google-play-vs-webshop/index.html',
    related: [
      ["/articles/2026-09-19-monst-web-shop-vs-google-play.html","1万円課金のポイント価値・損得分岐点を計算する"],
      ["/articles/2026-09-19-monst-in-app-packs-guide.html","モンストのパック・モンパスを目的から選ぶ"],
      ["/articles/2026-08-05-play-points-multiplier-stacking.html","特別獲得率の扱いを確認する"]
    ]
  },
  {
    id: 'starrail-supply-pass-value-2026',
    modified: '2026-10-29',
    editorialNext: true,
    listDescription: "列車補給標章を毎日受け取れる場合と、すぐ星玉が必要な場合を比較。通常購入との違いを確認できます。",
    title: "スタレの列車補給標章で次のガチャに備える｜毎日受取と即時チャージの違い",
    category: '使い方',
    gameTitle: 'スタレ',
    listTitle: "スタレの列車補給標章｜ガチャ終了までの受取日数で選ぶ",
    tags: ['スタレ', '崩壊スターレイル', '列車補給標章', '月パス', 'Play Points'],
    description: "列車補給標章の最大3,000星玉相当を、10日・20日・30日の受取量で比較。欲しいガチャに間に合うか、即時チャージとGoogle Play Pointsをどう比べるかを解説します。",
    file: '../games/starrail/supply-pass-value/index.html',
    related: [
      ["/articles/2025-12-25-subscription.html","定期購入のPlay Points条件を確認する"],
      ["/articles/2025-12-25-campaign.html","購入前に増量オファーの条件を確認する"],
      ["/articles/2025-12-25-best-use.html","獲得ポイントをどこで使うか確認する"]
    ]
  },
  {
    id: 'zzz-membership-value-2026',
    modified: '2026-10-30',
    listDescription: "ゼンゼロのインターノット会員は購入時のモノクローム300個と毎日90ポリクローム。10日・20日・30日に使える量と、即時チャージとの違いを解説します。",
    title: "ゼンゼロのインターノット会員で毎日90ポリクローム！30日間の受取内容",
    category: '使い方',
    gameTitle: 'ゼンゼロ',
    listTitle: "ゼンゼロのインターノット会員｜毎日90個とガチャまでの受取量",
    tags: ['ゼンゼロ', 'ゼンレスゾーンゼロ', 'インターノット会員', '月パス', 'Play Points'],
    description: "ゼンゼロのインターノット会員は購入時のモノクローム300個と毎日90ポリクローム。10日・20日・30日に使える量と、即時チャージとの違いを解説します。",
    file: '../games/zzz/membership-value/index.html',
    related: [
      ["/articles/2025-12-25-subscription.html","定期購入のPlay Points条件を確認する"],
      ["/articles/2025-12-25-campaign.html","購入前に増量オファーの条件を確認する"],
      ["/articles/2025-12-25-best-use.html","獲得ポイントをどこで使うか確認する"]
    ]
  },
  {
    id: 'umamusume-umasuku-value-2026',
    modified: '2026-10-30',
    listDescription: "月980円のウマスクを使い切れるか確認。ジュエル、未受取時の扱い、WebStoreとGoogle Playの違いが分かります。",
    title: "ウマ娘のウマスクは月980円｜毎日のジュエルと育成特典をチェック",
    category: '使い方',
    gameTitle: 'ウマ娘',
    listTitle: "ウマスク月980円｜毎日のジュエルと育成特典",
    tags: ['ウマ娘', 'ウマスク', 'Cygames WebStore', '月額', 'Play Points'],
    description: "ウマ娘の現行月額「ウマスク」を公式情報で整理。月980円、ジュエル、未受取仕様、WebStoreとGoogle Playの違いを比較します。",
    file: '../games/umamusume/umasuku-value/index.html',
    related: [
      ["/articles/2025-12-25-subscription.html","月額サービスのPlay Points条件を確認する"],
      ["/articles/2026-08-19-web-store-external-billing-points.html","Webストア決済との違いを確認する"],
      ["/articles/2025-12-25-best-use.html","獲得ポイントをどこで使うか確認する"]
    ]
  },
  {
    id: 'proseka-google-play-vs-webstore-2026',
    modified: '2026-10-30',
    editorialNext: true,
    listDescription: "カラフルパス3種とミッションパス、公式WebStoreを比較。商品ごとの内容と購入経路の違いを確認できます。",
    title: "プロセカの課金はどこで買う？公式WebStore・カラフルパスの選び方",
    category: '使い方',
    gameTitle: 'プロセカ',
    listTitle: "プロセカのカラフルパスとWebStore｜BASIC・DELUXEで選ぶ",
    tags: ['プロセカ', 'WebStore', 'カラフルパス', 'クリスタル', 'Play Points'],
    description: "プロセカ公式WebStoreの価格とカラフルパス3種を比較。毎日分の無償クリスタル、即時購入、有償限定ガチャ、Google Play Pointsの違いから選び方を解説します。",
    file: '../games/proseka/google-play-vs-webstore/index.html',
    related: [
      ["/articles/2026-08-19-web-store-external-billing-points.html","公式WebストアとGoogle Play課金の違いを確認する"],
      ["/articles/2025-12-25-subscription.html","月額商品のPlay Points条件を確認する"],
      ["/articles/2025-12-25-best-use.html","獲得ポイントをどこで使うか確認する"]
    ]
  },
  {
    id: 'pokepoke-premium-pass-guide-2026',
    modified: '2026-10-29',
    listDescription: "プレミアムパスを試す前に、14日無料体験と定期購入の条件を確認。Googleアカウントとの紐付けにも注意できます。",
    title: "ポケポケのプレミアムパスで1日1パック追加！特典と14日無料体験",
    category: '使い方',
    gameTitle: 'ポケポケ',
    listTitle: "ポケポケで1日1パック追加！プレミアムパスの特典と無料体験",
    tags: ['ポケポケ', 'Pokémon TCG Pocket', 'プレミアムパス', '無料体験', 'Play Points'],
    description: "Pokémon TCG Pocketのプレミアムパスを、1か月の定期購入、14日無料体験、Googleアカウントとの紐付け、Play Pointsから整理します。",
    file: '../games/pokepoke/premium-pass-guide/index.html',
    related: [
      ["/articles/2025-12-25-subscription.html","定期購入・無料体験のPlay Points条件を確認する"],
      ["/articles/2025-12-25-multiple-accounts.html","複数Googleアカウント利用時の注意点を見る"],
      ["/articles/2025-12-25-best-use.html","獲得ポイントをどこで使うか確認する"]
    ]
  },
  {
    id: 'pad-pass-value-2026',
    modified: '2026-10-30',
    listDescription: "月980円のパズドラパスと1週間無料トライアルの条件を確認。毎日のダンジョンや特典を使い切れるか判断できます。",
    title: "パズドラパスは月額980円で何が得？無料トライアル・特典・Play Points【2026年】",
    category: '使い方',
    gameTitle: 'パズドラ',
    listTitle: "パズドラパス月980円｜特典と向いている遊び方",
    tags: ['パズドラ', 'パズドラパス', '無料トライアル', '月額', 'Play Points'],
    description: "パズドラパスの月額980円、1週間無料トライアル、毎日ダンジョンや常設特典とGoogle Play Pointsを整理します。",
    file: '../games/pad/pad-pass-value/index.html',
    related: [
      ["/articles/2025-12-25-subscription.html","定期購入・無料体験のPlay Points条件を確認する"],
      ["/articles/2026-08-25-pad-puzzle-and-dragons-play-points.html","パズドラ課金全体の選び方を確認する"],
      ["/articles/2025-12-25-best-use.html","獲得ポイントをどこで使うか確認する"]
    ]
  },
  {
    id: 'arknights-monthly-pass-limited-scout-2026',
    modified: '2026-10-29',
    listDescription: "アークナイツの月パスで受け取れる純正源石6個、毎日の合成玉200個と理性回復剤を解説。スカウトまでの受取日数、購入額とPlay Points、限定300回の補足も掲載します。",
    title: "アークナイツの月パスでスカウトに備える｜30日間の合成玉と受取日数",
    category: '使い方',
    gameTitle: 'アークナイツ',
    listTitle: "アークナイツの月パス｜毎日の合成玉で次のスカウトに備える",
    tags: ['アークナイツ', '月パス', '限定スカウト', '300連', 'Play Points'],
    description: "アークナイツの月パスで受け取れる純正源石6個、毎日の合成玉200個と理性回復剤を解説。スカウトまでの受取日数、購入額とPlay Points、限定300回の補足も掲載します。",
    file: '../games/arknights/monthly-pass-limited-scout/index.html',
    related: [
      ["/articles/2025-12-25-subscription.html","定期購入のPlay Points条件を確認する"],
      ["/articles/2025-12-25-campaign.html","期間キャンペーンの確認方法を見る"],
      ["/articles/2025-12-25-best-use.html","獲得ポイントをどこで使うか確認する"]
    ]
  },
  {
    id: 'dokkan-google-play-vs-webstore-2026',
    modified: '2026-10-29',
    editorialNext: true,
    listDescription: "公式Web StoreとGoogle Playは別決済。価格とポイントの対象経路を、購入前に比べられます。",
    title: "ドッカンバトルの龍石購入ガイド｜Web Storeの特典・受取場所と比較のコツ",
    category: '使い方',
    gameTitle: 'ドッカン',
    listTitle: "ドッカンの龍石購入｜Web特典と受取場所を確認",
    tags: ['ドッカンバトル', '龍石', 'Web Store', 'Play Points'],
    description: "ドッカンバトルの龍石購入を、同額での個数とPlay Pointsで比較。仮の価格例、Web Store購入後の反映場所・履歴まで説明します。",
    file: '../games/dokkan/google-play-vs-webstore/index.html',
    related: [
      ["/articles/2026-08-19-web-store-external-billing-points.html","公式WebストアとGoogle Play課金の違いを確認する"],
      ["/articles/2026-08-25-dokkan-battle-dragon-ball-play-points.html","ドッカン課金全体の選び方を見る"],
      ["/articles/2025-12-25-best-use.html","獲得ポイントをどこで使うか確認する"]
    ]
  },
  {
    id: 'hbr-google-play-vs-webshop-2026',
    modified: '2026-10-30',
    listDescription: "WEB SHOPの5%OFFと専用ポイントを、Google Playの還元と比較。Webでは加入できない月額パスにも注意できます。",
    title: "ヘブバンWEB SHOPで5%OFF｜パス・独自ポイントとGoogle Playの違い",
    category: '使い方',
    gameTitle: 'ヘブバン',
    listTitle: "ヘブバンWEB SHOP｜5%OFFとパス・ポイントの違い",
    tags: ['ヘブバン', 'WEB SHOP', 'クォーツ', '月額パス', 'Play Points'],
    description: "ヘブバン公式WEB SHOPの5%OFF、WEB SHOPポイント、WEB限定クォーツ、月額パス加入不可の条件をGoogle Play Pointsと分けて比較します。",
    file: '../games/hbr/google-play-vs-webshop/index.html',
    related: [
      ["/articles/2026-08-19-web-store-external-billing-points.html","公式WebストアとGoogle Play課金の違いを確認する"],
      ["/articles/2025-12-25-campaign.html","割引・キャンペーンの比較方法を見る"],
      ["/articles/2025-12-25-best-use.html","獲得ポイントをどこで使うか確認する"]
    ]
  },
  {
    id: 'honkai3rd-google-play-vs-charge-center-2026',
    modified: '2026-10-29',
    listDescription: "崩壊3rdの水晶2倍ボーナスは購入先を変えても別々にもらえる？公式案内をもとに、チャージセンターとGoogle Playの選び方を整理します。",
    title: "崩壊3rdの水晶2倍ボーナスと購入先｜公式チャージセンター・Google Playの違い",
    category: '使い方',
    gameTitle: '崩壊3rd',
    listTitle: "崩壊3rdの水晶2倍ボーナス｜チャージセンターとゲーム内で共通",
    tags: ['崩壊3rd', 'チャージセンター', '月パス', 'Play Points'],
    description: "崩壊3rdの水晶2倍ボーナスは購入先を変えても別々にもらえる？公式案内をもとに、チャージセンターとGoogle Playの選び方を整理します。",
    file: '../games/honkai3rd/google-play-vs-charge-center/index.html',
    related: [
      ["/articles/2026-08-19-web-store-external-billing-points.html","外部決済とGoogle Play課金の違いを見る"],
      ["/articles/2025-12-25-campaign.html","期間限定割引を比較する時の確認点を見る"],
      ["/articles/2025-12-25-best-use.html","獲得ポイントをどこで使うか確認する"]
    ]
  },
  {
    id: 'phantomparade-google-play-vs-webshop-2026',
    modified: '2026-10-29',
    listDescription: "ファンパレ公式WEBショップで確認した廻珠増量・マイルpt・パスの内容を紹介。初回条件と使い道、Google Play Pointsを含めて購入先を比べる手順を解説します。",
    title: "ファンパレWEBショップで廻珠増量！初回特典・マイルと購入先の選び方",
    category: '使い方',
    gameTitle: 'ファンパレ',
    listTitle: "ファンパレWEBショップ｜廻珠増量・マイル・パスの選び方",
    tags: ['ファンパレ', 'WEBショップ', '廻珠', 'マイル', 'Play Points'],
    description: "ファンパレ公式WEBショップで確認した廻珠増量・マイルpt・パスの内容を紹介。初回条件と使い道、Google Play Pointsを含めて購入先を比べる手順を解説します。",
    file: '../games/phantomparade/google-play-vs-webshop/index.html',
    related: [
      ["/articles/2026-08-19-web-store-external-billing-points.html","公式WebストアとGoogle Play課金の違いを見る"],
      ["/articles/2025-12-25-campaign.html","購入前に増量オファーの条件を確認する"],
      ["/articles/2025-12-25-best-use.html","獲得ポイントをどこで使うか確認する"]
    ]
  },
  {
    id: 'prospi-a-google-play-vs-konami-store-2026',
    modified: '2026-10-29',
    listDescription: "プロスピAのウェブストア「KONAMI Gamesストア」の還元を解説。パワスピ・ゴールドとdポイント、Google Play Pointsの違い、エナジーの価格と個数を比べる手順を紹介します。",
    title: "プロスピAのエナジー購入ガイド｜KONAMIストアの還元とGoogle Play Points",
    category: '使い方',
    gameTitle: 'プロスピA',
    listTitle: "プロスピAのエナジー購入｜Gamesストアの還元とPlay Points",
    tags: ['プロスピA', 'ウェブストア', 'KONAMI Gamesストア', 'パワスピ・ゴールド', 'dポイント', 'Play Points'],
    description: "プロスピAのウェブストア「KONAMI Gamesストア」の還元を解説。パワスピ・ゴールドとdポイント、Google Play Pointsの違い、エナジーの価格と個数を比べる手順を紹介します。",
    file: '../games/prospi-a/google-play-vs-konami-store/index.html',
    related: [
      ["/articles/2026-08-19-web-store-external-billing-points.html","公式WebストアとGoogle Play課金の違いを見る"],
      ["/articles/2025-12-25-campaign.html","購入前に増量オファーの条件を確認する"],
      ["/articles/2025-12-25-best-use.html","獲得ポイントをどこで使うか確認する"]
    ]
  },
  {
    id: 'pokemon-go-google-play-vs-webstore-2026',
    modified: '2026-10-29',
    listDescription: "ポケコインを買う前に、公式Web StoreのボーナスとGoogle Playの還元を比較。Reward RoadやGalaxy Storeとの違いも確認できます。",
    title: "ポケモンGOの課金はどこがお得？Google PlayとWeb Storeを比較",
    category: '使い方',
    gameTitle: 'Pokémon GO',
    listTitle: "ポケモンGOの購入先選び｜ポケコイン・Reward Roadで比較",
    tags: ['Pokémon GO', 'Web Store', 'ポケコイン', 'Reward Road', 'Play Points'],
    description: "Pokémon GOのGoogle Play課金と公式Web Storeを、ボーナスポケコイン、Reward Road、Galaxy Storeとの違い、Google Play Pointsの観点から比較します。",
    file: '../games/pokemon-go/google-play-vs-webstore/index.html',
    related: [
      ["/articles/2026-08-19-web-store-external-billing-points.html","公式WebストアとGoogle Play課金の違いを見る"],
      ["/articles/2025-12-25-campaign.html","期間限定ボーナスを比較する時の確認点を見る"],
      ["/articles/2025-12-25-best-use.html","獲得ポイントをどこで使うか確認する"]
    ]
  },
  {
    id: 'efootball-google-play-points-vs-efootball-points-2026',
    modified: '2026-10-30',
    listDescription: "コイン、eFootballポイント、GP、Play Pointsは別のもの。課金で増える数字と使い道を確認できます。",
    title: "eFootballコイン購入でGoogle Play Pointsは貯まる？eFootballポイントとの違い【2026年】",
    category: '使い方',
    gameTitle: 'eFootball',
    listTitle: "eFootballコインと2つのポイント｜Google Play・KONAMIの違い",
    tags: ['eFootball', 'eFootballポイント', 'コイン', 'KONAMI', 'Play Points'],
    description: "eFootballコインのGoogle Play課金と、KONAMI独自のeFootballポイント、GP、Google Play Pointsの違いを公式情報で整理します。",
    file: '../games/efootball/google-play-points-vs-efootball-points/index.html',
    related: [
      ["/articles/2025-12-25-campaign.html","Play Pointsキャンペーンの確認方法を見る"],
      ["/articles/2025-12-25-best-use.html","Google Play Pointsの使い道を比較する"],
      ["/articles/2026-03-10-play-points-reflection-timing.html","購入後のPlay Pointsが見えないときの確認順"]
    ]
  }
].map(article => Object.freeze({
  ...article,
  date: PUBLISHED_AT,
  modified: article.modified || MODIFIED_AT,
  ogp: '../ogp.png',
  ...resolveGameThumbnail(article.gameTitle),
  source: 'game-guide',
  listed: true
})));

const GAME_GUIDE_FILE_SET = new Set(GAME_GUIDE_ARTICLES.map(article => article.file));
const GAME_GUIDE_PATH_SET = new Set(GAME_GUIDE_ARTICLES.map(article => article.file.replace(/^\.\.\//, '')));

function normalizeRepoPath(value) {
  const normalized = String(value || '').replaceAll('\\', '/').replace(/^\.\//, '').replace(/^\.\.\//, '').replace(/^\/(?!\/)/, '');
  return /^games\/[a-z0-9-]+\/[a-z0-9-]+\/$/.test(normalized) ? normalized + 'index.html' : normalized;
}

function isGameGuideArticleFile(file) {
  return GAME_GUIDE_FILE_SET.has(String(file || ''));
}

function isGameGuideArticlePath(relativePath) {
  return GAME_GUIDE_PATH_SET.has(normalizeRepoPath(relativePath));
}

function isSupportedJapaneseArticleManifestFile(file) {
  const value = String(file || '');
  return /^\.\.\/articles\/[^/]+\.html$/.test(value) || isGameGuideArticleFile(value);
}

function getJapaneseArticleRepoPaths(rootDir) {
  const directory = path.join(rootDir, 'articles');
  const standard = fs.existsSync(directory)
    ? fs.readdirSync(directory, { withFileTypes: true })
      .filter(entry => entry.isFile() && entry.name.endsWith('.html') && entry.name !== 'index.html')
      .map(entry => 'articles/' + entry.name)
    : [];
  const manifestPath = path.join(rootDir, 'blog', 'articles.json');
  const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : [];
  if (!Array.isArray(manifest)) throw new TypeError('記事一覧は配列である必要があります');
  const registered = manifest.map(article => article && article.file)
    .filter(isSupportedJapaneseArticleManifestFile)
    .map(file => file.slice(3));
  return [...new Set([...standard, ...registered])].sort();
}

function syncGameGuideArticleManifest(rootDir) {
  const manifestPath = path.join(rootDir, 'blog', 'articles.json');
  const existing = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const guideIds = new Set(GAME_GUIDE_ARTICLES.map(article => article.id));
  const guideFiles = new Set(GAME_GUIDE_ARTICLES.map(article => article.file));
  const base = existing.filter(article => !guideIds.has(article?.id) && !guideFiles.has(article?.file) && article?.source !== 'game-guide');
  const merged = [...GAME_GUIDE_ARTICLES.map(article => ({ ...article, browseCategory: 'ゲーム別課金' })), ...base];
  const next = JSON.stringify(merged, null, 2) + '\n';
  const previous = fs.readFileSync(manifestPath, 'utf8');
  if (next === previous) return { changed: false, total: merged.length, gameGuides: GAME_GUIDE_ARTICLES.length };
  fs.writeFileSync(manifestPath, next, 'utf8');
  return { changed: true, total: merged.length, gameGuides: GAME_GUIDE_ARTICLES.length };
}

function articleForPath(relativePath) {
  const normalized = normalizeRepoPath(relativePath);
  return GAME_GUIDE_ARTICLES.find(article => normalizeRepoPath(article.file) === normalized) || null;
}

module.exports = {
  GAME_GUIDE_ARTICLES,
  GAME_GUIDE_FILE_SET,
  GAME_GUIDE_PATH_SET,
  MODIFIED_AT,
  PUBLISHED_AT,
  articleForPath,
  getJapaneseArticleRepoPaths,
  isGameGuideArticleFile,
  isGameGuideArticlePath,
  isSupportedJapaneseArticleManifestFile,
  normalizeRepoPath,
  syncGameGuideArticleManifest
};
