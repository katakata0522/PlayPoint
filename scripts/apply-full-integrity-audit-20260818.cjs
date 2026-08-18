'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const TODAY = '2026-08-18';

function filePath(relative) { return path.join(root, relative); }
function read(relative) { return fs.readFileSync(filePath(relative), 'utf8'); }
function write(relative, content) {
  fs.mkdirSync(path.dirname(filePath(relative)), { recursive: true });
  fs.writeFileSync(filePath(relative), content.replace(/\r\n/g, '\n'), 'utf8');
}
function replaceRequired(relative, search, replacement, label = String(search)) {
  const before = read(relative);
  const after = typeof search === 'string' ? before.replace(search, replacement) : before.replace(search, replacement);
  if (after === before) throw new Error(`${relative}: replacement not applied: ${label}`);
  write(relative, after);
}
function replaceOptional(relative, search, replacement) {
  const before = read(relative);
  const after = typeof search === 'string' ? before.split(search).join(replacement) : before.replace(search, replacement);
  if (after !== before) write(relative, after);
}
function replaceRegionKey(content, region, key, value) {
  const start = content.indexOf(`    '${region}': {`);
  if (start < 0) throw new Error(`config region not found: ${region}`);
  const nextRegions = ['JP', 'US', 'KR', 'TW'].map(r => content.indexOf(`    '${r}': {`, start + 1)).filter(i => i > start);
  const end = nextRegions.length ? Math.min(...nextRegions) : content.indexOf('\n};', start);
  const segment = content.slice(start, end);
  const re = new RegExp(`(${key.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}:\\s*)"[^"]*"`);
  if (!re.test(segment)) throw new Error(`config key not found: ${region}.${key}`);
  return content.slice(0, start) + segment.replace(re, `$1"${value.replace(/"/g, '\\"')}"`) + content.slice(end);
}
function replaceRegionTemplate(content, region, key, value) {
  const start = content.indexOf(`    '${region}': {`);
  if (start < 0) throw new Error(`config region not found: ${region}`);
  const nextRegions = ['JP', 'US', 'KR', 'TW'].map(r => content.indexOf(`    '${r}': {`, start + 1)).filter(i => i > start);
  const end = nextRegions.length ? Math.min(...nextRegions) : content.indexOf('\n};', start);
  const segment = content.slice(start, end);
  const keyToken = `'${key}':`;
  const keyIndex = segment.indexOf(keyToken);
  if (keyIndex < 0) throw new Error(`config template not found: ${region}.${key}`);
  const valueStart = segment.indexOf('`', keyIndex + keyToken.length);
  const valueEnd = valueStart >= 0 ? segment.indexOf('`', valueStart + 1) : -1;
  if (valueStart < 0 || valueEnd < 0) throw new Error(`config template bounds not found: ${region}.${key}`);
  const nextSegment = segment.slice(0, valueStart + 1) + value + segment.slice(valueEnd);
  return content.slice(0, start) + nextSegment + content.slice(end);
}

