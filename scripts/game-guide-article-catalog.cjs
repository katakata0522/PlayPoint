'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { resolveGameThumbnail } = require('./game-thumbnail-assets.cjs');

const PUBLISHED_AT = '2026-09-13';
const MODIFIED_AT = '2026-09-13';

const GAME_GUIDE_ARTICLES = Object.freeze([
  {
    id: 'fgo-pity-cost-2026',
    title: 'FGO天井330回はいくら？聖晶石価格・福袋・Play Points還元【2026年】',
    category: '使い方',
    gameTitle: 'FGO',
    listTitle: 'FGO｜天井330回の費用・福袋・ポイント還元',
    tags: ['FGO', '聖晶石', '天井', '福袋', 'Play Points'],
    description: 'FGOの確定召喚330回に必要な聖晶石と課金額を、現行の公式価格から計算。ゼロからの最小購入例、福袋の有償15個、Google Play Points還元をまとめます。',
    file: '../games/fgo/pity-cost/index.html',
    related: [
      ['/articles/2026-08-05-play-points-multiplier-stacking.html', '倍率キャンペーン時のPlay Pointsを確認する'],
      ['/articles/2026-06-20-discount-gift-cards.html', 'Google Playギフトコードの割引購入前に確認する'],
      ['/games/genshin/welkin-value/', '原神の月パスと通常チャージを比較する']
    ]
  },
  {
    id: 'genshin-welkin-value-2026',
    title: '原神「空月の祝福」はどれくらいお得？610円・原石3000相当とPlay Points',
    category: '使い方',
    gameTitle: '原神',
    listTitle: '原神｜空月の祝福の価値と受け取り方',
    tags: ['原神', '空月の祝福', '月パス', 'Play Points'],
    description: '原神の空月の祝福を、610円・最大3,000原石相当・Google Play Pointsの観点で比較。通常チャージや90連・180連との違いも整理します。',
    file: '../games/genshin/welkin-value/index.html',
    related: [
      ['/articles/2025-12-25-subscription.html', '定期購入でもPlay Pointsが貯まる条件を確認する'],
      ['/articles/2025-12-25-campaign.html', '増量キャンペーンを待つべきか判断する'],
      ['/games/starrail/supply-pass-value/', 'スタレの列車補給標章と比較する']
    ]
  },
  {
    id: 'monst-google-play-vs-webshop-2026',
    title: 'モンストはGoogle Play課金とWebショップどっちがお得？月イチ200個とPlay Points比較【2026年】',
    category: '使い方',
    gameTitle: 'モンスト',
    listTitle: 'モンスト｜Google Playと公式ショップを比較',
    tags: ['モンスト', 'Webショップ', 'オーブ', 'Play Points'],
    description: 'モンストの1万円課金を比較。アプリ内180個、Webショップ190個、月イチ200個の差とGoogle Play Pointsを含めた選び方を整理します。',
    file: '../games/monst/google-play-vs-webshop/index.html',
    related: [
      ['/articles/2026-08-19-web-store-external-billing-points.html', '公式WebストアとGoogle Play課金の違いを確認する'],
      ['/articles/2026-08-05-play-points-multiplier-stacking.html', '特別獲得率の扱いを確認する'],
      ['/games/prospi-a/google-play-vs-konami-store/', 'プロスピAの公式ストア比較を見る']
    ]
  },
  {
    id: 'starrail-supply-pass-value-2026',
    title: 'スタレ「列車補給標章」はどれくらいお得？610円・3000星玉相当とPlay Points',
    category: '使い方',
    gameTitle: 'スタレ',
    listTitle: 'スタレ｜列車補給標章と通常購入を比較',
    tags: ['スタレ', '崩壊スターレイル', '列車補給標章', '月パス', 'Play Points'],
    description: '崩壊：スターレイルの列車補給標章を610円・最大3,000星玉相当・受取速度・Google Play Pointsで比較します。',
    file: '../games/starrail/supply-pass-value/index.html',
    related: [
      ['/articles/2025-12-25-subscription.html', '定期購入のPlay Points条件を確認する'],
      ['/games/genshin/welkin-value/', '原神の空月の祝福と比較する'],
      ['/games/zzz/membership-value/', 'ゼンゼロのインターノット会員と比較する']
    ]
  },
  {
    id: 'zzz-membership-value-2026',
    title: 'ゼンゼロ「インターノット会員」はお得？610円・3000相当とPlay Points',
    category: '使い方',
    gameTitle: 'ゼンゼロ',
    listTitle: 'ゼンゼロ｜インターノット会員の価値',
    tags: ['ゼンゼロ', 'ゼンレスゾーンゼロ', 'インターノット会員', '月パス', 'Play Points'],
    description: 'ゼンレスゾーンゼロのインターノット会員を610円・最大3,000ポリクローム相当・受取速度・Google Play Pointsで比較します。',
    file: '../games/zzz/membership-value/index.html',
    related: [
      ['/articles/2025-12-25-subscription.html', '定期購入のPlay Points条件を確認する'],
      ['/games/genshin/welkin-value/', '原神の空月の祝福と比較する'],
      ['/games/starrail/supply-pass-value/', 'スタレの列車補給標章と比較する']
    ]
  },
  {
    id: 'umamusume-umasuku-value-2026',
    title: 'ウマ娘「ウマスク」はどれくらいお得？月980円・ジュエル・Play Points比較【2026年】',
    category: '使い方',
    gameTitle: 'ウマ娘',
    listTitle: 'ウマ娘｜ウマスクの内容と購入先の違い',
    tags: ['ウマ娘', 'ウマスク', 'Cygames WebStore', '月額', 'Play Points'],
    description: 'ウマ娘の現行月額「ウマスク」を公式情報で整理。月980円、ジュエル、未受取仕様、WebStoreとGoogle Playの違いを比較します。',
    file: '../games/umamusume/umasuku-value/index.html',
    related: [
      ['/articles/2025-12-25-subscription.html', '月額サービスのPlay Points条件を確認する'],
      ['/articles/2026-08-19-web-store-external-billing-points.html', 'Webストア決済との違いを確認する'],
      ['/articles/2026-08-24-umamusume-half-anniversary-points.html', 'ウマ娘の期間課金判断も確認する']
    ]
  },
  {
    id: 'proseka-google-play-vs-webstore-2026',
    title: 'プロセカはGoogle Playと公式WebStoreどっちがお得？パス・クリスタル・Play Points比較',
    category: '使い方',
    gameTitle: 'プロセカ',
    listTitle: 'プロセカ｜パス・クリスタルの購入先比較',
    tags: ['プロセカ', 'WebStore', 'カラフルパス', 'クリスタル', 'Play Points'],
    description: 'プロセカ公式WebStoreの現行価格、カラフルパス3種、ミッションパスとGoogle Play Pointsの違いを整理します。',
    file: '../games/proseka/google-play-vs-webstore/index.html',
    related: [
      ['/articles/2026-08-19-web-store-external-billing-points.html', '公式WebストアとGoogle Play課金の違いを確認する'],
      ['/articles/2025-12-25-subscription.html', '月額商品のPlay Points条件を確認する'],
      ['/games/phantomparade/google-play-vs-webshop/', 'ファンパレのWEBショップ比較を見る']
    ]
  },
  {
    id: 'pokepoke-premium-pass-guide-2026',
    title: 'ポケポケのプレミアムパスはどう課金される？無料体験・Google Play Points確認【2026年】',
    category: '使い方',
    gameTitle: 'ポケポケ',
    listTitle: 'ポケポケ｜プレミアムパスと無料体験',
    tags: ['ポケポケ', 'Pokémon TCG Pocket', 'プレミアムパス', '無料体験', 'Play Points'],
    description: 'Pokémon TCG Pocketのプレミアムパスを、1か月の定期購入、14日無料体験、Googleアカウントとの紐付け、Play Pointsから整理します。',
    file: '../games/pokepoke/premium-pass-guide/index.html',
    related: [
      ['/articles/2025-12-25-subscription.html', '定期購入・無料体験のPlay Points条件を確認する'],
      ['/articles/2025-12-25-multiple-accounts.html', '複数Googleアカウント利用時の注意点を見る'],
      ['/games/pad/pad-pass-value/', 'パズドラパスの無料体験と比較する']
    ]
  },
  {
    id: 'pad-pass-value-2026',
    title: 'パズドラパスは月額980円で何が得？無料トライアル・特典・Play Points【2026年】',
    category: '使い方',
    gameTitle: 'パズドラ',
    listTitle: 'パズドラ｜パスの特典と無料トライアル',
    tags: ['パズドラ', 'パズドラパス', '無料トライアル', '月額', 'Play Points'],
    description: 'パズドラパスの月額980円、1週間無料トライアル、毎日ダンジョンや常設特典とGoogle Play Pointsを整理します。',
    file: '../games/pad/pad-pass-value/index.html',
    related: [
      ['/articles/2025-12-25-subscription.html', '定期購入・無料体験のPlay Points条件を確認する'],
      ['/articles/2026-08-25-pad-puzzle-and-dragons-play-points.html', 'パズドラ課金全体の選び方を確認する'],
      ['/games/pokepoke/premium-pass-guide/', 'ポケポケのプレミアムパスと比較する']
    ]
  },
  {
    id: 'arknights-monthly-pass-limited-scout-2026',
    title: 'アークナイツ月パスと限定300連をどう見る？内容・天井・Play Points【2026年】',
    category: '使い方',
    gameTitle: 'アークナイツ',
    listTitle: 'アークナイツ｜月パスと限定300連の考え方',
    tags: ['アークナイツ', '月パス', '限定スカウト', '300連', 'Play Points'],
    description: 'アークナイツの月パス内容と限定スカウト300回の仕様を公式情報で整理し、Google Play価格とPlay Pointsを分けて解説します。',
    file: '../games/arknights/monthly-pass-limited-scout/index.html',
    related: [
      ['/articles/2025-12-25-subscription.html', '定期購入のPlay Points条件を確認する'],
      ['/articles/2025-12-25-campaign.html', '期間キャンペーンの確認方法を見る'],
      ['/games/fgo/pity-cost/', 'FGOの天井課金額の考え方を見る']
    ]
  },
  {
    id: 'dokkan-google-play-vs-webstore-2026',
    title: 'ドッカンバトルはGoogle PlayとWeb Storeどっちで買う？Play Pointsの違い【2026年】',
    category: '使い方',
    gameTitle: 'ドッカン',
    listTitle: 'ドッカン｜Google Playと公式ストアを比較',
    tags: ['ドッカンバトル', '龍石', 'Web Store', 'Play Points'],
    description: 'ドッカンバトル公式Web StoreとGoogle Play購入を別決済として整理。Play Points対象経路、価格変動、購入前の比較ポイントを解説します。',
    file: '../games/dokkan/google-play-vs-webstore/index.html',
    related: [
      ['/articles/2026-08-19-web-store-external-billing-points.html', '公式WebストアとGoogle Play課金の違いを確認する'],
      ['/articles/2026-08-25-dokkan-battle-dragon-ball-play-points.html', 'ドッカン課金全体の選び方を見る'],
      ['/games/monst/google-play-vs-webshop/', 'モンストのWebショップ比較を見る']
    ]
  },
  {
    id: 'hbr-google-play-vs-webshop-2026',
    title: 'ヘブバンはGoogle PlayとWEB SHOPどっちがお得？5%OFF・独自ポイント・パスの違い【2026年】',
    category: '使い方',
    gameTitle: 'ヘブバン',
    listTitle: 'ヘブバン｜Google PlayとWebショップを比較',
    tags: ['ヘブバン', 'WEB SHOP', 'クォーツ', '月額パス', 'Play Points'],
    description: 'ヘブバン公式WEB SHOPの5%OFF、WEB SHOPポイント、WEB限定クォーツ、月額パス加入不可の条件をGoogle Play Pointsと分けて比較します。',
    file: '../games/hbr/google-play-vs-webshop/index.html',
    related: [
      ['/articles/2026-08-19-web-store-external-billing-points.html', '公式WebストアとGoogle Play課金の違いを確認する'],
      ['/articles/2025-12-25-campaign.html', '割引・キャンペーンの比較方法を見る'],
      ['/games/phantomparade/google-play-vs-webshop/', 'ファンパレのWEBショップ比較を見る']
    ]
  },
  {
    id: 'honkai3rd-google-play-vs-charge-center-2026',
    title: '崩壊3rdはGoogle Playと公式チャージセンターどっち？2倍特典・月パス・Play Points【2026年】',
    category: '使い方',
    gameTitle: '崩壊3rd',
    listTitle: '崩壊3rd｜Google Playとチャージセンターを比較',
    tags: ['崩壊3rd', 'チャージセンター', '月パス', 'Play Points'],
    description: '崩壊3rdのGoogle Play購入とHoYoverse公式チャージセンターを、2倍特典、月パス延長、期間限定割引、Play Pointsの違いから整理します。',
    file: '../games/honkai3rd/google-play-vs-charge-center/index.html',
    related: [
      ['/articles/2026-08-19-web-store-external-billing-points.html', '外部決済とGoogle Play課金の違いを見る'],
      ['/articles/2025-12-25-campaign.html', '期間限定割引を比較する時の確認点を見る'],
      ['/games/genshin/welkin-value/', '原神のHoYoverse系月パスを見る']
    ]
  },
  {
    id: 'phantomparade-google-play-vs-webshop-2026',
    title: 'ファンパレはGoogle PlayとWEBショップどっちがお得？増量・マイル・Play Points比較【2026年】',
    category: '使い方',
    gameTitle: 'ファンパレ',
    listTitle: 'ファンパレ｜Google PlayとWEBショップを比較',
    tags: ['ファンパレ', 'WEBショップ', '廻珠', 'マイル', 'Play Points'],
    description: 'ファンパレ公式WEBショップの増量率、マイルpt、パス商品とGoogle Play Pointsを別軸で比較します。',
    file: '../games/phantomparade/google-play-vs-webshop/index.html',
    related: [
      ['/articles/2026-08-19-web-store-external-billing-points.html', '公式WebストアとGoogle Play課金の違いを見る'],
      ['/games/hbr/google-play-vs-webshop/', 'ヘブバンのWEB SHOP比較を見る'],
      ['/games/proseka/google-play-vs-webstore/', 'プロセカのWebStore比較を見る']
    ]
  },
  {
    id: 'prospi-a-google-play-vs-konami-store-2026',
    title: 'プロスピAはGoogle PlayとKONAMI Gamesストアどっちがお得？Play Points・パワスピG・dポイント比較【2026年】',
    category: '使い方',
    gameTitle: 'プロスピA',
    listTitle: 'プロスピA｜Google PlayとKONAMIストアを比較',
    tags: ['プロスピA', 'KONAMI Gamesストア', 'パワスピ・ゴールド', 'dポイント', 'Play Points'],
    description: 'プロスピAのGoogle Play課金とKONAMI Gamesストアを、Google Play Points、パワスピ・ゴールド、dポイント、購入経路の違いから比較します。',
    file: '../games/prospi-a/google-play-vs-konami-store/index.html',
    related: [
      ['/articles/2026-08-19-web-store-external-billing-points.html', '公式WebストアとGoogle Play課金の違いを見る'],
      ['/games/monst/google-play-vs-webshop/', 'モンストの購入経路比較を見る'],
      ['/games/efootball/google-play-points-vs-efootball-points/', 'eFootballのKONAMI独自ポイントとの違いを見る']
    ]
  },
  {
    id: 'pokemon-go-google-play-vs-webstore-2026',
    title: 'Pokémon GOはGoogle PlayとWeb Storeどっちがお得？ボーナスポケコイン・Reward Road・Play Points比較【2026年】',
    category: '使い方',
    gameTitle: 'Pokémon GO',
    listTitle: 'Pokémon GO｜Google PlayとWebストアを比較',
    tags: ['Pokémon GO', 'Web Store', 'ポケコイン', 'Reward Road', 'Play Points'],
    description: 'Pokémon GOのGoogle Play課金と公式Web Storeを、ボーナスポケコイン、Reward Road、Galaxy Storeとの違い、Google Play Pointsの観点から比較します。',
    file: '../games/pokemon-go/google-play-vs-webstore/index.html',
    related: [
      ['/articles/2026-08-19-web-store-external-billing-points.html', '公式WebストアとGoogle Play課金の違いを見る'],
      ['/articles/2025-12-25-campaign.html', '期間限定ボーナスを比較する時の確認点を見る'],
      ['/games/monst/google-play-vs-webshop/', 'モンストのWebショップ比較を見る']
    ]
  },
  {
    id: 'efootball-google-play-points-vs-efootball-points-2026',
    title: 'eFootballコイン購入でGoogle Play Pointsは貯まる？eFootballポイントとの違い【2026年】',
    category: '使い方',
    gameTitle: 'eFootball',
    listTitle: 'eFootball｜コイン・ポイント・Play Pointsの違い',
    tags: ['eFootball', 'eFootballポイント', 'コイン', 'KONAMI', 'Play Points'],
    description: 'eFootballコインのGoogle Play課金と、KONAMI独自のeFootballポイント、GP、Google Play Pointsの違いを公式情報で整理します。',
    file: '../games/efootball/google-play-points-vs-efootball-points/index.html',
    related: [
      ['/articles/2025-12-25-campaign.html', 'Play Pointsキャンペーンの確認方法を見る'],
      ['/games/prospi-a/google-play-vs-konami-store/', 'KONAMI Gamesストアとの比較例を見る'],
      ['/articles/2025-12-25-best-use.html', 'Google Play Pointsの使い道を比較する']
    ]
  }
].map(article => Object.freeze({
  ...article,
  date: PUBLISHED_AT,
  modified: MODIFIED_AT,
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
  const merged = [...GAME_GUIDE_ARTICLES.map(article => ({ ...article })), ...base];
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
