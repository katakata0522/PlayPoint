'use strict';

import { CONFIGS, STATE, CONSTANTS, ANALYTICS } from './config.js';
import { UI } from './ui.js';
import { SHARE } from './share.js';

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

const WEEKLY_EXPERIENCE_COPY = Object.freeze({
    JP: Object.freeze({
        hint: '数字と景品を確認して「結果を記録」を押すと記録されます',
        largeValueHint: '本当に…？（このままの値でも記録に残せます）',
        weekGain: '今週',
        yearTotal: (year) => `${year}年累計`,
        chartLabel: '月別ポイント',
        shareAria: 'この週の結果をXで共有',
        shareText: 'Xで共有',
        saved: '記録済み ✓',
        edit: '編集',
        unsaved: '未保存の変更',
        saveChanges: '変更を保存',
        yearBest: '今年いちばん✨',
        nextReward: '次のウィークリー',
        calendarCta: 'Googleカレンダーに登録'
    }),
    US: Object.freeze({
        hint: 'Enter the result, then press Record result to add it to your record',
        largeValueHint: 'Really…? (You can still record this value as entered.)',
        weekGain: 'This week',
        yearTotal: (year) => `${year} total`,
        chartLabel: 'Monthly points',
        shareAria: 'Share this week’s result on X',
        shareText: 'Share on X',
        saved: 'Recorded ✓',
        edit: 'Edit',
        unsaved: 'Unsaved changes',
        saveChanges: 'Save changes',
        yearBest: 'Year best ✨',
        nextReward: 'Next weekly reward',
        calendarCta: 'Add to Google Calendar'
    }),
    IN: Object.freeze({
        hint: 'Enter the result, then press Record result to add it to your record',
        largeValueHint: 'Really…? (You can still record this value as entered.)',
        weekGain: 'This week',
        yearTotal: (year) => `${year} total`,
        chartLabel: 'Monthly points',
        shareAria: 'Share this week’s result on X',
        shareText: 'Share on X',
        saved: 'Recorded ✓',
        edit: 'Edit',
        unsaved: 'Unsaved changes',
        saveChanges: 'Save changes',
        yearBest: 'Year best ✨',
        nextReward: 'Next weekly reward',
        calendarCta: 'Add to Google Calendar'
    }),
    KR: Object.freeze({
        hint: '숫자와 리워드를 확인한 뒤 ‘결과 기록’을 누르면 기록됩니다',
        largeValueHint: '정말…? (이 값 그대로도 기록할 수 있습니다.)',
        weekGain: '이번 주',
        yearTotal: (year) => `${year}년 누적`,
        chartLabel: '월별 포인트',
        shareAria: '이번 주 결과를 X에 공유',
        shareText: 'X에 공유',
        saved: '기록 완료 ✓',
        edit: '수정',
        unsaved: '저장되지 않은 변경',
        saveChanges: '변경 저장',
        yearBest: '올해 최고✨',
        nextReward: '다음 주간 리워드',
        calendarCta: 'Google 캘린더에 등록'
    }),
    TW: Object.freeze({
        hint: '確認點數與獎品後，按「記錄結果」才會寫入記錄',
        largeValueHint: '真的…？（這個數值也可以直接保留並記錄。）',
        weekGain: '本週',
        yearTotal: (year) => `${year}年累計`,
        chartLabel: '每月點數',
        shareAria: '在 X 分享本週結果',
        shareText: '分享到 X',
        saved: '已記錄 ✓',
        edit: '編輯',
        unsaved: '尚未儲存的變更',
        saveChanges: '儲存變更',
        yearBest: '今年最高✨',
        nextReward: '下次每週獎勵',
        calendarCta: '新增至 Google 日曆'
    }),
    HK: Object.freeze({
        hint: '確認點數與獎品後，按「記錄結果」才會寫入記錄',
        largeValueHint: '真的…？（這個數值也可以直接保留並記錄。）',
        weekGain: '本週',
        yearTotal: (year) => `${year}年累計`,
        chartLabel: '每月點數',
        shareAria: '在 X 分享本週結果',
        shareText: '分享到 X',
        saved: '已記錄 ✓',
        edit: '編輯',
        unsaved: '尚未儲存的變更',
        saveChanges: '儲存變更',
        yearBest: '今年最高✨',
        nextReward: '下次每週獎勵',
        calendarCta: '新增至 Google 日曆'
    })
});

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
        return WEEKLY_EXPERIENCE_COPY[STATE.currentRegion] || WEEKLY_EXPERIENCE_COPY.JP;
    },

    ensureWeeklyExperienceStyle() {
        if (document.getElementById(WEEKLY_EXPLICIT_STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = WEEKLY_EXPLICIT_STYLE_ID;
        style.textContent = `
#diaryMode .weekly-autosave-hint{display:none!important}
#diaryMode .diary-input-area>#selectedMonth,#diaryMode .weekly-month-section-title{display:none!important}
#diaryMode .diary-input-area{padding-top:0!important}
#diaryMode .is-weekly-current{grid-template-areas:"current current" "label label" "points prize" "large large" "share share" "hint hint" "achievement achievement"!important}
#diaryMode .is-weekly-current>.weekly-points-field{grid-area:points}
#diaryMode .is-weekly-current>.weekly-large-value-hint{grid-area:large}
#diaryMode .is-weekly-current .diary-btn-group,#diaryMode .is-weekly-compact.is-weekly-expanded .diary-btn-group{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;gap:.55em!important;align-items:center}
#diaryMode .is-weekly-current .diary-save-btn,#diaryMode .is-weekly-compact.is-weekly-expanded .diary-save-btn{display:inline-flex!important;align-items:center;justify-content:center;min-height:44px;margin:0;background:#1e8e3e;color:#fff;border-color:#1e8e3e;font-weight:800}
#diaryMode .is-weekly-current .diary-x-share-btn,#diaryMode .is-weekly-compact.is-weekly-expanded .diary-x-share-btn{min-width:44px;min-height:44px;margin:0}
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
.weekly-mini-chart-title{margin:.9em 0 .45em;color:#52606d;font-size:.75em;font-weight:800}
.weekly-mini-chart{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));align-items:end;gap:3px;min-height:94px;padding:.45em .25em .15em;border-radius:10px;background:linear-gradient(180deg,rgba(88,166,255,.035),rgba(63,185,80,.02))}
.weekly-mini-item{display:grid;grid-template-rows:68px auto;gap:4px;min-width:0;align-items:end}
.weekly-mini-bar{position:relative;display:flex;align-items:flex-end;height:68px;min-width:0;border-radius:5px;background:linear-gradient(180deg,rgba(88,166,255,.08),rgba(11,87,208,.035));overflow:hidden}
.weekly-mini-bar-fill{display:block;width:100%;height:var(--weekly-bar,2%);min-height:2px;border-radius:5px 5px 2px 2px;background:linear-gradient(180deg,#58a6ff 0%,#4285f4 58%,#0b57d0 100%);box-shadow:0 -1px 5px rgba(66,133,244,.22);transform-origin:bottom}
.weekly-mini-item.is-current-month .weekly-mini-bar{background:linear-gradient(180deg,rgba(88,166,255,.14),rgba(63,185,80,.07));box-shadow:inset 0 0 0 1px rgba(63,185,80,.2)}
.weekly-mini-item.is-current-month .weekly-mini-bar-fill{background:linear-gradient(180deg,#58a6ff 0%,#4f9cf9 38%,#3fb950 100%);box-shadow:0 -2px 8px rgba(63,185,80,.32)}
.weekly-mini-bar-label{display:block;min-width:0;color:#7a8694;font-size:clamp(.5rem,2.1vw,.62rem);font-weight:700;line-height:1;text-align:center;white-space:nowrap;overflow:hidden}
.weekly-mini-item.is-current-month .weekly-mini-bar-label{color:#0b57d0;font-weight:900}
.weekly-next-reward{display:flex;align-items:center;justify-content:space-between;gap:.7em;flex-wrap:wrap;margin:.8em 0 0;padding-top:.7em;border-top:1px solid rgba(11,87,208,.12);font-size:.82em;line-height:1.5}
.weekly-next-reward strong{color:var(--text-color);font-weight:900}
.weekly-next-reward a{color:#0b57d0;font-weight:800;text-decoration:none}
.weekly-next-reward a:hover{text-decoration:underline}
.weekly-achievement-panel.is-celebrating{animation:weekly-panel-in .28s ease-out}
.weekly-achievement-panel.is-celebrating .weekly-mini-bar-fill{animation:weekly-bar-grow .62s cubic-bezier(.2,.78,.22,1) both;animation-delay:var(--weekly-delay,0ms)}
.weekly-achievement-panel.is-celebrating .weekly-mini-bar-label{animation:weekly-label-in .3s ease-out both;animation-delay:calc(var(--weekly-delay,0ms) + 260ms)}
.weekly-achievement-panel.is-celebrating .weekly-mini-item.is-current-month .weekly-mini-bar{animation:weekly-current-glow .7s ease-out both;animation-delay:calc(var(--weekly-delay,0ms) + 420ms)}
@keyframes weekly-panel-in{0%{opacity:.45;transform:translateY(-4px)}100%{opacity:1;transform:none}}
@keyframes weekly-bar-grow{0%{transform:scaleY(0)}76%{transform:scaleY(1.045)}100%{transform:scaleY(1)}}
@keyframes weekly-label-in{0%{opacity:0;transform:translateY(3px)}100%{opacity:1;transform:none}}
@keyframes weekly-current-glow{0%{box-shadow:inset 0 0 0 1px rgba(63,185,80,.2)}55%{box-shadow:inset 0 0 0 1px rgba(63,185,80,.4),0 0 12px rgba(63,185,80,.24)}100%{box-shadow:inset 0 0 0 1px rgba(63,185,80,.2)}}
@media(max-width:360px){#diaryMode .is-weekly-current{grid-template-columns:1fr!important;grid-template-areas:"current" "label" "points" "prize" "large" "share" "hint" "achievement"!important}.weekly-achievement-metrics{grid-template-columns:1fr}.weekly-mini-chart{gap:2px;padding-left:.1em;padding-right:.1em}.weekly-mini-bar-label{font-size:.5rem}}
@media(prefers-reduced-motion:reduce){.weekly-achievement-panel.is-celebrating,.weekly-achievement-panel.is-celebrating .weekly-mini-bar-fill,.weekly-achievement-panel.is-celebrating .weekly-mini-bar-label,.weekly-achievement-panel.is-celebrating .weekly-mini-item.is-current-month .weekly-mini-bar{animation:none}}
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

    renderWeeklyAchievement(row, pointsValue, yearlySummary, animate = false) {
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

        const chart = document.createElement('div');
        chart.className = 'weekly-mini-chart';
        chart.setAttribute('role', 'img');
        chart.setAttribute(
            'aria-label',
            copy.chartLabel + ': ' + Number(yearlySummary?.total || 0).toLocaleString(config.lang) + ' ' + texts.pointsUnit
        );
        totals.forEach((total, index) => {
            const item = document.createElement('span');
            item.className = 'weekly-mini-item';
            item.style.setProperty('--weekly-delay', (index * 42) + 'ms');
            if (index + 1 === STATE.diaryState.currentMonth) item.classList.add('is-current-month');

            const bar = document.createElement('span');
            bar.className = 'weekly-mini-bar';
            bar.title = texts.monthNames[index] + ': ' + Number(total).toLocaleString(config.lang) + ' ' + texts.pointsUnit;
            const fill = document.createElement('span');
            fill.className = 'weekly-mini-bar-fill';
            fill.style.setProperty('--weekly-bar', Math.max(2, Math.round((Number(total) / maxValue) * 100)) + '%');
            bar.appendChild(fill);

            const label = document.createElement('span');
            label.className = 'weekly-mini-bar-label';
            label.textContent = texts.monthNames[index];

            item.append(bar, label);
            chart.appendChild(item);
        });

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

        panel.append(metrics, chartTitle, chart, nextReward);
        panel.hidden = false;
        panel.classList.remove('is-celebrating');
        if (animate) {
            void panel.offsetWidth;
            panel.classList.add('is-celebrating');
        }
    },

    decorateExplicitCurrentWeek(row, weekNum, pointsValue, yearData) {
        if (!this.isCurrentDiaryWeek(weekNum)) return;
        this.ensureWeeklyExperienceStyle();
        row.classList.add('is-weekly-current', 'is-weekly-expanded');
        this.ensureWeeklyConfirmHint(row);
        this.renderWeeklyAchievement(row, pointsValue, DIARY_PURE.summarizeYear(yearData), false);
    },

    refreshWeeklyAchievement(weekNum, pointsValue, yearData, animate = false) {
        if (!this.isCurrentDiaryWeek(weekNum)) return;
        const row = STATE.dom.weekInputs?.querySelector('#week' + weekNum + '_points')?.closest('.week-row');
        if (!row) return;
        this.ensureWeeklyExperienceStyle();
        row.classList.add('is-weekly-current', 'is-weekly-expanded');
        this.ensureWeeklyConfirmHint(row);
        this.renderWeeklyAchievement(row, pointsValue, DIARY_PURE.summarizeYear(yearData), animate);
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
                    <button type="button" class="diary-x-share-btn" data-week="${weekNum}">𝕏</button>
                </div>
            `;

            // 明示確定とX共有のイベントハンドラを登録
            const pointsInput = row.querySelector(`#week${weekNum}_points`);
            const prizeSelect = row.querySelector(`#week${weekNum}_prize`);
            const largeValueHint = row.querySelector('.weekly-large-value-hint');
            const shareBtn = row.querySelector(`.diary-x-share-btn[data-week="${weekNum}"]`);
            const weeklyCopy = this.getWeeklyExperienceCopy();

            if (shareBtn) {
                shareBtn.title = weeklyCopy.shareAria;
                shareBtn.setAttribute('aria-label', weeklyCopy.shareAria);
            }
            this.updateLargeValueHint(pointsInput, largeValueHint);
            pointsInput.addEventListener('input', () => this.updateLargeValueHint(pointsInput, largeValueHint));

            // 入力だけでは確定しない。ユーザーが「結果を記録」ボタンを押した時だけ保存する。
            if (shareBtn) {
                shareBtn.addEventListener('click', () => {
                    const currentPoints = pointsInput.value.trim();
                    if (currentPoints === '') {
                        pointsInput.focus({ preventScroll: true });
                        return;
                    }
                    SHARE.shareRewardToX(currentPoints, prizeSelect.value);
                });
            }

            this.decorateExplicitCurrentWeek(row, weekNum, displayPoints, yearData);
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
        this.renderYearChart(yearlySummary.monthlyTotals);
    },

    // 保存済みデータだけを使い、月ごとの比較をDOMでアクセシブルに描画する。
    renderYearChart(monthlyTotals) {
        if (!STATE.dom.diaryYearChart) return;
        const config = CONFIGS[STATE.currentRegion];
        const texts = config.uiText;
        const maxValue = Math.max(1, ...monthlyTotals);
        STATE.dom.diaryYearChart.innerHTML = '';
        STATE.dom.diaryYearChart.setAttribute('aria-label', texts.yearlyChartDescription || '');

        monthlyTotals.forEach((total, index) => {
            const item = document.createElement('div');
            item.className = 'diary-chart-item';
            item.setAttribute('aria-label', `${texts.monthNames[index]}: ${total.toLocaleString(config.lang)} ${texts.pointsUnit}`);

            const value = document.createElement('span');
            value.className = 'diary-chart-value';
            value.textContent = total.toLocaleString(config.lang);

            const track = document.createElement('span');
            track.className = 'diary-chart-track';
            const bar = document.createElement('span');
            bar.className = 'diary-chart-bar';
            bar.style.setProperty('--bar-height', `${Math.round((total / maxValue) * 100)}%`);
            track.appendChild(bar);

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
                this.refreshWeeklyAchievement(weekNum, normalizedPoints, data[yearKey] || {}, true);
                UI.showToast(texts.toastDiarySaveSuccess);
                this.showSaveConfirmation(e.target, texts);
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
            this.refreshWeeklyAchievement(weekNum, normalizedPoints, data[yearKey] || {}, true);
            UI.showToast(texts.toastDiarySaveSuccess);
            document.dispatchEvent(new CustomEvent('playpoint:diary-saved', {
                detail: { region: STATE.currentRegion }
            }));
            this.showSaveConfirmation(e.target, texts);
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