// 1) Google Play公式仕様: プロモーションは「ステータス率×倍率」ではなく、表示された特別獲得率と通常率の高い方。
{
  let calculator = read('js/calculator.js');
  calculator = calculator.replace(
`    // 直接入力と倍率入力を別の入力方法として比較し、採用理由も返す
    getRateDetails(baseRateElement, statusSelectElement, multiplierElement) {`,
`    // 通常獲得率とGoogle Playに表示された特別獲得率を比較し、採用理由も返す。
    // multiplierElement というID/URLパラメータ名は既存共有URLとの互換性のため維持する。
    getRateDetails(baseRateElement, statusSelectElement, multiplierElement) {`
  );
  calculator = calculator.replace(
`        const multipliedRate = statusRate * multiplier;
        const difference = directRate - multipliedRate;`,
`        // Google Playのスペシャルオファーは、ランク通常率へ倍率を掛けるのではなく
        // 「100円/$1/1,000원/NT$30 あたり何pt」の特別獲得率として通常率と比較する。
        const promotionRate = multiplier;
        const difference = directRate - promotionRate;`
  );
  calculator = calculator.replace(
`            multipliedRate,
            finalRate: Math.max(directRate, multipliedRate),`,
`            promotionRate,
            // 古いテスト・補助コードとの互換性を保つ読み取り専用エイリアス。
            multipliedRate: promotionRate,
            finalRate: Math.max(directRate, promotionRate),`
  );
  if (!calculator.includes('const promotionRate = multiplier;')) throw new Error('calculator promotion-rate patch failed');
  write('js/calculator.js', calculator);

  let config = read('js/config.js');
  const copy = {
    JP: {
      labelBaseRate: '通常獲得率（ステータスから自動入力）',
      labelMultiplier: 'キャンペーン特別獲得率（例：3pt/100円）',
      labelMultiplierReverse: 'キャンペーン特別獲得率（例：3pt/100円）',
      warningRate: 'Google Playに表示された特別獲得率と通常獲得率の高い方を試算に使います。ステータスの通常獲得率へ倍率を掛けません。対象・上限・有効化はキャンペーン画面で確認してください。',
      resultRateSourceMultiplier: 'キャンペーンの特別獲得率を使用',
      tooltip: '<strong>【キャンペーンの特別獲得率】</strong><p>Google Playのオファー画面に「100円ごとに3ポイント」のように表示された最終的な獲得率を入力します。</p><p><strong>現在のステータスの通常獲得率に3を掛ける計算ではありません。</strong>通常獲得率と特別獲得率を比べ、高い方を試算に使います。</p><hr><p>対象商品、期間、上限、有効化の要否はGoogle Playのオファー画面を優先してください。</p>'
    },
    US: {
      labelBaseRate: 'Base earn rate (auto from level)',
      labelMultiplier: 'Promotion special earn rate (e.g. 3 pt/$1)',
      labelMultiplierReverse: 'Promotion special earn rate (e.g. 3 pt/$1)',
      warningRate: 'The calculator compares your base earn rate with the special earn rate shown in Google Play and uses the higher rate. It does not multiply your level rate by the promotion number. Confirm eligibility, caps, and activation in Google Play.',
      resultRateSourceMultiplier: 'Promotion special earn rate used',
      tooltip: '<strong>Promotion special earn rate</strong><p>Enter the final rate shown in Google Play, such as 3 points per $1.</p><p><strong>Do not multiply your level base rate by 3.</strong> The calculator compares the base rate with the special earn rate and uses the higher one.</p><hr><p>Check eligible items, offer period, caps, and activation in Google Play.</p>'
    },
    KR: {
      labelBaseRate: '기본 적립률(등급에서 자동 입력)',
      labelMultiplier: '프로모션 특별 적립률(예: 1,000원당 3pt)',
      labelMultiplierReverse: '프로모션 특별 적립률(예: 1,000원당 3pt)',
      warningRate: 'Google Play에 표시된 특별 적립률과 기본 적립률 중 높은 값을 사용합니다. 현재 등급의 기본 적립률에 프로모션 숫자를 곱하지 않습니다. 대상, 상한, 활성화 조건은 Google Play에서 확인하세요.',
      resultRateSourceMultiplier: '프로모션 특별 적립률 사용',
      tooltip: '<strong>프로모션 특별 적립률</strong><p>Google Play 오퍼에 표시된 최종 적립률(예: 1,000원당 3pt)을 입력하세요.</p><p><strong>현재 등급 기본 적립률에 3을 곱하지 않습니다.</strong> 기본 적립률과 특별 적립률 중 높은 값을 사용합니다.</p><hr><p>대상 상품, 기간, 상한, 활성화 여부는 Google Play 화면을 확인하세요.</p>'
    },
    TW: {
      labelBaseRate: '基本獲點率（依等級自動帶入）',
      labelMultiplier: '活動特別獲點率（例：每 NT$30 3 點）',
      labelMultiplierReverse: '活動特別獲點率（例：每 NT$30 3 點）',
      warningRate: '計算器會比較 Google Play 顯示的活動特別獲點率與基本獲點率，採用較高者；不會把目前等級的基本獲點率再乘上活動數字。適用商品、上限與啟用條件請以 Google Play 為準。',
      resultRateSourceMultiplier: '採用活動特別獲點率',
      tooltip: '<strong>活動特別獲點率</strong><p>請輸入 Google Play 優惠畫面顯示的最終獲點率，例如每 NT$30 3 點。</p><p><strong>不要把目前等級的基本獲點率再乘以 3。</strong>計算器會比較基本獲點率與特別獲點率並採用較高者。</p><hr><p>適用商品、期間、上限與是否需要啟用，請以 Google Play 顯示為準。</p>'
    }
  };
  for (const [region, values] of Object.entries(copy)) {
    for (const key of ['labelBaseRate','labelMultiplier','labelMultiplierReverse','warningRate','resultRateSourceMultiplier']) {
      config = replaceRegionKey(config, region, key, values[key]);
    }
    config = replaceRegionTemplate(config, region, 'tooltip-multiplier', values.tooltip);
  }
  write('js/config.js', config);

  let index = read('index.html');
  index = index.replaceAll('100円あたりの獲得率（自動入力・編集可）', '通常獲得率（ステータスから自動入力）');
  index = index.replaceAll('100円あたりの獲得率（直接入力）', '通常獲得率（ステータスから自動入力）');
  index = index.replaceAll('キャンペーン倍率（通常は1倍）', 'キャンペーン特別獲得率（例：3pt/100円）');
  index = index.replaceAll('キャンペーン倍率（もう一つの入力方法）', 'キャンペーン特別獲得率（例：3pt/100円）');
  index = index.replaceAll('「獲得率の直接入力」または「ステータス×倍率」の高い方を試算に使います。両方は別の入力方法です。実際の対象・上限・有効化はキャンペーン画面で確認してください。','Google Playに表示された特別獲得率と通常獲得率の高い方を試算に使います。ステータスの通常獲得率へ倍率を掛けません。対象・上限・有効化はキャンペーン画面で確認してください。');
  write('index.html', index);

  replaceOptional('info.html', '獲得率欄へ直接入力し、「3倍」のように表示される場合は倍率欄を使います。両方を入力した場合、計算機は「直接入力した獲得率」と「ステータスの基本獲得率×倍率」を比較し、高い方を試算に使います。これは入力方法を選べるようにするための計算であり、キャンペーンの併用可否や対象判定を保証するものではありません。', 'Google Playのオファー画面に「100円ごとに3ポイント」のような特別獲得率が表示される場合は、その最終的な獲得率をキャンペーン欄へ入力します。計算機は現在ステータスの通常獲得率と特別獲得率を比較し、高い方を試算に使います。通常獲得率へキャンペーン数字を掛ける計算ではありません。対象判定、上限、期間、有効化の要否はGoogle Playの表示を優先してください。');
}

