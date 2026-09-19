'use strict';

import { CONFIGS, STATE, CONSTANTS, ANALYTICS } from './config.js';
import { UI } from './ui.js';
import { SHARE } from './share.js';
import { getWeeklyExperienceCopy as resolveWeeklyExperienceCopy } from './weekly-experience-copy.js';

export const DIARY_PURE = {
    // 日記の週は端末の日付で直近の金曜日にそろえる。月・年をまたぐ週も同じ記録先になる。
    currentWeek(now = new Date()) {
        const friday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
        friday.setDate(friday.getDate() - (friday.getDay() + 2) % 7);
        return { year: friday.getFullYear(), month: friday.getMonth() + 1, week: Math.floor((friday.getDate() - 1) / 7) + 1 };
    },

    nextFriday(now = new Date()) {
        const friday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
        friday.setDate(friday.getDate() - (friday.getDay() + 2) % 7 + 7);
        return friday;
    },
    normalizePointsValue(value) {
        if (value === null || value === undefined) return '';
        const raw = String(value).trim();
        if (raw === '') return '';
        if (!/^\d+$/.test(raw)) return null;
        const points = Number(raw);
        if (!Number.isSafeInteger(points) || points < 0) return null;
        return String(points);
    },

    hasMeaningfulEntry(entry = {}, defaultPrize = '') {
        const normalizedPoints = this.normalizePointsValue(entry?.points);
        const prize = String(entry?.prize ?? '').trim();
        return normalizedPoints !== '' && normalizedPoints !== null
            || (prize !== '' && prize !== String(defaultPrize ?? '').trim());
    },

    shouldQuestionLargePoints(value) {
        const normalizedPoints = this.normalizePointsValue(value);
        return normalizedPoints !== '' && normalizedPoints !== null
            && Number(normalizedPoints) >= 10000;
    },

    summarizeYear(yearData = {}) {
        const monthlyTotals = Array.from({ length: 12 }, () => 0);
        const monthlyWeeks = Array.from({ length: 12 }, () => Array.from({ length: 5 }, () => 0));
        let total = 0;
        let recordedWeeks = 0;

        for (let month = 1; month <= 12; month++) {
            const monthData = yearData[month] || {};
            for (const [weekKey, week] of Object.entries(monthData)) {
                const normalizedPoints = this.normalizePointsValue(week?.points);
                if (normalizedPoints === '' || normalizedPoints === null) continue;
                const points = Number(normalizedPoints);
                const weekIndex = Number(weekKey) - 1;
                monthlyTotals[month - 1] += points;
                if (Number.isInteger(weekIndex) && weekIndex >= 0 && weekIndex < 5) {
                    monthlyWeeks[month - 1][weekIndex] = points;
                }
                total += points;
                recordedWeeks++;
            }
        }

        return {
            monthlyTotals,
            monthlyWeeks,
            total,
            recordedWeeks,
            average: recordedWeeks > 0 ? total / recordedWeeks : 0
        };
    },

    isNewYearBest(yearData = {}, nextPoints) {
        const normalizedNext = this.normalizePointsValue(nextPoints);
        if (normalizedNext === '' || normalizedNext === null) return false;
        const existing = [];
        for (const monthData of Object.values(yearData || {})) {
            for (const week of Object.values(monthData || {})) {
                const normalized = this.normalizePointsValue(week?.points);
                if (normalized === '' || normalized === null) continue;
                existing.push(Number(normalized));
            }
        }
        return existing.length > 0 && Number(normalizedNext) > Math.max(...existing);
    }
};

const WEEKLY_EXPLICIT_STYLE_ID = 'weekly-explicit-save-style';

