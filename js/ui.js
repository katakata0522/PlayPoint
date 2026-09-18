'use strict';

import { CONFIGS, STATE, CONSTANTS, getNextFridayCalendarWindow } from './config.js';

const HTML_TEXT_KEYS = new Set(['siteDescription', 'warningRate', 'guestNotice']);
const LOCALIZED_PAGE_PREFIXES = ['/en/', '/ko/', '/tw/'];
const TAB_NAVIGATION_KEYS = new Set(['ArrowRight', 'ArrowLeft', 'Home', 'End']);
const UNEXPECTED_ERROR_MESSAGES = Object.freeze({
    ja: '予期せぬエラーが発生しました。ページをリロードしてみてください。',
    en: 'An unexpected error occurred. Please try reloading the page.',
    ko: '예기치 않은 오류가 발생했습니다. 페이지를 새로고침해 주세요.',
    'zh-tw': '發生未預期的錯誤。請嘗試重新載入頁面。'
});

const MODE_CONTEXT_COPY = Object.freeze({
    JP: Object.freeze({
        backToTop: 'ページの先頭へ戻る',
        descriptions: Object.freeze({
            main: '目標ランクまであといくら必要か、現在のステータスと必要ポイントから計算できます。',
            reverse: '課金額を入れると、現在のステータスと獲得率から受け取れるPlay Pointsの目安を逆算できます。',
            diary: '毎週のウィークリーリワードを記録して、月ごと・年間の積み上がりをグラフで振り返れます。'
        }),
        reverse: Object.freeze({
            title: '逆算したあとに確認したいこと',
            intro: '計算結果と実際の付与ポイントに差が出そうな時や、キャンペーンを使う前に確認したい記事です。',
            cards: Object.freeze([
                ['価値', '100ポイントはいくら？', '/articles/2026-07-24-play-points-100-value.html'],
                ['キャンペーン', '増量キャンペーンを待つべき？', '/articles/2025-12-25-campaign.html'],
                ['反映', 'ポイントが反映されない時の確認', '/articles/2026-03-10-play-points-reflection-timing.html'],
                ['購入前', 'ギフトコードの還元条件を見る', '/articles/2026-06-20-discount-gift-cards.html']
            ])
        }),
        diary: Object.freeze({
            title: 'ウィークリー関連ガイド',
            intro: '今週の結果を記録したあと、受け取れない時やスーパーウィークリーの条件をすぐ確認できます。',
            cards: Object.freeze([
                ['基本', 'ウィークリーリワードの対象・更新日', '/articles/2025-12-25-weekly-reward.html'],
                ['受け取れない', 'ボタンがない・受け取れない時', '/articles/2026-08-16-weekly-reward-not-showing.html'],
                ['Super Weekly', 'スーパーウィークリーの条件・賞品', '/articles/2026-07-31-super-weekly-reward.html'],
                ['ランク', '対象ランクと必要ポイントを確認', '/articles/2026-08-05-play-points-levels-guide.html']
            ])
        })
    }),
    US: Object.freeze({
        backToTop: 'Back to top',
        descriptions: Object.freeze({
            main: 'Calculate how much you need to spend to reach the next Google Play Points level.',
            reverse: 'Enter a spending amount to estimate the Play Points you can earn from your current level and earn rate.',
            diary: 'Record each weekly reward and review how your points have built up across the year.'
        }),
        reverse: Object.freeze({
            title: 'Check after a reverse calculation',
            intro: 'Useful when the estimate and actual points differ, or before using a promotion.',
            cards: Object.freeze([
                ['Value', 'What are 100 Play Points worth?', '/en/articles/google-play-points-100-value.html'],
                ['Promotions', 'How promotion rates combine', '/en/articles/google-play-points-promotion-stacking.html'],
                ['Rounding', 'Why tax and rounding can change points', '/en/articles/google-play-points-rounding-tax.html'],
                ['Using points', 'How coupons and points work', '/en/articles/google-play-points-use-coupons.html']
            ])
        }),
        diary: Object.freeze({
            title: 'Weekly reward guides',
            intro: 'After recording this week, check eligibility, missing rewards, or Super Weekly details here.',
            cards: Object.freeze([
                ['Weekly', 'Weekly reward basics and reset timing', '/en/articles/google-play-points-weekly-reward.html'],
                ['Missing', 'What to check when points or rewards do not appear', '/en/articles/google-play-points-not-showing.html'],
                ['Super Weekly', 'Super Weekly eligibility and prizes', '/en/articles/google-play-points-super-weekly-reward.html'],
                ['Levels', 'Play Points levels and requirements', '/en/articles/google-play-points-levels.html']
            ])
        })
    }),
    IN: null,
    KR: Object.freeze({
        backToTop: '맨 위로',
        descriptions: Object.freeze({
            main: '목표 등급까지 필요한 결제 금액을 현재 등급과 필요한 포인트로 계산합니다.',
            reverse: '결제 금액을 입력하면 현재 등급과 적립률을 기준으로 받을 수 있는 Play Points를 계산합니다.',
            diary: '매주 리워드를 기록하고 월별·연간 누적을 그래프로 확인할 수 있습니다.'
        }),
        reverse: Object.freeze({
            title: '역산 후 함께 확인하기',
            intro: '예상치와 실제 적립 포인트가 다르거나 프로모션을 쓰기 전에 확인하면 좋은 내용입니다.',
            cards: Object.freeze([
                ['가치', 'Play Points 100점의 가치', '/ko/articles/google-play-points-100-value.html'],
                ['프로모션', '프로모션 적립률 적용 방식', '/ko/articles/google-play-points-promotion-stacking.html'],
                ['반올림', '세금·반올림으로 차이가 나는 이유', '/ko/articles/google-play-points-rounding-tax.html'],
                ['사용', '포인트와 쿠폰 사용 방법', '/ko/articles/google-play-points-use-coupons.html']
            ])
        }),
        diary: Object.freeze({
            title: '주간 리워드 가이드',
            intro: '이번 주 기록 후 리워드가 보이지 않을 때나 Super Weekly 조건을 바로 확인할 수 있습니다.',
            cards: Object.freeze([
                ['주간', '주간 리워드 기본과 갱신 시점', '/ko/articles/google-play-points-weekly-reward.html'],
                ['표시 안 됨', '포인트·리워드가 보이지 않을 때', '/ko/articles/google-play-points-not-showing.html'],
                ['Super Weekly', 'Super Weekly 대상과 보상', '/ko/articles/google-play-points-super-weekly-reward.html'],
                ['등급', 'Play Points 등급과 조건', '/ko/articles/google-play-points-levels.html']
            ])
        })
    }),
    TW: Object.freeze({
        backToTop: '回到頁首',
        descriptions: Object.freeze({
            main: '輸入目前等級、目標等級與尚缺點數，估算升級所需消費金額。',
            reverse: '輸入消費金額，依目前等級與獲點率估算可獲得的 Play Points。',
            diary: '記錄每週獎勵，並用圖表查看每月與全年累積。'
        }),
        reverse: Object.freeze({
            title: '逆算後可以一起確認',
            intro: '當預估與實際獲點不同，或使用活動獲點率前，可以先看這些內容。',
            cards: Object.freeze([
                ['價值', '100 Play Points 有多少價值？', '/tw/articles/google-play-points-100-value.html'],
                ['活動', '活動獲點率如何套用', '/tw/articles/google-play-points-promotion-stacking.html'],
                ['計算差異', '稅金與四捨五入造成的差異', '/tw/articles/google-play-points-rounding-tax.html'],
                ['使用', '點數與優惠券怎麼用', '/tw/articles/google-play-points-use-coupons.html']
            ])
        }),
        diary: Object.freeze({
            title: '每週獎勵指南',
            intro: '記錄本週結果後，可直接查看獎勵未出現或 Super Weekly 的相關說明。',
            cards: Object.freeze([
                ['每週獎勵', '每週獎勵基本規則與更新時間', '/tw/articles/google-play-points-weekly-reward.html'],
                ['未顯示', '點數或獎勵沒有出現時', '/tw/articles/google-play-points-not-showing.html'],
                ['Super Weekly', 'Super Weekly 資格與獎勵', '/tw/articles/google-play-points-super-weekly-reward.html'],
                ['等級', 'Play Points 等級與條件', '/tw/articles/google-play-points-levels.html']
            ])
        })
    }),
    HK: null
});

