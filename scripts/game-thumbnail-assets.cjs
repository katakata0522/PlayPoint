'use strict';

const DEFAULT_THUMBNAIL = Object.freeze({
  thumbnail: '../ogp.png',
  thumbnailKind: 'generic'
});

function asset(gameId, gameTitle, rightsHolder, sourcePageUrl) {
  return Object.freeze({
    gameId,
    gameTitle,
    rightsHolder,
    assetType: 'app_icon',
    sourcePageUrl,
    sourceImageUrl: null,
    localPath: null,
    acquiredAt: null,
    modification: 'resize-or-format-only',
    usage: 'article-list-thumbnail',
    status: 'pending',
    notes: 'Google Playの公式アプリ掲載ページを出典候補として登録。ローカル保存・内容確認・権利メモ完了後にactiveへ変更する。'
  });
}

const GAME_THUMBNAIL_ASSETS = Object.freeze({
  FGO: asset('fgo', 'FGO', 'Aniplex Inc.', 'https://play.google.com/store/apps/details?hl=ja&gl=JP&id=com.aniplex.fategrandorder'),
  '原神': asset('genshin', '原神', 'COGNOSPHERE PTE. LTD.', 'https://play.google.com/store/apps/details?hl=ja&gl=JP&id=com.miHoYo.GenshinImpact'),
  'モンスト': asset('monst', 'モンスト', 'XFLAG, Inc.', 'https://play.google.com/store/apps/details?hl=ja&gl=JP&id=jp.co.mixi.monsterstrike'),
  'スタレ': asset('starrail', 'スタレ', 'COGNOSPHERE PTE. LTD.', 'https://play.google.com/store/apps/details?hl=ja&gl=JP&id=com.HoYoverse.hkrpgoversea'),
  'ゼンゼロ': asset('zzz', 'ゼンゼロ', 'COGNOSPHERE PTE. LTD.', 'https://play.google.com/store/apps/details?hl=ja&gl=JP&id=com.HoYoverse.Nap'),
  'ウマ娘': asset('umamusume', 'ウマ娘', 'Cygames, Inc.', 'https://play.google.com/store/apps/details?hl=ja&gl=JP&id=jp.co.cygames.umamusume'),
  'プロセカ': asset('proseka', 'プロセカ', 'SEGA CORPORATION', 'https://play.google.com/store/apps/details?hl=ja&gl=JP&id=com.sega.pjsekai'),
  'ポケポケ': asset('pokepoke', 'ポケポケ', 'The Pokémon Company', 'https://play.google.com/store/apps/details?hl=ja&gl=JP&id=jp.pokemon.pokemontcgp'),
  'パズドラ': asset('pad', 'パズドラ', 'GungHo Online Entertainment, Inc.', 'https://play.google.com/store/apps/details?hl=ja&gl=JP&id=jp.gungho.pad'),
  'アークナイツ': asset('arknights', 'アークナイツ', 'Yostar, Inc.', 'https://play.google.com/store/apps/details?hl=ja&gl=JP&id=com.YoStarJP.Arknights'),
  'ドッカン': asset('dokkan', 'ドッカン', 'Bandai Namco Entertainment Inc.', 'https://play.google.com/store/apps/details?hl=ja&gl=JP&id=com.bandainamcogames.dbzdokkan'),
  'ヘブバン': asset('hbr', 'ヘブバン', 'WFS, Inc.', 'https://play.google.com/store/apps/details?hl=ja&gl=JP&id=com.heavenburnsred'),
  '崩壊3rd': asset('honkai3rd', '崩壊3rd', 'COGNOSPHERE PTE. LTD.', 'https://play.google.com/store/apps/details?hl=ja&gl=JP&id=com.miHoYo.bh3rdJP'),
  'ファンパレ': asset('phantomparade', 'ファンパレ', 'Sumzap, Inc.', 'https://play.google.com/store/apps/details?hl=ja&gl=JP&id=jp.co.sumzap.pj0014'),
  'プロスピA': asset('prospi-a', 'プロスピA', 'KONAMI', 'https://play.google.com/store/apps/details?hl=ja&gl=JP&id=jp.konami.prospia'),
  'Pokémon GO': asset('pokemon-go', 'Pokémon GO', 'Scopely Explore, Inc.', 'https://play.google.com/store/apps/details?hl=ja&gl=JP&id=com.nianticlabs.pokemongo'),
  'eFootball': asset('efootball', 'eFootball', 'KONAMI', 'https://play.google.com/store/apps/details?hl=ja&gl=JP&id=jp.konami.pesam')
});

function getGameThumbnailAsset(gameTitle) {
  return GAME_THUMBNAIL_ASSETS[String(gameTitle || '')] || null;
}

function resolveGameThumbnail(gameTitle) {
  const current = getGameThumbnailAsset(gameTitle);
  if (!current || current.status !== 'active' || !current.localPath) return DEFAULT_THUMBNAIL;
  return {
    thumbnail: '../' + current.localPath.replace(/^\/+/, ''),
    thumbnailKind: current.assetType === 'event_key_visual' ? 'event-visual' : 'app-icon'
  };
}

module.exports = {
  DEFAULT_THUMBNAIL,
  GAME_THUMBNAIL_ASSETS,
  getGameThumbnailAsset,
  resolveGameThumbnail
};