export const DIARY = {
    openCurrentWeek() {
        const current = DIARY_PURE.currentWeek();
        STATE.diaryState.currentYear = current.year;
        STATE.diaryState.currentMonth = current.month;
        this.renderDiary();
        const input = STATE.dom.weekInputs?.querySelector('#week' + current.week + '_points');
        input?.closest('.week-row')?.classList.add('is-current-week');
        input?.scrollIntoView({ block: 'center' });
        input?.focus({ preventScroll: true });
    },
    // ローカルストレージから日記データを取得するメソッド
    loadDiaryData() {
        try {
            const data = localStorage.getItem(CONSTANTS.DIARY_DATA_KEY);
            const parsed = data ? JSON.parse(data) : {};
            return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
        } catch (e) {
            console.error("日記データの読み込みに失敗しました:", e);
            const texts = CONFIGS[STATE.currentRegion]?.uiText || {};
            UI.showToast(texts.toastDiaryLoadError || "日記データの読み込みに失敗しました。", 'error');
            return {};
        }
    },

    // ローカルストレージへ日記データを保存するメソッド
    saveDiaryData(data) {
        try {
            localStorage.setItem(CONSTANTS.DIARY_DATA_KEY, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error("日記データの保存に失敗しました:", e);
            const texts = CONFIGS[STATE.currentRegion]?.uiText || {};
            UI.showToast(texts.toastDiarySaveError || "日記データの保存に失敗しました。", 'error');
            return false;
        }
    },

    // 特定の月における金曜日の日付リストを取得するメソッド
    getFridays(year, month) {
        const fridays = [];
        const date = new Date(year, month - 1, 1);
        while (date.getMonth() === month - 1) {
            if (date.getDay() === 5) { fridays.push(new Date(date)); }
            date.setDate(date.getDate() + 1);
        }
        return fridays;
    },

    getWeeklyExperienceCopy() {
        return resolveWeeklyExperienceCopy(STATE.currentRegion);
    },

    ensureWeeklyExperienceStyle() {
        if (document.getElementById(WEEKLY_EXPLICIT_STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = WEEKLY_EXPLICIT_STYLE_ID;
        style.textContent = `
#diaryMode .weekly-autosave-hint{display:none!important}
#diaryMode .diary-input-area>#selectedMonth,#diaryMode .weekly-month-section-title{display:none!important}
#diaryMode .diary-input-area{padding-top:0!important}
#diaryMode .is-weekly-current{grid-template-areas:"current current" "label label" "points prize" "large large" "share share" "state state" "hint hint" "achievement achievement"!important}
#diaryMode .is-weekly-current>.weekly-points-field{grid-area:points}
#diaryMode .is-weekly-current>.weekly-large-value-hint{grid-area:large}
#diaryMode .is-weekly-current .diary-btn-group,#diaryMode .is-weekly-compact.is-weekly-expanded .diary-btn-group{display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:.55em!important;align-items:center}
#diaryMode .is-weekly-current .diary-save-btn,#diaryMode .is-weekly-compact.is-weekly-expanded .diary-save-btn{display:inline-flex!important;align-items:center;justify-content:center;min-height:44px;margin:0;background:#1e8e3e;color:#fff;border-color:#1e8e3e;font-weight:800}
#diaryMode .diary-save-btn[hidden]{display:none!important}
#diaryMode .weekly-record-state{grid-area:state;display:flex;align-items:center;justify-content:space-between;gap:.7em;min-height:38px;padding:.45em .6em;border-radius:8px;background:rgba(63,185,80,.07);color:var(--text-color);font-size:.82em}
#diaryMode .weekly-record-state[hidden]{display:none!important}
#diaryMode .weekly-record-state.is-dirty{background:rgba(245,158,11,.08)}
#diaryMode .weekly-record-status{font-weight:800}
#diaryMode .weekly-record-edit{min-height:34px;margin:0;padding:.3em .7em;border:1px solid rgba(11,87,208,.2);border-radius:7px;background:rgba(11,87,208,.06);color:var(--link-hover-color);box-shadow:none;font-size:.82em}
#diaryMode .weekly-record-edit:hover:not(:disabled){background:rgba(11,87,208,.11)}
#diaryMode .is-weekly-current input:disabled,#diaryMode .is-weekly-current select:disabled{opacity:.86;cursor:default;background:rgba(15,23,42,.025)}
#diaryMode .is-weekly-compact:not(.is-weekly-expanded)>.weekly-large-value-hint{display:none!important}
.weekly-points-field{position:relative;min-width:0}
.weekly-points-field>input{width:100%;box-sizing:border-box;margin:0;padding-right:2.4em}
.weekly-points-unit{position:absolute;right:.75em;top:50%;transform:translateY(-50%);pointer-events:none;color:#64748b;font-size:.82em;font-weight:800}
.weekly-confirm-hint{grid-area:hint;margin:0;color:#4b5563;font-size:.78em;text-align:left}
.weekly-large-value-hint{margin:.15em 0 0;padding:.55em .7em;border-left:3px solid #f59e0b;border-radius:6px;background:rgba(245,158,11,.08);color:var(--text-color);font-size:.78em;line-height:1.45;text-align:left}
.weekly-large-value-hint[hidden]{display:none!important}
.weekly-achievement-panel{grid-area:achievement;width:100%;box-sizing:border-box;margin:.05em 0 0;padding:1em;border:1px solid rgba(11,87,208,.2);border-radius:12px;background:linear-gradient(180deg,rgba(11,87,208,.075),rgba(11,87,208,.018));text-align:left;overflow:hidden}
.weekly-achievement-panel[hidden]{display:none}
.weekly-achievement-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.55em}
.weekly-achievement-metric{min-width:0;padding:.72em .78em;border:1px solid rgba(11,87,208,.13);border-radius:10px;background:var(--section-bg-color)}
.weekly-achievement-metric span{display:block;margin-bottom:.15em;color:#52606d;font-size:.72em;font-weight:800}
.weekly-achievement-metric strong{display:block;color:var(--text-color);font-size:1.22em;line-height:1.25;overflow-wrap:anywhere}
.weekly-mini-chart-title{margin:.9em 0 .35em;color:#52606d;font-size:.75em;font-weight:800}
.weekly-week-legend{display:flex;align-items:center;gap:.46em;flex-wrap:wrap;margin:0 0 .42em;color:#667085;font-size:.64em}
.weekly-week-legend-item{display:inline-flex;align-items:center;gap:.22em;white-space:nowrap}
.weekly-week-legend-dot{display:inline-block;width:.72em;height:.72em;border-radius:3px}
.weekly-week-legend-dot.week-1{background:#4285F4}
.weekly-week-legend-dot.week-2{background:#EA4335}
.weekly-week-legend-dot.week-3{background:#FBBC04}
.weekly-week-legend-dot.week-4{background:#34A853}
.weekly-week-legend-dot.week-5{background:#8AB4F8}
.weekly-mini-chart{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));align-items:end;gap:3px;min-height:94px;padding:.45em .25em .15em;border-radius:10px;background:linear-gradient(180deg,rgba(88,166,255,.035),rgba(63,185,80,.02))}
.weekly-mini-item{display:grid;grid-template-rows:68px auto;gap:4px;min-width:0;align-items:end}
.weekly-mini-bar{position:relative;display:flex;align-items:flex-end;height:68px;min-width:0;border-radius:5px;background:linear-gradient(180deg,rgba(88,166,255,.08),rgba(11,87,208,.035));overflow:hidden}
.weekly-mini-stack{display:flex;flex-direction:column;width:100%;height:var(--weekly-bar,2%);min-height:2px;overflow:hidden;border-radius:5px 5px 2px 2px;transform-origin:bottom}
.weekly-week-segment{display:block;min-height:1px;flex-basis:0;transform-origin:bottom;box-shadow:inset 0 1px rgba(255,255,255,.32)}
.weekly-week-segment.week-1{background:#4285F4}
.weekly-week-segment.week-2{background:#EA4335}
.weekly-week-segment.week-3{background:#FBBC04}
.weekly-week-segment.week-4{background:#34A853}
.weekly-week-segment.week-5{background:#8AB4F8}
.weekly-week-segment.is-current-week-segment{filter:none;box-shadow:inset 0 1px rgba(255,255,255,.48),0 0 7px rgba(63,185,80,.35)}
.diary-chart-stack{display:flex;flex-direction:column;overflow:hidden;background:transparent;box-shadow:0 -1px 6px rgba(66,133,244,.16)}
.diary-week-segment{display:block;min-height:1px;flex-basis:0;transform-origin:bottom;box-shadow:inset 0 1px rgba(255,255,255,.34);animation:diary-week-rise .42s cubic-bezier(.2,.78,.22,1) both;animation-delay:var(--diary-week-delay,0ms)}
.diary-week-segment.week-1{background:#4285F4}
.diary-week-segment.week-2{background:#EA4335}
.diary-week-segment.week-3{background:#FBBC04}
.diary-week-segment.week-4{background:#34A853}
.diary-week-segment.week-5{background:#8AB4F8}
.diary-week-segment.is-current-week-segment{filter:none;box-shadow:inset 0 1px rgba(255,255,255,.5),0 0 8px rgba(63,185,80,.28)}
.diary-chart-item.is-current-month .diary-chart-track{box-shadow:inset 0 0 0 1px rgba(11,87,208,.18);background:rgba(88,166,255,.115)}
.diary-chart-item.is-current-month .diary-chart-label,.diary-chart-item.is-current-month .diary-chart-value{color:var(--link-hover-color);font-weight:800}
.weekly-mini-item.is-current-month .weekly-mini-bar{background:linear-gradient(180deg,rgba(88,166,255,.14),rgba(63,185,80,.07));box-shadow:inset 0 0 0 1px rgba(63,185,80,.2)}
.weekly-mini-bar-label{display:block;min-width:0;color:#7a8694;font-size:clamp(.5rem,2.1vw,.62rem);font-weight:700;line-height:1;text-align:center;white-space:nowrap;overflow:hidden}
.weekly-mini-item.is-current-month .weekly-mini-bar-label{color:#0b57d0;font-weight:900}
.weekly-next-reward{display:flex;align-items:center;justify-content:space-between;gap:.7em;flex-wrap:wrap;margin:.8em 0 0;padding-top:.7em;border-top:1px solid rgba(11,87,208,.12);font-size:.82em;line-height:1.5}
.weekly-next-reward strong{color:var(--text-color);font-weight:900}
.weekly-next-reward a{color:#0b57d0;font-weight:800;text-decoration:none}
.weekly-next-reward a:hover{text-decoration:underline}
.weekly-achievement-milestone{margin:0 0 .65em;color:#795900;font-size:.88em;font-weight:900}
.weekly-result-actions{display:flex;justify-content:flex-end;margin:.75em 0 0}
.weekly-result-share{min-height:38px;margin:0;padding:.42em .8em;border:1px solid rgba(17,24,39,.16);border-radius:8px;background:#111827;color:#fff;box-shadow:none;font-size:.82em;font-weight:800}
.weekly-result-share:hover:not(:disabled){background:#242b38;box-shadow:none}
.weekly-achievement-panel.is-celebrating{animation:weekly-panel-in .28s ease-out}
.weekly-achievement-panel.is-celebrating .weekly-week-segment{animation:weekly-week-rise .46s cubic-bezier(.2,.78,.22,1) both;animation-delay:calc(var(--weekly-delay,0ms) + var(--weekly-week-delay,0ms))}
.weekly-achievement-panel.is-celebrating .weekly-mini-bar-label{animation:weekly-label-in .3s ease-out both;animation-delay:calc(var(--weekly-delay,0ms) + 260ms)}
.weekly-achievement-panel.is-celebrating .weekly-mini-item.is-current-month .weekly-mini-bar{animation:weekly-current-glow .7s ease-out both;animation-delay:calc(var(--weekly-delay,0ms) + 420ms)}
@keyframes weekly-panel-in{0%{opacity:.45;transform:translateY(-4px)}100%{opacity:1;transform:none}}
@keyframes weekly-week-rise{0%{opacity:0;transform:scaleY(0)}76%{opacity:1;transform:scaleY(1.04)}100%{opacity:1;transform:scaleY(1)}}
@keyframes weekly-label-in{0%{opacity:0;transform:translateY(3px)}100%{opacity:1;transform:none}}
@keyframes weekly-current-glow{0%{box-shadow:inset 0 0 0 1px rgba(63,185,80,.2)}55%{box-shadow:inset 0 0 0 1px rgba(63,185,80,.4),0 0 12px rgba(63,185,80,.24)}100%{box-shadow:inset 0 0 0 1px rgba(63,185,80,.2)}}
@keyframes diary-week-rise{0%{opacity:0;transform:scaleY(0)}75%{opacity:1;transform:scaleY(1.035)}100%{opacity:1;transform:scaleY(1)}}
@media(max-width:360px){#diaryMode .is-weekly-current{grid-template-columns:1fr!important;grid-template-areas:"current" "label" "points" "prize" "large" "share" "state" "hint" "achievement"!important}.weekly-achievement-metrics{grid-template-columns:1fr}.weekly-mini-chart{gap:2px;padding-left:.1em;padding-right:.1em}.weekly-mini-bar-label{font-size:.5rem}}
@media(prefers-reduced-motion:reduce){.weekly-achievement-panel.is-celebrating,.weekly-achievement-panel.is-celebrating .weekly-week-segment,.weekly-achievement-panel.is-celebrating .weekly-mini-bar-label,.weekly-achievement-panel.is-celebrating .weekly-mini-item.is-current-month .weekly-mini-bar,.diary-week-segment{animation:none}}
`;
        document.head.appendChild(style);
    },

    isCurrentDiaryWeek(weekNum) {
        const current = DIARY_PURE.currentWeek();
        return STATE.diaryState.currentYear === current.year
            && STATE.diaryState.currentMonth === current.month
            && Number(weekNum) === current.week;
    },

    ensureWeeklyConfirmHint(row) {
        if (!row || row.querySelector('.weekly-confirm-hint')) return;
        const hint = document.createElement('p');
        hint.className = 'weekly-confirm-hint';
        hint.textContent = this.getWeeklyExperienceCopy().hint;
        const group = row.querySelector('.diary-btn-group');
        (group || row).insertAdjacentElement('afterend', hint);
    },

    updateLargeValueHint(pointsInput, hint) {
        if (!pointsInput || !hint) return;
        const shouldQuestion = DIARY_PURE.shouldQuestionLargePoints(pointsInput.value);
        hint.hidden = !shouldQuestion;
        hint.textContent = shouldQuestion ? this.getWeeklyExperienceCopy().largeValueHint : '';
    },

    setCurrentWeekRecordMode(row, mode) {
        if (!row) return;
        const copy = this.getWeeklyExperienceCopy();
        const texts = CONFIGS[STATE.currentRegion].uiText;
        const input = row.querySelector('input[type="number"]');
        const select = row.querySelector('select');
        const save = row.querySelector('.diary-save-btn');
        const state = row.querySelector('.weekly-record-state');
        const status = row.querySelector('.weekly-record-status');
        const edit = row.querySelector('.weekly-record-edit');
        const hint = row.querySelector('.weekly-confirm-hint');
        if (!input || !select || !save || !state || !status || !edit) return;

        row.dataset.recordMode = mode;
        const saved = mode === 'saved';
        input.disabled = saved;
        select.disabled = saved;
        save.hidden = saved;
        state.hidden = mode === 'new';
        edit.hidden = mode !== 'saved';
        state.classList.remove('is-dirty');

        if (mode === 'saved') {
            status.textContent = copy.saved;
            save.textContent = texts.saveButton;
            if (hint) hint.hidden = true;
        } else if (mode === 'editing') {
            status.textContent = copy.saved;
            save.textContent = copy.saveChanges;
            if (hint) hint.hidden = true;
        } else {
            status.textContent = '';
            save.textContent = texts.saveButton;
            if (hint) hint.hidden = false;
        }
    },

    updateCurrentWeekDirtyState(row) {
        if (!row || row.dataset.recordMode !== 'editing') return;
        const copy = this.getWeeklyExperienceCopy();
        const input = row.querySelector('input[type="number"]');
        const select = row.querySelector('select');
        const state = row.querySelector('.weekly-record-state');
        const status = row.querySelector('.weekly-record-status');
        if (!input || !select || !state || !status) return;
        const normalized = DIARY_PURE.normalizePointsValue(input.value);
        const currentPoints = normalized === null ? input.value.trim() : normalized;
        const dirty = String(currentPoints) !== String(row.dataset.savedPoints ?? '')
            || String(select.value ?? '') !== String(row.dataset.savedPrize ?? '');
        status.textContent = dirty ? copy.unsaved : copy.saved;
        state.classList.toggle('is-dirty', dirty);
    },

    configureCurrentWeekRecordState(row, weekData, defaultPrize) {
        if (!row) return;
        const copy = this.getWeeklyExperienceCopy();
        const input = row.querySelector('input[type="number"]');
        const select = row.querySelector('select');
        const save = row.querySelector('.diary-save-btn');
        const edit = row.querySelector('.weekly-record-edit');
        if (!input || !select || !save || !edit) return;

        const normalized = DIARY_PURE.normalizePointsValue(weekData?.points);
        const savedEntry = DIARY_PURE.hasMeaningfulEntry(weekData || {}, defaultPrize);
        if (savedEntry) {
            row.dataset.savedPoints = normalized === null ? '' : normalized;
            row.dataset.savedPrize = String(weekData?.prize ?? '');
            this.setCurrentWeekRecordMode(row, 'saved');
        } else {
            delete row.dataset.savedPoints;
            delete row.dataset.savedPrize;
            this.setCurrentWeekRecordMode(row, 'new');
        }

        edit.addEventListener('click', () => {
            this.setCurrentWeekRecordMode(row, 'editing');
            input.focus({ preventScroll: true });
        });
        input.addEventListener('input', () => this.updateCurrentWeekDirtyState(row));
        select.addEventListener('change', () => this.updateCurrentWeekDirtyState(row));
        input.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter' || save.hidden || input.disabled) return;
            event.preventDefault();
            save.click();
        });
    },

    commitCurrentWeekRecordState(weekNum, pointsValue, prizeValue) {
        if (!this.isCurrentDiaryWeek(weekNum)) return;
        const row = STATE.dom.weekInputs?.querySelector('#week' + weekNum + '_points')?.closest('.week-row');
        if (!row) return;
        row.dataset.savedPoints = String(pointsValue ?? '');
        row.dataset.savedPrize = String(prizeValue ?? '');
        this.setCurrentWeekRecordMode(row, 'saved');
    },

    resetCurrentWeekRecordState(weekNum) {
        if (!this.isCurrentDiaryWeek(weekNum)) return;
        const row = STATE.dom.weekInputs?.querySelector('#week' + weekNum + '_points')?.closest('.week-row');
        if (!row) return;
        delete row.dataset.savedPoints;
        delete row.dataset.savedPrize;
        this.setCurrentWeekRecordMode(row, 'new');
    },

    renderWeeklyAchievement(row, pointsValue, yearlySummary, animate = false, milestoneText = '') {
        if (!row) return;
        let panel = row.querySelector('.weekly-achievement-panel');
        if (!panel) {
            panel = document.createElement('section');
            panel.className = 'weekly-achievement-panel';
            panel.hidden = true;
            panel.setAttribute('aria-live', 'polite');
            row.appendChild(panel);
        }

        const normalizedPoints = DIARY_PURE.normalizePointsValue(pointsValue);
        if (normalizedPoints === '' || normalizedPoints === null) {
            panel.hidden = true;
            panel.classList.remove('is-celebrating');
            return;
        }

        const config = CONFIGS[STATE.currentRegion];
        const texts = config.uiText;
        const copy = this.getWeeklyExperienceCopy();
        const totals = yearlySummary?.monthlyTotals || Array.from({ length: 12 }, () => 0);
        const maxValue = Math.max(1, ...totals);

        panel.innerHTML = '';

        const metrics = document.createElement('div');
        metrics.className = 'weekly-achievement-metrics';

        const weekMetric = document.createElement('div');
        weekMetric.className = 'weekly-achievement-metric';
        const weekLabel = document.createElement('span');
        weekLabel.textContent = copy.weekGain;
        const weekValue = document.createElement('strong');
        weekValue.textContent = '+' + Number(normalizedPoints).toLocaleString(config.lang) + ' ' + texts.pointsUnit;
        weekMetric.append(weekLabel, weekValue);

        const yearMetric = document.createElement('div');
        yearMetric.className = 'weekly-achievement-metric';
        const yearLabel = document.createElement('span');
        yearLabel.textContent = copy.yearTotal(STATE.diaryState.currentYear);
        const yearValue = document.createElement('strong');
        yearValue.textContent = Number(yearlySummary?.total || 0).toLocaleString(config.lang) + ' ' + texts.pointsUnit;
        yearMetric.append(yearLabel, yearValue);
        metrics.append(weekMetric, yearMetric);

        const chartTitle = document.createElement('p');
        chartTitle.className = 'weekly-mini-chart-title';
        chartTitle.textContent = copy.chartLabel;

        const legend = document.createElement('div');
        legend.className = 'weekly-week-legend';
        for (let weekIndex = 0; weekIndex < 5; weekIndex++) {
            const legendItem = document.createElement('span');
            legendItem.className = 'weekly-week-legend-item';
            const dot = document.createElement('span');
            dot.className = 'weekly-week-legend-dot week-' + (weekIndex + 1);
            dot.setAttribute('aria-hidden', 'true');
            const text = document.createElement('span');
            text.textContent = String(weekIndex + 1);
            legendItem.title = texts.weekLabel + (weekIndex + 1) + texts.weekSuffix;
            legendItem.append(dot, text);
            legend.appendChild(legendItem);
        }

        const chart = document.createElement('div');
        chart.className = 'weekly-mini-chart';
        chart.setAttribute('role', 'img');
        chart.setAttribute(
            'aria-label',
            copy.chartLabel + ': ' + Number(yearlySummary?.total || 0).toLocaleString(config.lang) + ' ' + texts.pointsUnit
        );
        const monthlyWeeks = yearlySummary?.monthlyWeeks || Array.from({ length: 12 }, () => Array.from({ length: 5 }, () => 0));
        const currentWeek = DIARY_PURE.currentWeek();
        totals.forEach((total, index) => {
            const item = document.createElement('span');
            item.className = 'weekly-mini-item';
            item.style.setProperty('--weekly-delay', (index * 32) + 'ms');
            if (index + 1 === STATE.diaryState.currentMonth) item.classList.add('is-current-month');

            const bar = document.createElement('span');
            bar.className = 'weekly-mini-bar';
            bar.title = texts.monthNames[index] + ': ' + Number(total).toLocaleString(config.lang) + ' ' + texts.pointsUnit;

            const stack = document.createElement('span');
            stack.className = 'weekly-mini-stack';
            stack.style.setProperty('--weekly-bar', Math.max(2, Math.round((Number(total) / maxValue) * 100)) + '%');
            const weekValues = monthlyWeeks[index] || [];
            weekValues.forEach((weekPoints, weekIndex) => {
                if (!Number(weekPoints)) return;
                const segment = document.createElement('span');
                segment.className = 'weekly-week-segment week-' + (weekIndex + 1);
                segment.style.flexGrow = String(weekPoints);
                segment.style.setProperty('--weekly-week-delay', (weekIndex * 65) + 'ms');
                if (
                    STATE.diaryState.currentYear === currentWeek.year
                    && index + 1 === currentWeek.month
                    && weekIndex + 1 === currentWeek.week
                ) {
                    segment.classList.add('is-current-week-segment');
                }
                segment.title = texts.weekLabel + (weekIndex + 1) + texts.weekSuffix + ': '
                    + Number(weekPoints).toLocaleString(config.lang) + ' ' + texts.pointsUnit;
                stack.appendChild(segment);
            });
            bar.appendChild(stack);

            const label = document.createElement('span');
            label.className = 'weekly-mini-bar-label';
            label.textContent = texts.monthNames[index];

            item.append(bar, label);
            chart.appendChild(item);
        });

        const resultActions = document.createElement('div');
        resultActions.className = 'weekly-result-actions';
        const share = document.createElement('button');
        share.type = 'button';
        share.className = 'weekly-result-share';
        share.textContent = copy.shareText;
        share.title = copy.shareAria;
        share.setAttribute('aria-label', copy.shareAria);
        share.addEventListener('click', () => {
            const prize = row.querySelector('select')?.value || '';
            SHARE.shareRewardToX(normalizedPoints, prize);
        });
        resultActions.appendChild(share);

        const nextReward = document.createElement('div');
        nextReward.className = 'weekly-next-reward';
        const nextDate = DIARY_PURE.nextFriday();
        const nextDateText = new Intl.DateTimeFormat(config.lang, {
            month: 'numeric',
            day: 'numeric',
            weekday: 'short'
        }).format(nextDate);
        const nextLabel = document.createElement('span');
        nextLabel.append(document.createTextNode(copy.nextReward + ' '));
        const nextStrong = document.createElement('strong');
        nextStrong.textContent = nextDateText;
        nextLabel.appendChild(nextStrong);
        nextReward.appendChild(nextLabel);

        const calendarSource = document.getElementById('register-google-cal-btn');
        if (calendarSource?.href && !calendarSource.href.endsWith('#')) {
            const calendarLink = document.createElement('a');
            calendarLink.href = calendarSource.href;
            calendarLink.target = '_blank';
            calendarLink.rel = 'noopener noreferrer';
            calendarLink.textContent = copy.calendarCta;
            nextReward.appendChild(calendarLink);
        }

        if (milestoneText) {
            const milestone = document.createElement('p');
            milestone.className = 'weekly-achievement-milestone';
            milestone.textContent = milestoneText;
            panel.appendChild(milestone);
        }
        panel.append(metrics, chartTitle, legend, chart, resultActions, nextReward);
        panel.hidden = false;
        panel.classList.remove('is-celebrating');
        if (animate) {
            void panel.offsetWidth;
            panel.classList.add('is-celebrating');
        }
    },

    decorateExplicitCurrentWeek(row, weekNum, pointsValue, yearData, weekData, defaultPrize) {
        if (!this.isCurrentDiaryWeek(weekNum)) return;
        this.ensureWeeklyExperienceStyle();
        row.classList.add('is-weekly-current', 'is-weekly-expanded');
        this.ensureWeeklyConfirmHint(row);
        this.configureCurrentWeekRecordState(row, weekData, defaultPrize);
        this.renderWeeklyAchievement(row, pointsValue, DIARY_PURE.summarizeYear(yearData), false);
    },

    refreshWeeklyAchievement(weekNum, pointsValue, yearData, animate = false, milestoneText = '') {
        if (!this.isCurrentDiaryWeek(weekNum)) return;
        const row = STATE.dom.weekInputs?.querySelector('#week' + weekNum + '_points')?.closest('.week-row');
        if (!row) return;
        this.ensureWeeklyExperienceStyle();
        row.classList.add('is-weekly-current', 'is-weekly-expanded');
        this.ensureWeeklyConfirmHint(row);
        this.renderWeeklyAchievement(row, pointsValue, DIARY_PURE.summarizeYear(yearData), animate, milestoneText);
    },

    // 日記（アワード）画面のレンダリング
    renderDiary() {
        if (!STATE.dom.diaryMode) return;
        const config = CONFIGS[STATE.currentRegion];
        const texts = config.uiText;
        STATE.dom.currentYear.textContent = `${STATE.diaryState.currentYear}${texts.yearSuffix || ''}`;
        this.renderMonthSelector();
        this.renderWeekInputs();
        this.updateSummary();
    },

    // 月選択ボタンのレンダリング
    renderMonthSelector() {
        if (!STATE.dom.monthSelector) return;
        const texts = CONFIGS[STATE.currentRegion].uiText;
        STATE.dom.monthSelector.innerHTML = '';
        texts.monthNames.forEach((name, index) => {
            const monthNum = index + 1;
            const button = document.createElement('button');
            button.textContent = name;
            button.dataset.month = monthNum;
            if (monthNum === STATE.diaryState.currentMonth) button.classList.add(CONSTANTS.CLASS_ACTIVE);
            button.addEventListener('click', () => {
                STATE.diaryState.currentMonth = monthNum;
                this.renderDiary();
            });
            STATE.dom.monthSelector.appendChild(button);
        });
    },

    // 選択された月の各週の入力行のレンダリング
    renderWeekInputs() {
        if (!STATE.dom.weekInputs || !STATE.dom.selectedMonth) return;
        const texts = CONFIGS[STATE.currentRegion].uiText;
        STATE.dom.weekInputs.innerHTML = '';
        STATE.dom.selectedMonth.textContent = texts.monthNames[STATE.diaryState.currentMonth - 1];
        const fridays = this.getFridays(STATE.diaryState.currentYear, STATE.diaryState.currentMonth);
        const data = this.loadDiaryData();
        const yearData = data[STATE.diaryState.currentYear] || {};
        const monthData = yearData[STATE.diaryState.currentMonth] || {};
        if (fridays.length === 0) {
            STATE.dom.weekInputs.innerHTML = `<p>${texts.noWeeksMessage}</p>`;
            return;
        }
        fridays.forEach((friday, index) => {
            const weekNum = index + 1;
            const dateString = `${friday.getMonth() + 1}/${friday.getDate()}`;
            const weekData = monthData[weekNum] || { points: '', prize: texts.prizeOptions[0] };
            const normalizedPoints = DIARY_PURE.normalizePointsValue(weekData.points);
            const displayPoints = normalizedPoints === null ? '' : normalizedPoints;
            const row = document.createElement('div');
            row.className = 'week-row';
            const prizeOptionsHTML = texts.prizeOptions.map(opt => `<option value="${opt}" ${weekData.prize === opt ? 'selected' : ''}>${opt}</option>`).join('');
            row.innerHTML = `
                <label for="week${weekNum}_points">${texts.weekLabel}${weekNum}${texts.weekSuffix} (${dateString})</label>
                <div class="weekly-points-field">
                    <input type="number" id="week${weekNum}_points" placeholder="${texts.pointsPlaceholder}" value="${displayPoints}" min="0" step="1" inputmode="numeric">
                    <span class="weekly-points-unit" aria-hidden="true">${texts.pointsUnit || 'pt'}</span>
                </div>
                <select id="week${weekNum}_prize" aria-label="${texts.prizeLabel}">${prizeOptionsHTML}</select>
                <p class="weekly-large-value-hint" hidden aria-live="polite"></p>
                <div class="diary-btn-group">
                    <button type="button" class="diary-save-btn" data-week="${weekNum}">${texts.saveButton}</button>
                </div>
                <div class="weekly-record-state" hidden aria-live="polite">
                    <span class="weekly-record-status"></span>
                    <button type="button" class="weekly-record-edit"></button>
                </div>
            `;

            // 明示確定のイベントハンドラを登録
            const pointsInput = row.querySelector(`#week${weekNum}_points`);
            const largeValueHint = row.querySelector('.weekly-large-value-hint');
            const editButton = row.querySelector('.weekly-record-edit');
            const weeklyCopy = this.getWeeklyExperienceCopy();

            if (editButton) editButton.textContent = weeklyCopy.edit;
            this.updateLargeValueHint(pointsInput, largeValueHint);
            pointsInput.addEventListener('input', () => this.updateLargeValueHint(pointsInput, largeValueHint));

            // 入力だけでは確定しない。「結果を記録」または編集後の「変更を保存」で確定する。
            this.decorateExplicitCurrentWeek(
                row,
                weekNum,
                displayPoints,
                yearData,
                weekData,
                texts.prizeOptions?.[0] || ''
            );
            STATE.dom.weekInputs.appendChild(row);
        });
    },

    // 月間・年間の合計・平均ポイントの集計表示
    updateSummary() {
        if (!STATE.dom.monthlyTotal || !STATE.dom.yearlyTotal) return;
        const config = CONFIGS[STATE.currentRegion];
        const data = this.loadDiaryData();
        const yearData = data[STATE.diaryState.currentYear] || {};
        const monthData = yearData[STATE.diaryState.currentMonth] || {};
        let monthlyTotal = 0, monthlyWeeksWithPoints = 0;
        Object.values(monthData).forEach(week => {
            const normalizedPoints = DIARY_PURE.normalizePointsValue(week?.points);
            if (normalizedPoints === '' || normalizedPoints === null) return;
            monthlyTotal += Number(normalizedPoints);
            monthlyWeeksWithPoints++;
        });
        STATE.dom.monthlyTotal.textContent = monthlyTotal.toLocaleString(config.lang);
        STATE.dom.monthlyAverage.textContent = (monthlyWeeksWithPoints > 0 ? (monthlyTotal / monthlyWeeksWithPoints).toFixed(1) : '0.0');
        const yearlySummary = DIARY_PURE.summarizeYear(yearData);
        STATE.dom.yearlyTotal.textContent = yearlySummary.total.toLocaleString(config.lang);
        STATE.dom.yearlyAverage.textContent = yearlySummary.average.toFixed(1);
        this.renderYearChart(yearlySummary);
    },

    // 保存済みデータだけを使い、月ごとの比較をDOMでアクセシブルに描画する。
    renderYearChart(yearlySummary) {
        if (!STATE.dom.diaryYearChart) return;
        const config = CONFIGS[STATE.currentRegion];
        const texts = config.uiText;
        const monthlyTotals = yearlySummary?.monthlyTotals || Array.from({ length: 12 }, () => 0);
        const monthlyWeeks = yearlySummary?.monthlyWeeks || Array.from({ length: 12 }, () => Array.from({ length: 5 }, () => 0));
        const maxValue = Math.max(1, ...monthlyTotals);
        const currentWeek = DIARY_PURE.currentWeek();
        STATE.dom.diaryYearChart.innerHTML = '';
        STATE.dom.diaryYearChart.setAttribute('aria-label', texts.yearlyChartDescription || '');

        monthlyTotals.forEach((total, index) => {
            const item = document.createElement('div');
            item.className = 'diary-chart-item';
            if (STATE.diaryState.currentYear === currentWeek.year && index + 1 === currentWeek.month) {
                item.classList.add('is-current-month');
            }
            item.setAttribute('aria-label', `${texts.monthNames[index]}: ${total.toLocaleString(config.lang)} ${texts.pointsUnit}`);

            const value = document.createElement('span');
            value.className = 'diary-chart-value';
            value.textContent = total.toLocaleString(config.lang);

            const track = document.createElement('span');
            track.className = 'diary-chart-track';
            const stack = document.createElement('span');
            stack.className = 'diary-chart-bar diary-chart-stack';
            stack.style.setProperty('--bar-height', `${Math.round((total / maxValue) * 100)}%`);

            const weekValues = monthlyWeeks[index] || [];
            weekValues.forEach((weekPoints, weekIndex) => {
                if (!Number(weekPoints)) return;
                const segment = document.createElement('span');
                segment.className = 'diary-week-segment week-' + (weekIndex + 1);
                segment.style.flexGrow = String(weekPoints);
                segment.style.setProperty('--diary-week-delay', (weekIndex * 55) + 'ms');
                if (
                    STATE.diaryState.currentYear === currentWeek.year
                    && index + 1 === currentWeek.month
                    && weekIndex + 1 === currentWeek.week
                ) {
                    segment.classList.add('is-current-week-segment');
                }
                segment.title = texts.weekLabel + (weekIndex + 1) + texts.weekSuffix + ': '
                    + Number(weekPoints).toLocaleString(config.lang) + ' ' + texts.pointsUnit;
                stack.appendChild(segment);
            });
            track.appendChild(stack);

            const label = document.createElement('span');
            label.className = 'diary-chart-label';
            label.textContent = texts.monthNames[index];
            item.append(value, track, label);
            STATE.dom.diaryYearChart.appendChild(item);
        });
    },
    showSaveConfirmation(button, texts) {
        if (!button) return;
        const originalText = texts.saveButton;
        button.textContent = 'OK!';
        button.disabled = true;
        setTimeout(() => {
            button.textContent = originalText;
            button.disabled = false;
        }, CONSTANTS.SAVE_CONFIRMATION_DURATION);
    },

    cleanEmptyDiaryContainers(data, yearKey, monthKey) {
        const monthData = data?.[yearKey]?.[monthKey];
        if (monthData && Object.keys(monthData).length === 0) delete data[yearKey][monthKey];
        const yearData = data?.[yearKey];
        if (yearData && Object.keys(yearData).length === 0) delete data[yearKey];
    },

    // 週ごとの入力データ保存処理
    handleDiarySave(e, isSilent = false) {
        if (
            e.target.tagName !== 'BUTTON'
            || !e.target.dataset.week
            || !e.target.classList?.contains('diary-save-btn')
        ) return;

        const weekNum = e.target.dataset.week;
        const pointsInput = STATE.dom.weekInputs.querySelector(`#week${weekNum}_points`);
        const prizeSelect = STATE.dom.weekInputs.querySelector(`#week${weekNum}_prize`);
        if (!pointsInput || !prizeSelect) return;

        const texts = CONFIGS[STATE.currentRegion].uiText;
        const normalizedPoints = DIARY_PURE.normalizePointsValue(pointsInput.value);
        if (normalizedPoints === null) {
            UI.showToast(texts.errorDiaryPoints || texts.errorInput || 'ポイントは0以上の整数で入力してください。', 'error');
            return;
        }

        const defaultPrize = texts.prizeOptions?.[0] || '';
        const nextEntry = { points: normalizedPoints, prize: prizeSelect.value };
        const data = this.loadDiaryData();
        const yearKey = STATE.diaryState.currentYear;
        const monthKey = STATE.diaryState.currentMonth;
        const previousEntry = data?.[yearKey]?.[monthKey]?.[weekNum];
        const yearDataBeforeSave = data?.[yearKey] || {};
        const isYearBest = normalizedPoints !== ''
            && DIARY_PURE.isNewYearBest(yearDataBeforeSave, normalizedPoints);
        const hasMeaningfulEntry = DIARY_PURE.hasMeaningfulEntry(nextEntry, defaultPrize);

        if (!hasMeaningfulEntry) {
            if (!previousEntry) {
                if (!isSilent) UI.showToast(texts.errorDiaryEmptyEntry || texts.errorInput || '記録する内容を入力してください。', 'error');
                return;
            }

            delete data[yearKey][monthKey][weekNum];
            this.cleanEmptyDiaryContainers(data, yearKey, monthKey);
            if (!this.saveDiaryData(data)) return;
            this.updateSummary();
            this.resetCurrentWeekRecordState(weekNum);
            this.refreshWeeklyAchievement(weekNum, '', data[yearKey] || {}, false);
            if (!isSilent) {
                UI.showToast(texts.toastDiarySaveSuccess);
                document.dispatchEvent(new CustomEvent('playpoint:diary-saved', {
                    detail: { region: STATE.currentRegion }
                }));
                this.showSaveConfirmation(e.target, texts);
            }
            return;
        }

        const normalizedPreviousPoints = previousEntry
            ? DIARY_PURE.normalizePointsValue(previousEntry.points)
            : null;
        const isUnchanged = previousEntry
            && normalizedPreviousPoints === normalizedPoints
            && String(previousEntry.prize ?? '') === String(nextEntry.prize ?? '');

        if (isUnchanged) {
            if (!isSilent) {
                this.commitCurrentWeekRecordState(weekNum, normalizedPoints, nextEntry.prize);
                this.refreshWeeklyAchievement(weekNum, normalizedPoints, data[yearKey] || {}, true);
                UI.showToast(texts.toastDiarySaveSuccess);
                if (!this.isCurrentDiaryWeek(weekNum)) this.showSaveConfirmation(e.target, texts);
            }
            return;
        }

        if (!data[yearKey]) data[yearKey] = {};
        if (!data[yearKey][monthKey]) data[yearKey][monthKey] = {};
        data[yearKey][monthKey][weekNum] = nextEntry;
        if (!this.saveDiaryData(data)) return;

        // 有効な記録が新規作成・更新された時だけ、保存完了として計測する。
        ANALYTICS.track('diary_entry_saved', {
            region: STATE.currentRegion,
            entry_type: 'weekly_reward'
        });
        ANALYTICS.markEngaged();

        this.updateSummary();
        if (!isSilent) {
            this.commitCurrentWeekRecordState(weekNum, normalizedPoints, nextEntry.prize);
            this.refreshWeeklyAchievement(
                weekNum,
                normalizedPoints,
                data[yearKey] || {},
                true,
                isYearBest ? this.getWeeklyExperienceCopy().yearBest : ''
            );
            UI.showToast(texts.toastDiarySaveSuccess);
            document.dispatchEvent(new CustomEvent('playpoint:diary-saved', {
                detail: { region: STATE.currentRegion }
            }));
            if (!this.isCurrentDiaryWeek(weekNum)) this.showSaveConfirmation(e.target, texts);
        }
    },

    // 日記データをJSONテキストとしてエクスポート
    exportDiary() {
        const config = CONFIGS[STATE.currentRegion];
        const texts = config.uiText;
        let data = null;
        try {
            data = localStorage.getItem(CONSTANTS.DIARY_DATA_KEY);
        } catch (e) {
            console.error("日記データの読み込みに失敗しました:", e);
        }
        const exportString = data ? data : "{}";

        navigator.clipboard.writeText(exportString)
            .then(() => {
                UI.showToast(texts.exportSuccess);
            })
            .catch(err => {
                console.error("データの書き出しに失敗しました:", err);
                UI.showToast(texts.toastCopyError || "コピーに失敗しました。", 'error');
            });
    },

    // 復元用テキストエリアの表示/非表示切り替え
    toggleImportArea() {
        if (!STATE.dom.backupInputWrapper) return;
        const isHidden = STATE.dom.backupInputWrapper.classList.contains(CONSTANTS.CLASS_HIDDEN);
        STATE.dom.backupInputWrapper.classList.toggle(CONSTANTS.CLASS_HIDDEN, !isHidden);
        STATE.dom.backupInputWrapper.hidden = !isHidden;
        STATE.dom.backupInputWrapper.setAttribute('aria-hidden', isHidden ? 'false' : 'true');
        if (isHidden && STATE.dom.diaryBackupData) {
            STATE.dom.diaryBackupData.value = "";
            STATE.dom.diaryBackupData.focus();
        }
    },

    // HTMLエスケープ処理（XSS脆弱性対策）
    sanitizeString(str) {
        if (typeof str !== 'string') return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    },

    // JSONテキストから日記データをインポート（既存記録を保持しながら厳格に検証）
    executeImport() {
        if (!STATE.dom.diaryBackupData) return;
        const config = CONFIGS[STATE.currentRegion];
        const texts = config.uiText;
        const rawData = STATE.dom.diaryBackupData.value.trim();

        if (!rawData) {
            UI.showToast(texts.errorEmptyBackup || "復元するデータが空です。", 'error');
            return;
        }

        try {
            const parsed = JSON.parse(rawData);
            if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
                throw new Error("Invalid root data structure");
            }

            const validatedData = {};
            const defaultPrize = texts.prizeOptions?.[0] || '';
            let validEntryCount = 0;

            // 厳格なスキーマ検証と値のクレンジング (XSS防御)
            for (const [yearStr, monthData] of Object.entries(parsed)) {
                const year = Number(yearStr);
                if (!Number.isInteger(year) || year < 2020 || year > 2100) continue;
                if (typeof monthData !== 'object' || monthData === null || Array.isArray(monthData)) continue;

                for (const [monthStr, weekData] of Object.entries(monthData)) {
                    const month = Number(monthStr);
                    if (!Number.isInteger(month) || month < 1 || month > 12) continue;
                    if (typeof weekData !== 'object' || weekData === null || Array.isArray(weekData)) continue;

                    for (const [weekStr, valueObj] of Object.entries(weekData)) {
                        const week = Number(weekStr);
                        if (!Number.isInteger(week) || week < 1 || week > 5) continue;
                        if (typeof valueObj !== 'object' || valueObj === null || Array.isArray(valueObj)) continue;

                        const rawPoints = valueObj.points ?? '';
                        const points = DIARY_PURE.normalizePointsValue(rawPoints);
                        if (points === null) {
                            throw new Error("Invalid points value");
                        }

                        const rawPrize = String(valueObj.prize ?? '').trim();
                        const prize = this.sanitizeString(rawPrize);
                        const entry = { points, prize };
                        if (!DIARY_PURE.hasMeaningfulEntry(entry, defaultPrize)) continue;

                        if (!validatedData[year]) validatedData[year] = {};
                        if (!validatedData[year][month]) validatedData[year][month] = {};
                        validatedData[year][month][week] = entry;
                        validEntryCount++;
                    }
                }
            }

            // 空オブジェクトや日記と無関係なJSONで既存データを消さない。
            if (validEntryCount === 0) {
                throw new Error("No valid diary entries");
            }

            const existingData = this.loadDiaryData();
            const mergedData = JSON.parse(JSON.stringify(existingData));
            for (const [year, monthData] of Object.entries(validatedData)) {
                if (!mergedData[year]) mergedData[year] = {};
                for (const [month, weekData] of Object.entries(monthData)) {
                    if (!mergedData[year][month]) mergedData[year][month] = {};
                    Object.assign(mergedData[year][month], weekData);
                }
            }

            if (!this.saveDiaryData(mergedData)) return;
            this.renderDiary();
            if (STATE.dom.backupInputWrapper) {
                STATE.dom.backupInputWrapper.classList.add(CONSTANTS.CLASS_HIDDEN);
                STATE.dom.backupInputWrapper.hidden = true;
                STATE.dom.backupInputWrapper.setAttribute('aria-hidden', 'true');
            }
            STATE.dom.diaryBackupData.value = "";
            UI.showToast(texts.importSuccess);
            if (STATE.dom.importDiaryBtn) {
                STATE.dom.importDiaryBtn.focus();
            }
        } catch (e) {
            console.error("データの読み込みに失敗しました:", e);
            UI.showToast(texts.importError, 'error');
        }
    }
};

if (typeof window !== 'undefined' && window.__TEST_ENV__) {
    window.PP_APP = window.PP_APP || {};
    window.PP_APP.DIARY = DIARY;
    window.PP_APP.DIARY_PURE = DIARY_PURE;
}