const HOME_EXPERIENCE_STYLE_ID = 'playpoint-home-experience-style';


function getModeContextCopy() {
    if (STATE.currentRegion === 'IN') return MODE_CONTEXT_COPY.US;
    if (STATE.currentRegion === 'HK') return MODE_CONTEXT_COPY.TW;
    return MODE_CONTEXT_COPY[STATE.currentRegion] || MODE_CONTEXT_COPY.JP;
}

function ensureHomeExperienceStyles() {
    if (document.getElementById(HOME_EXPERIENCE_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = HOME_EXPERIENCE_STYLE_ID;
    style.textContent = `
.site-description{color:var(--muted-text-color,#45515f)!important;font-size:.96em!important}
.mode-context-section{margin:1.05em 0 0;padding:1em 0 0;border-top:1px solid rgba(11,87,208,.16)}
.mode-context-section[hidden]{display:none!important}
.mode-context-section h2{margin:0 0 .35em;font-size:1.08rem;border:0}
.mode-context-intro{margin:0 0 .8em;color:var(--muted-text-color,#4b5563);font-size:.92rem;line-height:1.65}
.mode-context-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.62em}
.mode-context-card{display:block;min-width:0;padding:.78em .75em;border:1px solid rgba(11,87,208,.14);border-radius:11px;background:var(--section-bg-color,#fff);box-shadow:0 4px 12px rgba(11,87,208,.055);text-decoration:none}
.mode-context-card:hover{border-color:rgba(11,87,208,.28);box-shadow:0 7px 18px rgba(11,87,208,.09)}
.mode-context-tag{display:block;margin:0 0 .3em;color:#0b57d0;font-size:.8rem;font-weight:800;line-height:1.3}
.mode-context-title{display:block;color:var(--text-color,#1f2937);font-size:.94rem;font-weight:750;line-height:1.48;overflow-wrap:anywhere}
.back-to-top{position:fixed;right:max(14px,env(safe-area-inset-right));bottom:max(16px,env(safe-area-inset-bottom));z-index:40;width:48px;height:48px;margin:0;padding:0;border:1px solid rgba(11,87,208,.2);border-radius:16px;background:rgba(255,255,255,.94);color:#0b57d0;box-shadow:0 8px 24px rgba(15,23,42,.16);backdrop-filter:blur(8px);display:grid;place-items:center;font-size:1.35rem;font-weight:900;line-height:1;opacity:0;transform:translateY(10px) scale(.94);pointer-events:none;transition:opacity .18s ease,transform .18s ease,box-shadow .18s ease}
.back-to-top[data-visible="true"]{opacity:1;transform:none;pointer-events:auto}
.back-to-top:hover{background:#fff;box-shadow:0 10px 26px rgba(15,23,42,.2)}
.back-to-top:focus-visible{outline:3px solid var(--input-focus-border-color,#005fcc);outline-offset:3px}
@media(max-width:640px){.article-link-list{grid-template-columns:repeat(2,minmax(0,1fr));gap:.6em}.article-link-card{height:100%;box-sizing:border-box;padding:.78em .72em}.article-link-tag{font-size:.8rem}.article-link-title{font-size:.93rem;line-height:1.48}.faq-item{font-size:.95rem}}
@media(max-width:340px){.mode-context-grid,.article-link-list{grid-template-columns:1fr}}
@media(prefers-reduced-motion:reduce){.back-to-top{transition:none}}
`;
    document.head.appendChild(style);
}

function getMainOnlySections() {
    const candidates = [
        document.querySelector('.calculation-flow-figure')?.closest('section'),
        document.querySelector('.article-link-list')?.closest('section'),
        document.querySelector('.faq-item')?.closest('section')
    ];
    return [...new Set(candidates.filter(Boolean))];
}

function ensureModeContextSection() {
    let section = document.getElementById('mode-context-section');
    if (section) return section;

    section = document.createElement('section');
    section.id = 'mode-context-section';
    section.className = 'mode-context-section';
    section.hidden = true;

    const anchor = getMainOnlySections()[0] || document.querySelector('.page-footer');
    const parent = anchor?.parentNode || document.querySelector('.calculator-wrapper') || document.body;
    if (anchor && anchor.parentNode === parent) parent.insertBefore(section, anchor);
    else parent.appendChild(section);
    return section;
}

function renderModeContext(mode) {
    ensureHomeExperienceStyles();
    const copy = getModeContextCopy();
    const description = document.getElementById('site-description');
    const modeDescription = copy.descriptions?.[mode] || copy.descriptions?.main;
    if (description && modeDescription) description.textContent = modeDescription;

    const isMain = mode === CONSTANTS.MODE_MAIN;
    for (const section of getMainOnlySections()) setElementVisibility(section, isMain);

    const contextSection = ensureModeContextSection();
    if (isMain) {
        setElementVisibility(contextSection, false);
        contextSection.replaceChildren();
        return;
    }

    const context = mode === CONSTANTS.MODE_DIARY ? copy.diary : copy.reverse;
    if (!context) {
        setElementVisibility(contextSection, false);
        contextSection.replaceChildren();
        return;
    }

    const heading = document.createElement('h2');
    heading.textContent = context.title;
    const intro = document.createElement('p');
    intro.className = 'mode-context-intro';
    intro.textContent = context.intro;
    const grid = document.createElement('div');
    grid.className = 'mode-context-grid';

    for (const [tagText, titleText, href] of context.cards) {
        const card = document.createElement('a');
        card.className = 'mode-context-card';
        card.href = href;
        const tag = document.createElement('span');
        tag.className = 'mode-context-tag';
        tag.textContent = tagText;
        const title = document.createElement('span');
        title.className = 'mode-context-title';
        title.textContent = titleText;
        card.append(tag, title);
        grid.appendChild(card);
    }

    contextSection.replaceChildren(heading, intro, grid);
    setElementVisibility(contextSection, true);
}

function updateBackToTopLabel(button = document.getElementById('back-to-top')) {
    if (!button) return;
    const label = getModeContextCopy().backToTop;
    button.setAttribute('aria-label', label);
    button.title = label;
}

function getUnexpectedErrorMessage() {
    const lang = typeof document !== 'undefined'
        ? String(document.documentElement?.lang || '').toLowerCase()
        : '';
    if (lang.startsWith('zh')) return UNEXPECTED_ERROR_MESSAGES['zh-tw'];
    const primaryLang = lang.split('-')[0];
    return UNEXPECTED_ERROR_MESSAGES[primaryLang] || UNEXPECTED_ERROR_MESSAGES.ja;
}

function isLocalizedSubdirectory(pathname) {
    return LOCALIZED_PAGE_PREFIXES.some(prefix => pathname.includes(prefix));
}

function updateLocalizedLink(element, value, isSubDir) {
    element.textContent = value.text;
    if (!value.href) return;

    const rawHref = value.href;
    const isAbsolute = rawHref.startsWith('http') || rawHref.startsWith('/');
    const isLocalizedFile = rawHref.startsWith('articles/');
    const prefix = (isSubDir && !isLocalizedFile) ? '../' : './';
    element.href = isAbsolute ? rawHref : (prefix + rawHref.replace(/^\.\//, ''));
}

function setElementVisibility(element, isVisible) {
    if (!element) return;
    element.classList.toggle(CONSTANTS.CLASS_HIDDEN, !isVisible);
    element.hidden = !isVisible;
}

function setPanelVisibility(element, isVisible) {
    if (!element) return;
    setElementVisibility(element, isVisible);
    element.setAttribute('aria-hidden', isVisible ? 'false' : 'true');
}

function setResultActionsVisibility(targetElement, isVisible) {
    if (targetElement === STATE.dom.result) {
        setElementVisibility(STATE.dom.resultActions, isVisible);
        setElementVisibility(STATE.dom.tweetButton, isVisible);
        setElementVisibility(STATE.dom.copyButton, isVisible);
    } else if (targetElement === STATE.dom.reverseResult) {
        setElementVisibility(STATE.dom.shareTwitterReverse, isVisible);
    }
}

function handleTabListKeydown(event) {
    if (!TAB_NAVIGATION_KEYS.has(event.key) || event.altKey || event.ctrlKey || event.metaKey) return;

    const currentTab = event.target.closest?.('.tab-switch [role="tab"]');
    if (!currentTab) return;

    const tabList = currentTab.closest('[role="tablist"]');
    if (!tabList) return;

    const tabs = Array.from(tabList.querySelectorAll('[role="tab"]'))
        .filter(tab => !tab.disabled && tab.getAttribute('aria-disabled') !== 'true');
    const currentIndex = tabs.indexOf(currentTab);
    if (currentIndex < 0 || tabs.length === 0) return;

    let nextIndex = currentIndex;
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
    if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = tabs.length - 1;

    event.preventDefault();
    const nextTab = tabs[nextIndex];
    nextTab.focus();
    nextTab.click();
}

export const UI = {
    toastTimerId: null,
    activeMode: CONSTANTS.MODE_MAIN,

    // トースト通知を表示するメソッド
    showToast(message, type = 'normal') {
        const toast = document.getElementById('toast');
        if (!toast) return;

        toast.textContent = message;
        toast.className = 'toast show';
        if (type === 'error') {
            toast.classList.add('error');
        }

        if (this.toastTimerId) {
            clearTimeout(this.toastTimerId);
        }

        this.toastTimerId = setTimeout(() => {
            toast.className = 'toast';
            this.toastTimerId = null;
        }, 3000);
    },

    // 数値を 0 から目標値までスムーズにカウントアップするアニメーションメソッド
    animateValue(obj, start, end, duration, formatLang = 'ja') {
        const prefersReducedMotion = typeof window.matchMedia === 'function'
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion || duration <= 0) {
            obj.textContent = end.toLocaleString(formatLang);
            return;
        }

        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            // イージング関数（滑らかに減速する Quadratic ease-out）を適用
            const easeOutQuad = progress * (2 - progress);
            const value = Math.floor(easeOutQuad * (end - start) + start);
            obj.textContent = value.toLocaleString(formatLang);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                obj.textContent = end.toLocaleString(formatLang);
            }
        };
        window.requestAnimationFrame(step);
    },

    // UIテキストを現在の言語設定でアップデートするメソッド
    updateUIText() {
        const config = CONFIGS[STATE.currentRegion];
        const texts = config.uiText;
        document.documentElement.lang = config.lang;
        document.title = texts.title;
        const isSubDir = isLocalizedSubdirectory(window.location.pathname);

        document.querySelectorAll('[data-lang-key]').forEach(el => {
            const key = el.dataset.langKey;
            if (!texts[key]) return;

            if (el.tagName === 'A' && typeof texts[key] === 'object' && texts[key].text) {
                updateLocalizedLink(el, texts[key], isSubDir);
                return;
            }

            if (HTML_TEXT_KEYS.has(key)) {
                el.innerHTML = texts[key];
            } else {
                el.textContent = texts[key];
            }
        });

        document.querySelectorAll('[data-lang-aria]').forEach(el => {
            const key = el.dataset.langAria;
            if (texts[key]) {
                el.setAttribute('aria-label', texts[key]);
            }
        });

        document.querySelectorAll('[data-lang-placeholder]').forEach(el => {
            const key = el.dataset.langPlaceholder;
            if (texts[key]) {
                el.placeholder = texts[key];
            }
        });

        document.querySelectorAll('.tooltip-box').forEach(box => {
            if (config.tooltips[box.id]) {
                box.innerHTML = config.tooltips[box.id];
            }
        });

        const gcalBtn = document.getElementById('register-google-cal-btn');
        if (gcalBtn) {
            const text = texts.calSubject;
            const details = texts.calDetails;
            const calendarWindow = getNextFridayCalendarWindow(STATE.currentRegion === 'US');
            const dates = `${calendarWindow.start}/${calendarWindow.end}`;
            const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(text)}&dates=${dates}&recur=RRULE:FREQ=WEEKLY;BYDAY=FR&details=${encodeURIComponent(details)}`;
            gcalBtn.href = gcalUrl;
        }

        this.initBackToTop();
        updateBackToTopLabel();
        renderModeContext(this.activeMode || CONSTANTS.MODE_MAIN);
    },

    initBackToTop() {
        ensureHomeExperienceStyles();
        if (document.getElementById('back-to-top')) return;

        const button = document.createElement('button');
        button.type = 'button';
        button.id = 'back-to-top';
        button.className = 'back-to-top';
        button.textContent = '↑';
        button.dataset.visible = 'false';
        updateBackToTopLabel(button);
        document.body.appendChild(button);

        const prefersReducedMotion = typeof window.matchMedia === 'function'
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        button.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
        });

        let ticking = false;
        const updateVisibility = () => {
            ticking = false;
            const threshold = Math.max(520, window.innerHeight * 0.85);
            button.dataset.visible = window.scrollY > threshold ? 'true' : 'false';
        };
        window.addEventListener('scroll', () => {
            if (ticking) return;
            ticking = true;
            window.requestAnimationFrame(updateVisibility);
        }, { passive: true });
        updateVisibility();
    },

    // 結果要素に残った前回計算の共有用データを破棄
    clearResultData(targetElement) {
        if (!targetElement) return;
        for (const key of Object.keys(targetElement.dataset)) {
            delete targetElement.dataset[key];
        }
    },

    // 通常計算の補足情報を、共有ボタンより後ろの折りたたみ領域へ表示する
    displayResultDetails(content) {
        const targetElement = STATE.dom.resultDetails;
        if (!targetElement) return;

        targetElement.innerHTML = content || '';
        setElementVisibility(targetElement, Boolean(content));

        if (!content) return;
        const config = CONFIGS[STATE.currentRegion];
        targetElement.querySelectorAll('.count-target').forEach(element => {
            const endValue = parseFloat(element.dataset.value);
            if (!Number.isNaN(endValue)) {
                this.animateValue(element, 0, endValue, 800, config.lang);
            }
        });
    },

    clearResultDetails() {
        const targetElement = STATE.dom.resultDetails;
        if (!targetElement) return;
        targetElement.innerHTML = '';
        setElementVisibility(targetElement, false);
    },

    // 結果表示メソッド（カウントアップアニメーション発火）
    displayResult(targetElement, content, isError = false) {
        if (!targetElement) return;
        this.clearResultData(targetElement);
        if (isError) {
            // エラーは安全にDOM要素で生成（innerHTML 不使用）
            targetElement.innerHTML = '';
            const span = document.createElement('span');
            span.className = 'error-text';
            span.textContent = content;
            targetElement.appendChild(span);
            if (targetElement === STATE.dom.result) this.clearResultDetails();
        } else {
            targetElement.innerHTML = content;
        }
        targetElement.classList.add(CONSTANTS.CLASS_HAS_RESULT);

        // 正常な計算結果表示時のアニメーション処理
        if (!isError) {
            const targets = targetElement.querySelectorAll('.count-target');
            const config = CONFIGS[STATE.currentRegion];
            targets.forEach(el => {
                const endValue = parseFloat(el.dataset.value);
                if (!isNaN(endValue)) {
                    this.animateValue(el, 0, endValue, 800, config.lang);
                }
            });
        }

        setResultActionsVisibility(targetElement, !isError);
    },

    // 結果のクリアメソッド
    clearResult(targetElement) {
        if (!targetElement) return;
        this.clearResultData(targetElement);
        targetElement.innerHTML = "";
        targetElement.classList.remove(CONSTANTS.CLASS_HAS_RESULT);
        if (targetElement === STATE.dom.result) this.clearResultDetails();
        setResultActionsVisibility(targetElement, false);
    },

    // モード（タブ）の切替メソッド
    switchMode(mode) {
        this.activeMode = mode;
        setPanelVisibility(STATE.dom.mainMode, mode === CONSTANTS.MODE_MAIN);
        setPanelVisibility(STATE.dom.reverseMode, mode === CONSTANTS.MODE_REVERSE);
        setPanelVisibility(STATE.dom.diaryMode, mode === CONSTANTS.MODE_DIARY);
        document.querySelectorAll(".tab-switch button").forEach(button => {
            const isActive = button.dataset.mode === mode;
            button.classList.toggle(CONSTANTS.CLASS_ACTIVE, isActive);
            button.setAttribute('aria-selected', isActive ? 'true' : 'false');
            button.tabIndex = isActive ? 0 : -1;
        });
        if (STATE.dom.result) this.clearResult(STATE.dom.result);
        if (STATE.dom.reverseResult) this.clearResult(STATE.dom.reverseResult);
        renderModeContext(mode);
    },

    // ツールチップを閉じるメソッド
    closeAllTooltips() {
        document.querySelectorAll(`${CONSTANTS.SELECTOR_TOOLTIP_BOX}.${CONSTANTS.CLASS_VISIBLE}`).forEach(box => {
            box.classList.remove(CONSTANTS.CLASS_VISIBLE);
            box.hidden = true;
            const btn = box.parentElement.querySelector(CONSTANTS.SELECTOR_INFO_BTN);
            if (btn) btn.setAttribute('aria-expanded', 'false');
        });
    },

    // ツールチップのトグルメソッド
    toggleTooltip(event) {
        event.preventDefault();
        event.stopPropagation();
        const btn = event.currentTarget;
        const tooltip = btn.parentElement.querySelector(CONSTANTS.SELECTOR_TOOLTIP_BOX);
        if (!tooltip) return;
        const isVisible = tooltip.classList.contains(CONSTANTS.CLASS_VISIBLE);
        this.closeAllTooltips();
        if (!isVisible) {
            tooltip.hidden = false;
            tooltip.classList.add(CONSTANTS.CLASS_VISIBLE);
            btn.setAttribute('aria-expanded', 'true');
        }
    }
};

// グローバルエラーハンドラ
window.onerror = function(message, source, lineno, colno, error) {
    console.error("予期せぬエラーが発生しました:", { message, source, lineno, colno, error });
    if (UI && typeof UI.showToast === 'function') {
        UI.showToast(getUnexpectedErrorMessage(), 'error');
    }
    return true;
};

if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('keydown', handleTabListKeydown);
}

if (typeof window !== 'undefined' && window.__TEST_ENV__) {
    window.PP_APP = window.PP_APP || {};
    window.PP_APP.UI = UI;
}
