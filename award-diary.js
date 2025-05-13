// award-diary.js

(function() {
    'use strict';

    // --- 定数・設定 ---
    const CURRENT_YEAR = new Date().getFullYear(); // 現在の年をデフォルトとする
    const LOCAL_STORAGE_KEY_PREFIX = 'playPointDiary_'; // ローカルストレージのキーの接頭辞

    // 月の名前と、各月に最大5週分のデータを持つことを示す (0埋めは不要、配列インデックスで管理)
    // 実際の月のインデックスは 0 (1月) から 11 (12月)
    const MONTHS = [
        "january", "february", "march", "april", "may", "june",
        "july", "august", "september", "october", "november", "december"
    ];

    // --- ヘルパー関数 ---

    /**
     * 指定された年のローカルストレージキーを取得する
     * @param {number} year - 年 (例: 2025)
     * @returns {string} ローカルストレージのキー
     */
    function getLocalStorageKey(year) {
        return `${LOCAL_STORAGE_KEY_PREFIX}${year}`;
    }

    /**
     * 指定された年のデータをローカルストレージから読み込む
     * データがない場合は、空のデータ構造を返す
     * @param {number} year - 年 (例: 2025)
     * @returns {object} その年の月ごとのポイントデータ (例: { january: [null,null,null,null,null], ... })
     */
    function loadYearData(year) {
        const key = getLocalStorageKey(year);
        const jsonData = localStorage.getItem(key);
        if (jsonData) {
            try {
                return JSON.parse(jsonData);
            } catch (e) {
                console.error("ローカルストレージのデータ解析に失敗しました:", e);
                // 解析失敗時は空データを返す
            }
        }
        // データがない場合や解析失敗時は、空のデータ構造を生成
        const emptyYearData = {};
        MONTHS.forEach(monthKey => {
            emptyYearData[monthKey] = [null, null, null, null, null]; // 各月5週分のデータをnullで初期化
        });
        return emptyYearData;
    }

    /**
     * 指定された年のデータをローカルストレージに保存する
     * @param {number} year - 年 (例: 2025)
     * @param {object} yearData - 保存する年のデータ
     */
    function saveYearData(year, yearData) {
        const key = getLocalStorageKey(year);
        try {
            localStorage.setItem(key, JSON.stringify(yearData));
            console.log(`${year}年のデータを保存しました。`);
        } catch (e) {
            console.error("ローカルストレージへのデータ保存に失敗しました:", e);
        }
    }

    // --- コア機能関数 ---

    /**
     * 指定された年・月・週にポイントを記録（保存）する
     * @param {number} year - 年 (例: 2025)
     * @param {number} monthIndex - 月のインデックス (0-11)
     * @param {number} weekIndex - 週のインデックス (0-4, 0が1週目)
     * @param {number | null} points - 記録するポイント数 (nullでクリア)
     */
    function recordPoint(year, monthIndex, weekIndex, points) {
        if (monthIndex < 0 || monthIndex >= MONTHS.length || weekIndex < 0 || weekIndex > 4) {
            console.error("無効な月または週のインデックスです。");
            return;
        }
        const pointsToSave = (points === null || points === '' || isNaN(parseInt(points))) ? null : parseInt(points);

        const yearData = loadYearData(year);
        const monthKey = MONTHS[monthIndex];

        if (!yearData[monthKey]) { //念のため月データが存在するか確認
            yearData[monthKey] = [null, null, null, null, null];
        }
        yearData[monthKey][weekIndex] = pointsToSave;
        saveYearData(year, yearData);
        console.log(`${year}年${monthKey}の第${weekIndex + 1}週に ${pointsToSave === null ? 'データなし' : pointsToSave + 'pt'} を記録しました。`);

        // ★ リアルタイム更新のために、ここで合計・平均計算と表示更新の関数を呼び出す (HTML連携後)
        // displayMonthlySummary(year, monthIndex);
        // displayYearlySummary(year);
    }

    /**
     * 指定された月のポイント合計を計算する
     * @param {Array<number|null>} monthData - 月の週ごとのポイントデータ (例: [100, 50, null, 75, null])
     * @returns {number} その月の合計ポイント
     */
    function calculateMonthTotal(monthData) {
        if (!Array.isArray(monthData)) return 0;
        return monthData.reduce((sum, points) => sum + (points || 0), 0);
    }

    /**
     * 指定された月の週平均ポイントを計算する (ポイントが記録されている週のみ対象)
     * @param {Array<number|null>} monthData - 月の週ごとのポイントデータ
     * @returns {number} その月の週平均ポイント (記録がない場合は0)
     */
    function calculateMonthAverage(monthData) {
        if (!Array.isArray(monthData)) return 0;
        const recordedWeeks = monthData.filter(points => points !== null);
        if (recordedWeeks.length === 0) return 0;
        const total = calculateMonthTotal(monthData);
        return total / recordedWeeks.length;
    }

    /**
     * 指定された年の総獲得ポイントを計算する
     * @param {object} yearData - その年の月ごとのポイントデータ
     * @returns {number} その年の総獲得ポイント
     */
    function calculateYearTotal(yearData) {
        let total = 0;
        MONTHS.forEach(monthKey => {
            if (yearData[monthKey]) {
                total += calculateMonthTotal(yearData[monthKey]);
            }
        });
        return total;
    }

    /**
     * 指定された年の月平均獲得ポイントを計算する (ポイントが記録されている月のみ対象)
     * @param {object} yearData - その年の月ごとのポイントデータ
     * @returns {number} その年の月平均ポイント (記録がない場合は0)
     */
    function calculateYearAverage(yearData) {
        let totalPoints = 0;
        let recordedMonthsCount = 0;
        MONTHS.forEach(monthKey => {
            if (yearData[monthKey]) {
                const monthTotal = calculateMonthTotal(yearData[monthKey]);
                if (monthTotal > 0) { // その月に1ポイントでも記録があればカウント
                    totalPoints += monthTotal;
                    recordedMonthsCount++;
                }
            }
        });
        if (recordedMonthsCount === 0) return 0;
        return totalPoints / recordedMonthsCount;
    }


    // --- HTML連携用の関数 (現時点ではダミー、またはコンソール出力) ---
    // これらはHTML要素ができてから本格的に実装します

    /**
     * 指定された月のサマリー（合計・平均）を表示する (HTML連携後)
     * @param {number} year
     * @param {number} monthIndex
     */
    function displayMonthlySummary(year, monthIndex) {
        const yearData = loadYearData(year);
        const monthKey = MONTHS[monthIndex];
        if (yearData[monthKey]) {
            const total = calculateMonthTotal(yearData[monthKey]);
            const average = calculateMonthAverage(yearData[monthKey]);
            console.log(`[表示更新] ${year}年${monthKey}: 合計 ${total}pt, 週平均 ${average.toFixed(2)}pt`);
            // TODO: HTML要素に結果を反映させる (例: document.getElementById(`month-total-${monthKey}`).textContent = total;)
        }
    }

    /**
     * 指定された年のサマリー（合計・平均）を表示する (HTML連携後)
     * @param {number} year
     */
    function displayYearlySummary(year) {
        const yearData = loadYearData(year);
        const total = calculateYearTotal(yearData);
        const average = calculateYearAverage(yearData);
        console.log(`[表示更新] ${year}年: 年間合計 ${total}pt, 月平均 ${average.toFixed(2)}pt`);
        // TODO: HTML要素に結果を反映させる
    }

    /**
     * 指定された年のデータを入力フィールドに表示する (HTML連携後)
     * @param {number} year
     */
    function populateInputsForYear(year) {
        const yearData = loadYearData(year);
        MONTHS.forEach((monthKey, monthIdx) => {
            if (yearData[monthKey]) {
                yearData[monthKey].forEach((points, weekIdx) => {
                    console.log(`[入力欄設定] ${year}年${monthKey}-week${weekIdx + 1}: ${points}`);
                    // TODO: HTMLの対応する入力フィールドに値を設定する
                    // (例: document.getElementById(`${monthKey}-week${weekIdx+1}-points`).value = points === null ? '' : points;)
                });
            }
        });
        // サマリーも更新
        MONTHS.forEach((_, monthIdx) => displayMonthlySummary(year, monthIdx));
        displayYearlySummary(year);
    }


    // --- 初期化処理とテスト呼び出し (開発用) ---
    // HTMLがなくてもコンソールで動作確認できるようにします

    console.log("award-diary.js が読み込まれました。");

    // 例: 2025年2月(インデックス1)の第1週(インデックス0)に100ポイント記録
    recordPoint(CURRENT_YEAR, 1, 0, 100);
    // 例: 2025年2月(インデックス1)の第2週(インデックス1)に50ポイント記録
    recordPoint(CURRENT_YEAR, 1, 1, 50);
    // 例: 2025年3月(インデックス2)の第1週(インデックス0)に200ポイント記録
    recordPoint(CURRENT_YEAR, 2, 0, 200);

    // 記録したデータを読み込んで表示（コンソールに）
    const currentYearData = loadYearData(CURRENT_YEAR);
    console.log(`${CURRENT_YEAR}年のデータ:`, JSON.parse(JSON.stringify(currentYearData))); // オブジェクトをきれいに出力

    // 月ごとの合計と平均を計算して表示（コンソールに）
    MONTHS.forEach((monthKey, index) => {
        if (currentYearData[monthKey]) {
            const monthTotal = calculateMonthTotal(currentYearData[monthKey]);
            const monthAverage = calculateMonthAverage(currentYearData[monthKey]);
            if (monthTotal > 0) { // データがある月のみ表示
                 console.log(`${CURRENT_YEAR}年 ${monthKey}: 合計 ${monthTotal}pt, 週平均 ${monthAverage.toFixed(2)}pt`);
            }
        }
    });

    // 年間の合計と平均を計算して表示（コンソールに）
    const yearTotal = calculateYearTotal(currentYearData);
    const yearAverage = calculateYearAverage(currentYearData);
    console.log(`${CURRENT_YEAR}年 年間: 合計 ${yearTotal}pt, 月平均 ${yearAverage.toFixed(2)}pt`);

    // HTML連携後に呼び出す関数のテスト（コンソール出力）
    // populateInputsForYear(CURRENT_YEAR); // これを呼ぶと、上記で記録したデータが入力欄に設定されるイメージ

    // グローバルスコープに一部関数を公開 (HTMLから呼び出すため、またはデバッグ用)
    // ただし、IIFEで囲んでいるので、通常は公開されません。
    // 必要に応じて、windowオブジェクトに明示的に追加します。
    // window.awardDiary = {
    //     recordPoint,
    //     populateInputsForYear,
    //     // 他に必要な関数があれば
    // };

})(); // 即時実行関数でスコープを分離