// 2) Consent Mode v2: TCFをPurpose 1だけで一括grantedにせず、広告用途を分離する。
write('js/consent.js', `'use strict';

(() => {
    if (window.PlayPointConsent) return;

    const callbacks = new Set();
    const EEA_UK_CH_REGIONS = [
        'AT', 'BE', 'BG', 'CH', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR',
        'GB', 'GR', 'HR', 'HU', 'IE', 'IS', 'IT', 'LI', 'LT', 'LU', 'LV', 'MT',
        'NL', 'NO', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK'
    ];
    let status = 'pending';
    let tcfListenerAttached = false;
    let tcfObserved = false;
    let consentState = Object.freeze({
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied'
    });

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() {
        window.dataLayer.push(arguments);
    };

    // 対象地域外は通常動作。EEA・英国・スイスはCMP更新まで保存を拒否する。
    window.gtag('consent', 'default', {
        analytics_storage: 'granted',
        ad_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted'
    });
    window.gtag('consent', 'default', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        region: EEA_UK_CH_REGIONS,
        wait_for_update: 500
    });

    function flushCallbacks() {
        if (status !== 'granted') return;
        for (const callback of callbacks) {
            try { callback(); } catch (error) { console.error('同意後の処理に失敗しました。', error); }
        }
        callbacks.clear();
    }

    function dispatchStatus(source) {
        document.dispatchEvent(new CustomEvent('playpoint:consent-updated', {
            detail: { status, source, consent: { ...consentState } }
        }));
    }

    function applyConsentState(nextState, source) {
        consentState = Object.freeze({ ...nextState });
        status = consentState.analytics_storage === 'granted' ? 'granted' : 'denied';
        window.gtag('consent', 'update', consentState);
        if (status !== 'granted') callbacks.clear();
        flushCallbacks();
        dispatchStatus(source);
    }

    function buildTcfConsentState(tcData) {
        if (tcData.gdprApplies === false) {
            return {
                analytics_storage: 'granted', ad_storage: 'granted',
                ad_user_data: 'granted', ad_personalization: 'granted'
            };
        }
        const consents = tcData.purpose?.consents || {};
        const storageAllowed = consents[1] === true;
        const personalizedAdsAllowed = storageAllowed && consents[3] === true && consents[4] === true;
        return {
            analytics_storage: storageAllowed ? 'granted' : 'denied',
            ad_storage: storageAllowed ? 'granted' : 'denied',
            // Purpose 1だけで広告ユーザーデータ/パーソナライズまで許可しない。
            ad_user_data: personalizedAdsAllowed ? 'granted' : 'denied',
            ad_personalization: personalizedAdsAllowed ? 'granted' : 'denied'
        };
    }

    function handleTcfData(tcData, success) {
        if (!success || !tcData) return;
        if (!['tcloaded', 'useractioncomplete'].includes(tcData.eventStatus)) return;
        tcfObserved = true;
        applyConsentState(buildTcfConsentState(tcData), 'tcf');
    }

    function attachTcfListener() {
        if (tcfListenerAttached || typeof window.__tcfapi !== 'function') return false;
        tcfListenerAttached = true;
        window.__tcfapi('addEventListener', 2, handleTcfData);
        return true;
    }

    function settleWithoutTcf() {
        if (tcfObserved || tcfListenerAttached) return;
        // TCF APIがない地域では内部処理を許可するが、Consent Modeのupdateは送らない。
        // これによりGoogle側の地域別default（EEA等はdenied）を上書きしない。
        status = 'granted';
        consentState = Object.freeze({
            analytics_storage: 'granted', ad_storage: 'granted',
            ad_user_data: 'granted', ad_personalization: 'granted'
        });
        flushCallbacks();
        dispatchStatus('no-tcf');
    }

    function waitForTcfApi() {
        if (attachTcfListener()) return;
        let attempts = 0;
        const timer = window.setInterval(() => {
            attempts += 1;
            if (attachTcfListener()) {
                window.clearInterval(timer);
                return;
            }
            if (attempts >= 8) {
                window.clearInterval(timer);
                settleWithoutTcf();
            }
        }, 250);
    }

    function showSettings() {
        window.googlefc = window.googlefc || {};
        window.googlefc.callbackQueue = window.googlefc.callbackQueue || [];
        window.googlefc.callbackQueue.push({
            CONSENT_API_READY() {
                if (typeof window.googlefc.showRevocationMessage === 'function') window.googlefc.showRevocationMessage();
            }
        });
        if (typeof window.googlefc.showRevocationMessage === 'function') window.googlefc.showRevocationMessage();
    }

    window.PlayPointConsent = Object.freeze({
        whenGranted(callback) {
            if (typeof callback !== 'function') return;
            if (status === 'granted') callback();
            else if (status === 'pending') callbacks.add(callback);
        },
        getStatus() { return status; },
        getConsentState() { return { ...consentState }; },
        showSettings
    });

    document.dispatchEvent(new CustomEvent('playpoint:consent-ready', { detail: { status } }));
    waitForTcfApi();
})();
`);

