'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function write(relativePath, content) {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content, 'utf8');
}

function replaceOnce(content, before, after, label) {
  const index = content.indexOf(before);
  if (index < 0) throw new Error(`置換対象が見つかりません: ${label}`);
  if (content.indexOf(before, index + before.length) >= 0) {
    throw new Error(`置換対象が複数あります: ${label}`);
  }
  return content.slice(0, index) + after + content.slice(index + before.length);
}

function replaceRange(content, startMarker, endMarker, replacement, label) {
  const start = content.indexOf(startMarker);
  if (start < 0) throw new Error(`開始位置が見つかりません: ${label}`);
  const end = content.indexOf(endMarker, start + startMarker.length);
  if (end < 0) throw new Error(`終了位置が見つかりません: ${label}`);
  return content.slice(0, start) + replacement + content.slice(end);
}

const regionNavigation = `'use strict';

import { CONFIGS, STATE, CONSTANTS } from './config.js';
import { UI } from './ui.js';

export const isEnglishPath = () => /\\/en(\\/|$)/.test(window.location.pathname);
export const isKoreanPath = () => /\\/ko(\\/|$)/.test(window.location.pathname);
export const isTaiwanPath = () => /\\/tw(\\/|$)/.test(window.location.pathname);

export function applyRegionFromPath() {
    try {
        if (isEnglishPath()) {
            STATE.currentRegion = 'US';
            localStorage.setItem(CONSTANTS.STORAGE_REGION_KEY, 'US');
        } else if (isKoreanPath()) {
            STATE.currentRegion = 'KR';
            localStorage.setItem(CONSTANTS.STORAGE_REGION_KEY, 'KR');
        } else if (isTaiwanPath()) {
            STATE.currentRegion = 'TW';
            localStorage.setItem(CONSTANTS.STORAGE_REGION_KEY, 'TW');
        } else {
            // URLと表示言語を一致させるため、ルートは常に日本語として扱う。
            STATE.currentRegion = 'JP';
        }
    } catch (e) {
        console.error("地域設定の読み込みに失敗しました:", e);
    }
}

export function switchRegion(newRegion, updateUIForRegion = () => {}) {
    if (!CONFIGS[newRegion] || STATE.currentRegion === newRegion) return;
    STATE.currentRegion = newRegion;
    try {
        localStorage.setItem(CONSTANTS.STORAGE_REGION_KEY, newRegion);
    } catch (e) {
        console.error("地域設定の保存に失敗しました:", e);
        UI.showToast("地域設定の保存に失敗しました。", 'error');
    }

    // URLのディレクトリ構成に基づいて静的ページ間を相互遷移させる
    const isEn = isEnglishPath();
    const isKo = isKoreanPath();
    const isTw = isTaiwanPath();
    const prefix = (isEn || isKo || isTw) ? '../' : './';

    let nextUrl = '';
    if (newRegion === 'JP') {
        nextUrl = (isEn || isKo || isTw) ? '../' : './';
    } else if (newRegion === 'US') {
        nextUrl = prefix + 'en/';
    } else if (newRegion === 'KR') {
        nextUrl = prefix + 'ko/';
    } else if (newRegion === 'TW') {
        nextUrl = prefix + 'tw/';
    }

    if (nextUrl) {
        window.location.href = nextUrl;
    } else {
        document.querySelectorAll(".region-switch button").forEach(button => {
            button.classList.toggle(CONSTANTS.CLASS_ACTIVE, button.dataset.region === newRegion);
        });
        updateUIForRegion();
    }
}

if (typeof window !== 'undefined' && window.__TEST_ENV__) {
    window.PP_APP = window.PP_APP || {};
    window.PP_APP.REGION_NAVIGATION = {
        applyRegionFromPath,
        isEnglishPath,
        isKoreanPath,
        isTaiwanPath,
        switchRegion
    };
}
`;

