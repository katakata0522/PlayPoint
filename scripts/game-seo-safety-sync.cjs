'use strict';

const fs = require('node:fs');
const path = require('node:path');

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

function syncBlueArchiveVerifiedInputOnly(rootDir) {
  const filePath = path.join(rootDir, 'games/bluearchive/index.html');
  let html = fs.readFileSync(filePath, 'utf8');

  html = html.replace(
    /<div class="preset-buttons">[\s\S]*?<\/div>/,
    `<div class="preset-buttons">\n                  <button type="button" class="preset-btn active" data-amount="0" data-mult="1" aria-pressed="true">Google Playの表示額を入力</button>\n              </div>`
  );

  html = html.replace(
    /(<select id="sim-pack-select">)[\s\S]*?(<\/select>)/,
    `$1\n                              <option value="custom" selected>現行価格をGoogle Playで確認して入力</option>\n                          $2`
  );

  html = html.replace(
    /<input type="number" id="sim-custom-amount" value="[^"]*" min="0" step="any" inputmode="decimal">/,
    '<input type="number" id="sim-custom-amount" value="0" min="0" step="any" inputmode="decimal">'
  );

  html = html.replace(
    /(<table class="pack-table">[\s\S]*?<tbody>)[\s\S]*?(<\/tbody>)/,
    '$1\n<tr><td colspan="4">現行のGoogle Play商品価格は一次表示の再確認中です。価格を推測で掲載せず、購入画面に表示された金額を上の自由入力欄へ入れて計算してください。</td></tr>\n                      $2'
  );

  return writeIfChanged(filePath, html);
}

function syncGameSeoSafety(rootDir) {
  const changedFiles = [];
  if (syncFgoInitialAmount(rootDir)) changedFiles.push('games/fgo/index.html');
  if (syncBlueArchiveVerifiedInputOnly(rootDir)) changedFiles.push('games/bluearchive/index.html');
  return { checked: 2, changedFiles };
}

module.exports = { syncGameSeoSafety };
