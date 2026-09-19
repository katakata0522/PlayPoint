'use strict';

const DEFAULT_THUMBNAIL = Object.freeze({
  thumbnail: '../ogp.png',
  thumbnailKind: 'generic'
});

const ACQUIRED_AT = '2026-09-19';

function activeAsset(gameId, gameTitle, rightsHolder, sourcePageUrl, sourceImageUrl) {
  return Object.freeze({
    gameId,
    gameTitle,
    rightsHolder,
    assetType: 'app_icon',
    sourcePageUrl,
    sourceImageUrl,
    localPath: 'images/game-icons/' + gameId + '.webp',
    acquiredAt: ACQUIRED_AT,
    modification: 'resize-only-96px-webp',
    usage: 'article-list-thumbnail',
    status: 'active',
    notes: 'Google Playの公式アプリ掲載ページで現行アイコンを確認し、同ページが参照するGoogle配信画像を96px WebPへ縮小してローカル保存。内容改変・外部CDNホットリンクなし。'
  });
}

const GAME_THUMBNAIL_ASSETS = Object.freeze({
  FGO: activeAsset(
    'fgo', 'FGO', 'Aniplex Inc.',
    'https://play.google.com/store/apps/details?hl=ja&gl=JP&id=com.aniplex.fategrandorder',
    'https://play-lh.googleusercontent.com/pTlA4kXv97Yo6rfV408vK6PNbcYQ667FeOdtzZm8mFnWkp_hB4yVhFDNNwRNX14icPefOY2SGlEiXMR4uAhU-uE=s0-br30'
  ),
  '原神': activeAsset(
    'genshin', '原神', 'COGNOSPHERE PTE. LTD.',
    'https://play.google.com/store/apps/details?hl=ja&gl=JP&id=com.miHoYo.GenshinImpact',
    'https://play-lh.googleusercontent.com/YQqyKaXX-63krqsfIzUEJWUWLINxcb5tbS6QVySdxbS7eZV7YB2dUjUvX27xA0TIGtfxQ5v-tQjwlT5tTB-O=s0-br30'
  ),
  'モンスト': activeAsset(
    'monst', 'モンスト', 'XFLAG, Inc.',
    'https://play.google.com/store/apps/details?hl=ja&gl=JP&id=jp.co.mixi.monsterstrike',
    'https://play-lh.googleusercontent.com/HHfoOjfXLp7FHLNZ-2OHI4mL3DJgFqKZMtFJpWr-UoXjt5KUU_WIRkwN0sDOcw2dfMxNDdvntfD5chNJJoXA=s0-br30'
  ),
  'スタレ': activeAsset(
    'starrail', 'スタレ', 'COGNOSPHERE PTE. LTD.',
    'https://play.google.com/store/apps/details?hl=ja&gl=JP&id=com.HoYoverse.hkrpgoversea',
    'https://play-lh.googleusercontent.com/aWrGocSA7hEuk1qAPe7L4T57LvLKrwwH26cK2_LOqxRQMQX7j3uHYojC-EKWgYEV2PdrmE0ahqvvhLhXrAGk6Q=s0-br30'
  ),
  'ゼンゼロ': activeAsset(
    'zzz', 'ゼンゼロ', 'COGNOSPHERE PTE. LTD.',
    'https://play.google.com/store/apps/details?hl=ja&gl=JP&id=com.HoYoverse.Nap',
    'https://play-lh.googleusercontent.com/N8j-t_IXvDvqFzN3U_19OJPIyAHHgljwVa7TMyCYpdRXRykalU3HKq9u9oPnzDXEkUOX1yyuX16yuWNDrUC_Uw=s0-br30'
  ),
  'ウマ娘': activeAsset(
    'umamusume', 'ウマ娘', 'Cygames, Inc.',
    'https://play.google.com/store/apps/details?hl=ja&gl=JP&id=jp.co.cygames.umamusume',
    'https://play-lh.googleusercontent.com/bww9X1CiJudBPk1Bld11v61SPbS5UQhus43qHiDhapvfW5ahkfH3lgUNdjCx45yu_3Ft-OhT26SvWu2r01uu=s0-br30'
  ),
  'プロセカ': activeAsset(
    'proseka', 'プロセカ', 'SEGA CORPORATION',
    'https://play.google.com/store/apps/details?hl=ja&gl=JP&id=com.sega.pjsekai',
    'https://play-lh.googleusercontent.com/pdv4ajv4O-ow2BVpWopiMy9XSHXTJSEzi1gjTeD-mg4V3bkM6dmu8qJv_-Poupg5mQ6wNXlhJRuXaH-8SE91=s0-br30'
  ),
  'ポケポケ': activeAsset(
    'pokepoke', 'ポケポケ', 'The Pokémon Company',
    'https://play.google.com/store/apps/details?hl=ja&gl=JP&id=jp.pokemon.pokemontcgp',
    'https://play-lh.googleusercontent.com/qdEdyVc19jfittS0bnDUnXLRM7jOPZzfHXEYoChPWOtzMrtwU6t3ZVm_FQ7wbeDYFlqLBuWCDK0Q6c1nEwYKTA=s0-br30'
  ),
  'パズドラ': activeAsset(
    'pad', 'パズドラ', 'GungHo Online Entertainment, Inc.',
    'https://play.google.com/store/apps/details?hl=ja&gl=JP&id=jp.gungho.pad',
    'https://play-lh.googleusercontent.com/aqOG6Cga3bPtKw_1bAO99wV9a9eaZA1wo_j_cyc4YH3TJYqnlbm17cLrHa7hUOdG4yp6ZU4wrw8mdLyLbTkNyw=s0-br30'
  ),
  'アークナイツ': activeAsset(
    'arknights', 'アークナイツ', 'Yostar, Inc.',
    'https://play.google.com/store/apps/details?hl=ja&gl=JP&id=com.YoStarJP.Arknights',
    'https://play-lh.googleusercontent.com/d768LvyQ1JVrv4K0900kVB-CpfKf_eFvHV22q7sLHk_JTZugf_qe4lOxbo5O_BMUO8cflqNkJk-SEshJDzX5zA=s0-br30'
  ),
  'ドッカン': activeAsset(
    'dokkan', 'ドッカン', 'Bandai Namco Entertainment Inc.',
    'https://play.google.com/store/apps/details?hl=ja&gl=JP&id=com.bandainamcogames.dbzdokkan',
    'https://play-lh.googleusercontent.com/AjC0FM5Y7Y-Nte45TKgOmvKZlfXPj3u9_CCLnWwzgDJfTTOziul3L4NqqzwupcdF7P4xgrwc1N_X0jRKwOSlf8M=s0-br30'
  ),
  'ヘブバン': activeAsset(
    'hbr', 'ヘブバン', 'WFS, Inc.',
    'https://play.google.com/store/apps/details?hl=ja&gl=JP&id=com.heavenburnsred',
    'https://play-lh.googleusercontent.com/IzdBGRsLy5Cf9NCTd11VTBAGZX6RaOqUglTAgvl5pRRXTDjDxQc1YlWM4vykHwu2rnpOBTo-Pqh8lON2ko5aLQ=s0-br30'
  ),
  '崩壊3rd': activeAsset(
    'honkai3rd', '崩壊3rd', 'COGNOSPHERE PTE. LTD.',
    'https://play.google.com/store/apps/details?hl=ja&gl=JP&id=com.miHoYo.bh3rdJP',
    'https://play-lh.googleusercontent.com/a4XEnh4BcFGOpgqHBP-OWvS3UR4nyCO4i_r9XfZC6zkAjc9dKliI-PYv--LgzNufCB4c-4dfeuIYFfEPB789D9w=s0-br30'
  ),
  'ファンパレ': activeAsset(
    'phantomparade', 'ファンパレ', 'Sumzap, Inc.',
    'https://play.google.com/store/apps/details?hl=ja&gl=JP&id=jp.co.sumzap.pj0014',
    'https://play-lh.googleusercontent.com/OJzzIZon3CknWSSn3JySBDEPqdaMtbodmo9neNa2b_FOvMeDMmXvvaTBQSCL-zT7Jrr7JDD3xtvCQ2l3x9HSFA=s0-br30'
  ),
  'プロスピA': activeAsset(
    'prospi-a', 'プロスピA', 'KONAMI',
    'https://play.google.com/store/apps/details?hl=ja&gl=JP&id=jp.konami.prospia',
    'https://play-lh.googleusercontent.com/F0IB7v9CufHt5hKPRfXC9WS7tOUunAuCD3_JtdMJTtlhkG93qwmNCg6Cbcbf10aipCZZ3rv82QA-6REtVaVLHD8=s0-br30'
  ),
  'Pokémon GO': activeAsset(
    'pokemon-go', 'Pokémon GO', 'Scopely Explore, Inc.',
    'https://play.google.com/store/apps/details?hl=ja&gl=JP&id=com.nianticlabs.pokemongo',
    'https://play-lh.googleusercontent.com/DUA40mf0fd6lUkU_Pvfw78BOoY37nPNM5tKw0tf4sCqzJfNwR84wqj-J00WN99QaZ89SpruNsU1xX7sDw6uBZg=s0-br30'
  ),
  'eFootball': activeAsset(
    'efootball', 'eFootball', 'KONAMI',
    'https://play.google.com/store/apps/details?hl=ja&gl=JP&id=jp.konami.pesam',
    'https://play-lh.googleusercontent.com/jn-jaGEFUPiu0dBP9O6PjiRk-BCwFFLm0RdeOjLH-qLYjhHJlzNBMgl3Sah24htajj67_fdve-DzGsqmMUx1tqQ=s0-br30'
  )
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
  ACQUIRED_AT,
  DEFAULT_THUMBNAIL,
  GAME_THUMBNAIL_ASSETS,
  getGameThumbnailAsset,
  resolveGameThumbnail
};