const languageSuggestion = `'use strict';

import { STATE, CONSTANTS } from './config.js';
import {
    isEnglishPath,
    isKoreanPath,
    isTaiwanPath,
    switchRegion
} from './region-navigation.js';

export function bindLanguageSuggestionDismiss() {
    if (!STATE.dom.closeLangBannerBtn) return;

    STATE.dom.closeLangBannerBtn.addEventListener('click', () => {
        if (STATE.dom.languageSuggestionBanner) {
            STATE.dom.languageSuggestionBanner.classList.add(CONSTANTS.CLASS_HIDDEN);
        }
        try {
            sessionStorage.setItem('playpointLangBannerClosed', 'true');
        } catch (e) {
            console.error("セッションストレージの書き込みに失敗しました:", e);
        }
    });
}

// 言語提案バナーの表示ロジック
export function checkLanguageSuggestion() {
    if (!STATE.dom.languageSuggestionBanner) return;

    let isClosed = false;
    try {
        isClosed = sessionStorage.getItem('playpointLangBannerClosed') === 'true';
    } catch (e) {
        console.error("セッションストレージの読み込みに失敗しました:", e);
    }
    if (isClosed) return;

    let preferredRegion = null;
    try {
        preferredRegion = localStorage.getItem(CONSTANTS.STORAGE_REGION_KEY);
    } catch (e) {
        console.error("ローカルストレージの読み込みに失敗しました:", e);
    }

    if (preferredRegion) return;

    const browserLang = (navigator.language || navigator.userLanguage || '').toLowerCase();

    let targetRegion = null;
    let messageText = '';
    let buttonText = '';
    let isCurrentMatch = false;

    if (browserLang.startsWith('ko')) {
        targetRegion = 'KR';
        messageText = '한국어 버전이 있습니다!';
        buttonText = '한국어로 전환';
        isCurrentMatch = isKoreanPath();
    } else if (browserLang.startsWith('zh-tw') || browserLang.startsWith('zh-hk')) {
        targetRegion = 'TW';
        messageText = '提供繁體中文版本！';
        buttonText = '切換至繁體中文';
        isCurrentMatch = isTaiwanPath();
    } else if (browserLang.startsWith('en')) {
        targetRegion = 'US';
        messageText = 'English version is available!';
        buttonText = 'Switch to English';
        isCurrentMatch = isEnglishPath();
    }

    if (targetRegion && !isCurrentMatch) {
        const spanEl = STATE.dom.languageSuggestionBanner.querySelector('span');
        const btnEl = STATE.dom.switchToEnBtn;
        if (spanEl && btnEl) {
            spanEl.textContent = messageText;
            btnEl.textContent = buttonText;

            const newBtn = btnEl.cloneNode(true);
            btnEl.parentNode.replaceChild(newBtn, btnEl);
            STATE.dom.switchToEnBtn = newBtn;

            newBtn.addEventListener('click', () => {
                switchRegion(targetRegion);
            });
        }
        STATE.dom.languageSuggestionBanner.classList.remove(CONSTANTS.CLASS_HIDDEN);
    }
}
`;

const calendarReminder = `'use strict';

import { CONFIGS, STATE, ANALYTICS, getNextFridayCalendarWindow } from './config.js';

export function bindCalendarReminderEvents() {
    if (STATE.dom.downloadIcalBtn) {
        STATE.dom.downloadIcalBtn.addEventListener('click', () => downloadICS());
    }
    if (STATE.dom.registerGoogleCalBtn) {
        STATE.dom.registerGoogleCalBtn.addEventListener('click', () => {
            ANALYTICS.track('calendar_reminder_added', {
                region: STATE.currentRegion,
                calendar_type: 'google'
            });
        });
    }
}

// ICSファイルのダウンロードロジック
export function downloadICS() {
    const config = CONFIGS[STATE.currentRegion];
    const texts = config.uiText;
    const summary = texts.calSubject;
    const description = texts.calDetails.replace(/\\n/g, '\\\\n');

    const calendarWindow = getNextFridayCalendarWindow(STATE.currentRegion === 'US');

    const icsLines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//PlayPoint//NONSGML Calendar//EN',
        'BEGIN:VEVENT',
        \`SUMMARY:\${summary}\`,
        \`DESCRIPTION:\${description}\`,
        \`DTSTART:\${calendarWindow.start}\`,
        \`DTEND:\${calendarWindow.end}\`,
        'RRULE:FREQ=WEEKLY;BYDAY=FR',
        'SEQUENCE:0',
        'STATUS:CONFIRMED',
        'TRANSP:TRANSPARENT',
        'END:VEVENT',
        'END:VCALENDAR'
    ];
    const icsString = icsLines.join('\\r\\n');
    const blob = new Blob([icsString], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = texts.icsFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    ANALYTICS.track('calendar_reminder_added', {
        region: STATE.currentRegion,
        calendar_type: 'ical'
    });
}
`;

