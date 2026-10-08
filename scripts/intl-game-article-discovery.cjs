'use strict';

const { ALL_GUIDES } = require('./intl-game-guide-expansion.cjs');
const LABELS = {
  en: { game: 'Find your game', all: 'All topics and games', games: 'All game guides', topic: 'What are you comparing?', any: 'Any purchase topic', pass: 'Passes & daily packs', trial: 'Free trials', shop: 'App vs web shop', rewards: 'Currencies & rewards', version: 'Japan-version reference' },
  ko: { game: '게임으로 찾기', all: '전체 주제·게임', games: '전체 게임 가이드', topic: '무엇을 비교할까요?', any: '전체 구매 주제', pass: '패스·일일 상품', trial: '무료 체험', shop: '앱·웹샵 비교', rewards: '재화·포인트', version: '일본판 참고' },
  tw: { game: '依遊戲尋找', all: '全部主題與遊戲', games: '所有遊戲指南', topic: '想比較什麼？', any: '全部消費主題', pass: '通行證與每日包', trial: '免費試用', shop: 'App與網路商店', rewards: '貨幣與回饋', version: '日版參考' }
};
const NAMES = {
  en: ['Fate/Grand Order', 'Genshin Impact', 'Monster Strike', 'Honkai: Star Rail', 'Zenless Zone Zero', 'Umamusume', 'COLORFUL STAGE!', 'Pokémon TCG Pocket', 'Puzzle & Dragons', 'Arknights', 'Dokkan Battle', 'Heaven Burns Red', 'Honkai Impact 3rd', 'Phantom Parade', 'Prospi A', 'Pokémon GO', 'eFootball'],
  ko: ['페이트/그랜드 오더', '원신', '몬스터 스트라이크', '붕괴: 스타레일', '젠레스 존 제로', '우마무스메', '프로젝트 세카이', '포켓몬 카드 게임 Pocket', '퍼즐앤드래곤', '명일방주', '드래곤볼 Z 폭렬격전', '헤븐 번즈 레드', '붕괴3rd', '주술회전 팬텀 퍼레이드', '프로스피A', 'Pokémon GO', 'eFootball'],
  tw: ['Fate/Grand Order', '原神', '怪物彈珠', '崩壞：星穹鐵道', '絕區零', '賽馬娘', '世界計畫', 'Pokémon TCG Pocket', 'Puzzle & Dragons', '明日方舟', '七龍珠Z 爆裂激戰', '緋染天空', '崩壞3rd', '咒術迴戰 幻影夜行', 'Prospi A', 'Pokémon GO', 'eFootball']
};
// ゲーム名はカタログ順ではなくIDと結び付け、順序変更時に別ゲームへずれない。
const IDS = ['fgo', 'genshin', 'monst', 'starrail', 'zzz', 'umamusume', 'proseka', 'pokepoke', 'pad', 'arknights', 'dokkan', 'hbr', 'honkai3rd', 'phantomparade', 'prospi-a', 'pokemon-go', 'efootball'];
// 商品名ではなく、確認済みの商品種別とサービス地域を管理する。
const PASS_LOCALES = Object.freeze({ genshin: ['en', 'ko', 'tw'], starrail: ['en', 'ko', 'tw'], zzz: ['en', 'ko', 'tw'], umamusume: ['en', 'ko', 'tw'], proseka: ['en', 'ko', 'tw'], pokepoke: ['en', 'ko', 'tw'], pad: ['en', 'ko'], arknights: ['en', 'tw'], monst: ['tw'], hbr: ['en', 'ko', 'tw'], phantomparade: ['en'], 'pokemon-go': ['en', 'ko', 'tw'] });
function metadata(href) {
  const match = String(href).match(/^\/(en|ko|tw)\/articles\/([^/]+)\.html$/);
  const guide = match && ALL_GUIDES.find(item => item.slug === match[2]);
  if (!guide) return null;
  const locale = match[1], content = guide.content[locale], tags = [];
  if (content.reference) tags.push('version');
  if (PASS_LOCALES[guide.gameId]?.includes(locale)) tags.push('pass');
  if (guide.gameId === 'pokepoke' || guide.gameId === 'pad' && locale === 'en') tags.push('trial');
  if (['dokkan', 'honkai3rd', 'pokemon-go', 'prospi-a'].includes(guide.gameId) || guide.gameId === 'monst' || guide.gameId === 'hbr' && locale === 'tw') tags.push('shop');
  if (!tags.length || ['fgo', 'efootball', 'pokemon-go'].includes(guide.gameId)) tags.push('rewards');
  return { id: guide.gameId, name: NAMES[locale][IDS.indexOf(guide.gameId)], tags, locale };
}
module.exports = { LABELS, metadata };
