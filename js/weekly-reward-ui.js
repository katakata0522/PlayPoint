'use strict';

(() => {
    const UI_VERSION = '20260916a';
    const currentScript = document.currentScript;
    const scriptSrc = currentScript?.getAttribute('src') || '';
    const scriptIndex = scriptSrc.indexOf('js/weekly-reward-ui.js');
    const assetPrefix = scriptIndex >= 0 ? scriptSrc.substring(0, scriptIndex) : '/';

    const COPY = {
        ja: {
            monthsToggle: '月を選ぶ',
            currentWeek: '今週のリワード',
            thisMonth: '今月の記録',
            history: 'ほかの週',
            edit: '編集',
            close: '閉じる',
            input: '入力',
            noRecord: '未記録',
            autoSave: '変更は自動保存されます',
            saved: '自動保存済み',
            yearDetails: '年間の記録を見る',
            toolsDetails: '通知・バックアップ',
            recordedWeeks: '週記録',
            points: 'pt'
        },
        en: {
            monthsToggle: 'Choose month',
            currentWeek: 'This week’s reward',
            thisMonth: 'This month',
            history: 'Other weeks',
            edit: 'Edit',
            close: 'Close',
            input: 'Enter',
            noRecord: 'Not recorded',
            autoSave: 'Changes are saved automatically',
            saved: 'Auto-saved',
            yearDetails: 'View yearly records',
            toolsDetails: 'Reminders & backup',
            recordedWeeks: 'weeks recorded',
            points: 'pt'
        },
        ko: {
            monthsToggle: '월 선택',
            currentWeek: '이번 주 리워드',
            thisMonth: '이번 달 기록',
            history: '다른 주',
            edit: '수정',
            close: '닫기',
            input: '입력',
            noRecord: '미기록',
            autoSave: '변경 내용은 자동으로 저장됩니다',
            saved: '자동 저장됨',
            yearDetails: '연간 기록 보기',
            toolsDetails: '알림·백업',
            recordedWeeks: '주 기록',
            points: 'pt'
        },
        zh: {
            monthsToggle: '選擇月份',
            currentWeek: '本週獎勵',
            thisMonth: '本月記錄',
            history: '其他週',
            edit: '編輯',
            close: '關閉',
            input: '輸入',
            noRecord: '尚未記錄',
            autoSave: '變更會自動儲存',
            saved: '已自動儲存',
            yearDetails: '查看年度記錄',
            toolsDetails: '提醒與備份',
            recordedWeeks: '週已記錄',
            points: 'pt'
        }
    };

    const languageKey = (() => {
        const lang = (document.documentElement.lang || 'ja').toLowerCase();
        if (lang.startsWith('ko')) return 'ko';
        if (lang.startsWith('zh')) return 'zh';
        if (lang.startsWith('en')) return 'en';
        return 'ja';
    })();
    const copy = COPY[languageKey];

    let decorateQueued = false;

    function ensureStylesheet() {
        if (document.querySelector('link[data-weekly-reward-ui]')) return;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = `${assetPrefix}weekly-reward-ui.css?v=${UI_VERSION}`;
        link.dataset.weeklyRewardUi = UI_VERSION;
        document.head.appendChild(link);
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
                window.setTimeout(() => {
                    hint.textContent = copy.autoSave;
                }, 1600);
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
        ensureStylesheet();
        bindDiaryTab();
        observeDiary();
        queueDecorate();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
