'use strict';

import { STATE, CONSTANTS } from './config.js';
import { CALC } from './calculator.js';
import { UI } from './ui.js';

export const SHARE = {
    getNumber(params, name, min, max) {
        if (!params.has(name)) return null;
        const value = Number(params.get(name));
        return Number.isFinite(value) && value >= min && value <= max ? value : null;
    },

    isAllowedStatusValue(select, value) {
        if (!select || value === null) return false;
        return Array.from(select.options).some(option => Number(option.value) === value);
    },

    buildBaseUrl() {
        const url = new URL(window.location.href);
        url.search = '';
        url.hash = '';
        return url;
    },

    buildMainShareUrl() {
        const dom = STATE.dom;
        const neededPoints = CALC.getValidNumberInput(dom.neededPoints, 0.01);
        const multiplier = CALC.getValidNumberInput(dom.multiplier, 1);
        if (neededPoints === null || multiplier === null || !dom.currentStatus) return '';

        const url = this.buildBaseUrl();
        url.searchParams.set('mode', 'main');
        url.searchParams.set('status', dom.currentStatus.value);
        const selectedTarget = dom.targetStatus && dom.targetStatus.options[dom.targetStatus.selectedIndex];
        if (selectedTarget && selectedTarget.dataset.statusLabel) {
            url.searchParams.set('target', this.normalizeTarget(selectedTarget.dataset.statusLabel));
        }
        url.searchParams.set('points', String(neededPoints));
        url.searchParams.set('multiplier', String(multiplier));
        return url.toString();
    },

    normalizeTarget(value) {
        const label = String(value || '').toLowerCase();
        if (/diamond|ダイヤ|다이아|鑽石/i.test(label)) return 'diamond';
        if (/platinum|プラチナ|플래티넘|白金|鉑金/i.test(label)) return 'platinum';
        if (/gold|ゴールド|골드|黃金|黃金級/i.test(label)) return 'gold';
        if (/silver|シルバー|실버|白銀|銀級/i.test(label)) return 'silver';
        return '';
    },

    setTargetFromParam(select, target) {
        const normalized = this.normalizeTarget(target);
        if (!select || !normalized) return;
        const optionIndex = Array.from(select.options).findIndex(option => {
            return this.normalizeTarget(option.dataset.statusLabel) === normalized;
        });
        if (optionIndex >= 0) select.selectedIndex = optionIndex;
    },

    buildReverseShareUrl() {
        const dom = STATE.dom;
        const amount = CALC.getValidNumberInput(dom.amountYen, 0);
        const multiplier = CALC.getValidNumberInput(dom.reverseMultiplier, 1);
        if (amount === null || multiplier === null || !dom.reverseStatus) return '';

        const url = this.buildBaseUrl();
        url.searchParams.set('mode', 'reverse');
        url.searchParams.set('status', dom.reverseStatus.value);
        url.searchParams.set('amount', String(amount));
        url.searchParams.set('multiplier', String(multiplier));
        return url.toString();
    },

    applyFromUrl() {
        const params = new URLSearchParams(window.location.search);
        const mode = params.get('mode');
        const status = this.getNumber(params, 'status', 1, 2);
        const target = params.get('target');
        const multiplier = this.getNumber(params, 'multiplier', 1, 10);
        const dom = STATE.dom;

        if (mode === 'reverse') {
            const amount = this.getNumber(params, 'amount', 0, 100000000);
            if (this.isAllowedStatusValue(dom.reverseStatus, status)) dom.reverseStatus.value = String(status);
            CALC.updateReverseBaseRate();
            if (amount !== null && dom.amountYen) dom.amountYen.value = String(amount);
            if (multiplier !== null && dom.reverseMultiplier) dom.reverseMultiplier.value = String(multiplier);
            UI.switchMode(CONSTANTS.MODE_REVERSE);

            // 共有URLからの復元時に自動計算を実行
            CALC.reverseCalculate();
            return;
        }

        if (mode !== 'main') return;
        if (this.isAllowedStatusValue(dom.currentStatus, status)) dom.currentStatus.value = String(status);
        CALC.updateBaseRateAndTarget();
        this.setTargetFromParam(dom.targetStatus, target);
        CALC.updateNeededPointsConstraint();
        const points = this.getNumber(params, 'points', 0.01, 1000000);
        const maxPoints = Number(dom.neededPoints && dom.neededPoints.max);
        if (points !== null && dom.neededPoints && (!Number.isFinite(maxPoints) || points <= maxPoints)) {
            dom.neededPoints.value = String(points);
        }
        if (multiplier !== null && dom.multiplier) dom.multiplier.value = String(multiplier);
        UI.switchMode(CONSTANTS.MODE_MAIN);

        // 共有URLからの復元時に自動計算を実行
        CALC.calculate();
    },

    buildRewardShareUrl(points, prize) {
        const region = STATE.currentRegion || 'JP';
        const numPoints = Number.parseInt(points, 10);
        const validPoints = Number.isFinite(numPoints) && numPoints >= 0 ? numPoints : 0;
        const regionPaths = { JP: '', US: 'en/', KR: 'ko/', TW: 'tw/', HK: 'hk/', IN: 'in/' };
        const siteUrl = new URL(regionPaths[region] || '', 'https://playpoint-sim.com/').toString();

        let tweetText = '';
        if (region === 'US' || region === 'IN') {
            tweetText = `Got ${validPoints} Play Points from this week's Google Play Weekly Prize! 🎉 #GooglePlay #PlayPoints #PlayPointCalc`;
        } else if (region === 'KR') {
            tweetText = `이번 주 Google Play 주간 혜택으로 ${validPoints}pt를 받았습니다! 🎉 #구글플레이 #플레이포인트 #PlayPoint계산기`;
        } else if (region === 'TW' || region === 'HK') {
            tweetText = `這週的 Google Play 每週獎勵抽到了 ${validPoints} 點！🎉 #GooglePlay #Play點數 #PlayPoint計算器`;
        } else {
            tweetText = `今週のGoogle Playウィークリーリワードは【${validPoints}pt】でした！🎉 #Playポイント #GooglePlay #Playポイント計算機`;
        }

        const shareUrl = new URL('https://twitter.com/intent/tweet');
        shareUrl.searchParams.set('text', tweetText);
        shareUrl.searchParams.set('url', siteUrl);
        return shareUrl.toString();
    },

    shareRewardToX(points, prize) {
        const url = this.buildRewardShareUrl(points, prize);
        window.open(url, '_blank', 'noopener,noreferrer');
    }
};

if (typeof window !== 'undefined' && window.__TEST_ENV__) {
    window.PP_APP = window.PP_APP || {};
    window.PP_APP.SHARE = SHARE;
}