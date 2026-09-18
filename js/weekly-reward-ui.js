'use strict';

(() => {
    const COPY = {
        ja: {
            monthsToggle: '月を選ぶ', currentWeek: '今週のリワード', thisMonth: '今月の記録',
            edit: '編集', close: '閉じる', input: '入力', noRecord: '未記録',
            confirmHint: '数字と景品を確認して「決定」を押すと記録されます',
            achievement: '記録できた！', weekGain: '今週', yearTotal: '今年ここまで', chartLabel: '月別の積み上がり',
            yearDetails: '年間の記録を見る', toolsDetails: '通知・バックアップ', recordedWeeks: '週記録', points: 'pt'
        },
        en: {
            monthsToggle: 'Choose month', currentWeek: 'This week’s reward', thisMonth: 'This month',
            edit: 'Edit', close: 'Close', input: 'Enter', noRecord: 'Not recorded',
            confirmHint: 'Enter the result, then press Confirm to add it to your record',
            achievement: 'Recorded!', weekGain: 'This week', yearTotal: 'Year to date', chartLabel: 'Monthly progress',
            yearDetails: 'View yearly records', toolsDetails: 'Reminders & backup', recordedWeeks: 'weeks recorded', points: 'pt'
        },
        ko: {
            monthsToggle: '월 선택', currentWeek: '이번 주 리워드', thisMonth: '이번 달 기록',
            edit: '수정', close: '닫기', input: '입력', noRecord: '미기록',
            confirmHint: '숫자와 리워드를 확인한 뒤 ‘확정’을 누르면 기록됩니다',
            achievement: '기록 완료!', weekGain: '이번 주', yearTotal: '올해 누적', chartLabel: '월별 누적',
            yearDetails: '연간 기록 보기', toolsDetails: '알림·백업', recordedWeeks: '주 기록', points: 'pt'
        },
        zh: {
            monthsToggle: '選擇月份', currentWeek: '本週獎勵', thisMonth: '本月記錄',
            edit: '編輯', close: '關閉', input: '輸入', noRecord: '尚未記錄',
            confirmHint: '確認點數與獎品後，按「確定」才會寫入記錄',
            achievement: '記錄完成！', weekGain: '本週', yearTotal: '今年累計', chartLabel: '每月累積',
            yearDetails: '查看年度記錄', toolsDetails: '提醒與備份', recordedWeeks: '週已記錄', points: 'pt'
        }
    };

    const STYLE_TEXT = `
#tab-diary::before{content:"🎁";display:inline-block;margin-right:.35em}
#diaryMode.weekly-ui-ready{--weekly-accent:#0b57d0;--weekly-soft:rgba(11,87,208,.06);--weekly-border:rgba(11,87,208,.16)}
#diaryMode .diary-header{margin:1.05em 0 .75em}#diaryMode .diary-header h2{font-size:1.45em}
.weekly-month-picker,.weekly-secondary-details{border:1px solid var(--weekly-border,rgba(11,87,208,.16));border-radius:10px;background:var(--section-bg-color);overflow:hidden}
.weekly-month-picker{margin:0 0 .8em}
.weekly-month-picker>summary,.weekly-secondary-details>summary{list-style:none;display:flex;align-items:center;justify-content:space-between;min-height:44px;padding:.72em .95em;color:var(--link-hover-color);font-weight:700;cursor:pointer;box-sizing:border-box}
.weekly-month-picker>summary::-webkit-details-marker,.weekly-secondary-details>summary::-webkit-details-marker{display:none}
.weekly-month-picker>summary::after,.weekly-secondary-details>summary::after{content:"⌄";font-size:1.1em;transition:transform .16s ease}
.weekly-month-picker[open]>summary::after,.weekly-secondary-details[open]>summary::after{transform:rotate(180deg)}
.weekly-month-picker .month-selector{grid-template-columns:repeat(4,minmax(0,1fr));gap:.45em;margin:0;padding:0 .8em .8em}.weekly-month-picker .month-selector button{padding:.62em .2em;min-height:42px}
#diaryMode .diary-input-area{padding:0;margin-bottom:.9em;border:0;background:transparent}#diaryMode .diary-input-area>#selectedMonth{margin:0 0 .35em;color:var(--link-color);font-size:.9em;font-weight:700;text-align:left}
.weekly-month-section-title{margin:0 0 .65em;font-size:.92em;font-weight:800;color:var(--text-color);text-align:left}#diaryMode .week-inputs{gap:.55em}
#diaryMode .week-row{border:1px solid var(--weekly-border,rgba(11,87,208,.16));border-radius:10px;padding:.8em;background:var(--section-bg-color)}
#diaryMode .week-row.is-weekly-current{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);grid-template-areas:"current current" "label label" "points prize" "share share" "hint hint";gap:.7em;padding:.95em;border:1.5px solid rgba(11,87,208,.3);background:linear-gradient(180deg,rgba(11,87,208,.065),var(--section-bg-color));box-shadow:0 7px 20px rgba(11,87,208,.08)}
#diaryMode .is-weekly-current .weekly-current-label{grid-area:current;text-align:left;font-size:1.05em;font-weight:800;color:var(--text-color)}#diaryMode .is-weekly-current>label{grid-area:label;margin:0;color:var(--link-color);font-size:.82em;text-align:left}
#diaryMode .is-weekly-current>input{grid-area:points}#diaryMode .is-weekly-current>select{grid-area:prize}#diaryMode .is-weekly-current>.diary-btn-group{grid-area:share}
#diaryMode .is-weekly-current .diary-btn-group{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.55em;min-height:44px}
#diaryMode .is-weekly-current .diary-save-btn{display:inline-flex;align-items:center;justify-content:center;min-height:44px;margin:0;background:#1e8e3e;color:#fff;border-color:#1e8e3e;font-weight:800}
#diaryMode .is-weekly-current .diary-x-share-btn{flex:0 0 auto;min-width:44px;min-height:44px;padding:.35em .8em}
.weekly-confirm-hint{grid-area:hint;margin:0;color:#4b5563;font-size:.78em;text-align:left}
.weekly-achievement-panel{width:100%;box-sizing:border-box;margin:.05em 0 .15em;padding:1em;border:1px solid rgba(11,87,208,.2);border-radius:12px;background:linear-gradient(180deg,rgba(11,87,208,.08),rgba(11,87,208,.025));text-align:left;overflow:hidden}
.weekly-achievement-panel[hidden]{display:none}
.weekly-achievement-kicker{margin:0 0 .7em;font-size:.92em;font-weight:900;color:var(--text-color)}
.weekly-achievement-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.55em}
.weekly-achievement-metric{min-width:0;padding:.7em .75em;border:1px solid rgba(11,87,208,.12);border-radius:10px;background:var(--section-bg-color)}
.weekly-achievement-metric span{display:block;margin-bottom:.15em;color:#4b5563;font-size:.72em;font-weight:700}
.weekly-achievement-metric strong{display:block;color:var(--text-color);font-size:1.2em;line-height:1.25;overflow-wrap:anywhere}
.weekly-mini-chart-title{margin:.8em 0 .4em;color:#4b5563;font-size:.72em;font-weight:700}
.weekly-mini-chart{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));align-items:end;gap:3px;height:74px}
.weekly-mini-bar{display:flex;align-items:flex-end;height:100%;min-width:0;border-radius:3px;background:rgba(11,87,208,.07);overflow:hidden}
.weekly-mini-bar-fill{display:block;width:100%;height:var(--weekly-bar,2%);min-height:2px;border-radius:3px 3px 0 0;background:#0b57d0;transform-origin:bottom}
.weekly-achievement-panel.is-celebrating{animation:weekly-achievement-pop .42s cubic-bezier(.2,.8,.2,1)}
.weekly-achievement-panel.is-celebrating .weekly-mini-bar-fill{animation:weekly-bar-grow .55s cubic-bezier(.2,.8,.2,1)}
@keyframes weekly-achievement-pop{0%{opacity:0;transform:translateY(-8px) scale(.985)}100%{opacity:1;transform:none}}
@keyframes weekly-bar-grow{0%{transform:scaleY(0)}100%{transform:scaleY(1)}}
#diaryMode .week-row.is-weekly-compact{display:block;padding:0;overflow:hidden}.weekly-compact-summary{display:flex;align-items:center;justify-content:space-between;gap:.7em;min-height:50px;padding:.55em .7em .55em .9em}.weekly-compact-main{display:flex;min-width:0;align-items:baseline;gap:.75em;text-align:left}.weekly-compact-main strong{flex:0 0 auto;color:var(--text-color)}.weekly-compact-main span{min-width:0;color:var(--link-color);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.weekly-edit-toggle{flex:0 0 auto;min-height:36px;margin:0;padding:.35em .75em;border:1px solid rgba(11,87,208,.22);border-radius:7px;background:rgba(11,87,208,.06);color:var(--link-hover-color);box-shadow:none;font-size:.82em}.weekly-edit-toggle:hover:not(:disabled){background:rgba(11,87,208,.11)}
#diaryMode .is-weekly-compact>label,#diaryMode .is-weekly-compact>input,#diaryMode .is-weekly-compact>select,#diaryMode .is-weekly-compact>.diary-btn-group{display:none}#diaryMode .is-weekly-compact.is-weekly-expanded{padding:.8em}#diaryMode .is-weekly-compact.is-weekly-expanded .weekly-compact-summary{margin:-.8em -.8em .7em;border-bottom:1px solid var(--weekly-border,rgba(11,87,208,.16))}
#diaryMode .is-weekly-compact.is-weekly-expanded>label,#diaryMode .is-weekly-compact.is-weekly-expanded>input,#diaryMode .is-weekly-compact.is-weekly-expanded>select,#diaryMode .is-weekly-compact.is-weekly-expanded>.diary-btn-group{display:block}#diaryMode .is-weekly-compact.is-weekly-expanded>label{margin:0 0 .45em;text-align:left}#diaryMode .is-weekly-compact.is-weekly-expanded>.diary-btn-group{display:flex;justify-content:flex-end;margin-top:.65em}#diaryMode .is-weekly-compact.is-weekly-future .weekly-compact-main span{opacity:.72}
#diaryMode .diary-summary.weekly-summary-strip{grid-template-columns:repeat(2,minmax(0,1fr));gap:.55em;margin:.85em 0}#diaryMode .weekly-summary-strip .summary-box{padding:.8em;border-radius:10px;box-shadow:none}#diaryMode .weekly-summary-strip .summary-box h4{margin-bottom:.55em;padding-bottom:.35em;font-size:.9em}#diaryMode .weekly-summary-strip .summary-box dl{gap:.25em .55em;font-size:.84em}#diaryMode .weekly-summary-strip .summary-box dd{font-size:1.08em}.weekly-recorded-count{margin:.45em 0 0;color:var(--link-color);font-size:.75em}
.weekly-secondary-details{margin:.7em 0}.weekly-secondary-details[open]>summary{border-bottom:1px solid var(--weekly-border,rgba(11,87,208,.16))}.weekly-secondary-details .diary-year-chart-section,.weekly-secondary-details .diary-reminder-section,.weekly-secondary-details .diary-backup-section{margin:0;border:0;border-radius:0;box-shadow:none}.weekly-secondary-details .diary-year-chart-section{padding:.9em;background:transparent}.weekly-tools-details .diary-reminder-section,.weekly-tools-details .diary-backup-section{padding:.95em}#diaryMode .guest-notice{margin:.7em 0;padding:.72em .85em;font-size:.78em}
@media(max-width:480px){.weekly-month-picker .month-selector{grid-template-columns:repeat(4,minmax(0,1fr))}#diaryMode .week-row.is-weekly-current{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}#diaryMode .diary-summary.weekly-summary-strip{grid-template-columns:repeat(2,minmax(0,1fr))}#diaryMode .weekly-summary-strip .summary-box{min-width:0;padding:.68em}.weekly-compact-main{gap:.55em}}
@media(max-width:360px){#diaryMode .week-row.is-weekly-current{grid-template-columns:1fr;grid-template-areas:"current" "label" "points" "prize" "share" "hint"}#diaryMode .diary-summary.weekly-summary-strip{grid-template-columns:1fr}}
@media(prefers-reduced-motion:reduce){.weekly-month-picker>summary::after,.weekly-secondary-details>summary::after{transition:none}.weekly-achievement-panel.is-celebrating,.weekly-achievement-panel.is-celebrating .weekly-mini-bar-fill{animation:none}}
`;

    const languageKey = (() => {
        const lang = (document.documentElement.lang || 'ja').toLowerCase();
        if (lang.startsWith('ko')) return 'ko';
        if (lang.startsWith('zh')) return 'zh';
        if (lang.startsWith('en')) return 'en';
        return 'ja';
    })();
    const copy = COPY[languageKey];
    let decorateQueued = false;

    function ensureStyles() {
        if (document.querySelector('style[data-weekly-reward-ui]')) return;
        const style = document.createElement('style');
        style.dataset.weeklyRewardUi = 'true';
        style.textContent = STYLE_TEXT;
        document.head.appendChild(style);
    }

    function getCurrentFriday(now = new Date()) {
        const friday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
        friday.setDate(friday.getDate() - (friday.getDay() + 2) % 7);
        return friday;
    }

    function getDisplayedYear() {
        const text = document.getElementById('currentYear')?.textContent || '';
        const match = text.match(/(20\d{2})/);
        return match ? Number(match[1]) : null;
    }

    function getSelectedMonth() {
        const active = document.querySelector('#monthSelector button.active');
        return active ? Number(active.dataset.month) : null;
    }

    function parseRowDate(row, fallbackYear) {
        const label = row.querySelector('label')?.textContent || '';
        const match = label.match(/\((\d{1,2})\/(\d{1,2})\)/);
        if (!match || !fallbackYear) return null;
        return new Date(fallbackYear, Number(match[1]) - 1, Number(match[2]), 12);
    }

    function isSameDate(a, b) {
        return Boolean(a && b)
            && a.getFullYear() === b.getFullYear()
            && a.getMonth() === b.getMonth()
            && a.getDate() === b.getDate();
    }

    function createDetails(className, summaryText) {
        const details = document.createElement('details');
        details.className = className;
        const summary = document.createElement('summary');
        summary.textContent = summaryText;
        details.appendChild(summary);
        return details;
    }

    function wrapMonthSelector() {
        const selector = document.getElementById('monthSelector');
        if (!selector || selector.closest('.weekly-month-picker')) return;
        const details = createDetails('weekly-month-picker', copy.monthsToggle);
        selector.parentNode.insertBefore(details, selector);
        details.appendChild(selector);
    }

    function wrapYearChart() {
        const section = document.querySelector('.diary-year-chart-section');
        if (!section || section.closest('.weekly-secondary-details')) return;
        const details = createDetails('weekly-secondary-details weekly-year-details', copy.yearDetails);
        section.parentNode.insertBefore(details, section);
        details.appendChild(section);
    }

    function wrapTools() {
        const reminder = document.querySelector('.diary-reminder-section');
        const backup = document.querySelector('.diary-backup-section');
        if (!reminder || !backup || reminder.closest('.weekly-secondary-details')) return;
        const details = createDetails('weekly-secondary-details weekly-tools-details', copy.toolsDetails);
        reminder.parentNode.insertBefore(details, reminder);
        details.append(reminder, backup);
    }

    function ensureMonthlyHeading() {
        const inputArea = document.querySelector('.diary-input-area');
        if (!inputArea) return;
        let heading = inputArea.querySelector('.weekly-month-section-title');
        if (!heading) {
            heading = document.createElement('div');
            heading.className = 'weekly-month-section-title';
            heading.textContent = copy.thisMonth;
            inputArea.insertBefore(heading, document.getElementById('selectedMonth')?.nextSibling || inputArea.firstChild);
        }
    }

    function makeCompactSummary(row, rowDate, isFuture) {
        let compact = row.querySelector('.weekly-compact-summary');
        if (!compact) {
            compact = document.createElement('div');
            compact.className = 'weekly-compact-summary';
            row.insertBefore(compact, row.firstChild);
        }

        const input = row.querySelector('input[type="number"]');
        const select = row.querySelector('select');
        const points = input?.value?.trim() || '';
        const prize = select?.value?.trim() || '';
        const defaultPrize = select?.options?.[0]?.value || '';
        const hasPrize = prize && prize !== defaultPrize;
        const dateText = rowDate
            ? `${rowDate.getMonth() + 1}/${rowDate.getDate()}`
            : (row.querySelector('label')?.textContent || '').replace(/^.*?(\d+\/\d+).*$/, '$1');
        const valueText = points
            ? `${Number(points).toLocaleString()} ${copy.points}${hasPrize ? ` · ${prize}` : ''}`
            : (hasPrize ? prize : copy.noRecord);

        compact.innerHTML = '';
        const main = document.createElement('span');
        main.className = 'weekly-compact-main';
        const date = document.createElement('strong');
        date.textContent = dateText;
        const value = document.createElement('span');
        value.textContent = valueText;
        main.append(date, value);

        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'weekly-edit-toggle';
        toggle.textContent = row.classList.contains('is-weekly-expanded')
            ? copy.close
            : (isFuture && !points && !hasPrize ? copy.input : copy.edit);
        toggle.setAttribute('aria-expanded', row.classList.contains('is-weekly-expanded') ? 'true' : 'false');
        toggle.addEventListener('click', () => {
            const expanded = row.classList.toggle('is-weekly-expanded');
            toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
            toggle.textContent = expanded ? copy.close : (isFuture && !points && !hasPrize ? copy.input : copy.edit);
            if (expanded) input?.focus({ preventScroll: true });
        });
        compact.append(main, toggle);
    }

    function ensureConfirmHint(row, isCurrent) {
        if (!isCurrent) return;
        let hint = row.querySelector('.weekly-confirm-hint');
        if (!hint) {
            hint = document.createElement('p');
            hint.className = 'weekly-confirm-hint';
            const group = row.querySelector('.diary-btn-group');
            (group || row).insertAdjacentElement('afterend', hint);
        }
        hint.textContent = copy.confirmHint;
    }

    function ensureAchievementPanel(currentRow) {
        if (!currentRow) return null;
        let panel = document.querySelector('#weekInputs .weekly-achievement-panel');
        if (!panel) {
            panel = document.createElement('section');
            panel.className = 'weekly-achievement-panel';
            panel.hidden = true;
            panel.setAttribute('aria-live', 'polite');
        }
        if (panel.previousElementSibling !== currentRow) {
            currentRow.insertAdjacentElement('afterend', panel);
        }
        return panel;
    }

    function readYearlyBars() {
        const items = [...document.querySelectorAll('#diary-year-chart .diary-chart-item')];
        const totals = items.map(item => {
            const raw = (item.querySelector('.diary-chart-value')?.textContent || '').replace(/[^0-9.-]/g, '');
            const value = Number(raw);
            return Number.isFinite(value) && value >= 0 ? value : 0;
        });
        while (totals.length < 12) totals.push(0);
        return totals.slice(0, 12);
    }

    function renderAchievementPanel(animate = false) {
        const currentRow = document.querySelector('#weekInputs .week-row.is-weekly-current');
        if (!currentRow) return;
        const panel = ensureAchievementPanel(currentRow);
        const input = currentRow.querySelector('input[type="number"]');
        const rawPoints = input?.value?.trim() || '';
        if (!rawPoints) {
            panel.hidden = true;
            panel.classList.remove('is-celebrating');
            return;
        }

        const weekPoints = Number(rawPoints);
        const yearlyText = document.getElementById('yearlyTotal')?.textContent?.trim() || '0';
        const totals = readYearlyBars();
        const max = Math.max(1, ...totals);

        panel.innerHTML = '';
        const kicker = document.createElement('p');
        kicker.className = 'weekly-achievement-kicker';
        kicker.textContent = '🎉 ' + copy.achievement;

        const metrics = document.createElement('div');
        metrics.className = 'weekly-achievement-metrics';
        const weekMetric = document.createElement('div');
        weekMetric.className = 'weekly-achievement-metric';
        const weekLabel = document.createElement('span');
        weekLabel.textContent = copy.weekGain;
        const weekValue = document.createElement('strong');
        weekValue.textContent = '+' + (Number.isFinite(weekPoints) ? weekPoints.toLocaleString() : '0') + ' ' + copy.points;
        weekMetric.append(weekLabel, weekValue);

        const yearMetric = document.createElement('div');
        yearMetric.className = 'weekly-achievement-metric';
        const yearLabel = document.createElement('span');
        yearLabel.textContent = copy.yearTotal;
        const yearValue = document.createElement('strong');
        yearValue.textContent = yearlyText + ' ' + copy.points;
        yearMetric.append(yearLabel, yearValue);
        metrics.append(weekMetric, yearMetric);

        const chartTitle = document.createElement('p');
        chartTitle.className = 'weekly-mini-chart-title';
        chartTitle.textContent = copy.chartLabel;
        const chart = document.createElement('div');
        chart.className = 'weekly-mini-chart';
        chart.setAttribute('role', 'img');
        chart.setAttribute('aria-label', copy.chartLabel + ': ' + yearlyText + ' ' + copy.points);
        totals.forEach((total) => {
            const bar = document.createElement('span');
            bar.className = 'weekly-mini-bar';
            const fill = document.createElement('span');
            fill.className = 'weekly-mini-bar-fill';
            fill.style.setProperty('--weekly-bar', Math.max(2, Math.round((total / max) * 100)) + '%');
            bar.appendChild(fill);
            chart.appendChild(bar);
        });

        panel.append(kicker, metrics, chartTitle, chart);
        panel.hidden = false;
        panel.classList.remove('is-celebrating');
        if (animate) {
            void panel.offsetWidth;
            panel.classList.add('is-celebrating');
        }
    }

    function decorateRows() {
        const container = document.getElementById('weekInputs');
        if (!container) return;
        const rows = [...container.querySelectorAll('.week-row')];
        if (!rows.length) return;

        const displayedYear = getDisplayedYear();
        const currentFriday = getCurrentFriday();
        const selectedMonth = getSelectedMonth();
        const isCurrentMonth = displayedYear === currentFriday.getFullYear()
            && selectedMonth === currentFriday.getMonth() + 1;
        let currentRow = null;

        rows.forEach((row) => {
            const rowDate = parseRowDate(row, displayedYear);
            const isCurrent = isCurrentMonth && isSameDate(rowDate, currentFriday);
            const isFuture = Boolean(rowDate && rowDate > currentFriday);
            row.classList.toggle('is-weekly-current', isCurrent);
            row.classList.toggle('is-weekly-compact', !isCurrent);
            row.classList.toggle('is-weekly-future', isFuture);
            if (isCurrent) {
                currentRow = row;
                row.classList.add('is-weekly-expanded');
                let title = row.querySelector('.weekly-current-label');
                if (!title) {
                    title = document.createElement('div');
                    title.className = 'weekly-current-label';
                    title.textContent = `🎁 ${copy.currentWeek}`;
                    row.insertBefore(title, row.firstChild);
                }
                ensureConfirmHint(row, true);
            } else {
                row.classList.remove('is-weekly-expanded');
                makeCompactSummary(row, rowDate, isFuture);
            }
        });

        if (currentRow && container.firstElementChild !== currentRow) {
            container.insertBefore(currentRow, container.firstElementChild);
        }
        if (currentRow) renderAchievementPanel(false);
    }

    function decorateSummary() {
        const summary = document.querySelector('.diary-summary');
        const monthlyBox = summary?.querySelector('.summary-box:first-child');
        if (!summary || !monthlyBox) return;
        summary.classList.add('weekly-summary-strip');
        let count = monthlyBox.querySelector('.weekly-recorded-count');
        if (!count) {
            count = document.createElement('p');
            count.className = 'weekly-recorded-count';
            monthlyBox.appendChild(count);
        }
        const totalWeeks = document.querySelectorAll('#weekInputs .week-row').length;
        const recorded = [...document.querySelectorAll('#weekInputs input[type="number"]')]
            .filter((input) => input.value.trim() !== '').length;
        count.textContent = `${recorded}/${totalWeeks} ${copy.recordedWeeks}`;
    }

    function decorateDiary() {
        if (!document.getElementById('diaryMode')) return;
        wrapMonthSelector();
        wrapYearChart();
        wrapTools();
        ensureMonthlyHeading();
        decorateRows();
        decorateSummary();
        document.getElementById('diaryMode')?.classList.add('weekly-ui-ready');
    }

    function queueDecorate() {
        if (decorateQueued) return;
        decorateQueued = true;
        window.requestAnimationFrame(() => {
            decorateQueued = false;
            decorateDiary();
        });
    }

    function selectCurrentMonth() {
        const friday = getCurrentFriday();
        const currentYear = getDisplayedYear();
        const monthButton = document.querySelector(`#monthSelector button[data-month="${friday.getMonth() + 1}"]`);
        if (currentYear === friday.getFullYear() && monthButton && !monthButton.classList.contains('active')) {
            monthButton.click();
        }
    }

    function bindDiaryTab() {
        const tab = document.getElementById('tab-diary');
        if (!tab || tab.dataset.weeklyUiBound) return;
        tab.dataset.weeklyUiBound = 'true';
        tab.addEventListener('click', () => {
            window.setTimeout(() => {
                selectCurrentMonth();
                queueDecorate();
            }, 0);
        });
    }

    function bindSavedFeedback() {
        document.addEventListener('playpoint:diary-saved', () => {
            window.setTimeout(() => {
                decorateSummary();
                renderAchievementPanel(true);
            }, 0);
        });
    }

    function observeDiary() {
        const weekInputs = document.getElementById('weekInputs');
        if (!weekInputs) return;
        const observer = new MutationObserver(queueDecorate);
        observer.observe(weekInputs, { childList: true });
    }

    function init() {
        ensureStyles();
        bindDiaryTab();
        bindSavedFeedback();
        observeDiary();
        selectCurrentMonth();
        queueDecorate();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