const pwaInstall = `'use strict';

import { STATE, ANALYTICS } from './config.js';

let deferredInstallPrompt = null;

function getInstallCopy() {
    const copy = {
        JP: {
            title: '次回もすぐ日記を開けます',
            body: 'この端末のホーム画面に追加すると、金曜の記録をすぐ始められます。',
            button: 'ホーム画面に追加'
        },
        US: {
            title: 'Open your diary faster next time',
            body: 'Add this tool to your device for quicker weekly entries.',
            button: 'Install app'
        },
        KR: {
            title: '다음 일지를 더 빠르게 열 수 있어요',
            body: '이 도구를 기기에 추가하면 매주 기록을 빠르게 시작할 수 있습니다.',
            button: '앱 설치'
        },
        TW: {
            title: '下次更快開啟日記',
            body: '將此工具加到裝置，即可更快開始每週記錄。',
            button: '安裝應用程式'
        }
    };
    return copy[STATE.currentRegion] || copy.JP;
}

function showInstallPromptAfterDiarySave() {
    if (!deferredInstallPrompt || !STATE.dom.diaryMode) return;
    if (document.getElementById('pwa-install-card')) return;

    const copy = getInstallCopy();
    const card = document.createElement('aside');
    card.id = 'pwa-install-card';
    card.className = 'pwa-install-card';

    const text = document.createElement('div');
    const title = document.createElement('strong');
    const body = document.createElement('p');
    const button = document.createElement('button');
    title.textContent = copy.title;
    body.textContent = copy.body;
    button.type = 'button';
    button.textContent = copy.button;
    text.append(title, body);
    card.append(text, button);
    STATE.dom.diaryMode.appendChild(card);

    button.addEventListener('click', async () => {
        const promptEvent = deferredInstallPrompt;
        deferredInstallPrompt = null;
        card.remove();
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice.outcome === 'accepted') {
            ANALYTICS.track('pwa_install_accepted', {
                region: STATE.currentRegion,
                install_surface: 'after_diary_save'
            });
        }
    }, { once: true });
}

export function initPwaInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        deferredInstallPrompt = event;
    });

    document.addEventListener('playpoint:diary-saved', showInstallPromptAfterDiarySave);
}
`;

const widgetReferral = `'use strict';

import { STATE, ANALYTICS } from './config.js';

export function trackWidgetReferral() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('entry') !== 'widget') return;
    try {
        if (sessionStorage.getItem('playpoint:widget-referral-tracked') === 'true') return;
        sessionStorage.setItem('playpoint:widget-referral-tracked', 'true');
    } catch (error) {
        console.warn('ウィジェット流入の重複防止設定を保存できませんでした。', error);
    }
    ANALYTICS.track('widget_referral_landed', {
        region: STATE.currentRegion,
        entry_surface: 'embedded_widget'
    });
}
`;

const serviceWorkerRegistration = `'use strict';

import { isEnglishPath, isKoreanPath, isTaiwanPath } from './region-navigation.js';

function runWhenIdle(callback, timeout = 2000) {
    if ('requestIdleCallback' in window) {
        window.requestIdleCallback(callback, { timeout });
        return;
    }
    window.setTimeout(callback, Math.min(timeout, 1200));
}

export function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    window.addEventListener('load', () => {
        runWhenIdle(() => {
            const swPath = (isEnglishPath() || isKoreanPath() || isTaiwanPath()) ? '../sw.js' : './sw.js';
            navigator.serviceWorker.register(swPath, { updateViaCache: 'none' })
                .then((reg) => {
                    console.log('ServiceWorker registered successfully:', reg.scope);
                    void reg.update().catch(err => console.warn('ServiceWorker update check failed:', err));
                })
                .catch(err => console.error('ServiceWorker registration failed:', err));
        });
    });
}
`;

