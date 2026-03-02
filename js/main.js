'use strict';

function updateUIForRegion() {
    updateUIText();
    populateStatusSelects();
    updateBaseRateAndTarget();
    updateReverseBaseRate();
    if(PP_STATE.dom.result) clearResult(PP_STATE.dom.result);
    if(PP_STATE.dom.reverseResult) clearResult(PP_STATE.dom.reverseResult);
    if (PP_STATE.dom.diaryMode && !PP_STATE.dom.diaryMode.classList.contains(PP_CONSTANTS.CLASS_HIDDEN)) renderDiary();
}

function switchRegion(newRegion) {
    if (!PP_REGION_CONFIGS[newRegion] || PP_STATE.currentRegion === newRegion) return;
    PP_STATE.currentRegion = newRegion;
    document.querySelectorAll(".region-switch button").forEach(button => {
        button.classList.toggle(PP_CONSTANTS.CLASS_ACTIVE, button.dataset.region === newRegion);
    });
    try {
        localStorage.setItem(PP_CONSTANTS.STORAGE_REGION_KEY, newRegion);
    } catch (e) {
        console.error("地域設定の保存に失敗しました:", e);
        showToast("地域設定の保存に失敗しました。", 'error');
    }
    updateUIForRegion();
}

function init() {
    const ids = [
        'mainMode', 'reverseMode', 'currentStatus', 'baseRate', 'targetStatus',
        'neededPoints', 'multiplier', 'calculateButton', 'result', 'copyButton',
        'tweetButton', 'amountYen', 'reverseStatus', 'reverseBaseRate',
        'reverseMultiplier', 'reverseCalculateButton', 'reverseResult', 'share-twitter-reverse',
        'copyright-year',
        'tab-diary', 'diaryMode', 'prevYearBtn', 'currentYear', 'nextYearBtn',
        'monthSelector', 'selectedMonth', 'weekInputs', 'monthlyTotal', 'monthlyAverage',
        'yearlyTotal', 'yearlyAverage', 'diary-guest-notice'
    ];
    
    ids.forEach(id => {
        const key = id.replace(/-([a-z])/g, g => g[1].toUpperCase());
        const element = document.getElementById(id);
        if (element) PP_STATE.dom[key] = element;
    });

    if (PP_STATE.dom.calculateButton) PP_STATE.dom.calculateButton.addEventListener('click', calculate);
    if (PP_STATE.dom.copyButton) PP_STATE.dom.copyButton.addEventListener('click', copyResult);
    if (PP_STATE.dom.tweetButton) PP_STATE.dom.tweetButton.addEventListener('click', handleTweet);
    if (PP_STATE.dom.reverseCalculateButton) PP_STATE.dom.reverseCalculateButton.addEventListener('click', reverseCalculate);
    if (PP_STATE.dom.shareTwitterReverse) PP_STATE.dom.shareTwitterReverse.addEventListener('click', handleTweetReverse);
    if (PP_STATE.dom.currentStatus) PP_STATE.dom.currentStatus.addEventListener('change', updateBaseRateAndTarget);
    if (PP_STATE.dom.reverseStatus) PP_STATE.dom.reverseStatus.addEventListener('change', updateReverseBaseRate);

    [PP_STATE.dom.neededPoints, PP_STATE.dom.baseRate, PP_STATE.dom.multiplier].forEach(el => {
        if(el) el.addEventListener('keydown', (e) => { if (e.key === 'Enter') {e.preventDefault(); calculate();} });
    });
    [PP_STATE.dom.amountYen, PP_STATE.dom.reverseBaseRate, PP_STATE.dom.reverseMultiplier].forEach(el => {
        if(el) el.addEventListener('keydown', (e) => { if (e.key === 'Enter') {e.preventDefault(); reverseCalculate();} });
    });

    document.querySelectorAll(".tab-switch button").forEach(button => button.addEventListener('click', () => switchMode(button.dataset.mode)));
    
    document.querySelectorAll(PP_CONSTANTS.SELECTOR_INFO_BTN).forEach(button => {
        button.addEventListener('click', toggleTooltip);
        button.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleTooltip(e); } });
    });
    
    document.querySelectorAll(".region-switch button").forEach(button => button.addEventListener('click', (e) => switchRegion(e.currentTarget.dataset.region)));
    
    document.addEventListener('click', (e) => { if (!e.target.closest(PP_CONSTANTS.SELECTOR_INFO_BTN) && !e.target.closest(PP_CONSTANTS.SELECTOR_TOOLTIP_BOX)) closeAllTooltips(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAllTooltips(); });

    if (PP_STATE.dom.prevYearBtn) PP_STATE.dom.prevYearBtn.addEventListener('click', () => { if (PP_STATE.diaryState.currentYear > 2023) { PP_STATE.diaryState.currentYear--; renderDiary(); } });
    if (PP_STATE.dom.nextYearBtn) PP_STATE.dom.nextYearBtn.addEventListener('click', () => { PP_STATE.diaryState.currentYear++; renderDiary(); });
    if (PP_STATE.dom.weekInputs) PP_STATE.dom.weekInputs.addEventListener('click', handleDiarySave);

    if (PP_STATE.dom.copyrightYear) PP_STATE.dom.copyrightYear.textContent = new Date().getFullYear();

    try {
        const savedRegion = localStorage.getItem(PP_CONSTANTS.STORAGE_REGION_KEY);
        if (savedRegion && PP_REGION_CONFIGS[savedRegion]) {
            PP_STATE.currentRegion = savedRegion;
        }
    } catch (e) {
        console.error("地域設定の読み込みに失敗しました:", e);
    }

    document.querySelectorAll(".region-switch button").forEach(button => {
        button.classList.toggle(PP_CONSTANTS.CLASS_ACTIVE, button.dataset.region === PP_STATE.currentRegion);
    });

    switchMode(PP_CONSTANTS.MODE_MAIN);
    updateUIForRegion();
}

document.addEventListener('DOMContentLoaded', () => {
    init();
    initTheme();
});
