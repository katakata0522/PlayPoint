'use strict';

import { STATE } from './config.js';

export function initFridayRewardBanner() {
    const now = new Date();
    // 5 is Friday
    if (now.getDay() !== 5) {
        return; // 金曜日以外は何もしない（完全非表示）
    }

    const todayStr = now.toISOString().slice(0, 10);
    if (sessionStorage.getItem('dismiss_friday_banner') === todayStr) {
        return; // 当日すでに閉じたユーザーには表示しない
    }

    const container = document.querySelector('.main-card, .container, main');
    if (!container) return;

    if (document.querySelector('.friday-reward-notice')) return;

    const lang = String(document.documentElement.lang || 'ja').toLowerCase();
    const isEn = lang.startsWith('en');
    const isKo = lang.startsWith('ko');
    const isTw = lang.startsWith('zh');

    let texts = {
        title: '🎉 本日は金曜日！ウィークリーリワード更新日です',
        body: '今週のポイントはもう受け取りましたか？受け取った結果は「ほくほくリワード日記」に記録しておきましょう！',
        btnDiary: '📝 リワード日記をつける',
        btnGuide: '📖 受け取り方ガイド',
        guideHref: '/articles/2025-12-25-weekly-reward.html',
        closeAria: '閉じる'
    };

    if (isEn) {
        texts = {
            title: "🎉 Happy Friday! Weekly Rewards are updated today",
            body: "Have you claimed your Google Play Points weekly prize yet? Log your points in the diary!",
            btnDiary: '📝 Open Reward Diary',
            btnGuide: '📖 Weekly Reward Guide',
            guideHref: '/en/articles/google-play-points-weekly-reward.html',
            closeAria: 'Close'
        };
    } else if (isKo) {
        texts = {
            title: '🎉 오늘은 금요일! 주간 리워드 갱信일입니다',
            body: '이번 주 Google Play Points 리워드는 받으셨나요? 리워드 일기에 획득 포인트를 기록해보세요!',
            btnDiary: '📝 리워드 일기 쓰기',
            btnGuide: '📖 리워드 수령 가이드',
            guideHref: '/ko/articles/google-play-points-weekly-reward.html',
            closeAria: '닫기'
        };
    } else if (isTw) {
        texts = {
            title: '🎉 今天是星期五！每週獎勵更新囉',
            body: '您今天領取 Google Play 每週點數獎勵了嗎？快來記錄在「點數日記」吧！',
            btnDiary: '📝 記錄每週獎勵',
            btnGuide: '📖 每週獎勵領取指南',
            guideHref: '/tw/articles/google-play-points-weekly-reward.html',
            closeAria: '關閉'
        };
    }

    const banner = document.createElement('div');
    banner.className = 'friday-reward-notice';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', texts.title);

    banner.innerHTML = `
        <button class="friday-reward-notice__close" aria-label="${texts.closeAria}">&times;</button>
        <div class="friday-reward-notice__lead">${texts.title}</div>
        <div class="friday-reward-notice__body">${texts.body}</div>
        <div class="friday-reward-notice__actions">
            <button class="friday-reward-notice__btn friday-reward-notice__btn--primary" id="friday-banner-diary-btn">${texts.btnDiary}</button>
            <a href="${texts.guideHref}" class="friday-reward-notice__btn friday-reward-notice__btn--secondary">${texts.btnGuide}</a>
        </div>
    `;

    const closeBtn = banner.querySelector('.friday-reward-notice__close');
    closeBtn.addEventListener('click', () => {
        sessionStorage.setItem('dismiss_friday_banner', todayStr);
        banner.style.opacity = '0';
        banner.style.transform = 'translateY(-8px)';
        banner.style.transition = 'all 0.2s ease';
        setTimeout(() => banner.remove(), 200);
    });

    const diaryBtn = banner.querySelector('#friday-banner-diary-btn');
    diaryBtn.addEventListener('click', () => {
        // Switch to Diary tab
        if (STATE && STATE.dom && STATE.dom.tabDiary) {
            STATE.dom.tabDiary.click();
            STATE.dom.tabDiary.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });

    const targetInsert = document.querySelector('.top-bar, .visitor-thanks, #language-suggestion-banner');
    if (targetInsert && targetInsert.nextSibling) {
        targetInsert.parentNode.insertBefore(banner, targetInsert.nextSibling);
    } else if (container.firstChild) {
        container.insertBefore(banner, container.firstChild);
    } else {
        container.appendChild(banner);
    }
}
