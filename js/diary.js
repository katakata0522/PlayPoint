'use strict';

function loadDiaryData() {
    try {
        const data = localStorage.getItem(PP_CONSTANTS.DIARY_DATA_KEY);
        return data ? JSON.parse(data) : {};
    } catch (e) {
        console.error("日記データの読み込みに失敗しました:", e);
        showToast("日記データの読み込みに失敗しました。", 'error');
        return {};
    }
}

function saveDiaryData(data) {
    try {
        localStorage.setItem(PP_CONSTANTS.DIARY_DATA_KEY, JSON.stringify(data));
    } catch (e) {
        console.error("日記データの保存に失敗しました:", e);
        showToast("日記データの保存に失敗しました。", 'error');
    }
}

function getFridays(year, month) {
    const fridays = [];
    const date = new Date(year, month - 1, 1);
    while (date.getMonth() === month - 1) {
        if (date.getDay() === 5) { fridays.push(new Date(date)); }
        date.setDate(date.getDate() + 1);
    }
    return fridays;
}

function renderDiary() {
    if (!PP_STATE.dom.diaryMode) return;
    const config = PP_REGION_CONFIGS[PP_STATE.currentRegion];
    const texts = config.uiText;
    PP_STATE.dom.currentYear.textContent = `${PP_STATE.diaryState.currentYear}${texts.yearSuffix || ''}`;
    renderMonthSelector();
    renderWeekInputs();
    updateSummary();
}

function renderMonthSelector() {
    if (!PP_STATE.dom.monthSelector) return;
    const texts = PP_REGION_CONFIGS[PP_STATE.currentRegion].uiText;
    PP_STATE.dom.monthSelector.innerHTML = '';
    texts.monthNames.forEach((name, index) => {
        const monthNum = index + 1;
        const button = document.createElement('button');
        button.textContent = name;
        button.dataset.month = monthNum;
        if (monthNum === PP_STATE.diaryState.currentMonth) button.classList.add(PP_CONSTANTS.CLASS_ACTIVE);
        button.addEventListener('click', () => {
            PP_STATE.diaryState.currentMonth = monthNum;
            renderDiary();
        });
        PP_STATE.dom.monthSelector.appendChild(button);
    });
}

function renderWeekInputs() {
    if (!PP_STATE.dom.weekInputs || !PP_STATE.dom.selectedMonth) return;
    const texts = PP_REGION_CONFIGS[PP_STATE.currentRegion].uiText;
    PP_STATE.dom.weekInputs.innerHTML = '';
    PP_STATE.dom.selectedMonth.textContent = texts.monthNames[PP_STATE.diaryState.currentMonth - 1];
    const fridays = getFridays(PP_STATE.diaryState.currentYear, PP_STATE.diaryState.currentMonth);
    const data = loadDiaryData();
    const yearData = data[PP_STATE.diaryState.currentYear] || {};
    const monthData = yearData[PP_STATE.diaryState.currentMonth] || {};
    if (fridays.length === 0) {
        PP_STATE.dom.weekInputs.innerHTML = `<p>${texts.noWeeksMessage}</p>`;
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
        PP_STATE.dom.weekInputs.appendChild(row);
    });
}

function updateSummary() {
    if (!PP_STATE.dom.monthlyTotal || !PP_STATE.dom.yearlyTotal) return;
    const config = PP_REGION_CONFIGS[PP_STATE.currentRegion];
    const data = loadDiaryData();
    const yearData = data[PP_STATE.diaryState.currentYear] || {};
    const monthData = yearData[PP_STATE.diaryState.currentMonth] || {};
    let monthlyTotal = 0, monthlyWeeksWithPoints = 0;
    Object.values(monthData).forEach(week => {
        const points = parseInt(week.points, 10);
        if (!isNaN(points)) { monthlyTotal += points; monthlyWeeksWithPoints++; }
    });
    PP_STATE.dom.monthlyTotal.textContent = monthlyTotal.toLocaleString(config.lang);
    PP_STATE.dom.monthlyAverage.textContent = (monthlyWeeksWithPoints > 0 ? (monthlyTotal / monthlyWeeksWithPoints).toFixed(1) : '0.0');
    let yearlyTotal = 0, yearlyWeeksWithPoints = 0;
    Object.values(yearData).forEach(month => {
        Object.values(month).forEach(week => {
            const points = parseInt(week.points, 10);
            if (!isNaN(points)) { yearlyTotal += points; yearlyWeeksWithPoints++; }
        });
    });
    PP_STATE.dom.yearlyTotal.textContent = yearlyTotal.toLocaleString(config.lang);
    PP_STATE.dom.yearlyAverage.textContent = (yearlyWeeksWithPoints > 0 ? (yearlyTotal / yearlyWeeksWithPoints).toFixed(1) : '0.0');
}

function handleDiarySave(e) {
    if (e.target.tagName === 'BUTTON' && e.target.dataset.week) {
        const weekNum = e.target.dataset.week;
        const pointsInput = PP_STATE.dom.weekInputs.querySelector(`#week${weekNum}_points`);
        const prizeSelect = PP_STATE.dom.weekInputs.querySelector(`#week${weekNum}_prize`);
        const data = loadDiaryData();
        if (!data[PP_STATE.diaryState.currentYear]) data[PP_STATE.diaryState.currentYear] = {};
        if (!data[PP_STATE.diaryState.currentYear][PP_STATE.diaryState.currentMonth]) data[PP_STATE.diaryState.currentYear][PP_STATE.diaryState.currentMonth] = {};
        data[PP_STATE.diaryState.currentYear][PP_STATE.diaryState.currentMonth][weekNum] = { points: pointsInput.value, prize: prizeSelect.value };
        saveDiaryData(data);
        const originalText = PP_REGION_CONFIGS[PP_STATE.currentRegion].uiText.saveButton;
        e.target.textContent = 'OK!';
        e.target.disabled = true;
        setTimeout(() => {
            e.target.textContent = originalText;
            e.target.disabled = false;
        }, PP_CONSTANTS.SAVE_CONFIRMATION_DURATION);
        updateSummary();
    }
}
