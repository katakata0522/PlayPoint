'use strict';

import { CONFIGS, STATE, CONSTANTS, ANALYTICS } from './config.js';
import { UI } from './ui.js';
import { SHARE } from './share.js';

export const DIARY_PURE = {
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

    summarizeYear(yearData = {}) {
        const monthlyTotals = Array.from({ length: 12 }, () => 0);
        let total = 0;
        let recordedWeeks = 0;

        for (let month = 1; month <= 12; month++) {
            const monthData = yearData[month] || {};
            for (const week of Object.values(monthData)) {
                const normalizedPoints = this.normalizePointsValue(week?.points);
                if (normalizedPoints === '' || normalizedPoints === null) continue;
                const points = Number(normalizedPoints);
                monthlyTotals[month - 1] += points;
                total += points;
                recordedWeeks++;
            }
        }

        return {
            monthlyTotals,
            total,
            recordedWeeks,
            average: recordedWeeks > 0 ? total / recordedWeeks : 0
        };
    }
};

export const DIARY = {
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
                <input type="number" id="week${weekNum}_points" placeholder="${texts.pointsPlaceholder}" value="${displayPoints}" min="0" step="1" inputmode="numeric">
                <select id="week${weekNum}_prize" aria-label="${texts.prizeLabel}">${prizeOptionsHTML}</select>
                <div class="diary-btn-group">
                    <button class="diary-save-btn" data-week="${weekNum}">${texts.saveButton}</button>
                    <button type="button" class="diary-x-share-btn" data-week="${weekNum}" title="X（Twitter）でシェア" aria-label="Xでシェア">𝕏</button>
                </div>
            `;

            // オートセーブ用のイベントハンドラを登録
            const pointsInput = row.querySelector(`#week${weekNum}_points`);
            const prizeSelect = row.querySelector(`#week${weekNum}_prize`);
            const saveBtn = row.querySelector(`.diary-save-btn[data-week="${weekNum}"]`);
            const shareBtn = row.querySelector(`.diary-x-share-btn[data-week="${weekNum}"]`);

            const triggerAutoSave = () => {
                this.handleDiarySave({ target: saveBtn }, true); // サイレント保存
            };

            pointsInput.addEventListener('blur', triggerAutoSave);
            prizeSelect.addEventListener('change', triggerAutoSave);

            if (shareBtn) {
                shareBtn.addEventListener('click', () => {
                    const currentPoints = pointsInput.value;
                    const currentPrize = prizeSelect.value;
                    if (currentPoints !== '') {
                        triggerAutoSave();
                    }
                    SHARE.shareRewardToX(currentPoints, currentPrize);
                });
            }

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
        if (e.target.tagName !== 'BUTTON' || !e.target.dataset.week) return;

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

        if (!isSilent) {
            UI.showToast(texts.toastDiarySaveSuccess);
            document.dispatchEvent(new CustomEvent('playpoint:diary-saved', {
                detail: { region: STATE.currentRegion }
            }));
            this.showSaveConfirmation(e.target, texts);
        }
        this.updateSummary();
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
