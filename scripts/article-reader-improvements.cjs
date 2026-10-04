'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { GAME_GUIDE_ARTICLES } = require('./game-guide-article-catalog.cjs');
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const plain = value => String(value).replace(/<[^>]*>/g, '').replace(/[<>]/g, '').trim();
const EARN_SOURCE = 'https://support.google.com/googleplay/answer/9077192?co=GENIE.CountryCode%3DJP&amp;hl=ja';
// 見出しの主張と一次情報を結ぶ。別制度の説明をGoogleの資料だけで裏付けない。
const SOURCE_RULES = {
  fgo: [[/福袋/, /福袋/], [/天井|330/, /確定召喚/]],
  monst: [[/月イチ/, /月イチ/], [/Web|アプリ/, /Web190/]],
  umamusume: [[/ウマプラン/, /ウマプラン/], [/終了/, /販売|終了/]],
  proseka: [[/パス|有償|無償/, /FAQ/]],
  pokepoke: [[/アカウント|購入/, /購入・Premium/]],
  pad: [[/無料|トライアル|解約/, /FAQ/]],
  arknights: [[/限定|300/, /リミテッド/]],
  hbr: [[/5%|5％/, /5%OFF/], [/ポイント/, /WEB SHOPポイント/], [/月額|パス/, /加入不可/]],
  honkai3rd: [[/割引|イベント/, /割引イベント/]],
  phantomparade: [[/アカウント|連携/, /アカウント連携/]],
  'prospi-a': [[/独自還元|KONAMI Gamesストア/, /Gamesストアとは/], [/Android|購入方法/, /エナジー購入方法/]],
  'pokemon-go': [[/Reward Road/, /Reward Road/], [/Android|Galaxy|無料ポケコイン/, /購入方法/], [/Web|購入先/, /Web Storeサポート/]],
  efootball: [[/eFootballポイント/, /^eFootballポイント公式$/], [/資産|3種類/, /ゲーム内資産/]]
};

function comparisonTable(game) {
  const pokemon = game === 'pokemon-go';
  const unit = pokemon ? 'ポケコイン' : '龍石';
  const rows = [
    ['Google Play', '購入画面の支払額・受取個数', '決済画面の獲得予定ポイント', pokemon ? '対象の現金購入はReward Roadも確認' : 'セール・デイリー商品の受取時期を確認'],
    ['公式Web Store', 'Web画面の支払額・ボーナス込み個数', 'Google Play Pointsの対象外', pokemon ? '対象の現金購入はReward Roadも確認' : 'Web限定商品・対象アカウントを確認'],
    ...(pokemon ? [['Galaxy Store', 'Galaxyの決済画面の支払額・受取個数', 'Google Play Pointsの対象外', 'ストア独自特典とReward Roadの対象条件を個別に確認']] : [])
  ];
  return `<section class="section reader-comparison" id="purchase-comparison"><h2 id="purchase-comparison-title">同じ予算で購入先を選ぶ</h2><p>今すぐ使う${unit}の数を優先するなら、同じ支払額で受け取れる合計個数を比べます。Google Playの還元を重視するなら、購入画面の獲得予定ポイントを、実際に使う交換先の価値に置き換えて判断してください。</p><div class="table-card" tabindex="0" role="region" aria-label="購入先の比較表（左右矢印キーでスクロール）"><table><caption>${pokemon ? 'Pokémon GO' : 'ドッカンバトル'}の購入経路と比較項目（日本向け）</caption><thead><tr><th scope="col">購入先</th><th scope="col">今すぐ得られる分</th><th scope="col">後で使うポイント</th><th scope="col">条件</th></tr></thead><tbody>${rows.map(row => '<tr>' + row.map((cell, i) => `<${i ? 'td' : 'th scope="row"'}>${cell}</${i ? 'td' : 'th'}>`).join('') + '</tr>').join('')}</tbody></table></div><p><strong>比較の計算：</strong>1個あたりの支払額 ＝ 支払額 ÷ ボーナス込みの受取個数。ポイントは同じゲームで使えるとは限らないため、今すぐ受け取る${unit}に足しません。デイリー受取や期間限定特典は、期限内に受け取れる分だけを比較します。</p><p>${pokemon ? 'Reward RoadはWebだけの特典として差し引かず、各購入先で対象になるかを確認します。ポケコインやPokémon GOギフトカードでの購入には対象外条件があります。' : 'デイリーカプセルの毎日受取分と、購入直後の龍石を分けてください。購入予定がセール対象かも、現在の表示で確認します。'}価格や個数が異なる商品は、片方の表示をもう片方へ流用せず、同じ日本向けアカウント・通貨・時点で確認してください。</p></section>`;
}

