'use strict';

/**
 * 計算ファネルの匿名イベントと重複防止状態を一か所で管理する。
 * DOMや入力値そのものは受け取らず、分類済みの値だけを計測へ渡す。
 */
export function createCalculatorFunnelAnalytics({
    analytics,
    getConsentStatus,
    getRegion,
    modeMain,
    modeReverse,
    modeDiary
}) {
    const startedModes = new Set();
    const completedModes = new Set();
    let activeMode = modeMain;
    let diaryTabOpenedThisPage = false;

    const isCalculatorMode = (mode) => mode === modeMain || mode === modeReverse;
    const canRecord = () => getConsentStatus?.() !== 'denied';
    const calculationMode = (mode) => mode === modeReverse ? 'spend_to_points' : 'rank_up';

    function trackFormStarted(mode, startField) {
        if (!isCalculatorMode(mode) || !canRecord() || startedModes.has(mode)) return false;
        startedModes.add(mode);
        analytics.track('calculator_form_started', {
            calculation_mode: calculationMode(mode),
            region: getRegion(),
            start_field: startField
        });
        return true;
    }

    function trackValidationError(mode, errorType) {
        if (!isCalculatorMode(mode) || !errorType || !canRecord()) return false;
        analytics.track('calculator_validation_error', {
            calculation_mode: calculationMode(mode),
            region: getRegion(),
            error_type: errorType
        });
        return true;
    }

    function trackCompleted(mode) {
        if (!isCalculatorMode(mode) || !canRecord() || completedModes.has(mode)) return false;
        completedModes.add(mode);
        analytics.track('calculator_funnel_completed', {
            calculation_mode: calculationMode(mode),
            region: getRegion()
        });
        return true;
    }

    function trackModeChange(nextMode) {
        const previousMode = activeMode;
        if (!nextMode || previousMode === nextMode) return false;

        activeMode = nextMode;
        if (!canRecord()) return false;

        analytics.track('calculator_mode_changed', {
            region: getRegion(),
            from_mode: previousMode,
            to_mode: nextMode
        });

        if (nextMode === modeDiary && !diaryTabOpenedThisPage) {
            diaryTabOpenedThisPage = true;
            analytics.track('diary_tab_opened', {
                region: getRegion(),
                open_surface: 'tab'
            });
        }
        return true;
    }

    function resetIfDenied() {
        if (getConsentStatus?.() !== 'denied') return false;
        startedModes.clear();
        completedModes.clear();
        diaryTabOpenedThisPage = false;
        return true;
    }

    return Object.freeze({
        resetIfDenied,
        trackCompleted,
        trackFormStarted,
        trackModeChange,
        trackValidationError
    });
}
