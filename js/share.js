'use strict';

PP_APP.SHARE = {
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
        const dom = PP_APP.STATE.dom;
        const neededPoints = PP_APP.CALC.getValidNumberInput(dom.neededPoints, 0.01);
        const multiplier = PP_APP.CALC.getValidNumberInput(dom.multiplier, 1);
        if (neededPoints === null || multiplier === null || !dom.currentStatus) return '';

        const url = this.buildBaseUrl();
        url.searchParams.set('mode', 'main');
        url.searchParams.set('status', dom.currentStatus.value);
        url.searchParams.set('points', String(neededPoints));
        url.searchParams.set('multiplier', String(multiplier));
        return url.toString();
    },

    buildReverseShareUrl() {
        const dom = PP_APP.STATE.dom;
        const amount = PP_APP.CALC.getValidNumberInput(dom.amountYen, 0);
        const multiplier = PP_APP.CALC.getValidNumberInput(dom.reverseMultiplier, 1);
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
        const multiplier = this.getNumber(params, 'multiplier', 1, 10);
        const dom = PP_APP.STATE.dom;

        if (mode === 'reverse') {
            const amount = this.getNumber(params, 'amount', 0, 100000000);
            if (this.isAllowedStatusValue(dom.reverseStatus, status)) dom.reverseStatus.value = String(status);
            PP_APP.CALC.updateReverseBaseRate();
            if (amount !== null && dom.amountYen) dom.amountYen.value = String(amount);
            if (multiplier !== null && dom.reverseMultiplier) dom.reverseMultiplier.value = String(multiplier);
            PP_APP.UI.switchMode(PP_APP.CONSTANTS.MODE_REVERSE);
            return;
        }

        if (mode !== 'main') return;
        if (this.isAllowedStatusValue(dom.currentStatus, status)) dom.currentStatus.value = String(status);
        PP_APP.CALC.updateBaseRateAndTarget();
        const points = this.getNumber(params, 'points', 0.01, 1000000);
        const maxPoints = Number(dom.neededPoints && dom.neededPoints.max);
        if (points !== null && dom.neededPoints && (!Number.isFinite(maxPoints) || points <= maxPoints)) {
            dom.neededPoints.value = String(points);
        }
        if (multiplier !== null && dom.multiplier) dom.multiplier.value = String(multiplier);
        PP_APP.UI.switchMode(PP_APP.CONSTANTS.MODE_MAIN);
    }
};
