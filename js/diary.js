'use strict';

import { CONFIGS, STATE, CONSTANTS, ANALYTICS } from './config.js';
import { UI } from './ui.js';

export const DIARY = {
    // ローカルストレージから日記データを取得するメソッド
    loadDiaryData() {
        try {
            const data = localStorage.getItem(CONSTANTS.DIARY_DATA_KEY);
            return data ? JSON.parse(data) : {};
        } catch (e) {
            console.error("日記データの読み込みに失敗しました:", e);
            UI.showToast("日記データの読み込みに失敗しました。", 'error');
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
            UI.showToast("日記データの保存に失敗しました。", 'error');
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
            const row = document.createElement('div');
            row.className = 'week-row';
            const prizeOptionsHTML = texts.prizeOptions.map(opt => `<option value="${opt}" ${weekData.prize === opt ? 'selected' : ''}>${opt}</option>`).join('');
            row.innerHTML = `
                <label for="week${weekNum}_points">${texts.weekLabel}${weekNum}${texts.weekSuffix} (${dateString})</label>
                <input type="number" id="week${weekNum}_points" placeholder="${texts.pointsPlaceholder}" value="${weekData.points || ''}" inputmode="numeric">
                <select id="week${weekNum}_prize">${prizeOptionsHTML}</select>
                <button data-week="${weekNum}">${texts.saveButton}</button>
            `;
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
            const points = parseInt(week.points, 10);
            if (!isNaN(points)) { monthlyTotal += points; monthlyWeeksWithPoints++; }
        });
        STATE.dom.monthlyTotal.textContent = monthlyTotal.toLocaleString(config.lang);
        STATE.dom.monthlyAverage.textContent = (monthlyWeeksWithPoints > 0 ? (monthlyTotal / monthlyWeeksWithPoints).toFixed(1) : '0.0');
        let yearlyTotal = 0, yearlyWeeksWithPoints = 0;
        Object.values(yearData).forEach(month => {
            Object.values(month).forEach(week => {
                const points = parseInt(week.points, 10);
                if (!isNaN(points)) { yearlyTotal += points; yearlyWeeksWithPoints++; }
            });
        });
        STATE.dom.yearlyTotal.textContent = yearlyTotal.toLocaleString(config.lang);
        STATE.dom.yearlyAverage.textContent = (yearlyWeeksWithPoints > 0 ? (yearlyTotal / yearlyWeeksWithPoints).toFixed(1) : '0.0');
    },

    // 週ごとの入力データ保存処理
    handleDiarySave(e) {
        if (e.target.tagName === 'BUTTON' && e.target.dataset.week) {
            const weekNum = e.target.dataset.week;
            const pointsInput = STATE.dom.weekInputs.querySelector(`#week${weekNum}_points`);
            const prizeSelect = STATE.dom.weekInputs.querySelector(`#week${weekNum}_prize`);
            const data = this.loadDiaryData();
            if (!data[STATE.diaryState.currentYear]) data[STATE.diaryState.currentYear] = {};
            if (!data[STATE.diaryState.currentYear][STATE.diaryState.currentMonth]) data[STATE.diaryState.currentYear][STATE.diaryState.currentMonth] = {};
            data[STATE.diaryState.currentYear][STATE.diaryState.currentMonth][weekNum] = { points: pointsInput.value, prize: prizeSelect.value };
            if (!this.saveDiaryData(data)) return;
            ANALYTICS.track('diary_entry_saved', {
                region: STATE.currentRegion,
                entry_type: 'weekly_reward'
            });
            ANALYTICS.markEngaged();
            const originalText = CONFIGS[STATE.currentRegion].uiText.saveButton;
            e.target.textContent = 'OK!';
            e.target.disabled = true;
            setTimeout(() => {
                e.target.textContent = originalText;
                e.target.disabled = false;
            }, CONSTANTS.SAVE_CONFIRMATION_DURATION);
            this.updateSummary();
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
                UI.showToast("コピーに失敗しました。", 'error');
            });
    },

    // 復元用テキストエリアの表示/非表示切り替え
    toggleImportArea() {
        if (!STATE.dom.backupInputWrapper) return;
        const isHidden = STATE.dom.backupInputWrapper.classList.contains(CONSTANTS.CLASS_HIDDEN);
        STATE.dom.backupInputWrapper.classList.toggle(CONSTANTS.CLASS_HIDDEN, !isHidden);
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

    // JSONテキストから日記データをインポート（厳格なバリデーション）
    executeImport() {
        if (!STATE.dom.diaryBackupData) return;
        const config = CONFIGS[STATE.currentRegion];
        const texts = config.uiText;
        const rawData = STATE.dom.diaryBackupData.value.trim();
        
        if (!rawData) {
            UI.showToast(texts.errorInputReverse, 'error');
            return;
        }
        
        try {
            const parsed = JSON.parse(rawData);
            if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
                throw new Error("Invalid root data structure");
            }
            
            const validatedData = {};
            
            // 厳格なスキーマ検証と値のクレンジング (XSS防御)
            for (const [yearStr, monthData] of Object.entries(parsed)) {
                const year = parseInt(yearStr, 10);
                if (isNaN(year) || year < 2020 || year > 2100) continue; 
                
                if (typeof monthData !== 'object' || monthData === null || Array.isArray(monthData)) continue;
                validatedData[year] = {};
                
                for (const [monthStr, weekData] of Object.entries(monthData)) {
                    const month = parseInt(monthStr, 10);
                    if (isNaN(month) || month < 1 || month > 12) continue;
                    
                    if (typeof weekData !== 'object' || weekData === null || Array.isArray(weekData)) continue;
                    validatedData[year][month] = {};
                    
                    for (const [weekStr, valueObj] of Object.entries(weekData)) {
                        const week = parseInt(weekStr, 10);
                        if (isNaN(week) || week < 1 || week > 5) continue;
                        
                        if (typeof valueObj !== 'object' || valueObj === null) continue;
                        
                        const rawPoints = String(valueObj.points || '').trim();
                        const pointsNum = parseInt(rawPoints, 10);
                        const points = (isNaN(pointsNum) || pointsNum < 0) ? '' : String(pointsNum);
                        
                        const rawPrize = String(valueObj.prize || '').trim();
                        const prize = this.sanitizeString(rawPrize);
                        
                        validatedData[year][month][week] = { points, prize };
                    }
                }
            }
            
            if (!this.saveDiaryData(validatedData)) return;
            this.renderDiary();
            if (STATE.dom.backupInputWrapper) {
                STATE.dom.backupInputWrapper.classList.add(CONSTANTS.CLASS_HIDDEN);
            }
            STATE.dom.diaryBackupData.value = "";
            UI.showToast(texts.importSuccess);
        } catch (e) {
            console.error("データの読み込みに失敗しました:", e);
            UI.showToast(texts.importError, 'error');
        }
    }
};

if (typeof window !== 'undefined' && window.__TEST_ENV__) {
    window.PP_APP = window.PP_APP || {};
    window.PP_APP.DIARY = DIARY;
}