function improveGameGuide(html, article) {
  html = html.replace(/\s*<p class="reader-source">[\s\S]*?<\/p>/g, '')
    .replace(/<section class="section reader-comparison"[\s\S]*?<\/section>/g, '');
  const sources = [...(html.match(/<section\b[^>]*class="[^"]*source-list[^"]*"[^>]*>[\s\S]*?<\/section>/)?.[0] || '').matchAll(/<a\b[^>]*href="(https:[^"]+)"[^>]*>([\s\S]*?)<\/a>/g)]
    .map(match => ({ href: match[1], label: plain(match[2]) })).filter(source => !/アプリ掲載/.test(source.label));
  if (!sources.length) throw new Error(article.id + ': 公式出典が見つかりません');
  html = html.replace(/(<section class="section)(">\s*<h2\b)/, '$1 answer-box$2');
  const game = article.file.split('/')[2];
  if (['pokemon-go', 'dokkan'].includes(game)) html = html.replace(/(<section class="section answer-box">[\s\S]*?<\/section>)/, '$1\n' + comparisonTable(game));
  // 出典一覧に登録された一次情報を、主張の近くへ戻す。広告・FAQ・関連記事は対象外。
  html = html.replace(/(<section\b[^>]*class="(?:section|section answer-box|section reader-comparison)"[^>]*>)([\s\S]*?)(<\/section>)/g, (whole, start, body, end) => {
    const heading = plain(body.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/)?.[1] || '');
    if (!heading || /公式|出典|次にやること|あわせて|よくある質問/.test(heading) && !/結論|Web/.test(heading)) return whole;
    const rule = (SOURCE_RULES[game] || []).find(([pattern]) => pattern.test(heading));
    let source = rule && sources.find(item => rule[1].test(item.label));
    if (rule && !source) throw new Error(article.id + ': 見出しに対応する公式出典がありません: ' + heading);
    source ||= sources.find(item => !/Google Play/.test(item.label)) || sources[0];
    const extra = source.href !== EARN_SOURCE && /Play Points|Playポイント|購入先/.test(body) ? ` ／ <a href="${EARN_SOURCE}" target="_blank" rel="noopener noreferrer">Google Playの獲得条件</a>` : '';
    const additional = sources.find(item => item.href !== source.href && (game === 'fgo' && /円/.test(body) && /販売価格/.test(item.label) || game === 'pokemon-go' && /Reward Road/.test(body) && /Reward Road/.test(item.label)));
    const more = additional ? ` ／ <a href="${additional.href}" target="_blank" rel="noopener noreferrer">${escape(additional.label)}</a>` : '';
    return start + body + `<p class="reader-source">確認する公式情報：<a href="${source.href}" target="_blank" rel="noopener noreferrer">${escape(source.label)}</a>${extra}${more}</p>` + end;
  });
  // 回答を先に読み、要約・目次は必要なときに開ける。
  const intro = html.match(/<div class="intro">[\s\S]*?<\/div>/)?.[0];
  if (intro) html = html.replace(intro, '').replace(/(<section class="section answer-box">[\s\S]*?<\/section>)/, '$1\n' + intro);
  return html;
}

