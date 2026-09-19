'use strict';

import { ensureBackToTop } from './home-back-to-top.js';

const MODE_COPY = Object.freeze({
    JP: Object.freeze({
        backToTop: 'ページの先頭へ戻る',
        descriptions: Object.freeze({
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
    KR: Object.freeze({
        backToTop: '맨 위로',
        descriptions: Object.freeze({
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
    })
});

const STYLE_ID = 'playpoint-home-experience-style';
function copyFor(region) {
    if (region === 'IN') return MODE_COPY.US;
    if (region === 'HK') return MODE_COPY.TW;
    return MODE_COPY[region] || MODE_COPY.JP;
}

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
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
.home-use-cases-title{margin:.05em 0 .45em;font-size:.94rem;font-weight:800;color:var(--text-color,#202124)}
.home-use-cases{display:grid;gap:.42em;margin:0 0 .78em;padding-left:1.28em}
.home-use-cases li{margin:0;line-height:1.55;color:var(--text-color,#202124)}

.home-rank-card{--rank-accent:#6b7280;--rank-glow:rgba(107,114,128,.18);position:relative;overflow:hidden;isolation:isolate;border-width:2px;background:linear-gradient(135deg,var(--rank-wash,rgba(107,114,128,.055)),transparent 62%),var(--section-bg-color,#fff)}
.home-rank-card::after{content:"";position:absolute;z-index:0;right:-28px;top:-36px;width:92px;height:92px;border-radius:50%;background:radial-gradient(circle,var(--rank-glow) 0%,transparent 68%);pointer-events:none}
.home-rank-card>*{position:relative;z-index:1}
.home-rank-card .article-link-tag{color:var(--rank-accent);background:var(--rank-tag-bg,rgba(107,114,128,.1))}
.home-rank-card--silver{--rank-accent:#7D8896;--rank-glow:rgba(125,136,150,.24);--rank-wash:rgba(125,136,150,.065);--rank-tag-bg:rgba(125,136,150,.12);border-color:#AEB7C2}
.home-rank-card--gold{--rank-accent:#9A6D00;--rank-glow:rgba(251,188,4,.25);--rank-wash:rgba(251,188,4,.075);--rank-tag-bg:rgba(251,188,4,.13);border-color:#D5AD3B}
.home-rank-card--platinum{--rank-accent:#557A9B;--rank-glow:rgba(112,151,184,.22);--rank-wash:rgba(112,151,184,.07);--rank-tag-bg:rgba(112,151,184,.12);border-color:#91ABC1}
.home-rank-card--diamond{--rank-accent:#2877D4;--rank-glow:rgba(66,133,244,.24);--rank-wash:rgba(66,133,244,.07);--rank-tag-bg:rgba(66,133,244,.11);border-color:#78AEEF;background:linear-gradient(135deg,rgba(66,133,244,.075),rgba(234,67,53,.018) 52%,rgba(52,168,83,.05)),var(--section-bg-color,#fff)}
.home-rank-hint{display:block;margin-top:.38em;color:var(--muted-text-color,#5f6368);font-size:.79rem;line-height:1.42;font-weight:600}
@media(max-width:640px){.home-use-cases-title{font-size:.9rem}.home-use-cases{gap:.34em;margin-bottom:.6em;padding-left:1.16em}.home-use-cases li{font-size:.88rem;line-height:1.48}.home-rank-hint{font-size:.72rem;line-height:1.35}.article-link-list{grid-template-columns:repeat(2,minmax(0,1fr));gap:.6em}.article-link-list>li:last-child:nth-child(odd){grid-column:1/-1}.article-link-card{height:100%;box-sizing:border-box;padding:.78em .72em}.article-link-tag{font-size:.8rem}.article-link-title{font-size:.93rem;line-height:1.48}.faq-item{font-size:.95rem}}
@media(max-width:340px){.mode-context-grid,.article-link-list{grid-template-columns:1fr}.article-link-list>li:last-child:nth-child(odd){grid-column:auto}}
`;
    document.head.appendChild(style);
}

function mainOnlySections() {
    const candidates = [
        document.querySelector('.calculation-flow-figure')?.closest('section'),
        document.querySelector('.article-link-list')?.closest('section'),
        document.querySelector('.faq-item')?.closest('section')
    ];
    return [...new Set(candidates.filter(Boolean))];
}

function ensureContextSection() {
    let section = document.getElementById('mode-context-section');
    if (section) return section;
    section = document.createElement('section');
    section.id = 'mode-context-section';
    section.className = 'mode-context-section';
    section.hidden = true;
    const anchor = mainOnlySections()[0] || document.querySelector('.page-footer');
    const parent = anchor?.parentNode || document.querySelector('.calculator-wrapper') || document.body;
    if (anchor && anchor.parentNode === parent) parent.insertBefore(section, anchor);
    else parent.appendChild(section);
    return section;
}

function setVisible(element, visible) {
    if (!element) return;
    element.hidden = !visible;
    element.classList.toggle('hidden', !visible);
}

function restoreMainDescription(region) {
    const description = document.getElementById('site-description');
    if (!description) return;
    // Main copy is already owned by CONFIGS/UI; only remove a mode override marker.
    if (description.dataset.modeContext === 'true') {
        description.dataset.modeContext = 'false';
    }
}

function renderCards(section, context) {
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
    section.replaceChildren(heading, intro, grid);
}

export function renderHomeExperience(mode, region) {
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') return;
    ensureStyles();
    ensureBackToTop(copyFor(region).backToTop);

    const isMain = mode === 'main';
    const sections = mainOnlySections();
    for (const section of sections) setVisible(section, isMain);

    const contextSection = ensureContextSection();
    if (isMain) {
        setVisible(contextSection, false);
        contextSection.replaceChildren();
        restoreMainDescription(region);
        return;
    }

    const copy = copyFor(region);
    const description = document.getElementById('site-description');
    if (description && copy.descriptions[mode]) {
        description.textContent = copy.descriptions[mode];
        description.dataset.modeContext = 'true';
    }

    const context = mode === 'diary' ? copy.diary : copy.reverse;
    renderCards(contextSection, context);
    setVisible(contextSection, true);
}
