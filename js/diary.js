'use strict';

PP_APP.DIARY = {
    // ローカルストレージから日記データを取得するメソッド
    loadDiaryData() {
        try {
            const data = localStorage.getItem(PP_APP.CONSTANTS.DIARY_DATA_KEY);
            return data ? JSON.parse(data) : {};
        } catch (e) {
            console.error("日記データの読み込みに失敗しました:", e);
            PP_APP.UI.showToast("日記データの読み込みに失敗しました。", 'error');
            return {};
        }
    },

    // ローカルストレージへ日記データを保存するメソッド
    saveDiaryData(data) {
        try {
            localStorage.setItem(PP_APP.CONSTANTS.DIARY_DATA_KEY, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error("日記データの保存に失敗しました:", e);
            PP_APP.UI.showToast("日記データの保存に失敗しました。", 'error');
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
        if (!PP_APP.STATE.dom.diaryMode) return;
        const config = PP_APP.CONFIGS[PP_APP.STATE.currentRegion];
        const texts = config.uiText;
        PP_APP.STATE.dom.currentYear.textContent = `${PP_APP.STATE.diaryState.currentYear}${texts.yearSuffix || ''}`;
        this.renderMonthSelector();
        this.renderWeekInputs();
        this.updateSummary();
    },

    // 月選択ボタンのレンダリング
    renderMonthSelector() {
        if (!PP_APP.STATE.dom.monthSelector) return;
        const texts = PP_APP.CONFIGS[PP_APP.STATE.currentRegion].uiText;
        PP_APP.STATE.dom.monthSelector.innerHTML = '';
        texts.monthNames.forEach((name, index) => {
            const monthNum = index + 1;
            const button = document.createElement('button');
            button.textContent = name;
            button.dataset.month = monthNum;
            if (monthNum === PP_APP.STATE.diaryState.currentMonth) button.classList.add(PP_APP.CONSTANTS.CLASS_ACTIVE);
            button.addEventListener('click', () => {
                PP_APP.STATE.diaryState.currentMonth = monthNum;
                this.renderDiary();
            });
            PP_APP.STATE.dom.monthSelector.appendChild(button);
        });
    },

    // 選択された月の各週の入力行のレンダリング
    renderWeekInputs() {
        if (!PP_APP.STATE.dom.weekInputs || !PP_APP.STATE.dom.selectedMonth) return;
        const texts = PP_APP.CONFIGS[PP_APP.STATE.currentRegion].uiText;
        PP_APP.STATE.dom.weekInputs.innerHTML = '';
        PP_APP.STATE.dom.selectedMonth.textContent = texts.monthNames[PP_APP.STATE.diaryState.currentMonth - 1];
        const fridays = this.getFridays(PP_APP.STATE.diaryState.currentYear, PP_APP.STATE.diaryState.currentMonth);
        const data = this.loadDiaryData();
        const yearData = data[PP_APP.STATE.diaryState.currentYear] || {};
        const monthData = yearData[PP_APP.STATE.diaryState.currentMonth] || {};
        if (fridays.length === 0) {
            PP_APP.STATE.dom.weekInputs.innerHTML = `<p>${texts.noWeeksMessage}</p>`;
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
            PP_APP.STATE.dom.weekInputs.appendChild(row);
        });
    },

    // 月間・年間の合計・平均ポイントの集計表示
    updateSummary() {
        if (!PP_APP.STATE.dom.monthlyTotal || !PP_APP.STATE.dom.yearlyTotal) return;
        const config = PP_APP.CONFIGS[PP_APP.STATE.currentRegion];
        const data = this.loadDiaryData();
        const yearData = data[PP_APP.STATE.diaryState.currentYear] || {};
        const monthData = yearData[PP_APP.STATE.diaryState.currentMonth] || {};
        let monthlyTotal = 0, monthlyWeeksWithPoints = 0;
        Object.values(monthData).forEach(week => {
            const points = parseInt(week.points, 10);
            if (!isNaN(points)) { monthlyTotal += points; monthlyWeeksWithPoints++; }
        });
        PP_APP.STATE.dom.monthlyTotal.textContent = monthlyTotal.toLocaleString(config.lang);
        PP_APP.STATE.dom.monthlyAverage.textContent = (monthlyWeeksWithPoints > 0 ? (monthlyTotal / monthlyWeeksWithPoints).toFixed(1) : '0.0');
        let yearlyTotal = 0, yearlyWeeksWithPoints = 0;
        Object.values(yearData).forEach(month => {
            Object.values(month).forEach(week => {
                const points = parseInt(week.points, 10);
                if (!isNaN(points)) { yearlyTotal += points; yearlyWeeksWithPoints++; }
            });
        });
        PP_APP.STATE.dom.yearlyTotal.textContent = yearlyTotal.toLocaleString(config.lang);
        PP_APP.STATE.dom.yearlyAverage.textContent = (yearlyWeeksWithPoints > 0 ? (yearlyTotal / yearlyWeeksWithPoints).toFixed(1) : '0.0');
    },

    // 週ごとの入力データ保存処理
    handleDiarySave(e) {
        if (e.target.tagName === 'BUTTON' && e.target.dataset.week) {
            const weekNum = e.target.dataset.week;
            const pointsInput = PP_APP.STATE.dom.weekInputs.querySelector(`#week${weekNum}_points`);
            const prizeSelect = PP_APP.STATE.dom.weekInputs.querySelector(`#week${weekNum}_prize`);
            const data = this.loadDiaryData();
            if (!data[PP_APP.STATE.diaryState.currentYear]) data[PP_APP.STATE.diaryState.currentYear] = {};
            if (!data[PP_APP.STATE.diaryState.currentYear][PP_APP.STATE.diaryState.currentMonth]) data[PP_APP.STATE.diaryState.currentYear][PP_APP.STATE.diaryState.currentMonth] = {};
            data[PP_APP.STATE.diaryState.currentYear][PP_APP.STATE.diaryState.currentMonth][weekNum] = { points: pointsInput.value, prize: prizeSelect.value };
            if (!this.saveDiaryData(data)) return;
            PP_APP.ANALYTICS.track('diary_entry_saved', {
                region: PP_APP.STATE.currentRegion,
                entry_type: 'weekly_reward'
            });
            PP_APP.ANALYTICS.markEngaged();
            const originalText = PP_APP.CONFIGS[PP_APP.STATE.currentRegion].uiText.saveButton;
            e.target.textContent = 'OK!';
            e.target.disabled = true;
            setTimeout(() => {
                e.target.textContent = originalText;
                e.target.disabled = false;
            }, PP_APP.CONSTANTS.SAVE_CONFIRMATION_DURATION);
            this.updateSummary();
        }
    },

    // 日記データをJSONテキストとしてエクスポート
    exportDiary() {
        const config = PP_APP.CONFIGS[PP_APP.STATE.currentRegion];
        const texts = config.uiText;
        const data = localStorage.getItem(PP_APP.CONSTANTS.DIARY_DATA_KEY);
        const exportString = data ? data : "{}";
        
        navigator.clipboard.writeText(exportString)
            .then(() => {
                PP_APP.UI.showToast(texts.exportSuccess);
            })
            .catch(err => {
                console.error("データの書き出しに失敗しました:", err);
                PP_APP.UI.showToast("コピーに失敗しました。", 'error');
            });
    },

    // 復元用テキストエリアの表示/非表示切り替え
    toggleImportArea() {
        if (!PP_APP.STATE.dom.backupInputWrapper) return;
        const isHidden = PP_APP.STATE.dom.backupInputWrapper.classList.contains(PP_APP.CONSTANTS.CLASS_HIDDEN);
        PP_APP.STATE.dom.backupInputWrapper.classList.toggle(PP_APP.CONSTANTS.CLASS_HIDDEN, !isHidden);
        if (isHidden && PP_APP.STATE.dom.diaryBackupData) {
            PP_APP.STATE.dom.diaryBackupData.value = "";
            PP_APP.STATE.dom.diaryBackupData.focus();
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
        if (!PP_APP.STATE.dom.diaryBackupData) return;
        const config = PP_APP.CONFIGS[PP_APP.STATE.currentRegion];
        const texts = config.uiText;
        const rawData = PP_APP.STATE.dom.diaryBackupData.value.trim();
        
        if (!rawData) {
            PP_APP.UI.showToast(texts.errorInputReverse, 'error');
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
            if (PP_APP.STATE.dom.backupInputWrapper) {
                PP_APP.STATE.dom.backupInputWrapper.classList.add(PP_APP.CONSTANTS.CLASS_HIDDEN);
            }
            PP_APP.STATE.dom.diaryBackupData.value = "";
            PP_APP.UI.showToast(texts.importSuccess);
        } catch (e) {
            console.error("データの読み込みに失敗しました:", e);
            PP_APP.UI.showToast(texts.importError, 'error');
        }
    }
};