function improveDiagnostic(html) {
  html = html.replace(/<!-- reader-diagnostic:start -->[\s\S]*?<!-- reader-diagnostic:end -->\s*/g, '');
  const choices = `<nav class="reader-situation-links" aria-label="消えたものから確認する"><a href="#check">ポイント残高が減った</a><a href="/articles/2026-08-16-january-rank-reset.html">今年のランク進捗が戻った</a><a href="/articles/2026-08-16-weekly-reward-not-showing.html">週次の特典カードが消えた</a><a href="/articles/2026-03-10-play-points-reflection-timing.html">購入したポイントが付かない</a></nav>`;
  const quick = /(<section\b[^>]*aria-labelledby="quick-answer"[^>]*>)[\s\S]*?(<\/section>)/;
  return html.replace(quick, '$1<h2 id="quick-answer">まず、消えたものを選んでください</h2><p>ポイント残高、今年のランク進捗、週次の特典カードは別の数字です。購入後に増えていない場合は、残高の失効より先に付与条件を確認します。</p><!-- reader-diagnostic:start -->' + choices + '<!-- reader-diagnostic:end -->$2');
}

function improveBeginner(html) {
  html = html.replace(/<!-- reader-steps:start -->[\s\S]*?<!-- reader-steps:end -->\s*/g, '');
  const figure = '<!-- reader-steps:start --><figure class="reader-step-figure"><img src="/images/guides/play-points-start.svg" width="480" height="540" loading="lazy" alt="Google Playストアを開く、プロフィールを選ぶ、Play Pointsを選ぶ、無料で開始の順番"><figcaption>Androidでの登録手順。操作の順番を示した図です。表示名や位置はアプリのバージョンで異なる場合があります。</figcaption></figure><p class="reader-source"><a href="https://support.google.com/googleplay/answer/9077312?co=GENIE.CountryCode%3DJP&amp;hl=ja">Google公式の登録手順（日本向け、2026年10月4日確認）</a></p><!-- reader-steps:end -->';
  html = html.replace(/(<div class="steps">[\s\S]*?<\/div>)/, '$1\n' + figure);
  html = html.replace(/<!-- reader-calculation:start -->[\s\S]*?<!-- reader-calculation:end -->\s*/g, '');
  const example = '<!-- reader-calculation:start --><aside class="callout"><h3>対象額500円の計算例</h3><p>日本の通常獲得率なら、税を除いた対象額500円でブロンズは5ポイント、シルバーは6ポイントです。シルバーの計算値6.25を購入ごとに四捨五入します。税込の支払額や複数購入の合計を、そのまま対象額と混同しないでください。</p><p><a href="/">自分の購入額・ランクで計算する</a> ／ <a href="https://support.google.com/googleplay/answer/9077192?co=GENIE.CountryCode%3DJP&amp;hl=ja">Google公式の計算例（日本）</a></p></aside><!-- reader-calculation:end -->';
  html = html.replace(/(<p class="small">※対象購入ごとに計算され[\s\S]*?<\/p>)/, '$1\n' + example);
  return html.replace('画面の案内に従って<strong>「参加」または「有効にする」</strong>を選ぶ', '画面の案内に従って<strong>「無料で開始」</strong>を選ぶ');
}

function syncReaderImprovements(root) {
  const modified = '2026-10-04';
  const updateDate = html => html.replace(/(<meta\b[^>]*name="last-modified"[^>]*content=")[^"]*(")/, '$1' + modified + '$2')
    .replace(/("dateModified"\s*:\s*")[^"]*(")/g, '$1' + modified + '$2');
  let changed = 0;
  for (const article of GAME_GUIDE_ARTICLES) {
    const file = path.join(root, article.file.slice(3)), before = fs.readFileSync(file, 'utf8');
    const after = updateDate(improveGameGuide(before, article));
    if (after !== before) { fs.writeFileSync(file, after); changed++; }
  }
  for (const [name, transform] of [['2026-08-16-points-disappeared.html', improveDiagnostic], ['2025-12-25-getting-started.html', improveBeginner]]) {
    const file = path.join(root, 'articles', name), before = fs.readFileSync(file, 'utf8'), after = updateDate(transform(before));
    if (after !== before) { fs.writeFileSync(file, after); changed++; }
  }
  const file = path.join(root, 'blog/articles.json'), manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const article of manifest) if (article.source === 'game-guide' || ['getting-started', 'points-disappeared'].includes(article.id)) article.modified = modified;
  fs.writeFileSync(file, JSON.stringify(manifest, null, 2) + '\n');
  return changed;
}
module.exports = { comparisonTable, improveGameGuide, improveDiagnostic, improveBeginner, syncReaderImprovements };
