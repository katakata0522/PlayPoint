'use strict';

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