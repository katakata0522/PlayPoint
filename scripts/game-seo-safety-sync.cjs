'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { getGamePageHtmlFiles } = require('./game-page-targets.cjs');
const { VERIFIED_AT } = require('./game-seo-data.cjs');

function writeIfChanged(filePath, content) {
  const previous = fs.readFileSync(filePath, 'utf8');
  if (previous === content) return false;
  fs.writeFileSync(filePath, content, 'utf8');
  return true;
}

function syncFgoInitialAmount(rootDir) {
  const filePath = path.join(rootDir, 'games/fgo/index.html');
  let html = fs.readFileSync(filePath, 'utf8');
  html = html.replace(
    '<input type="number" id="sim-custom-amount" value="1900" min="0" step="any" inputmode="decimal">',
    '<input type="number" id="sim-custom-amount" value="1920" min="0" step="any" inputmode="decimal">'
  );
  return writeIfChanged(filePath, html);
}

function replaceDescriptionAcrossGamePages(rootDir, before, after) {
  const changedFiles = [];
  for (const relativePath of getGamePageHtmlFiles(rootDir)) {
    const filePath = path.join(rootDir, relativePath);
    const html = fs.readFileSync(filePath, 'utf8');
    if (!html.includes(before)) continue;
    if (writeIfChanged(filePath, html.replaceAll(before, after))) changedFiles.push(relativePath);
  }
  return changedFiles;
}

function syncVerifiedInputOnly(rootDir, config) {
  const filePath = path.join(rootDir, config.file);
  let html = fs.readFileSync(filePath, 'utf8');

  html = html.replace(
    /<div class="preset-buttons">[\s\S]*?<\/div>/,
    `<div class="preset-buttons">\n                  <button type="button" class="preset-btn active" data-amount="0" data-mult="1" aria-pressed="true">${config.presetLabel}</button>\n              </div>`
  );

  html = html.replace(
    /(<select id="sim-pack-select">)[\s\S]*?(<\/select>)/,
    `$1\n                              <option value="custom" selected>${config.optionLabel}</option>\n                          $2`
  );

  html = html.replace(
    /<input type="number" id="sim-custom-amount" value="[^"]*" min="0" step="any" inputmode="decimal">/,
    '<input type="number" id="sim-custom-amount" value="0" min="0" step="any" inputmode="decimal">'
  );

  html = html.replace(
    /(<table class="pack-table">[\s\S]*?<tbody>)[\s\S]*?(<\/tbody>)/,
    `$1\n<tr><td colspan="4">${config.tableMessage}</td></tr>\n                      $2`
  );

  if (config.gameMeta) {
    html = html.replace(
      /<p class="game-meta">[^<]*<\/p>/,
      `<p class="game-meta">${config.gameMeta}</p>`
    );
  }

  for (const [before, after] of config.replacements || []) {
    html = html.replaceAll(before, after);
  }

  return writeIfChanged(filePath, html);
}

function syncBlueArchiveVerifiedInputOnly(rootDir) {
  return syncVerifiedInputOnly(rootDir, {
    file: 'games/bluearchive/index.html',
    presetLabel: 'Google Playの表示額を入力',
    optionLabel: '現行価格をGoogle Playで確認して入力',
    tableMessage: '現行のGoogle Play商品価格は一次表示の再確認中です。価格を推測で掲載せず、購入画面に表示された金額を上の自由入力欄へ入れて計算してください。'
  });
}

function syncNikkeVerifiedInputOnly(rootDir) {
  return syncVerifiedInputOnly(rootDir, {
    file: 'games/nikke/index.html',
    presetLabel: 'Google Playの表示額を入力',
    optionLabel: '現行価格をGoogle Playで確認して入力',
    tableMessage: 'NIKKE公式の特定商取引法表示では価格は各商品ページで確認する方式です。現行Google Play価格を公開テキストで固定できないため、旧価格を推測で残さず購入画面の金額を入力してください。',
    gameMeta: `NIKKE Google Play価格・Play Points確認：${VERIFIED_AT}（価格は購入画面を正本） ｜ Google Play Points (100円=1pt)`,
    replacements: [
      ['NIKKEのゴールドマイレージ（金票200枚）で何ポイント還元されますか？', 'NIKKEの200連分に必要な現金額は固定ですか？'],
      ['200連（約7.6万円）課金した場合、通常時（1pt/100円）で約760pt、特別獲得率5pt/100円時なら約3,800pt貯まります。', 'いいえ。所持チケットや配布、商品構成、購入経路で実際の支払額が変わるため、PlayPointでは約7.6万円などの固定額を断定しません。Google Playで実際に支払う金額を入力してPlay Pointsを確認してください。'],
      ['はい。月額補給品やプレミアムパスの購入時にも全額Play Pointsが付与されます。', 'Google Play上の対象購入として処理される場合に、Google Playのルールに基づいてポイントが計算されます。購入前のGoogle Play画面に表示される獲得予定ポイントを確認してください。']
    ]
  });
}