// 4,5,6) ゲームページ: 更新日をページ自身から取得できるようにし、検証範囲/出典を明示し、noindex保留記事を推薦しない。
{
  let game = read('scripts/generate-game-simulators.cjs');
  game = game.replace("const path = require('path');", "const path = require('path');\n\nconst GAME_CONTENT_UPDATED_AT = '2026-08-18';");
  game = game.replaceAll("verifiedDate: '最終確認：2026年8月'", "verifiedDate: 'Play Points獲得率確認：2026年8月（ゲーム内価格・天井は参考値）'");
  game = game.replaceAll("verifiedDate: 'Verified: August 2026'", "verifiedDate: 'Play Points rates checked: August 2026 (game prices/pity are reference values)'");
  game = game.replaceAll("verifiedDate: '2026년 8월 확인'", "verifiedDate: 'Play Points 적립률 확인: 2026년 8월 (게임 가격/천장은 참고값)'");
  game = game.replaceAll("verifiedDate: '最後確認：2026年8月'", "verifiedDate: 'Play Points 獲點率確認：2026年8月（遊戲價格／保底為參考值）'");
  game = game.replaceAll("multiplierLabel: 'ポイント倍率：'", "multiplierLabel: 'キャンペーン特別獲得率：'");
  game = game.replaceAll("{ val: '1', label: '通常時（等倍 / 1%）' }", "{ val: '1', label: '通常 / 100円あたり1pt' }");
  game = game.replaceAll("{ val: '2', label: '2倍キャンペーン' }", "{ val: '2', label: '特別獲得率：100円あたり2pt' }");
  game = game.replaceAll("{ val: '3', label: '3倍キャンペーン' }", "{ val: '3', label: '特別獲得率：100円あたり3pt' }");
  game = game.replaceAll("{ val: '4', label: '4倍キャンペーン' }", "{ val: '4', label: '特別獲得率：100円あたり4pt' }");
  game = game.replaceAll("{ val: '5', label: '5倍キャンペーン' }", "{ val: '5', label: '特別獲得率：100円あたり5pt' }");
  game = game.replaceAll("{ val: '7', label: '7倍キャンペーン' }", "{ val: '7', label: '特別獲得率：100円あたり7pt' }");
  game = game.replaceAll("multiplierLabel: 'Promotion Multiplier:'", "multiplierLabel: 'Promotion special earn rate:'");
  game = game.replaceAll("{ val: '1', label: 'Standard Rate (1x)' }", "{ val: '1', label: 'Base reference: 1 pt / $1' }");
  for (const n of [2,3,4,5,7]) game = game.replaceAll(`{ val: '${n}', label: '${n}x Point Promotion' }`, `{ val: '${n}', label: 'Special rate: ${n} pt / $1' }`);
  game = game.replaceAll("multiplierLabel: '프로모션 배율:'", "multiplierLabel: '프로모션 특별 적립률:'");
  game = game.replaceAll("multiplierLabel: '活動倍率：'", "multiplierLabel: '活動特別獲點率：'");
  game = game.replaceAll("tableThCp: '5倍CP時還元 (5%)'", "tableThCp: '特別獲得率 5pt/100円時'");
  game = game.replaceAll("tableThCp: '5x Promo (5x)'", "tableThCp: 'Special rate (5 pt / $1)'");
  game = game.replace("      { title: '東京ゲームショウ Google Play VIP特典', href: 'articles/2026-08-17-tgs-google-play-vip.html' },\n      { title: 'Google Play大感謝祭の参加方法と特典', href: 'articles/2026-08-17-diamond-valley-festival-guide.html' },", "      { title: '倍率・キャンペーンの正しい計算方法', href: 'articles/2026-08-05-play-points-multiplier-stacking.html' },\n      { title: 'Play Pointsランク完全ガイド', href: 'articles/2026-08-05-play-points-levels-guide.html' },");

  // 全ゲームページの<head>へ意味のある更新日を持たせる。
  game = game.replace('<meta name="robots" content="index, follow, max-image-preview:large" />', '<meta name="robots" content="index, follow, max-image-preview:large" />\n  <meta name="last-modified" content="${GAME_CONTENT_UPDATED_AT}" />');

  // FAQ直後に、何を検証済み/未検証かを明示する共通セクションを追加。
  const marker = `          <!-- 他のゲーム計算機 -->`;
  const sourceSection = `          <section class="section game-source-section">\n              <h2>${'${locale.lang === \'ja\' ? \'出典・確認範囲\' : locale.lang === \'ko\' ? \'출처 및 확인 범위\' : locale.lang === \'zh-TW\' ? \'來源與確認範圍\' : \'Sources & verification scope\'}'}</h2>\n              <p>${'${locale.lang === \'ja\' ? \'Play Pointsの国別通常獲得率・ランク条件・四捨五入ルールはGoogle Play公式ヘルプを基準に確認しています。ゲーム内パック価格、ガチャ天井、商品構成は変更されるため参考値であり、購入前に各ゲーム内ストアと公式告知で再確認してください。\' : locale.lang === \'ko\' ? \'Play Points의 국가별 기본 적립률, 등급 조건, 반올림 규칙은 Google Play 공식 도움말을 기준으로 확인합니다. 게임 내 패키지 가격과 천장 조건은 변경될 수 있는 참고값이므로 결제 전 게임 내 상점과 공식 공지를 다시 확인하세요.\' : locale.lang === \'zh-TW\' ? \'Play Points 的地區基本獲點率、等級條件與四捨五入規則以 Google Play 官方說明為基準。遊戲內商品價格與保底條件可能變更，僅作參考；購買前請在遊戲內商店與官方公告再次確認。\' : \'Google Play Points base earn rates, level thresholds, and rounding rules are checked against Google Play Help. In-game pack prices and pity/guarantee values can change and are reference inputs only; verify them in the game store and publisher notices before purchase.\'}'}</p>\n              <p><a href="${'${locale.lang === \'ja\' ? \'https://support.google.com/googleplay/answer/9077192?co=GENIE.CountryCode%3DJP&hl=ja\' : \'https://support.google.com/googleplay/answer/9077192\'}'}" target="_blank" rel="noopener noreferrer">Google Play Points official help</a></p>\n          </section>\n\n`;
  if (!game.includes(marker)) throw new Error('game source insertion marker missing');
  game = game.replace(marker, sourceSection + marker);
  write('scripts/generate-game-simulators.cjs', game);
}

