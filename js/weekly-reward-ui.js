'use strict';

(() => {
    const COPY = {
        ja: {
            monthsToggle: '月を選ぶ', currentWeek: '今週のリワード', thisMonth: '今月の記録',
            edit: '編集', close: '閉じる', input: '入力', noRecord: '未記録',
            autoSave: '変更は自動保存されます', saved: '自動保存済み',
            yearDetails: '年間の記録を見る', toolsDetails: '通知・バックアップ', recordedWeeks: '週記録', points: 'pt'
        },
        en: {
            monthsToggle: 'Choose month', currentWeek: 'This week’s reward', thisMonth: 'This month',
            edit: 'Edit', close: 'Close', input: 'Enter', noRecord: 'Not recorded',
            autoSave: 'Changes are saved automatically', saved: 'Auto-saved',
            yearDetails: 'View yearly records', toolsDetails: 'Reminders & backup', recordedWeeks: 'weeks recorded', points: 'pt'
        },
        ko: {
            monthsToggle: '월 선택', currentWeek: '이번 주 리워드', thisMonth: '이번 달 기록',
            edit: '수정', close: '닫기', input: '입력', noRecord: '미기록',
            autoSave: '변경 내용은 자동으로 저장됩니다', saved: '자동 저장됨',
            yearDetails: '연간 기록 보기', toolsDetails: '알림·백업', recordedWeeks: '주 기록', points: 'pt'
        },
        zh: {
            monthsToggle: '選擇月份', currentWeek: '本週獎勵', thisMonth: '本月記錄',
            edit: '編輯', close: '關閉', input: '輸入', noRecord: '尚未記錄',
            autoSave: '變更會自動儲存', saved: '已自動儲存',
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
#diaryMode .is-weekly-current .diary-save-btn,#diaryMode .is-weekly-compact .diary-save-btn{display:none}#diaryMode .is-weekly-current .diary-btn-group{justify-content:flex-end;min-height:34px}#diaryMode .is-weekly-current .diary-x-share-btn{flex:0 0 auto;min-width:42px;min-height:38px;padding:.35em .75em}
.weekly-autosave-hint{grid-area:hint;margin:0;color:#4b5563;font-size:.78em;text-align:left}
#diaryMode .week-row.is-weekly-compact{display:block;padding:0;overflow:hidden}.weekly-compact-summary{display:flex;align-items:center;justify-content:space-between;gap:.7em;min-height:50px;padding:.55em .7em .55em .9em}.weekly-compact-main{display:flex;min-width:0;align-items:baseline;gap:.75em;text-align:left}.weekly-compact-main strong{flex:0 0 auto;color:var(--text-color)}.weekly-compact-main span{min-width:0;color:var(--link-color);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.weekly-edit-toggle{flex:0 0 auto;min-height:36px;margin:0;padding:.35em .75em;border:1px solid rgba(11,87,208,.22);border-radius:7px;background:rgba(11,87,208,.06);color:var(--link-hover-color);box-shadow:none;font-size:.82em}.weekly-edit-toggle:hover:not(:disabled){background:rgba(11,87,208,.11)}
#diaryMode .is-weekly-compact>label,#diaryMode .is-weekly-compact>input,#diaryMode .is-weekly-compact>select,#diaryMode .is-weekly-compact>.diary-btn-group{display:none}#diaryMode .is-weekly-compact.is-weekly-expanded{padding:.8em}#diaryMode .is-weekly-compact.is-weekly-expanded .weekly-compact-summary{margin:-.8em -.8em .7em;border-bottom:1px solid var(--weekly-border,rgba(11,87,208,.16))}
#diaryMode .is-weekly-compact.is-weekly-expanded>label,#diaryMode .is-weekly-compact.is-weekly-expanded>input,#diaryMode .is-weekly-compact.is-weekly-expanded>select,#diaryMode .is-weekly-compact.is-weekly-expanded>.diary-btn-group{display:block}#diaryMode .is-weekly-compact.is-weekly-expanded>label{margin:0 0 .45em;text-align:left}#diaryMode .is-weekly-compact.is-weekly-expanded>.diary-btn-group{display:flex;justify-content:flex-end;margin-top:.65em}#diaryMode .is-weekly-compact.is-weekly-future .weekly-compact-main span{opacity:.72}
#diaryMode .diary-summary.weekly-summary-strip{grid-template-columns:repeat(2,minmax(0,1fr));gap:.55em;margin:.85em 0}#diaryMode .weekly-summary-strip .summary-box{padding:.8em;border-radius:10px;box-shadow:none}#diaryMode .weekly-summary-strip .summary-box h4{margin-bottom:.55em;padding-bottom:.35em;font-size:.9em}#diaryMode .weekly-summary-strip .summary-box dl{gap:.25em .55em;font-size:.84em}#diaryMode .weekly-summary-strip .summary-box dd{font-size:1.08em}.weekly-recorded-count{margin:.45em 0 0;color:var(--link-color);font-size:.75em}
.weekly-secondary-details{margin:.7em 0}.weekly-secondary-details[open]>summary{border-bottom:1px solid var(--weekly-border,rgba(11,87,208,.16))}.weekly-secondary-details .diary-year-chart-section,.weekly-secondary-details .diary-reminder-section,.weekly-secondary-details .diary-backup-section{margin:0;border:0;border-radius:0;box-shadow:none}.weekly-secondary-details .diary-year-chart-section{padding:.9em;background:transparent}.weekly-tools-details .diary-reminder-section,.weekly-tools-details .diary-backup-section{padding:.95em}#diaryMode .guest-notice{margin:.7em 0;padding:.72em .85em;font-size:.78em}
@media(max-width:480px){.weekly-month-picker .month-selector{grid-template-columns:repeat(4,minmax(0,1fr))}#diaryMode .week-row.is-weekly-current{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}#diaryMode .diary-summary.weekly-summary-strip{grid-template-columns:repeat(2,minmax(0,1fr))}#diaryMode .weekly-summary-strip .summary-box{min-width:0;padding:.68em}.weekly-compact-main{gap:.55em}}
@media(max-width:360px){#diaryMode .week-row.is-weekly-current{grid-template-columns:1fr;grid-template-areas:"current" "label" "points" "prize" "share" "hint"}#diaryMode .diary-summary.weekly-summary-strip{grid-template-columns:1fr}}
@media(prefers-reduced-motion:reduce){.weekly-month-picker>summary::after,.weekly-secondary-details>summary::after{transition:none}}
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

    function ensureAutoSaveHint(row, isCurrent) {
        if (!isCurrent) return;
        let hint = row.querySelector('.weekly-autosave-hint');
        if (!hint) {
            hint = document.createElement('p');
            hint.className = 'weekly-autosave-hint';
            hint.setAttribute('aria-live', 'polite');
            const group = row.querySelector('.diary-btn-group');
            (group || row).insertAdjacentElement('afterend', hint);
        }
        hint.textContent = copy.autoSave;

        const input = row.querySelector('input[type="number"]');
        const select = row.querySelector('select');
        const markSaved = () => {
            window.setTimeout(() => {
                hint.textContent = copy.saved;
                window.setTimeout(() => { hint.textContent = copy.autoSave; }, 1600);
            }, 0);
        };
        if (input && !input.dataset.weeklyUiBound) {
            input.dataset.weeklyUiBound = 'true';
            input.addEventListener('blur', markSaved);
        }
        if (select && !select.dataset.weeklyUiBound) {
            select.dataset.weeklyUiBound = 'true';
            select.addEventListener('change', markSaved);
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
                ensureAutoSaveHint(row, true);
            } else {
                row.classList.remove('is-weekly-expanded');
                makeCompactSummary(row, rowDate, isFuture);
            }
        });

        if (currentRow && container.firstElementChild !== currentRow) {
            container.insertBefore(currentRow, container.firstElementChild);
        }
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

    function observeDiary() {
        const weekInputs = document.getElementById('weekInputs');
        if (!weekInputs) return;
        const observer = new MutationObserver(queueDecorate);
        observer.observe(weekInputs, { childList: true });
    }

    function init() {
        ensureStyles();
        bindDiaryTab();
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