function syncGakumasVerifiedInputOnly(rootDir) {
  return syncVerifiedInputOnly(rootDir, {
    file: 'games/gakumas/index.html',
    presetLabel: 'Google Playの表示額を入力',
    optionLabel: '現行価格をGoogle Playで確認して入力',
    tableMessage: '学マスは配信ストアごとに購入経路が分かれます。Google Play版の現行商品価格を一次情報で固定できるまでは、旧ジュエル価格やパス価格を掲載せず購入画面の金額を入力してください。',
    gameMeta: `学マス Google Play価格・Play Points確認：${VERIFIED_AT}（価格は購入画面を正本） ｜ Google Play Points (100円=1pt)`,
    replacements: [
      ['学マスの天井課金（6万円）でゴールドランクになれますか？', '学マスの200連分に必要な現金額は固定ですか？'],
      ['はい。通常レートで約600pt、CP時なら約1,800pt〜3,000pt貯まり、ゴールド（1,000pt）に到達可能です。', 'いいえ。所持ジュエルや配布、販売中の商品構成、購入経路で実際の支払額が変わるため、PlayPointでは6万円などの固定額を断定しません。Google Playの購入画面に表示された支払額を入力して確認してください。']
    ]
  });
}

function syncProsekaVerifiedInputOnly(rootDir) {
  return syncVerifiedInputOnly(rootDir, {
    file: 'games/proseka/index.html',
    presetLabel: 'Google Playの表示額を入力',
    optionLabel: 'Google Play購入画面の金額を入力',
    tableMessage: '公式WebStoreの現行価格は別記事で確認できますが、WebStoreはGoogle Play決済ではありません。Google Play版の商品価格をWebStoreから類推せず、購入画面の金額を入力してください。',
    replacements: [
      ['プロセカの天井（9万円）で何ポイント還元されますか？', 'プロセカの300連分に必要な現金額は固定9万円ですか？'],
      ['通常時で約900pt、Google Playの5倍キャンペーン時なら約4,500pt（プラチナランク到達）還元されます。', 'いいえ。所持クリスタル、無償分、パス、キャンペーン、公式WebStoreなどで実際の負担が変わるため、Google Playでの支払額を固定9万円とは扱いません。Google Play購入画面の金額を入力してPlay Pointsを確認してください。']
    ]
  });
}

function syncGameSeoSafety(rootDir) {
  const changedFiles = [];
  if (syncFgoInitialAmount(rootDir)) changedFiles.push('games/fgo/index.html');
  if (syncBlueArchiveVerifiedInputOnly(rootDir)) changedFiles.push('games/bluearchive/index.html');
  if (syncNikkeVerifiedInputOnly(rootDir)) changedFiles.push('games/nikke/index.html');
  if (syncGakumasVerifiedInputOnly(rootDir)) changedFiles.push('games/gakumas/index.html');
  if (syncProsekaVerifiedInputOnly(rootDir)) changedFiles.push('games/proseka/index.html');

  const descriptionReplacements = [
    [
      '勝利の女神：NIKKEのジュエル購入、30日補給品、イベントパス、マイレージ200連天井で貯まるPlayポイントをサクッと計算！パック別還元早見表やポイント使い道も比較できます。隊員募集前の課金計画にぜひ役立ててみてくださいね。',
      'NIKKEのGoogle Play課金予定額からPlay Pointsを計算。現行商品価格は購入画面を正本とし、200連や凸に必要な現金額を固定値として推測しません。'
    ],
    [
      '学園アイドルマスター（学マス）の有償ジュエル、プレミアムミッションパス、200連天井・4凸課金で貯まるPlayポイントをパッと計算！パック別還元早見表やお得な使い道も比較できます。プロデュース前の計画にぜひ役立ててみてくださいね。',
      '学園アイドルマスター（学マス）のGoogle Play課金予定額からPlay Pointsを計算。現行商品価格を一次情報で固定できない間は、購入画面の金額を自由入力して確認できます。'
    ],
    [
      'プロジェクトセカイ（プロセカ）の有償クリスタル、カラフルパス、プレパス、天井ガチャで貯まるGoogle Play Pointsを即時計算！パック別還元早見表や使い道も掲載しています。ガチャ前のポイント確認にぜひ役立ててみてくださいね。',
      'プロセカのGoogle Play課金予定額からPlay Pointsを計算。公式WebStoreは別決済として分離し、Google Playの現行商品価格は購入画面を正本として確認できます。'
    ]
  ];
  for (const [before, after] of descriptionReplacements) {
    changedFiles.push(...replaceDescriptionAcrossGamePages(rootDir, before, after));
  }

  return { checked: 5, changedFiles: [...new Set(changedFiles)].sort() };
}

module.exports = { syncGameSeoSafety };