// 4) sitemapのゲームlastmodをトップページ日付で一律上書きせず、コンテンツ日付台帳を使う。
{
  let sitemap = read('scripts/sitemap-sync.cjs');
  sitemap = sitemap.replace(
`function getGameSitemapEntries(rootDir) {
  const entries = [];`,
`function getGameSitemapEntries(rootDir) {
  const entries = [];
  const dateFor = (relativePath) => CONTENT_DATE_OVERRIDES[relativePath] || TOP_PAGE_CONTENT_DATES.ja;`
  );
  sitemap = sitemap.replace("      lastmod: TOP_PAGE_CONTENT_DATES.ja\n    });", "      lastmod: dateFor(`${prefix}/index.html`)\n    });");
  sitemap = sitemap.replace("            lastmod: TOP_PAGE_CONTENT_DATES.ja\n          });", "            lastmod: dateFor(`${prefix}/${sub.name}/index.html`)\n          });");
  write('scripts/sitemap-sync.cjs', sitemap);

  let dates = read('scripts/content-dates.cjs');
  dates = dates.replace("  'privacy.html': '2026-08-12',", "  'privacy.html': '2026-08-18',");
  dates = dates.replace("  'terms.html': '2026-08-12',", "  'terms.html': '2026-08-18',");
  for (const prefix of ['', 'en/', 'ko/', 'tw/']) {
    dates = dates.replace(new RegExp(`  '${prefix.replace('/', '\\/')}games\\/([^']+)': '2026-08-(?:12|16|17)',`, 'g'), (m, suffix) => `  '${prefix}games/${suffix}': '2026-08-18',`);
  }
  dates = dates.replace("  'campaign/2x/index.html': '2026-08-12',", "  'campaign/2x/index.html': '2026-08-18',");
  dates = dates.replace("  'campaign/3x/index.html': '2026-08-12',", "  'campaign/3x/index.html': '2026-08-18',");
  write('scripts/content-dates.cjs', dates);
}

// 7) 変動する楽天還元率を固定断定しない。
{
  let monetization = read('scripts/insert-lp-monetization.cjs');
  monetization = monetization.replaceAll('SPU（スーパーポイントアップ）やお買い物マラソン、5と0のつく日で実質5%〜15%以上の楽天ポイントが還元', '楽天市場側のキャンペーンや会員条件により楽天ポイント還元の対象になる場合');
  monetization = monetization.replaceAll('コードはメールで即時届くため、課金の実質負担を大幅に抑えられます。', '付与率・上限・エントリー要否・コードの受取条件は変わるため、購入画面とキャンペーン詳細を確認してください。');
  write('scripts/insert-lp-monetization.cjs', monetization);

  const publicRoots = ['articles','status','maintenance','campaign','amount','compare','latest','points-cost'];
  for (const base of publicRoots) {
    const abs = filePath(base);
    if (!fs.existsSync(abs)) continue;
    const stack = [abs];
    while (stack.length) {
      const current = stack.pop();
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const target = path.join(current, entry.name);
        if (entry.isDirectory()) stack.push(target);
        else if (entry.isFile() && entry.name.endsWith('.html')) {
          let html = fs.readFileSync(target, 'utf8');
          html = html.replaceAll('SPU（スーパーポイントアップ）やお買い物マラソン、5と0のつく日で実質5%〜15%以上の楽天ポイントが還元', '楽天市場側のキャンペーンや会員条件により楽天ポイント還元の対象になる場合');
          html = html.replaceAll('コードはメールで即時届くため、課金の実質負担を大幅に抑えられます。', '付与率・上限・エントリー要否・コードの受取条件は変わるため、購入画面とキャンペーン詳細を確認してください。');
          fs.writeFileSync(target, html, 'utf8');
        }
      }
    }
  }
}