write('js/region-navigation.js', regionNavigation);
write('js/language-suggestion.js', languageSuggestion);
write('js/calendar-reminder.js', calendarReminder);
write('js/pwa-install.js', pwaInstall);
write('js/widget-referral.js', widgetReferral);
write('js/service-worker-registration.js', serviceWorkerRegistration);

let main = read('js/main.js');
main = replaceOnce(
  main,
  "import { CONFIGS, STATE, CONSTANTS, ANALYTICS, getNextFridayCalendarWindow } from './config.js';",
  "import { CONFIGS, STATE, CONSTANTS, ANALYTICS } from './config.js';",
  'main config import'
);
main = replaceOnce(
  main,
  "import { initWebVitalsMonitoring } from './web-vitals.js';\n\nlet deferredInstallPrompt = null;",
  "import { initWebVitalsMonitoring } from './web-vitals.js';\nimport {\n    applyRegionFromPath,\n    isEnglishPath,\n    isKoreanPath,\n    isTaiwanPath,\n    switchRegion as navigateToRegion\n} from './region-navigation.js';\nimport { bindLanguageSuggestionDismiss, checkLanguageSuggestion } from './language-suggestion.js';\nimport { bindCalendarReminderEvents, downloadICS } from './calendar-reminder.js';\nimport { initPwaInstallPrompt } from './pwa-install.js';\nimport { trackWidgetReferral } from './widget-referral.js';\nimport { registerServiceWorker } from './service-worker-registration.js';",
  'main responsibility imports'
);
main = replaceOnce(
  main,
  "initWebVitalsMonitoring();\n\nexport const isEnglishPath = () => /\\/en(\\/|$)/.test(window.location.pathname);\nexport const isKoreanPath = () => /\\/ko(\\/|$)/.test(window.location.pathname);\nexport const isTaiwanPath = () => /\\/tw(\\/|$)/.test(window.location.pathname);",
  "initWebVitalsMonitoring();\ninitPwaInstallPrompt();\n\nexport { isEnglishPath, isKoreanPath, isTaiwanPath };",
  'main early initialization and region exports'
);
main = replaceRange(
  main,
  'function runWhenIdle(callback, timeout = 2000) {',
  '// 言語テキスト更新後に、記事一覧の実件数をテンプレートへ反映する',
  '',
  'remove service worker idle helper'
);
main = replaceRange(
  main,
  'export function switchRegion(newRegion) {',
  '// DOM要素のバインドとイベントリスナーの登録（初期化処理）',
  "export function switchRegion(newRegion) {\n    return navigateToRegion(newRegion, updateUIForRegion);\n}\n\n",
  'replace region switch implementation'
);
main = replaceRange(
  main,
  "    if (STATE.dom.closeLangBannerBtn) STATE.dom.closeLangBannerBtn.addEventListener('click', () => {",
  '    // Enterキー押下での計算実行',
  "    bindLanguageSuggestionDismiss();\n    bindCalendarReminderEvents();\n\n",
  'replace language and calendar event binding'
);
main = replaceRange(
  main,
  '    try {\n        if (isEnglishPath()) {',
  '    document.querySelectorAll(".region-switch button").forEach(button => {',
  "    applyRegionFromPath();\n\n",
  'replace path region initialization'
);
main = replaceRange(
  main,
  '    // PWAサービスワーカーの登録',
  '\n}\n\nfunction getInstallCopy() {',
  '    registerServiceWorker();',
  'replace service worker registration'
);
main = replaceRange(
  main,
  'function getInstallCopy() {',
  '// 初期ロード完了時の発火',
  '',
  'remove extracted responsibilities'
);
write('js/main.js', main);

let minify = read('.github/scripts/minify.cjs');
minify = replaceOnce(
  minify,
  "  'js/main.js',\n  'js/main-calculator-ui.js',",
  "  'js/main.js',\n  'js/region-navigation.js',\n  'js/language-suggestion.js',\n  'js/calendar-reminder.js',\n  'js/pwa-install.js',\n  'js/widget-referral.js',\n  'js/service-worker-registration.js',\n  'js/main-calculator-ui.js',",
  'minify new modules'
);
write('.github/scripts/minify.cjs', minify);

