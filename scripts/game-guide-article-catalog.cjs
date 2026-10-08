'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { resolveGameThumbnail } = require('./game-thumbnail-assets.cjs');

const PUBLISHED_AT = '2026-09-13';
const MODIFIED_AT = '2026-10-08';

const GAME_GUIDE_ARTICLES = Object.freeze([
  {
    id: 'fgo-pity-cost-2026',
    listDescription: "天井330回までの費用を知りたい方へ。必要な聖晶石、最小購入例、福袋の有償15個とポイント還元を確認できます。",
    title: 'FGO天井330回はいくら？聖晶石価格・福袋・Play Points還元【2026年】',
    category: '使い方',
    gameTitle: 'FGO',
    listTitle: 'FGO｜天井330回の費用・福袋・ポイント還元',
    tags: ['FGO', '聖晶石', '天井', '福袋', 'Play Points'],
    description: 'FGOの確定召喚330回に必要な聖晶石と課金額を、現行の公式価格から計算。ゼロからの最小購入例、福袋の有償15個、Google Play Points還元をまとめます。',
    file: '../games/fgo/pity-cost/index.html',
    related: [
      ["/articles/2026-08-05-play-points-multiplier-stacking.html","倍率キャンペーン時のPlay Pointsを確認する"],
      ["/articles/2026-06-20-discount-gift-cards.html","Google Playギフトコードの割引購入前に確認する"],
      ["/articles/2025-12-25-best-use.html","獲得ポイントをどこで使うか確認する"]
    ]
  },
  {
    id: 'genshin-welkin-value-2026',
    listDescription: "毎日受け取る空月の祝福と、今すぐ使える通常チャージを比較。受取日数とガチャの予定から選べます。",
    title: '原神「空月の祝福」はどれくらいお得？原石3000相当とPlay Points',
    category: '使い方',
    gameTitle: '原神',
    listTitle: '原神｜空月の祝福の価値と受け取り方',
    tags: ['原神', '空月の祝福', '月パス', 'Play Points'],
    description: '原神の空月の祝福を、最大3,000原石相当・Google Play Pointsの観点で比較。通常チャージや90連・180連との違いも整理します。',
    file: '../games/genshin/welkin-value/index.html',
    related: [
      ["/articles/2025-12-25-subscription.html","定期購入でもPlay Pointsが貯まる条件を確認する"],
      ["/articles/2025-12-25-campaign.html","増量キャンペーンを待つべきか判断する"],
      ["/articles/2025-12-25-best-use.html","獲得ポイントをどこで使うか確認する"]
    ]
  },
  {
    id: 'monst-google-play-vs-webshop-2026',
    listDescription: "同じ1万円でアプリ180個、Web190個、月イチ200個。ポイントの利用価値も含めて購入先を選べます。",
    title: 'モンストのオーブはどこで買う？アプリ180個・Web190個・月イチ200個を比較',
    category: '使い方',
    gameTitle: 'モンスト',
    listTitle: 'モンスト｜購入経路・オーブ数の基本比較',
    tags: ['モンスト', 'Webショップ', 'オーブ', 'Play Points'],
    description: 'モンストの1万円課金を比較。アプリ内180個、Webショップ190個、月イチ200個の差とGoogle Play Pointsを含めた選び方を整理します。',
    file: '../games/monst/google-play-vs-webshop/index.html',
    related: [
      ["/articles/2026-09-19-monst-web-shop-vs-google-play.html","1万円課金のポイント価値・損得分岐点を計算する"],
      ["/articles/2026-09-19-monst-in-app-packs-guide.html","モンストのパック・モンパスを目的から選ぶ"],
      ["/articles/2026-08-05-play-points-multiplier-stacking.html","特別獲得率の扱いを確認する"]
    ]
  },
  {
    id: 'starrail-supply-pass-value-2026',
    editorialNext: true,
    listDescription: "列車補給標章を毎日受け取れる場合と、すぐ星玉が必要な場合を比較。通常購入との違いを確認できます。",
    title: 'スタレ「列車補給標章」は買うべき？毎日受取と即時チャージの違い',
    category: '使い方',
    gameTitle: 'スタレ',
    listTitle: 'スタレ｜列車補給標章と通常購入を比較',
    tags: ['スタレ', '崩壊スターレイル', '列車補給標章', '月パス', 'Play Points'],
    description: '列車補給標章の最大3,000星玉相当を、10日・20日・30日の受取量で比較。欲しいガチャに間に合うか、即時チャージとGoogle Play Pointsをどう比べるかを解説します。',
    file: '../games/starrail/supply-pass-value/index.html',
    related: [
      ["/articles/2025-12-25-subscription.html","定期購入のPlay Points条件を確認する"],
      ["/articles/2025-12-25-campaign.html","購入前に増量オファーの条件を確認する"],
      ["/articles/2025-12-25-best-use.html","獲得ポイントをどこで使うか確認する"]
    ]
  },
  {
    id: 'zzz-membership-value-2026',
    listDescription: "インターノット会員と通常購入を、受取日数と必要なタイミングで比較。ポイント還元も分けて考えられます。",
    title: 'ゼンゼロ「インターノット会員」はお得？3,000ポリクローム相当の受取条件',
    category: '使い方',
    gameTitle: 'ゼンゼロ',
    listTitle: 'ゼンゼロ｜インターノット会員の価値',
    tags: ['ゼンゼロ', 'ゼンレスゾーンゼロ', 'インターノット会員', '月パス', 'Play Points'],
    description: 'ゼンレスゾーンゼロのインターノット会員を最大3,000ポリクローム相当・受取速度・Google Play Pointsで比較します。',
    file: '../games/zzz/membership-value/index.html',
    related: [
      ["/articles/2025-12-25-subscription.html","定期購入のPlay Points条件を確認する"],
      ["/articles/2025-12-25-campaign.html","購入前に増量オファーの条件を確認する"],
      ["/articles/2025-12-25-best-use.html","獲得ポイントをどこで使うか確認する"]
    ]
  },
  {
    id: 'umamusume-umasuku-value-2026',
    listDescription: "月980円のウマスクを使い切れるか確認。ジュエル、未受取時の扱い、WebStoreとGoogle Playの違いが分かります。",
    title: 'ウマ娘「ウマスク」はどれくらいお得？月980円・ジュエル・Play Points比較【2026年】',
    category: '使い方',
    gameTitle: 'ウマ娘',
    listTitle: 'ウマ娘｜ウマスクの内容と購入先の違い',
    tags: ['ウマ娘', 'ウマスク', 'Cygames WebStore', '月額', 'Play Points'],
    description: 'ウマ娘の現行月額「ウマスク」を公式情報で整理。月980円、ジュエル、未受取仕様、WebStoreとGoogle Playの違いを比較します。',
    file: '../games/umamusume/umasuku-value/index.html',
    related: [
      ["/articles/2025-12-25-subscription.html","月額サービスのPlay Points条件を確認する"],
      ["/articles/2026-08-19-web-store-external-billing-points.html","Webストア決済との違いを確認する"],
      ["/articles/2025-12-25-best-use.html","獲得ポイントをどこで使うか確認する"]
    ]
  },
  {
    id: 'proseka-google-play-vs-webstore-2026',
    editorialNext: true,
    listDescription: "カラフルパス3種とミッションパス、公式WebStoreを比較。商品ごとの内容と購入経路の違いを確認できます。",
    title: 'プロセカの課金はどこで買う？公式WebStore・カラフルパスの選び方',
    category: '使い方',
    gameTitle: 'プロセカ',
    listTitle: 'プロセカ｜パス・クリスタルの購入先比較',
    tags: ['プロセカ', 'WebStore', 'カラフルパス', 'クリスタル', 'Play Points'],
    description: 'プロセカ公式WebStoreの価格とカラフルパス3種を比較。毎日分の無償クリスタル、即時購入、有償限定ガチャ、Google Play Pointsの違いから選び方を解説します。',
    file: '../games/proseka/google-play-vs-webstore/index.html',
    related: [
      ["/articles/2026-08-19-web-store-external-billing-points.html","公式WebストアとGoogle Play課金の違いを確認する"],
      ["/articles/2025-12-25-subscription.html","月額商品のPlay Points条件を確認する"],
      ["/articles/2025-12-25-best-use.html","獲得ポイントをどこで使うか確認する"]
    ]
  },
  {
    id: 'pokepoke-premium-pass-guide-2026',
    listDescription: "プレミアムパスを試す前に、14日無料体験と定期購入の条件を確認。Googleアカウントとの紐付けにも注意できます。",
    title: 'ポケポケのプレミアムパスは何が得？14日無料体験と自動更新の注意点',
    category: '使い方',
    gameTitle: 'ポケポケ',
    listTitle: 'ポケポケ｜プレミアムパスと無料体験',
    tags: ['ポケポケ', 'Pokémon TCG Pocket', 'プレミアムパス', '無料体験', 'Play Points'],
    description: 'Pokémon TCG Pocketのプレミアムパスを、1か月の定期購入、14日無料体験、Googleアカウントとの紐付け、Play Pointsから整理します。',
    file: '../games/pokepoke/premium-pass-guide/index.html',
    related: [
      ["/articles/2025-12-25-subscription.html","定期購入・無料体験のPlay Points条件を確認する"],
      ["/articles/2025-12-25-multiple-accounts.html","複数Googleアカウント利用時の注意点を見る"],
      ["/articles/2025-12-25-best-use.html","獲得ポイントをどこで使うか確認する"]
    ]
  },
  {
    id: 'pad-pass-value-2026',
    listDescription: "月980円のパズドラパスと1週間無料トライアルの条件を確認。毎日のダンジョンや特典を使い切れるか判断できます。",
    title: 'パズドラパスは月額980円で何が得？無料トライアル・特典・Play Points【2026年】',
    category: '使い方',
    gameTitle: 'パズドラ',
    listTitle: 'パズドラ｜パスの特典と無料トライアル',
    tags: ['パズドラ', 'パズドラパス', '無料トライアル', '月額', 'Play Points'],
    description: 'パズドラパスの月額980円、1週間無料トライアル、毎日ダンジョンや常設特典とGoogle Play Pointsを整理します。',
    file: '../games/pad/pad-pass-value/index.html',
    related: [
      ["/articles/2025-12-25-subscription.html","定期購入・無料体験のPlay Points条件を確認する"],
      ["/articles/2026-08-25-pad-puzzle-and-dragons-play-points.html","パズドラ課金全体の選び方を確認する"],
      ["/articles/2025-12-25-best-use.html","獲得ポイントをどこで使うか確認する"]
    ]
  },
  {
    id: 'arknights-monthly-pass-limited-scout-2026',
    listDescription: "月パスの受取内容と、限定スカウト300回の条件を確認。必要な時期とGoogle Playでの購入額を分けて考えられます。",
    title: 'アークナイツの月パスは何が得？内容と限定300連の仕組み',
    category: '使い方',
    gameTitle: 'アークナイツ',
    listTitle: 'アークナイツ｜月パスと限定300連の考え方',
    tags: ['アークナイツ', '月パス', '限定スカウト', '300連', 'Play Points'],
    description: 'アークナイツの月パス内容と限定スカウト300回の仕様を公式情報で整理し、Google Play価格とPlay Pointsを分けて解説します。',
    file: '../games/arknights/monthly-pass-limited-scout/index.html',
    related: [
      ["/articles/2025-12-25-subscription.html","定期購入のPlay Points条件を確認する"],
      ["/articles/2025-12-25-campaign.html","期間キャンペーンの確認方法を見る"],
      ["/articles/2025-12-25-best-use.html","獲得ポイントをどこで使うか確認する"]
    ]
  },
  {
    id: 'dokkan-google-play-vs-webstore-2026',
    editorialNext: true,
    listDescription: "公式Web StoreとGoogle Playは別決済。価格とポイントの対象経路を、購入前に比べられます。",
    title: 'ドッカンバトルの龍石はどこで買う？Google PlayとWeb Storeの選び方',
    category: '使い方',
    gameTitle: 'ドッカン',
    listTitle: 'ドッカン｜Google Playと公式ストアを比較',
    tags: ['ドッカンバトル', '龍石', 'Web Store', 'Play Points'],
    description: 'ドッカンバトルの龍石購入を、同額での個数とPlay Pointsで比較。仮の価格例、Web Store購入後の反映場所・履歴まで説明します。',
    file: '../games/dokkan/google-play-vs-webstore/index.html',
    related: [
      ["/articles/2026-08-19-web-store-external-billing-points.html","公式WebストアとGoogle Play課金の違いを確認する"],
      ["/articles/2026-08-25-dokkan-battle-dragon-ball-play-points.html","ドッカン課金全体の選び方を見る"],
      ["/articles/2025-12-25-best-use.html","獲得ポイントをどこで使うか確認する"]
    ]
  },
  {
    id: 'hbr-google-play-vs-webshop-2026',
    listDescription: "WEB SHOPの5%OFFと専用ポイントを、Google Playの還元と比較。Webでは加入できない月額パスにも注意できます。",
    title: 'ヘブバンの課金はWebが得？5%OFFとパス・Play Pointsの違い',
    category: '使い方',
    gameTitle: 'ヘブバン',
    listTitle: 'ヘブバン｜Google PlayとWebショップを比較',
    tags: ['ヘブバン', 'WEB SHOP', 'クォーツ', '月額パス', 'Play Points'],
    description: 'ヘブバン公式WEB SHOPの5%OFF、WEB SHOPポイント、WEB限定クォーツ、月額パス加入不可の条件をGoogle Play Pointsと分けて比較します。',
    file: '../games/hbr/google-play-vs-webshop/index.html',
    related: [
      ["/articles/2026-08-19-web-store-external-billing-points.html","公式WebストアとGoogle Play課金の違いを確認する"],
      ["/articles/2025-12-25-campaign.html","割引・キャンペーンの比較方法を見る"],
      ["/articles/2025-12-25-best-use.html","獲得ポイントをどこで使うか確認する"]
    ]
  },
  {
    id: 'honkai3rd-google-play-vs-charge-center-2026',
    listDescription: "Google Playと公式チャージセンターで、2倍特典・月パス延長・割引の扱いを確認。購入する商品の条件から選べます。",
    title: '崩壊3rdはGoogle Playと公式チャージセンターどっち？2倍特典・月パス・Play Points【2026年】',
    category: '使い方',
    gameTitle: '崩壊3rd',
    listTitle: '崩壊3rd｜Google Playとチャージセンターを比較',
    tags: ['崩壊3rd', 'チャージセンター', '月パス', 'Play Points'],
    description: '崩壊3rdのGoogle Play購入とHoYoverse公式チャージセンターを、2倍特典、月パス延長、期間限定割引、Play Pointsの違いから整理します。',
    file: '../games/honkai3rd/google-play-vs-charge-center/index.html',
    related: [
      ["/articles/2026-08-19-web-store-external-billing-points.html","外部決済とGoogle Play課金の違いを見る"],
      ["/articles/2025-12-25-campaign.html","期間限定割引を比較する時の確認点を見る"],
      ["/articles/2025-12-25-best-use.html","獲得ポイントをどこで使うか確認する"]
    ]
  },
  {
    id: 'phantomparade-google-play-vs-webshop-2026',
    listDescription: "公式WEBショップの増量、マイルpt、パス商品を比較。Google Play Pointsと別の特典として判断できます。",
    title: 'ファンパレはGoogle PlayとWEBショップどっちがお得？増量・マイル・Play Points比較【2026年】',
    category: '使い方',
    gameTitle: 'ファンパレ',
    listTitle: 'ファンパレ｜Google PlayとWEBショップを比較',
    tags: ['ファンパレ', 'WEBショップ', '廻珠', 'マイル', 'Play Points'],
    description: 'ファンパレ公式WEBショップの増量率、マイルpt、パス商品とGoogle Play Pointsを別軸で比較します。',
    file: '../games/phantomparade/google-play-vs-webshop/index.html',
    related: [
      ["/articles/2026-08-19-web-store-external-billing-points.html","公式WebストアとGoogle Play課金の違いを見る"],
      ["/articles/2025-12-25-campaign.html","購入前に増量オファーの条件を確認する"],
      ["/articles/2025-12-25-best-use.html","獲得ポイントをどこで使うか確認する"]
    ]
  },
  {
    id: 'prospi-a-google-play-vs-konami-store-2026',
    listDescription: "Google PlayとKONAMI Gamesストアの購入経路を比較。Play Points、パワスピ・ゴールド、dポイントの違いが分かります。",
    title: 'プロスピAの課金はどこがお得？KONAMIストアの還元とGoogle Playを比較',
    category: '使い方',
    gameTitle: 'プロスピA',
    listTitle: 'プロスピA｜Google PlayとKONAMIストアを比較',
    tags: ['プロスピA', 'KONAMI Gamesストア', 'パワスピ・ゴールド', 'dポイント', 'Play Points'],
    description: 'プロスピAのGoogle Play課金とKONAMI Gamesストアを、Google Play Points、パワスピ・ゴールド、dポイント、購入経路の違いから比較します。',
    file: '../games/prospi-a/google-play-vs-konami-store/index.html',
    related: [
      ["/articles/2026-08-19-web-store-external-billing-points.html","公式WebストアとGoogle Play課金の違いを見る"],
      ["/articles/2025-12-25-campaign.html","購入前に増量オファーの条件を確認する"],
      ["/articles/2025-12-25-best-use.html","獲得ポイントをどこで使うか確認する"]
    ]
  },
  {
    id: 'pokemon-go-google-play-vs-webstore-2026',
    listDescription: "ポケコインを買う前に、公式Web StoreのボーナスとGoogle Playの還元を比較。Reward RoadやGalaxy Storeとの違いも確認できます。",
    title: 'Pokémon GOの課金はどこがお得？Google PlayとWeb Storeを比較',
    category: '使い方',
    gameTitle: 'Pokémon GO',
    listTitle: 'Pokémon GO｜Google PlayとWebストアを比較',
    tags: ['Pokémon GO', 'Web Store', 'ポケコイン', 'Reward Road', 'Play Points'],
    description: 'Pokémon GOのGoogle Play課金と公式Web Storeを、ボーナスポケコイン、Reward Road、Galaxy Storeとの違い、Google Play Pointsの観点から比較します。',
    file: '../games/pokemon-go/google-play-vs-webstore/index.html',
    related: [
      ["/articles/2026-08-19-web-store-external-billing-points.html","公式WebストアとGoogle Play課金の違いを見る"],
      ["/articles/2025-12-25-campaign.html","期間限定ボーナスを比較する時の確認点を見る"],
      ["/articles/2025-12-25-best-use.html","獲得ポイントをどこで使うか確認する"]
    ]
  },
  {
    id: 'efootball-google-play-points-vs-efootball-points-2026',
    listDescription: "コイン、eFootballポイント、GP、Play Pointsは別のもの。課金で増える数字と使い道を確認できます。",
    title: 'eFootballコイン購入でGoogle Play Pointsは貯まる？eFootballポイントとの違い【2026年】',
    category: '使い方',
    gameTitle: 'eFootball',
    listTitle: 'eFootball｜コイン・ポイント・Play Pointsの違い',
    tags: ['eFootball', 'eFootballポイント', 'コイン', 'KONAMI', 'Play Points'],
    description: 'eFootballコインのGoogle Play課金と、KONAMI独自のeFootballポイント、GP、Google Play Pointsの違いを公式情報で整理します。',
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