// 8) 法務ページの日付を本文/meta/JSON-LD/サイトマップ台帳で一致させる。
for (const relative of ['privacy.html','terms.html']) {
  let html = read(relative);
  html = html.replace(/<meta name="last-modified" content="\d{4}-\d{2}-\d{2}">/, `<meta name="last-modified" content="${TODAY}">`);
  html = html.replace(/<meta property="article:modified_time" content="\d{4}-\d{2}-\d{2}T00:00:00\+09:00">/, `<meta property="article:modified_time" content="${TODAY}T00:00:00+09:00">`);
  html = html.replace(/"dateModified": "\d{4}-\d{2}-\d{2}"/, `"dateModified": "${TODAY}"`);
  html = html.replace(/(<strong>最終改定日：<\/strong>)(?:\d{4}[年/-]\d{1,2}[月/-]\d{1,2}日?)/, `$1${TODAY}`);
  write(relative, html);
}

// 9) inline script要素は当面互換性のため許可しつつ、HTML属性イベントハンドラだけCSPで禁止する。
{
  let ht = read('.htaccess');
  ht = ht.replace("script-src 'self' 'unsafe-inline'", "script-src 'self' 'unsafe-inline'; script-src-attr 'none'; script-src-elem 'self' 'unsafe-inline'");
  if (!ht.includes("script-src-attr 'none'")) throw new Error('CSP hardening failed');
  write('.htaccess', ht);
}

// 国際SEO生成文の「ランク率×倍率」誤解を避ける表現へ寄せる。
{
  let intl = read('scripts/intl-seo-content.cjs');
  intl = intl.replaceAll('promotion multiplier', 'promotion special earn rate');
  intl = intl.replaceAll('campaign multiplier', 'campaign special earn rate');
  intl = intl.replaceAll('campaign multipliers', 'campaign special earn rates');
  intl = intl.replaceAll('캠페인 배율', '캠페인 특별 적립률');
  intl = intl.replaceAll('活動倍率', '活動特別獲點率');
  intl = intl.replaceAll('1x and campaign special earn rates', 'the base rate and the special earn rate shown in Google Play');
  intl = intl.replaceAll('1x first, then compare the result with 2x or 3x if your purchase is actually eligible for that promotion.', 'Start with your base rate, then enter the final special earn rate shown for an eligible purchase in Google Play.');
  write('scripts/intl-seo-content.cjs', intl);
}

// 日本語2x/3x LPはURL互換性を維持しつつ、「2pt/3ptの特別獲得率」として正しい金額へ修正。
{
  let p3 = read('campaign/3x/index.html');
  p3 = p3.replace('倍率を3倍にした状態で計算機へ移動し、必要額がどれくらい変わるかを確認できます。', 'このページの旧「3倍」表記はURL互換性のため残していますが、計算ではGoogle Playに表示される「100円あたり3ポイント」の特別獲得率として扱い、現在ランクの通常獲得率へ3を掛けません。');
  p3 = p3.replace('倍率3倍・ダイヤモンド到達', '特別獲得率3pt/100円・ダイヤモンド到達');
  p3 = p3.replaceAll('<th>2倍時</th>', '<th>特別獲得率 2pt/100円</th>');
  p3 = p3.replaceAll('<th>3倍キャンペーン時</th>', '<th>特別獲得率 3pt/100円</th>');
  p3 = p3.replace('<td>30,000円</td>\n                        <td>20,000円</td>', '<td>37,500円</td>\n                        <td>25,000円</td>');
  p3 = p3.replace('<td>100,000円</td>\n                        <td>66,667円</td>', '<td>150,000円</td>\n                        <td>100,000円</td>');
  p3 = p3.replace('<td>約314,286円</td>\n                        <td>約209,524円</td>', '<td>550,000円</td>\n                        <td>約366,667円</td>');
  p3 = p3.replace('約40,000円おトク', '約35,000円少ない');
  p3 = p3.replace('約133,333円おトク', '約100,000円少ない');
  p3 = p3.replace('約419,048円おトク', '約261,905円少ない');
  p3 = p3.replace('3倍の破壊力:', '特別獲得率3pt/100円の比較:');
  p3 = p3.replace('ダイヤ到達までの差額は約42万円分にも上ります。高額課金を予定しているなら、3倍キャンペーン期間の活用が圧倒的に有利です。', 'プラチナ通常率1.75pt/100円との比較では必要額が約26.2万円少なくなる試算です。対象購入・上限・期間が一致する場合だけこの特別獲得率を使ってください。');
  p3 = p3.replace('<strong>キャンペーン倍率:</strong> 3を入力します。対象外の支払いが混ざる場合は、対象分だけを別で計算してください。', '<strong>キャンペーン特別獲得率:</strong> Google Playに「100円あたり3ポイント」と表示されている場合に3を入力します。対象外の支払いは分けて計算してください。');
  write('campaign/3x/index.html', p3);

  let p2 = read('campaign/2x/index.html');
  p2 = p2.replaceAll('キャンペーン倍率', 'キャンペーン特別獲得率');
  p2 = p2.replaceAll('2倍キャンペーン', '特別獲得率2pt/100円のキャンペーン');
  p2 = p2.replaceAll('倍率を2倍', '特別獲得率を100円あたり2pt');
  write('campaign/2x/index.html', p2);
}