let assetSync = read('scripts/asset-sync.cjs');
assetSync = replaceOnce(
  assetSync,
  "  'js/config.js',\n  'js/ui.js',",
  "  'js/config.js',\n  'js/region-navigation.js',\n  'js/language-suggestion.js',\n  'js/calendar-reminder.js',\n  'js/pwa-install.js',\n  'js/widget-referral.js',\n  'js/service-worker-registration.js',\n  'js/ui.js',",
  'app module cache revision inputs'
);
write('scripts/asset-sync.cjs', assetSync);

let sw = read('sw.js');
sw = replaceOnce(
  sw,
  "  './js/main.js?v=fbe8708023',\n  './js/intent-tracking.js?v=5cdd51c178',",
  "  './js/main.js?v=fbe8708023',\n  './js/region-navigation.js',\n  './js/language-suggestion.js',\n  './js/calendar-reminder.js',\n  './js/pwa-install.js',\n  './js/widget-referral.js',\n  './js/service-worker-registration.js',\n  './js/intent-tracking.js?v=5cdd51c178',",
  'service worker precache modules'
);
write('sw.js', sw);

let growthTest = read('tests/growth-migration.test.cjs');
growthTest = replaceOnce(
  growthTest,
  "  const main = read('js/main.js');\n  const diary = read('js/diary.js');",
  "  const pwaInstall = read('js/pwa-install.js');\n  const diary = read('js/diary.js');",
  'growth test responsibility source'
);
growthTest = replaceOnce(
  growthTest,
  '  assert.match(main, /beforeinstallprompt/);',
  '  assert.match(pwaInstall, /beforeinstallprompt/);',
  'growth test pwa assertion'
);
write('tests/growth-migration.test.cjs', growthTest);

const splitTest = `'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

const moduleFiles = [
  'js/region-navigation.js',
  'js/language-suggestion.js',
  'js/calendar-reminder.js',
  'js/pwa-install.js',
  'js/widget-referral.js',
  'js/service-worker-registration.js'
];

test('main.jsは初期化と画面調停に集中し独立責務を各モジュールへ委譲する', () => {
  const main = read('js/main.js');

  for (const file of moduleFiles) {
    const importPath = './' + path.basename(file);
    assert.ok(main.includes(importPath), \`main.jsに\${importPath}のimportがありません\`);
  }

  for (const extractedMarker of [
    'beforeinstallprompt',
    'BEGIN:VCALENDAR',
    'widget_referral_landed',
    'navigator.serviceWorker.register',
    '한국어 버전이 있습니다!'
  ]) {
    assert.ok(!main.includes(extractedMarker), \`main.jsに分離済み責務が残っています: \${extractedMarker}\`);
  }
});

test('分離した責務の実装と既存イベント名は専用モジュールに保持する', () => {
  assert.ok(read('js/pwa-install.js').includes('beforeinstallprompt'));
  assert.ok(read('js/pwa-install.js').includes("track('pwa_install_accepted'"));
  assert.ok(read('js/calendar-reminder.js').includes('BEGIN:VCALENDAR'));
  assert.ok(read('js/calendar-reminder.js').includes("track('calendar_reminder_added'"));
  assert.ok(read('js/widget-referral.js').includes("track('widget_referral_landed'"));
  assert.ok(read('js/service-worker-registration.js').includes('navigator.serviceWorker.register'));
  assert.ok(read('js/language-suggestion.js').includes('한국어 버전이 있습니다!'));
});

test('新しい実行時モジュールは圧縮・キャッシュ更新・オフライン先読みに含める', () => {
  const minify = read('.github/scripts/minify.cjs');
  const assetSync = read('scripts/asset-sync.cjs');
  const serviceWorker = read('sw.js');

  for (const file of moduleFiles) {
    assert.ok(minify.includes(\`'\${file}'\`), \`圧縮対象にありません: \${file}\`);
    assert.ok(assetSync.includes(\`'\${file}'\`), \`キャッシュ改訂対象にありません: \${file}\`);
    assert.ok(serviceWorker.includes(\`'./\${file}'\`), \`Service Worker先読みにありません: \${file}\`);
  }
});
`;
write('tests/main-responsibility-split.test.cjs', splitTest);

console.log('main.js responsibilities split into dedicated modules');
