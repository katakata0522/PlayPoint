'use strict';

const DEFAULT_THUMBNAIL = Object.freeze({
  thumbnail: '../ogp.png',
  thumbnailKind: 'generic'
});

const ACQUIRED_AT = '2026-10-03';

function activeAsset(gameId, gameTitle, rightsHolder, sourcePageUrl, sourceImageUrl) {
  return Object.freeze({
    gameId,
    gameTitle,
    rightsHolder,
    assetType: 'app_icon',
    sourcePageUrl,
    sourceImageUrl,
    localPath: 'images/game-icons/' + gameId + '.webp',
    highDensityLocalPath: 'images/game-icons/' + gameId + '-2x.webp',
    highDensityAcquiredAt: '2026-10-04',
    acquiredAt: ACQUIRED_AT,
    modification: 'resize-only-128px-webp',
    usage: 'article-list-thumbnail',
    status: 'active',
    notes: 'Google Playの公式アプリ掲載ページで現行アイコンを確認し、同ページが参照するGoogle配信画像を128px WebPへ縦横比を保って縮小し、ローカル保存。高密度表示用に同じ配信元の240px WebP版を追加。内容改変・外部CDNホットリンクなし。'
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
    'https://play-lh.googleusercontent.com/PQEqjOxr-3uZaNHmWoQinLVQQ9fbSegMKXmqgFm5nGgagqC2REH-1er3BguYStWbH3YStijj5WH1DDlwPh2ehw=s0-br30'
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
    'https://play-lh.googleusercontent.com/kpMAHoFE7T_ccji5-P1I6njm7tufDzFHFPTPUDstve1L1_3hKHU29_bu8kZASVSiGOnIpqyG4CmAcib7Kzh8Vg=s0-br30'
  ),
  'プロセカ': activeAsset(
    'proseka', 'プロセカ', 'SEGA CORPORATION',
    'https://play.google.com/store/apps/details?hl=ja&gl=JP&id=com.sega.pjsekai',
    'https://play-lh.googleusercontent.com/BWJxYwzJFPOgdrBX_4DIspL90JuxuScIw3S8DpdE95_8SFuXkbYIJ0macz5p-a_M4f33QbisdbfZJBFHL6arlQ=s0-br30'
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
    'https://play-lh.googleusercontent.com/6qv7YkyQQ9fVeyM-PSIvnD1vnBO9xZVZoqQy9f3s9m3_IIUt2JS4ni3jDi7TZFpyrKN0cC-I2BbuXMYuhY1aCxg=s0-br30'
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
  ),
  NIKKE: activeAsset(
    'nikke', 'NIKKE', 'Level Infinite',
    'https://play.google.com/store/apps/details?hl=ja&gl=JP&id=com.proximabeta.nikke',
    'https://play-lh.googleusercontent.com/JK5mejs0bVT_9613gCxNfCjRw_m3JiQ4wC8B8Kt471yu7ThFQazVkCLTfPZ81hnenft7ilaE-qSwVGpQT6sEFcY=s0-br30'
  ),
  'ブルアカ': activeAsset(
    'bluearchive', 'ブルアカ', 'Yostar, Inc.',
    'https://play.google.com/store/apps/details?hl=ja&gl=JP&id=com.YostarJP.BlueArchive',
    'https://play-lh.googleusercontent.com/H975s6W1-boCSogzpF5_rIyawbjiXfG842ncgjIRiVGzhXHFTCVut0DkBhlDR4CgN1nn98OOC1fWN-LE7kUHnQ=s0-br30'
  ),
  '学マス': activeAsset(
    'gakumas', '学マス', 'Bandai Namco Entertainment Inc.',
    'https://play.google.com/store/apps/details?hl=ja&gl=JP&id=com.bandainamcoent.idolmaster_gakuen',
    'https://play-lh.googleusercontent.com/ch_SGwCMoLElrzColmSthRPYxzv608YoyBx4tXY3ciM8Bg4fLxKhRHdeoqPSbygFruy62D9p5EdGAwLW8KGTfwI=s0-br30'
  ),
  'ポケスリ': activeAsset(
    'pokemon-sleep', 'ポケスリ', 'The Pokémon Company',
    'https://play.google.com/store/apps/details?hl=ja&gl=JP&id=jp.pokemon.pokemonsleep',
    'https://play-lh.googleusercontent.com/tg-BeEJO7UDjvfxWXWJ1u-PMLa-45twu0YhJkZfQu-PEjRJU_2l9Sb9xMR3YBha3mtLzdzU-016ZpWN5IUwrFwU=s0-br30'
  ),
  '幻水SP': activeAsset(
    'suikoden-star-leap', '幻水SP', 'KONAMI',
    'https://play.google.com/store/apps/details?hl=ja&gl=JP&id=jp.konami.suikoden.starleap',
    'https://play-lh.googleusercontent.com/CZqC6kjKA871p5R5tf734xuTrgNd7B2DC9Q2Y1Fj0Bmdg3z2I8PhgV-7JNsOg-g-BV1ZWNLRPqq0frr9byaN=s0-br30'
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
    thumbnail2x: '../' + current.highDensityLocalPath.replace(/^\/+/, ''),
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