// 3) ブラウザCIへゲーム計算と記事の収益/計測経路を追加する独立スモーク。
write('.github/scripts/browser-revenue-smoke.cjs', `'use strict';
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright-core');
const ROOT = path.resolve(__dirname, '../..');
const CHROME_PATH = process.env.CHROME_PATH;
const REQUESTED_BASE_URL = (process.env.SMOKE_BASE_URL || '').trim();
const MIME = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png' };
function assert(v,m){ if(!v) throw new Error(m); }
function startServer(){ const server=http.createServer((req,res)=>{ let p=decodeURIComponent(new URL(req.url||'/','http://localhost').pathname); if(p.endsWith('/'))p+='index.html'; const abs=path.resolve(ROOT,'.'+p); if(!abs.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;} fs.stat(abs,(e,s)=>{if(e||!s.isFile()){res.writeHead(404).end();return;}res.writeHead(200,{'content-type':MIME[path.extname(abs)]||'application/octet-stream','cache-control':'no-store'});fs.createReadStream(abs).pipe(res);});}); return new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',()=>resolve({baseUrl:'http://127.0.0.1:'+server.address().port+'/',close:()=>new Promise(r=>server.close(r))}));}); }
async function blockExternal(context, origin){ await context.route('**/*', async route=>{ const u=new URL(route.request().url()); if(u.origin===origin)return route.continue(); const type=route.request().resourceType(); if(type==='script')return route.fulfill({status:200,contentType:'text/javascript',body:'/* blocked */'}); if(type==='stylesheet')return route.fulfill({status:200,contentType:'text/css',body:'/* blocked */'}); return route.fulfill({status:204,body:''}); }); }
async function main(){ assert(CHROME_PATH,'CHROME_PATH is required'); let local; const base=REQUESTED_BASE_URL?(REQUESTED_BASE_URL.endsWith('/')?REQUESTED_BASE_URL:REQUESTED_BASE_URL+'/'):(local=await startServer()).baseUrl; const origin=new URL(base).origin; const browser=await chromium.launch({headless:true,executablePath:CHROME_PATH,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']}); try{ const gamePaths=['games/genshin/','en/games/genshin/','ko/games/genshin/','tw/games/genshin/']; for(const gamePath of gamePaths){ const context=await browser.newContext({viewport:{width:390,height:844}}); await blockExternal(context,origin); const page=await context.newPage(); const errors=[]; page.on('pageerror',e=>errors.push(e.message)); page.on('console',m=>{if(m.type()==='error')errors.push(m.text());}); const response=await page.goto(new URL(gamePath,base).href,{waitUntil:'domcontentloaded',timeout:45000}); assert(response&&response.ok(),gamePath+' HTTP failure'); await page.locator('#game-sim-form').waitFor({state:'attached',timeout:30000}); await page.locator('#sim-pack-select').selectOption('custom'); await page.locator('#sim-custom-amount').fill(gamePath.startsWith('en/')?'10':'1000'); await page.locator('#sim-custom-amount').dispatchEvent('input'); await page.waitForFunction(()=>{const text=document.querySelector('#res-earned-points')?.textContent||'';return /\\d/.test(text)&&!text.startsWith('-');}); const state=await page.evaluate(()=>({points:document.querySelector('#res-earned-points')?.textContent||'',analytics:Boolean(window.PlayPointAnalytics),consent:Boolean(window.PlayPointConsent),source:Boolean(document.querySelector('.game-source-section')),slot:document.querySelector('.game-ad-container ins.adsbygoogle')?.dataset.adSlot||''})); assert(state.analytics&&state.consent,gamePath+' analytics/consent runtime missing'); assert(state.source,gamePath+' source scope missing'); assert(state.slot==='8250492620',gamePath+' managed ad slot missing'); assert(errors.length===0,gamePath+' browser errors: '+errors.join(' | ')); await context.close(); console.log('ok - game revenue smoke '+gamePath); }
 const context=await browser.newContext({viewport:{width:390,height:844}}); await blockExternal(context,origin); const page=await context.newPage(); const articleUrl=new URL('articles/2026-08-05-play-points-multiplier-stacking.html',base).href; const response=await page.goto(articleUrl,{waitUntil:'domcontentloaded',timeout:45000}); assert(response&&response.ok(),'article HTTP failure'); await page.locator('article').waitFor({state:'attached',timeout:30000}); const article=await page.evaluate(()=>({analytics:Boolean(window.PlayPointAnalytics),consent:Boolean(window.PlayPointConsent),slot:document.querySelector('.article-ad-container ins.adsbygoogle')?.dataset.adSlot||'',thirdParty:[...document.scripts].some(s=>/blog\\/(components|article)\\.js/.test(s.src)||/third-party\\.js/.test(s.src))})); assert(article.analytics&&article.consent,'article analytics/consent runtime missing'); assert(article.slot==='8250492620','article ad slot missing'); assert(article.thirdParty,'article runtime loader missing'); await context.close(); console.log('ok - article revenue smoke'); } finally { await browser.close(); if(local)await local.close(); } }
main().catch(e=>{console.error(e);process.exitCode=1;});
`);

{
  let workflow = read('.github/workflows/browser-smoke.yml');
  workflow = workflow.replace('      - name: Verify local calculator in Chromium\n        run: node .github/scripts/browser-smoke.cjs', '      - name: Verify local calculator in Chromium\n        run: |\n          node .github/scripts/browser-smoke.cjs\n          node .github/scripts/browser-revenue-smoke.cjs');
  workflow = workflow.replace('        run: node .github/scripts/browser-smoke.cjs\n\n      - name: Upload failure evidence', '        run: |\n          node .github/scripts/browser-smoke.cjs\n          node .github/scripts/browser-revenue-smoke.cjs\n\n      - name: Upload failure evidence');
  write('.github/workflows/browser-smoke.yml', workflow);
}

