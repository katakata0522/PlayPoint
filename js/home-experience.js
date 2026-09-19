'use strict';

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
let backToTopButton = null;
let scrollBound = false;

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
.back-to-top{position:fixed;right:max(14px,env(safe-area-inset-right));bottom:max(16px,env(safe-area-inset-bottom));z-index:42;width:48px;height:48px;margin:0;padding:0;border:1px solid rgba(118,196,255,.34);border-radius:50%;background:radial-gradient(circle at 38% 28%,#1d6fa8 0%,#123f68 42%,#0b2139 100%);color:#eaf7ff;box-shadow:0 8px 22px rgba(5,27,48,.26),inset 0 1px 0 rgba(255,255,255,.18);display:grid;place-items:center;line-height:1;opacity:0;transform:translateY(10px) scale(.92);pointer-events:none;transition:opacity .16s ease,transform .16s ease,box-shadow .16s ease;overflow:visible}
.back-to-top[data-visible="true"]{opacity:1;transform:none;pointer-events:auto}
.back-to-top:hover{box-shadow:0 10px 25px rgba(5,27,48,.32),0 0 0 3px rgba(88,166,255,.09),inset 0 1px 0 rgba(255,255,255,.2)}
.back-to-top:focus-visible{outline:3px solid var(--input-focus-border-color,#7cc4ff);outline-offset:3px}
.back-to-top__mark{position:relative;display:block;width:18px;height:22px}
.back-to-top__mark::before{content:"";position:absolute;left:8px;top:5px;width:2px;height:15px;border-radius:999px;background:linear-gradient(180deg,#fff,#83d7ff);box-shadow:0 0 8px rgba(131,215,255,.75)}
.back-to-top__mark::after{content:"";position:absolute;left:4px;top:4px;width:9px;height:9px;border-left:2px solid #fff;border-top:2px solid #fff;transform:rotate(45deg);filter:drop-shadow(0 0 4px rgba(131,215,255,.7))}
.back-to-top.is-warping .back-to-top__mark{animation:pp-launch-mark .34s cubic-bezier(.2,.8,.2,1)}
.back-to-top-warp-layer{position:fixed;inset:0;z-index:41;pointer-events:none;overflow:hidden;background:radial-gradient(circle at 50% 4%,rgba(124,210,255,.08),transparent 42%)}
.back-to-top-warp-streak{position:absolute;top:-24vh;width:2px;height:22vh;border-radius:999px;background:linear-gradient(180deg,transparent,rgba(169,226,255,.82),transparent);opacity:0;filter:drop-shadow(0 0 5px rgba(100,194,255,.65));animation:pp-warp-streak .38s cubic-bezier(.16,.72,.22,1) forwards;animation-delay:var(--pp-warp-delay,0ms)}
@keyframes pp-launch-mark{0%{transform:translateY(0);opacity:1}45%{transform:translateY(-12px) scaleY(1.25);opacity:1}100%{transform:translateY(-28px) scaleY(.72);opacity:0}}
@keyframes pp-warp-streak{0%{opacity:0;transform:translateY(-10vh) scaleY(.25)}20%{opacity:.72}100%{opacity:0;transform:translateY(145vh) scaleY(3.1)}}
@media(max-width:640px){.article-link-list{grid-template-columns:repeat(2,minmax(0,1fr));gap:.6em}.article-link-list>li:last-child:nth-child(odd){grid-column:1/-1}.article-link-card{height:100%;box-sizing:border-box;padding:.78em .72em}.article-link-tag{font-size:.8rem}.article-link-title{font-size:.93rem;line-height:1.48}.faq-item{font-size:.95rem}}
@media(max-width:340px){.mode-context-grid,.article-link-list{grid-template-columns:1fr}.article-link-list>li:last-child:nth-child(odd){grid-column:auto}}
@media(prefers-reduced-motion:reduce){.back-to-top{transition:none}.back-to-top.is-warping .back-to-top__mark,.back-to-top-warp-streak{animation:none}}
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

function removeWarpLayer(layer) {
    if (layer?.parentNode) layer.parentNode.removeChild(layer);
}

function createWarpLayer() {
    const layer = document.createElement('div');
    layer.className = 'back-to-top-warp-layer';
    const positions = [9, 18, 31, 44, 59, 72, 85, 94];
    positions.forEach((left, index) => {
        const streak = document.createElement('span');
        streak.className = 'back-to-top-warp-streak';
        streak.style.left = left + '%';
        streak.style.setProperty('--pp-warp-delay', ((index % 4) * 18) + 'ms');
        streak.style.height = (15 + (index % 3) * 5) + 'vh';
        layer.appendChild(streak);
    });
    document.body.appendChild(layer);
    return layer;
}

function warpToTop(button, reducedMotion) {
    const startY = window.scrollY || window.pageYOffset || 0;
    if (startY <= 0) return;
    if (reducedMotion || typeof window.requestAnimationFrame !== 'function') {
        window.scrollTo(0, 0);
        return;
    }

    const layer = createWarpLayer();
    button.classList.add('is-warping');
    const duration = Math.min(390, Math.max(285, 285 + Math.log10(Math.max(10, startY)) * 26));
    const startAt = performance.now();

    const frame = (now) => {
        const progress = Math.min(1, (now - startAt) / duration);
        const eased = 1 - Math.pow(1 - progress, 4);
        window.scrollTo(0, Math.round(startY * (1 - eased)));
        if (progress < 1) {
            window.requestAnimationFrame(frame);
            return;
        }
        window.scrollTo(0, 0);
        window.setTimeout(() => {
            button.classList.remove('is-warping');
            removeWarpLayer(layer);
        }, 80);
    };
    window.requestAnimationFrame(frame);
}

function ensureBackToTop(region) {
    if (!backToTopButton) {
        backToTopButton = document.createElement('button');
        backToTopButton.type = 'button';
        backToTopButton.id = 'back-to-top';
        backToTopButton.className = 'back-to-top';
        backToTopButton.innerHTML = '<span class="back-to-top__mark" aria-hidden="true"></span>';
        backToTopButton.dataset.visible = 'false';
        document.body.appendChild(backToTopButton);

        const reduced = typeof window.matchMedia === 'function'
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        backToTopButton.addEventListener('click', () => {
            warpToTop(backToTopButton, reduced);
        });
    }

    const label = copyFor(region).backToTop;
    backToTopButton.setAttribute('aria-label', label);
    backToTopButton.title = label;

    const updateVisibility = () => {
        const threshold = Math.max(520, window.innerHeight * 0.85);
        backToTopButton.dataset.visible = window.scrollY > threshold ? 'true' : 'false';
    };
    if (!scrollBound) {
        scrollBound = true;
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (ticking) return;
            ticking = true;
            window.requestAnimationFrame(() => {
                ticking = false;
                updateVisibility();
            });
        }, { passive: true });
    }
    updateVisibility();
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
    ensureBackToTop(region);

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