// 回帰テストを新仕様へ更新し、今回の9項目を将来戻さないガードを追加。
{
  let uiTest = read('tests/main-calculator-ui.test.cjs');
  uiTest = uiTest.replace("test('直接レートと倍率は代替入力として高い方と採用理由を返す'", "test('通常獲得率と特別獲得率は高い方を返しランク率へ掛け算しない'");
  uiTest = uiTest.replace("{ directRate: 4, multiplier: 2, multipliedRate: 3, finalRate: 4, source: 'direct' }", "{ directRate: 4, multiplier: 2, promotionRate: 2, multipliedRate: 2, finalRate: 4, source: 'direct' }");
  uiTest = uiTest.replace("assert.strictEqual(getRateDetails(createInput('2'), status, createInput('2')).source, 'multiplier');", "assert.strictEqual(getRateDetails(createInput('1.5'), status, createInput('3')).finalRate, 3);\n  assert.strictEqual(getRateDetails(createInput('1.5'), status, createInput('3')).source, 'multiplier');");
  uiTest = uiTest.replace("assert.strictEqual(getRateDetails(createInput('3'), status, createInput('2')).source, 'same');", "assert.strictEqual(getRateDetails(createInput('2'), status, createInput('2')).source, 'same');");
  write('tests/main-calculator-ui.test.cjs', uiTest);

  let common = read('tests/common-pages-fact-ux.test.cjs');
  common = common.replace("test('トップは倍率と直接レートを代替入力として説明し、入力境界をHTMLでも制約する'", "test('トップは通常率と特別獲得率を比較し、入力境界をHTMLでも制約する'");
  common = common.replace("assert.match(html, /100円あたりの獲得率（自動入力・編集可）/);", "assert.match(html, /通常獲得率（ステータスから自動入力）/);");
  common = common.replace("assert.match(html, /キャンペーン倍率（通常は1倍）/);", "assert.match(html, /キャンペーン特別獲得率/);");
  common = common.replace("assert.match(calculator, /finalRate:\\s*Math\\.max\\(directRate, multipliedRate\\)/);", "assert.match(calculator, /finalRate:\\s*Math\\.max\\(directRate, promotionRate\\)/);\n  assert.doesNotMatch(calculator, /statusRate \\* multiplier/);");
  write('tests/common-pages-fact-ux.test.cjs', common);

  write('tests/full-integrity-audit.test.cjs', `'use strict';
const assert=require('node:assert/strict'); const fs=require('node:fs'); const path=require('node:path'); const test=require('node:test');
const root=path.resolve(__dirname,'..'); const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('Google Play特別獲得率をランク通常率へ掛けない',()=>{const c=read('js/calculator.js');assert.match(c,/const promotionRate = multiplier/);assert.match(c,/Math\\.max\\(directRate, promotionRate\\)/);assert.doesNotMatch(c,/statusRate \\* multiplier/);});
test('Consent Modeは広告用途をPurpose 1だけで一括許可しない',()=>{const c=read('js/consent.js');assert.match(c,/consents\\[3\\]/);assert.match(c,/consents\\[4\\]/);assert.match(c,/ad_user_data: personalizedAdsAllowed/);assert.match(c,/ad_personalization: personalizedAdsAllowed/);});
test('ゲーム生成物は確認範囲と出典を明示し保留記事を推薦しない',()=>{const g=read('scripts/generate-game-simulators.cjs');assert.match(g,/game-source-section/);assert.match(g,/game prices\/pity are reference values/);assert.ok(!g.includes('tgs-google-play-vip.html'));assert.ok(!g.includes('diamond-valley-festival-guide.html'));});
test('楽天還元率を固定の5〜15%以上と断定しない',()=>{for(const p of ['scripts/insert-lp-monetization.cjs','status/gold/index.html','campaign/3x/index.html'])assert.ok(!read(p).includes('実質5%〜15%以上'),p);});
test('法務ページの更新日は2026-08-18へ統一',()=>{for(const p of ['privacy.html','terms.html']){const h=read(p);assert.match(h,/last-modified\" content=\"2026-08-18/);assert.match(h,/dateModified\": \"2026-08-18/);assert.match(h,/最終改定日：<\\/strong>2026-08-18/);}});
test('CSPはHTML属性のinline scriptを禁止する',()=>{assert.match(read('.htaccess'),/script-src-attr 'none'/);});
test('ブラウザCIはゲームと記事の収益経路を検査する',()=>{const w=read('.github/workflows/browser-smoke.yml');assert.match(w,/browser-revenue-smoke\\.cjs/);const s=read('.github/scripts/browser-revenue-smoke.cjs');assert.match(s,/games\\/genshin/);assert.match(s,/article-ad-container/);});
test('ゲームサイトマップはコンテンツ日付台帳を参照する',()=>{const s=read('scripts/sitemap-sync.cjs');assert.match(s,/CONTENT_DATE_OVERRIDES\\[relativePath\\]/);assert.match(read('scripts/content-dates.cjs'),/games\\/hbr\\/index\\.html': '2026-08-18'/);});
`);
}

console.log('Applied full integrity audit fixes.');
