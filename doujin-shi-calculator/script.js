/* ==========================================================================
   同人誌の発行部数&黒字化シミュレーター | script.js  v2.0.0
   Architecture: constants / DOM / state / helpers / calc / UI / storage / events
   ========================================================================== */

'use strict';

/* ================================================================
   0. 定数 & データベース
================================================================ */

/** 印刷価格データベース (2026年現在の相場目安) */
const PRINT_PRICE_DB = {
    A5: {
        pages:   [24, 32, 40, 48, 64, 80, 100],
        volumes: [20, 50, 100, 200, 300],
        prices: {
            24:  [7500, 13000, 21000, 33000, 44000],
            32:  [9000, 15500, 24000, 38500, 50500],
            40:  [10000, 17500, 27500, 44000, 57000],
            48:  [11000, 20000, 31000, 49500, 64000],
            64:  [13000, 24000, 37500, 60500, 77000],
            80:  [15500, 28500, 44000, 71500, 90000],
            100: [18500, 34000, 53000, 84500, 105500],
        },
    },
    B5: {
        pages:   [24, 32, 40, 48, 64, 80, 100],
        volumes: [20, 50, 100, 200, 300],
        prices: {
            24:  [10000, 17500, 26500, 40500, 55000],
            32:  [11500, 20000, 31000, 47500, 64000],
            40:  [13000, 23000, 35000, 54000, 72500],
            48:  [15000, 26000, 39500, 60500, 81500],
            64:  [18000, 31000, 48500, 73500, 99000],
            80:  [21000, 36500, 57000, 87000, 116500],
            100: [25500, 43000, 68000, 103500, 138500],
        },
    },
    B6: {
        pages:   [24, 32, 40, 48, 64, 80, 100],
        volumes: [20, 50, 100, 200, 300],
        prices: {
            24:  [7000, 12000, 18500, 29500, 39500],
            32:  [8000, 14000, 22000, 34000, 46000],
            40:  [9000, 16000, 25500, 39500, 53000],
            48:  [10500, 18000, 28500, 45000, 59500],
            64:  [12500, 22000, 34000, 55000, 70500],
            80:  [14500, 26000, 40500, 65000, 82500],
            100: [17000, 31000, 48500, 77000, 97000],
        },
    },
    A6: {
        pages:   [40, 64, 80, 100, 150, 200],
        volumes: [20, 50, 100, 200, 300],
        prices: {
            40:  [7000, 12000, 17500, 27500, 37500],
            64:  [9000, 15500, 23000, 36500, 48500],
            80:  [10000, 17500, 26500, 42000, 55000],
            100: [11500, 20000, 31000, 48500, 65000],
            150: [15500, 26500, 40500, 65000, 87000],
            200: [19500, 33000, 50500, 81500, 109000],
        },
    },
    shinsho: {
        pages:   [40, 64, 80, 100, 150, 200],
        volumes: [20, 50, 100, 200, 300],
        prices: {
            40:  [7500, 13000, 19500, 31000, 42000],
            64:  [9500, 17000, 25500, 39500, 54000],
            80:  [11000, 19500, 29000, 46000, 61500],
            100: [12500, 22000, 34000, 53000, 71500],
            150: [17000, 29000, 45000, 71500, 95500],
            200: [21500, 36500, 56000, 90000, 120000],
        },
    },
};

/** アフィリエイト商品データベース */
const AFFILIATE_PRODUCTS = {
    copybook: {
        title: '📚 コピー本づくりのおすすめ製本グッズ',
        desc:  'コピー本（折本・小冊子）の自宅・コンビニ製本に圧倒的に便利なアイテムです。',
        items: [
            {
                name:   'マックス 中とじホッチキス ホッチくる',
                url:    'https://www.amazon.co.jp/dp/B001PMH76W?tag=katakata-22',
                icon:   '📌',
                reason: 'ヘッドが90度回転し、A4用紙の中央に簡単にホッチキスが打てるコピー本作家の必須装備です。',
            },
            {
                name:   'コクヨ 上質紙 特厚口 A4 50枚',
                url:    'https://www.amazon.co.jp/dp/B000FL7GZ2?tag=katakata-22',
                icon:   '📄',
                reason: 'コピー本の表紙や、少しリッチな本文用紙に最適なコシのある特厚口の上質紙です。',
            },
        ],
    },
    event: {
        title: '🎪 即売会サークル参加の必須・便利設営グッズ',
        desc:  'コミケやオンリーイベントなどのスペース設営で大活躍するド定番アイテムです。',
        items: [
            {
                name:   '折りたたみ式ポスタースタンド（卓上）',
                url:    'https://www.amazon.co.jp/dp/B0BD4XYQ6D?tag=katakata-22',
                icon:   '🚩',
                reason: 'A4やA3のお品書き・ポスターを机の上に自立させてアピール力を激変させる軽量スタンド。',
            },
            {
                name:   'ヘッズ クリップ式 値札ホルダー 5個',
                url:    'https://www.amazon.co.jp/dp/B07BLVNDN9?tag=katakata-22',
                icon:   '🏷️',
                reason: '新刊の前に値札を挟んで立たせるための透明で見えやすいポップスタンドです。',
            },
        ],
    },
    shipping: {
        title: '📦 自家通販・BOOTH梱包用の資材セット',
        desc:  'BOOTHや匿名配送（あんしんBOOTHパック、レターパック等）で本を安全に送るための梱包資材です。',
        items: [
            {
                name:   'OPP袋 B5用 テープ付 100枚',
                url:    'https://www.amazon.co.jp/dp/B004GBA9AS?tag=katakata-22',
                icon:   '✉️',
                reason: '雨濡れを防ぐための透明OPP袋です。本を美しく包装し、傷から守ります。',
            },
            {
                name:   'クッション封筒 B5対応 25枚',
                url:    'https://www.amazon.co.jp/dp/B08CSCW7FF?tag=katakata-22',
                icon:   '📦',
                reason: '内側にぷちぷちが入っており、封筒に入れるだけでそのまま発送可能な衝撃吸収封筒。',
            },
        ],
    },
};

/** LocalStorage キー */
const LS_KEY = 'doujin_saved_books_v1';

/** 各種計算パラメータ設定 */
const CONFIG = {
    CONSIGNMENT_REVENUE_RATE: 0.7, // 書店委託時の料率 (手数料30%引き)
    COLOR_COST_MULTIPLIER: 1.6,    // フルカラー印刷時のコスト倍率 (1.6倍)
    COPYBOOK_PAGE_UNIT_COST: 6.0,  // コピー本の1ページ・1部あたりコスト
    DEBOUNCE_WAIT_MS: 120,          // 入力時のデバウンス待ち時間 (ms)
};

/* ================================================================
   1. DOM キャッシュ（一度だけ取得）
================================================================ */

/** id からDOM要素を取得するショートハンド */
const $ = (id) => document.getElementById(id);

// --- 入力フォーム ---
const bookSizeEl       = $('book-size');
const printTypeEl      = $('print-type');
const bookPagesEl      = $('book-pages');
const printVolumeEl    = $('print-volume');
const printCostEl      = $('print-cost');
const costAutoBadgeEl  = $('cost-auto-badge');
const btnResetCostEl   = $('btn-reset-cost');

const eventFeeEl       = $('event-fee');
const otherExpensesEl  = $('other-expenses');
const sellingPriceEl   = $('selling-price');
const useConsignmentEl = $('use-consignment');

const btnQuick500El    = $('btn-quick-500');
const btnQuick1000El   = $('btn-quick-1000');
const btnQuickAutoEl   = $('btn-quick-auto');
const btnDistEventEl   = $('btn-dist-event');
const btnDistOnlineEl  = $('btn-dist-online');

const customCircleEl      = $('custom-circle');
const customTitleEl       = $('custom-title');
const customEventNameEl   = $('custom-event-name');
const customEventDateEl   = $('custom-event-date');
const saveValidationMsgEl = $('save-validation-msg');

// --- 出力エリア ---

const totalExpensesDisplayEl = $('total-expenses-display');
const unitCostDisplayEl      = $('unit-cost-display');
const selloutProfitLabelEl   = $('sellout-profit-label');
const selloutProfitDisplayEl = $('sellout-profit-display');

const salesSliderEl          = $('sales-slider');
const salesCountInputEl      = $('sales-count-input');
const sliderHalfTickEl       = $('slider-half-tick');
const sliderMaxTickEl        = $('slider-max-tick');

const profitStatusCardEl      = $('profit-status-card');
const profitStatusTextEl      = $('profit-status-text');
const profitAmountDisplayEl   = $('profit-amount-display');
const profitProgressBarEl     = $('profit-progress-bar');
const breakevenLineEl         = $('breakeven-line');
const breakevenSalesDisplayEl = $('breakeven-sales-display');
const profitAdviceTextEl      = $('profit-advice-text');

// --- ボタン・Canvas ---
const btnResetAllEl       = $('btn-reset-all');
const btnSaveBookEl       = $('btn-save-book');
const btnExportEl         = $('btn-export');
const exportCanvasEl      = $('export-canvas');

// --- モーダル ---
const exportModalEl         = $('export-modal');
const modalOverlayEl        = $('modal-overlay');
const btnCloseModalEl       = $('btn-close-modal');
const modalPreviewImageEl   = $('modal-preview-image');
const btnDownloadFallbackEl = $('btn-download-fallback');

// --- アフィリエイト ---
const dynamicAffiliateBoxEl = $('dynamic-affiliate-box');

// --- タブ ---
const tabButtons = document.querySelectorAll('.tab-button');
const tabPanes   = document.querySelectorAll('.tab-pane');

// --- ダッシュボード ---
const savedBooksGridEl    = $('saved-books-grid');
const emptyStateEl        = $('empty-state');
const statTotalProfitEl   = $('stat-total-profit');
const statBookCountEl     = $('stat-book-count');
const statTotalRevenueEl  = $('stat-total-revenue');
const statTotalExpensesEl = $('stat-total-expenses');
const btnExportDataEl     = $('btn-export-data');
const inputImportFileEl   = $('input-import-file');

// --- 保存メタデータアコーディオン ---
const accordionSaveMetaEl = $('accordion-save-meta');

// --- ページ数警告 ---
const pagesWarningEl      = $('pages-warning');

// --- 計画診断パネル ---
const diagnosticStarsEl      = $('diagnostic-stars');
const diagnosticStatusNameEl = $('diagnostic-status-name');
const diagnosticDetailTextEl = $('diagnostic-detail-text');

// --- カスタムダイアログ ---
const customDialogEl     = $('custom-dialog');
const dialogMessageEl    = $('dialog-message');
const dialogBtnCancelEl  = $('dialog-btn-cancel');
const dialogBtnConfirmEl = $('dialog-btn-confirm');

/* ================================================================
   2. アプリケーション状態
================================================================ */

/** 計算結果のキャッシュ（保存時に使用） */
const appState = {
    totalExpenses:       0,
    unitCost:            0,
    breakevenSales:      0,
    isPossibleBreakeven: false,
    netProfit:           0,
    salesRevenue:        0,
    salesCount:          0,
};

/** 印刷費の自動計算フラグ */
let isAutoCostEnabled = true;

/* ================================================================
   3. 汎用ユーティリティ
================================================================ */

/**
 * 値を [min, max] に収める。
 * @param {number} v
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/**
 * 数値入力から安全に整数を取得し、範囲外はクランプして入力欄も修正する。
 * @param {HTMLInputElement} el
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function safeInt(el, min, max) {
    const raw     = parseInt(el.value) || 0;
    const clamped = clamp(raw, min, max);
    if (raw !== clamped) el.value = clamped;
    return clamped;
}

/**
 * デバウンス関数。
 * @param {Function} fn
 * @param {number} wait - ms
 * @returns {Function}
 */
function debounce(fn, wait) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), wait);
    };
}

/** HTMLエスケープ（XSS対策） */
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * ¥ 付きの日本語ロケール数値文字列を返す。
 * @param {number} val
 * @returns {string}
 */
const yen = (val) => `\uffe5${Math.round(val).toLocaleString('ja-JP')}`;

/* ================================================================
   4. 印刷費推定ロジック
================================================================ */

/** 線形補間および線形補外（1次元） - 超堅牢フェイルセーフ仕様 */
function interpolate1D(x, xArr, yArr) {
    if (!Array.isArray(xArr) || !Array.isArray(yArr) || xArr.length === 0 || yArr.length === 0) {
        return 0;
    }
    const len = Math.min(xArr.length, yArr.length);
    if (len < 2) return Number(yArr[0]) || 0;
    if (typeof x !== 'number' || isNaN(x)) return Number(yArr[0]) || 0;

    // 最小値未満の補外（基本料金を考慮し、最小価格の60%を下限とする）
    if (x < xArr[0]) {
        const dx = xArr[1] - xArr[0];
        if (dx === 0) return Number(yArr[0]) || 0;
        const slope = (yArr[1] - yArr[0]) / dx;
        if (isNaN(slope) || !isFinite(slope)) return Number(yArr[0]) || 0;
        const result = yArr[0] - slope * (xArr[0] - x);
        return Math.max(Math.round(yArr[0] * 0.6), Math.round(result));
    }

    // 最大値超の補外
    if (x > xArr[len - 1]) {
        const dx = xArr[len - 1] - xArr[len - 2];
        if (dx === 0) return Number(yArr[len - 1]) || 0;
        const slope = (yArr[len - 1] - yArr[len - 2]) / dx;
        if (isNaN(slope) || !isFinite(slope)) return Number(yArr[len - 1]) || 0;
        const result = yArr[len - 1] + slope * (x - xArr[len - 1]);
        return Math.max(yArr[len - 1], Math.round(result));
    }

    // 範囲内の線形補間
    for (let i = 0; i < len - 1; i++) {
        if (x >= xArr[i] && x <= xArr[i + 1]) {
            const dx = xArr[i + 1] - xArr[i];
            if (dx === 0) return Number(yArr[i]) || 0;
            const t = (x - xArr[i]) / dx;
            return Math.round(yArr[i] + t * (yArr[i + 1] - yArr[i]));
        }
    }
    return Number(yArr[0]) || 0;
}

/** ページ数・部数を 2次元的に補間・補外して印刷費を推定する（大部数・多ページ対応） - 超堅牢フェイルセーフ仕様 */
function estimatePrintCost(size, pageCount, volume) {
    const db = PRINT_PRICE_DB[size];
    if (!db || typeof db !== 'object') return 0;
    if (!Array.isArray(db.pages) || !Array.isArray(db.volumes) || !db.prices) return 0;

    // 各ページ階層において、指定部数に対する価格を部数方向に補間・補外
    const pricesAtVol = [];
    for (const p of db.pages) {
        const row = db.prices[p];
        if (!Array.isArray(row)) {
            continue; // 破損行はスキップ
        }
        pricesAtVol.push(interpolate1D(volume, db.volumes, row));
    }

    if (pricesAtVol.length === 0) return 0;

    // 得られた価格列から、指定ページ数に対する価格をページ方向に補間・補外
    return Math.max(0, interpolate1D(pageCount, db.pages.slice(0, pricesAtVol.length), pricesAtVol));
}

/** 自動印刷費を計算して入力欄を更新する */
function updateAutoPrintCost() {
    if (!isAutoCostEnabled) return;

    const size      = bookSizeEl.value;
    const printType = printTypeEl.value;
    const pages     = clamp(parseInt(bookPagesEl.value)   || 1, 1,  1000); // 1000ページまで対応
    const volume    = clamp(parseInt(printVolumeEl.value)  || 1, 1, 50000);

    let cost;
    if (printType === 'copybook') {
        cost = Math.round(CONFIG.COPYBOOK_PAGE_UNIT_COST * pages * volume);
    } else {
        cost = estimatePrintCost(size, pages, volume);
        if (printType === 'color') cost = Math.round(cost * CONFIG.COLOR_COST_MULTIPLIER);
    }

    printCostEl.value = cost;
    if (costAutoBadgeEl) {
        costAutoBadgeEl.className   = 'cost-badge-btn auto';
        costAutoBadgeEl.textContent = '自動計算中';
        costAutoBadgeEl.disabled    = true; // 自動計算中はクリック不可（手動編集されたら有効化）
    }
}

/** 印刷費を自動計算モードに戻す */
function resetToAutoPrintCost() {
    isAutoCostEnabled = true;
    updateAutoPrintCost();
    calculateAll();
}

/* ================================================================
   5. 計算ロジック（責務別に分割）
================================================================ */

/** 入力値を一括取得・クランプする */
function _readInputs() {
    const salesMax = parseInt(salesSliderEl.max) || 1;
    return {
        pages:         safeInt(bookPagesEl,      4,       500),
        volume:        safeInt(printVolumeEl,    1,     50000),
        printCost:     safeInt(printCostEl,      0,   5000000),
        eventFee:      safeInt(eventFeeEl,       0,  1000000),
        otherExp:      safeInt(otherExpensesEl,  0,  1000000),
        sellingPrice:  safeInt(sellingPriceEl,   0,   100000),
        printType:     printTypeEl.value,
        isConsignment: useConsignmentEl.checked,
        salesCount:    clamp(parseInt(salesSliderEl.value) || 0, 0, salesMax),
    };
}

/** ページ数の倍数チェック警告を表示する */
function _updateWarnings({ pages, printType }) {
    if (pagesWarningEl) {
        const isCopy = printType === 'copybook';
        const required = isCopy ? 8 : 4;
        if (pages > 0 && pages % required !== 0) {
            pagesWarningEl.textContent =
                `⚠️ ${pages}ページは${required}の倍数ではありません。印刷所に発注する際は${required}の倍数（例：${Math.round(pages / required) * required}ページ）で発注してください。`;
            pagesWarningEl.style.display = 'block';
        } else {
            pagesWarningEl.style.display = 'none';
        }
    }
}

/** 収支・損益分岐点を計算する */
function _calcProfit({ printCost, eventFee, otherExp, volume, sellingPrice, salesCount, isConsignment }) {
    const totalExpenses = printCost + eventFee + otherExp;
    const unitCost      = Math.round(totalExpenses / volume);
    const revenueRate   = isConsignment ? CONFIG.CONSIGNMENT_REVENUE_RATE : 1.0;
    const salesRevenue  = Math.round(salesCount * sellingPrice * revenueRate);
    const netProfit     = salesRevenue - totalExpenses;

    const selloutRevenue = Math.round(volume * sellingPrice * revenueRate);
    const selloutProfit  = selloutRevenue - totalExpenses;

    let breakevenSales      = 0;
    let isPossibleBreakeven = false;
    if (sellingPrice > 0) {
        breakevenSales      = Math.ceil(totalExpenses / (sellingPrice * revenueRate));
        isPossibleBreakeven = breakevenSales <= volume;
    }

    return { totalExpenses, unitCost, salesRevenue, netProfit, breakevenSales, isPossibleBreakeven, selloutProfit };
}

/** 計算結果を画面に描画する */
function _renderCalcResults(inputs, profit) {
    const { volume, salesCount, sellingPrice } = inputs;
    const { totalExpenses, unitCost, netProfit, breakevenSales, isPossibleBreakeven, selloutProfit } = profit;

    // 経費
    totalExpensesDisplayEl.textContent = yen(totalExpenses);
    unitCostDisplayEl.textContent      = yen(unitCost);

    // スライダー同期
    salesSliderEl.max = volume;
    salesSliderEl.setAttribute('aria-valuemin', '0');
    salesSliderEl.setAttribute('aria-valuemax', String(volume));
    salesSliderEl.setAttribute('aria-valuenow', String(salesCount));
    sliderHalfTickEl.textContent = `${Math.round(volume / 2)}部`;
    sliderMaxTickEl.textContent  = `${volume}部`;
    if (parseInt(salesSliderEl.value) > volume) salesSliderEl.value = volume;
    if (document.activeElement !== salesCountInputEl) salesCountInputEl.value = salesCount;

    // 損益分岐点
    breakevenSalesDisplayEl.textContent = isPossibleBreakeven ? String(breakevenSales) : '達成不可';
    if (isPossibleBreakeven && volume > 0) {
        breakevenLineEl.style.left    = `${(breakevenSales / volume) * 100}%`;
        breakevenLineEl.style.display = 'block';
    } else {
        breakevenLineEl.style.display = 'none';
    }

    // 完売時想定収支の描画
    if (selloutProfitDisplayEl && selloutProfitLabelEl) {
        selloutProfitLabelEl.textContent = `完売（${volume.toLocaleString('ja-JP')}部）時の想定収支：`;
        const prefix = selloutProfit >= 0 ? '+' : '-';
        selloutProfitDisplayEl.textContent = `${prefix}${yen(Math.abs(selloutProfit))}`;
        selloutProfitDisplayEl.className = selloutProfit >= 0 ? 'gain-text' : 'loss-text';
    }

    // プログレスバー
    profitProgressBarEl.style.width = `${volume > 0 ? (salesCount / volume) * 100 : 0}%`;

    // 損益カード
    if (netProfit >= 0) {
        profitStatusCardEl.className      = 'profit-status-card gain';
        profitStatusTextEl.textContent    = '黒字化達成！';
        profitAmountDisplayEl.textContent = `+${yen(netProfit)}`;
        profitAdviceTextEl.textContent    =
            `おめでとうございます！損益分岐点（${breakevenSales}部）を超え、利益が出ています。` +
            `イベント活動のステップアップが期待できます！`;
    } else {
        profitStatusCardEl.className      = 'profit-status-card loss';
        profitStatusTextEl.textContent    = '赤字ゾーン';
        profitAmountDisplayEl.textContent = `-${yen(Math.abs(netProfit))}`;

        if (sellingPrice === 0) {
            profitAdviceTextEl.textContent =
                '警告：本の頒布価格が「0円（無料配布）」になっています。印刷経費を回収することはできません。';
        } else if (!isPossibleBreakeven) {
            const revenueRate = isConsignment ? CONFIG.CONSIGNMENT_REVENUE_RATE : 1.0;
            const minSellingPrice = Math.ceil(totalExpenses / (volume * revenueRate));
            const consignmentNote = isConsignment ? '（書店委託手数料30%を考慮）' : '';
            profitAdviceTextEl.textContent =
                `警告：本の価格設定（${sellingPrice}円）が低すぎるか、経費が高すぎます。` +
                `完売しても黒字になりません。1冊あたり最低でも ${minSellingPrice} 円以上${consignmentNote}に設定することをお勧めします。`;
        } else {
            profitAdviceTextEl.textContent =
                `あと ${breakevenSales - salesCount} 部の頒布で黒字に達します。` +
                `価格を少し上げるか、お品書きのデザインを工夫してアピールしてみましょう！`;
        }
    }

    // 計画の収支診断判定
    if (diagnosticStarsEl && diagnosticStatusNameEl && diagnosticDetailTextEl) {
        if (sellingPrice === 0 || (!isPossibleBreakeven && selloutProfit < 0)) {
            diagnosticStarsEl.textContent = '★☆☆☆☆';
            diagnosticStarsEl.className = 'diagnostic-stars loss';
            diagnosticStatusNameEl.textContent = '赤字確定プラン';
            diagnosticDetailTextEl.textContent = '完売しても印刷費などの経費を回収できません。頒布価格を見直すか、部数調整、または印刷所の仕様を変更して印刷費を抑えることを検討しましょう。';
        } else {
            const breakevenRatio = volume > 0 ? (breakevenSales / volume) : 0;
            if (breakevenRatio <= 0.35) {
                diagnosticStarsEl.textContent = '★★★★★';
                diagnosticStarsEl.className = 'diagnostic-stars gain';
                diagnosticStatusNameEl.textContent = '超健全プラン（低リスク）';
                diagnosticDetailTextEl.textContent = '非常に手堅く安全な計画です！発行部数の3分の1ほど売れれば赤字を回避できます。安心して本づくりに専念してください。';
            } else if (breakevenRatio <= 0.70) {
                diagnosticStarsEl.textContent = '★★★★☆';
                diagnosticStarsEl.className = 'diagnostic-stars safe-gain';
                diagnosticStatusNameEl.textContent = '定番プラン（バランス良）';
                diagnosticDetailTextEl.textContent = '同人活動における標準的でバランスの良い設計です。半分程度売れれば経費を無事回収でき、残りは純利益になります。';
            } else {
                diagnosticStarsEl.textContent = '★★★☆☆';
                diagnosticStarsEl.className = 'diagnostic-stars warning-gain';
                diagnosticStatusNameEl.textContent = '強気プラン（リスクあり）';
                diagnosticDetailTextEl.textContent = '完売近く（全体の7割以上）売れないと黒字になりません。価格を50〜100円上げるか、部数を少し抑えると、ぐっと赤字リスクを減らせます。';
            }
        }
    }
}

/** メイン計算エントリーポイント */
function calculateAll() {
    updateAutoPrintCost();

    const inputs = _readInputs();
    _updateWarnings(inputs);

    const profit = _calcProfit(inputs);

    _renderCalcResults(inputs, profit);

    // appState を最新値で更新（保存処理で使用）
    Object.assign(appState, {
        totalExpenses:       profit.totalExpenses,
        unitCost:            profit.unitCost,
        breakevenSales:      profit.breakevenSales,
        isPossibleBreakeven: profit.isPossibleBreakeven,
        netProfit:           profit.netProfit,
        salesRevenue:        profit.salesRevenue,
        salesCount:          inputs.salesCount,
    });

    updateAffiliateBox();
}

const debouncedCalculateAll = debounce(calculateAll, CONFIG.DEBOUNCE_WAIT_MS);

/* ================================================================
   6. クイック価格ボタン
================================================================ */

/** クイック価格ボタンのアクティブクラスを更新する */
function updateQuickPriceActiveBadge(activeBtn) {
    [btnQuick500El, btnQuick1000El, btnQuickAutoEl].forEach(b => {
        if (!b) return;
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
    });
    if (activeBtn) {
        activeBtn.classList.add('active');
        activeBtn.setAttribute('aria-pressed', 'true');
    }
}

/* ================================================================
   7. アフィリエイトボックスの動的更新
================================================================ */
function updateAffiliateBox() {
    if (!dynamicAffiliateBoxEl) return;

    const printType = printTypeEl.value;
    const key       = printType === 'copybook' ? 'copybook' : 'event';
    const db        = AFFILIATE_PRODUCTS[key];
    if (!db) return;

    const itemsHtml = db.items.map(item => `
        <a href="${item.url}" target="_blank" rel="noopener" class="affiliate-card">
            <div class="affiliate-card-img-placeholder">${item.icon}</div>
            <div class="affiliate-card-info">
                <span class="affiliate-card-name">${item.name}</span>
                <p class="affiliate-card-reason">${item.reason}</p>
                <span class="affiliate-card-btn">Amazonで詳細を見る &#10145;</span>
            </div>
        </a>`).join('');

    dynamicAffiliateBoxEl.innerHTML = `
        <h4 class="affiliate-title">${db.title}</h4>
        <p class="affiliate-desc">${db.desc}</p>
        <div class="affiliate-items-grid">${itemsHtml}</div>`;
}

/* ================================================================
   8. モーダル制御
================================================================ */

function openModal(imgSrc, fallbackUrl) {
    modalPreviewImageEl.src    = imgSrc;
    btnDownloadFallbackEl.href = fallbackUrl;
    exportModalEl.classList.add('open');
    exportModalEl.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    exportModalEl.classList.remove('open');
    exportModalEl.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}

/* ================================================================
   9. Canvas 画像出力
================================================================ */
async function exportSummaryImage() {
    // 描画前にWebフォントの読み込み完了を保証
    try {
        if (document.fonts) {
            await document.fonts.load('bold 24px "Noto Sans JP"');
            await document.fonts.load('bold 22px "Outfit"');
        }
    } catch (e) {
        console.warn('フォントロード失敗、システムフォントで代替します:', e);
    }

    const ctx = exportCanvasEl.getContext('2d');
    if (!ctx) return;

    // 背景グラデーション
    const grad = ctx.createLinearGradient(0, 0, 800, 500);
    grad.addColorStop(0, '#f5f3ff');
    grad.addColorStop(1, '#fad0c4');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 800, 500);

    // ドット柄
    ctx.fillStyle = 'rgba(139,92,246,0.05)';
    for (let x = 10; x < 800; x += 25)
        for (let y = 10; y < 500; y += 25) {
            ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
        }

    /** 角丸矩形描画ヘルパー */
    function roundRect(x, y, w, h, r, fill = true, stroke = true) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y,     x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x,     y + h, r);
        ctx.arcTo(x,     y + h, x,     y,     r);
        ctx.arcTo(x,     y,     x + w, y,     r);
        ctx.closePath();
        if (fill)   ctx.fill();
        if (stroke) ctx.stroke();
    }

    // カード背景
    ctx.fillStyle   = 'rgba(255,255,255,0.96)';
    ctx.strokeStyle = 'rgba(139,92,246,0.25)';
    ctx.lineWidth   = 2;
    roundRect(30, 30, 740, 440, 16);

    // タイトル装飾
    ctx.fillStyle = '#8b5cf6'; ctx.fillRect(60, 62, 6, 26);
    ctx.fillStyle = '#ec4899'; ctx.fillRect(70, 62, 3, 26);

    ctx.fillStyle = '#1f2937';
    ctx.font      = 'bold 24px "Noto Sans JP", sans-serif';
    ctx.fillText('同人誌 収支&部数計画シート', 85, 82);

    ctx.fillStyle = '#6b7280';
    ctx.font      = '13px "Noto Sans JP", sans-serif';
    const dateStr = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
    ctx.fillText(`作成日: ${dateStr} | 創作支援シミュレーター`, 85, 107);

    // サークル・タイトルタグ
    const customCircle = customCircleEl.value.trim();
    const customTitle  = customTitleEl.value.trim();
    if (customCircle || customTitle) {
        ctx.fillStyle   = 'rgba(139,92,246,0.06)';
        ctx.strokeStyle = 'rgba(139,92,246,0.2)';
        ctx.lineWidth   = 1;
        roundRect(460, 52, 280, 58, 8);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#6d28d9';
        ctx.font      = 'bold 12px "Noto Sans JP", sans-serif';
        ctx.fillText(customCircle || 'サークル名未設定', 720, 74, 260);
        ctx.fillStyle = '#1f2937';
        ctx.font      = 'bold 15px "Noto Sans JP", sans-serif';
        ctx.fillText(`📖 ${customTitle || '新刊計画'}`, 720, 96, 260);
        ctx.textAlign = 'left';
    }

    // 区切り線（グラデーション）
    const lineGrad = ctx.createLinearGradient(60, 0, 740, 0);
    lineGrad.addColorStop(0, '#8b5cf6');
    lineGrad.addColorStop(0.5, '#ec4899');
    lineGrad.addColorStop(1, 'rgba(226,232,240,0.5)');
    ctx.beginPath(); ctx.moveTo(60, 125); ctx.lineTo(740, 125);
    ctx.strokeStyle = lineGrad; ctx.lineWidth = 2; ctx.stroke();

    // 左カラム：仕様
    const sizeLabel = bookSizeEl.options[bookSizeEl.selectedIndex].text.split('（')[0];
    const typeLabel = printTypeEl.options[printTypeEl.selectedIndex].text.split('（')[0];

    ctx.fillStyle = '#4b5563';
    ctx.font      = 'bold 16px "Noto Sans JP", sans-serif';
    ctx.fillText('📖 本の仕様と価格設定', 60, 170);

    ctx.font      = '14px "Noto Sans JP", sans-serif';
    ctx.fillStyle = '#1f2937';
    [
        `サイズ: ${sizeLabel}`,
        `印刷仕様: ${typeLabel}`,
        `総ページ数: ${bookPagesEl.value} ページ`,
        `発行部数: ${printVolumeEl.value} 部`,
        `頒布価格: ${sellingPriceEl.value} 円 / 1冊`,
    ].forEach((text, i) => ctx.fillText(text, 80, 200 + i * 30));

    // 損益分岐点ボックス
    const { totalExpenses, breakevenSales, isPossibleBreakeven } = appState;
    ctx.fillStyle   = 'rgba(239,68,68,0.05)';
    ctx.strokeStyle = 'rgba(239,68,68,0.3)';
    ctx.lineWidth   = 1;
    roundRect(70, 345, 300, 42, 6);
    ctx.fillStyle = '#b91c1c';
    ctx.font      = 'bold 14px "Noto Sans JP", sans-serif';
    ctx.fillText(
        isPossibleBreakeven
            ? `⚠️ 損益分岐点: ${breakevenSales} 部の頒布で黒字化`
            : `⚠️ 損益分岐点: 達成不可`,
        85, 371);

    // 右カラム：試算結果
    ctx.fillStyle = '#4b5563';
    ctx.font      = 'bold 16px "Noto Sans JP", sans-serif';
    ctx.fillText('📊 試算結果（シミュレーション）', 440, 170);

    const profitVal = appState.netProfit;
    const profitPrefix = profitVal >= 0 ? '+' : '';
    const profitColor = profitVal >= 0 ? '#10b981' : '#dc2626';

    [
        { color: '#8b5cf6', label: `シミュレーション部数: ${appState.salesCount.toLocaleString('ja-JP')} 部`, bold: false },
        { color: '#ec4899', label: `想定売上高: ${yen(appState.salesRevenue)}`, bold: false },
        { color: profitColor, label: `想定収支: ${profitPrefix}${yen(profitVal)}`, bold: true },
    ].forEach(({ color, label, bold }, i) => {
        const y = 195 + i * 50;
        ctx.fillStyle = color; ctx.fillRect(440, y, 10, 15);
        ctx.fillStyle = '#1f2937';
        ctx.font      = (bold ? 'bold ' : '') + `${bold ? 16 : 15}px "Noto Sans JP", sans-serif`;
        ctx.fillText(label, 460, y + 15);
    });

    // 総経費ボックス
    ctx.fillStyle   = '#f8fafc';
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth   = 1;
    roundRect(440, 345, 300, 80, 8);
    ctx.fillStyle = '#4b5563';
    ctx.font      = '12px "Noto Sans JP", sans-serif';
    ctx.fillText('総経費 (印刷費＋イベント経費)', 458, 375);
    ctx.fillStyle = '#1f2937';
    ctx.font      = 'bold 22px "Outfit", sans-serif';
    ctx.fillText(yen(totalExpenses), 458, 405);

    // 検索窓グラフィック
    const sx = 65, sy = 405;
    ctx.fillStyle   = '#ffffff';
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth   = 1.5;
    roundRect(sx, sy, 190, 28, 4);
    ctx.fillStyle = '#9ca3af';
    ctx.font      = '11px "Noto Sans JP", sans-serif';
    ctx.fillText('かたかたの同人ツール', sx + 10, sy + 18);
    ctx.fillStyle = '#8b5cf6'; ctx.fillRect(sx + 150, sy + 1, 39, 26);
    ctx.fillStyle = '#ffffff';
    ctx.font      = 'bold 10px "Noto Sans JP", sans-serif';
    ctx.fillText('検索', sx + 158, sy + 17);

    // フッター
    ctx.fillStyle = '#9ca3af';
    ctx.font      = '11px "Noto Sans JP", sans-serif';
    ctx.fillText('Designed by かたかた (katakatalab.com)', 60, 452);

    try {
        openModal(exportCanvasEl.toDataURL('image/png'), exportCanvasEl.toDataURL('image/png'));
    } catch (err) {
        console.error('画像生成エラー:', err);
        showToast('❌ 画像の書き出しに失敗しました。ブラウザのCanvas機能をご確認ください。');
    }
}

/* ================================================================
   10. トースト通知
================================================================ */
function showToast(message) {
    const existing = document.querySelector('.toast-message');
    if (existing) {
        existing.remove();
    }
    const toast       = document.createElement('div');
    toast.className   = 'toast-message';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // フェードアウトさせてから削除
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 2400);
}

/* ================================================================
   11. カスタムダイアログ（confirm() 廃止）
================================================================ */
let _dialogResolve = null;

/**
 * カスタム確認ダイアログを表示する。
 * @param {string} message
 * @returns {Promise<boolean>}
 */
function showDialog(message) {
    return new Promise(resolve => {
        _dialogResolve = resolve;
        dialogMessageEl.textContent  = message;
        customDialogEl.style.display = 'flex';
        dialogBtnConfirmEl.focus();
    });
}

function _closeDialog(result) {
    customDialogEl.style.display = 'none';
    _dialogResolve?.(result);
    _dialogResolve = null;
}

dialogBtnCancelEl?.addEventListener('click',  () => _closeDialog(false));
dialogBtnConfirmEl?.addEventListener('click', () => _closeDialog(true));

/* ================================================================
   12. LocalStorage CRUD
================================================================ */

/** 全作品データを取得する */
function getBooks() {
    try {
        return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
    } catch {
        return [];
    }
}

/** 全作品データを保存する */
function setBooks(books) {
    try {
        localStorage.setItem(LS_KEY, JSON.stringify(books));
    } catch {
        showToast('❌ データの保存に失敗しました。ストレージ容量をご確認ください。');
    }
}

/* ================================================================
   13. ダッシュボード：描画
================================================================ */

/** 累計サマリー統計カードを更新する */
function renderStats(books) {
    const { rev, exp } = books.reduce(
        (acc, b) => ({ rev: acc.rev + (b.salesRevenue || 0), exp: acc.exp + (b.totalExpenses || 0) }),
        { rev: 0, exp: 0 }
    );
    const profit = rev - exp;

    statBookCountEl.textContent     = `${books.length} 作品`;
    statTotalRevenueEl.textContent  = yen(rev);
    statTotalExpensesEl.textContent = yen(exp);

    statTotalProfitEl.className   = `stats-value font-outfit ${profit >= 0 ? 'positive' : 'negative'}`;
    statTotalProfitEl.textContent =
        profit > 0 ? `+${yen(profit)}` : profit < 0 ? `-${yen(Math.abs(profit))}` : yen(0);
}

/** 作品カード一覧を DocumentFragment で効率的に再描画する */
function renderBookCards(books) {
    savedBooksGridEl.querySelectorAll('.book-card').forEach(el => el.remove());

    if (books.length === 0) {
        emptyStateEl.style.display = 'block';
        return;
    }
    emptyStateEl.style.display = 'none';

    const fragment = document.createDocumentFragment();

    books.forEach(book => {
        const isGain    = book.netProfit >= 0;
        const savedDate = new Date(book.savedAt).toLocaleDateString('ja-JP', {
            year: 'numeric', month: 'short', day: 'numeric',
        });

        // イベント情報行（任意表示）
        let eventHtml = '';
        if (book.eventName || book.eventDate) {
            const evName = book.eventName
                ? `<span>🎪 ${escapeHtml(book.eventName)}</span>` : '';
            const evDate = book.eventDate
                ? `<span>📅 ${new Date(book.eventDate).toLocaleDateString('ja-JP', {
                      year: 'numeric', month: 'short', day: 'numeric',
                  })}</span>` : '';
            eventHtml = `<div class="book-card-event">${evName}${evDate}</div>`;
        }

        const card          = document.createElement('div');
        card.className      = `book-card ${isGain ? 'profit-positive' : 'profit-negative'}`;
        card.dataset.bookId = book.id;

        card.innerHTML = `
            <div class="book-card-header">
                <div>
                    <div class="book-card-title">📖 ${escapeHtml(book.title)}</div>
                    <div class="book-card-circle">${escapeHtml(book.circle)}</div>
                </div>
                <span class="book-card-badge ${isGain ? 'gain' : 'loss'}">${isGain ? '✅ 黒字' : '🔴 赤字'}</span>
            </div>
            ${eventHtml}
            <div class="book-card-meta">
                <div class="book-card-meta-item">
                    <span>印刷部数</span>
                    <strong class="font-outfit">${book.printVolume.toLocaleString('ja-JP')} 部</strong>
                </div>
                <div class="book-card-meta-item">
                    <span>頒布数</span>
                    <strong class="font-outfit">${book.salesCount.toLocaleString('ja-JP')} 部</strong>
                </div>
                <div class="book-card-meta-item">
                    <span>頒布価格</span>
                    <strong class="font-outfit">${yen(book.sellingPrice)}</strong>
                </div>
                <div class="book-card-meta-item">
                    <span>総経費</span>
                    <strong class="font-outfit">${yen(book.totalExpenses)}</strong>
                </div>
            </div>
            <div class="book-card-profit-row">
                <span class="book-card-profit-label">実績収支</span>
                <span class="book-profit-amount ${isGain ? 'gain' : 'loss'}">
                    ${isGain ? '+' : '-'}${yen(Math.abs(book.netProfit))}
                </span>
            </div>
            <div class="book-card-saved-date">保存日：${savedDate}</div>
            <div class="book-card-actions">
                <button type="button" class="btn-card-action btn-card-reload"
                    data-id="${book.id}" title="この仕様をシミュレーターに読み込む">🔄 再シミュレーション</button>
                <button type="button" class="btn-card-action btn-card-delete"
                    data-id="${book.id}" title="この記録を削除する">🗑️ 削除</button>
            </div>`;

        fragment.appendChild(card);
    });

    savedBooksGridEl.appendChild(fragment);
}

/** ダッシュボード全体を再描画する */
function renderDashboard() {
    const books = getBooks();
    renderStats(books);
    renderBookCards(books);
}

/* ================================================================
   14. 再シミュレーション（保存データを計算器に反映）
================================================================ */
function applyBookToSimulator(bookId) {
    const book = getBooks().find(b => b.id === bookId);
    if (!book) return;

    // 基本情報
    if (book.bookSize)    bookSizeEl.value     = book.bookSize;
    if (book.printType)   printTypeEl.value    = book.printType;
    if (book.bookPages)   bookPagesEl.value    = book.bookPages;
    if (book.printVolume) printVolumeEl.value  = book.printVolume;
    if (book.sellingPrice)sellingPriceEl.value = book.sellingPrice;

    // サークル・イベント情報
    customCircleEl.value   = (book.circle && book.circle !== '（サークル名未設定）') ? book.circle : '';
    customTitleEl.value    = book.title    ?? '';
    if (customEventNameEl) customEventNameEl.value = book.eventName ?? '';
    if (customEventDateEl) customEventDateEl.value = book.eventDate ?? '';

    // 経費情報 (拡張)
    if (book.eventFee !== undefined)      eventFeeEl.value      = book.eventFee;
    if (book.otherExpenses !== undefined) otherExpensesEl.value = book.otherExpenses;
    if (book.useConsignment !== undefined) {
        useConsignmentEl.checked = book.useConsignment;
    }

    // 印刷費手動/自動状態 (拡張)
    if (book.isAutoCost !== undefined) {
        isAutoCostEnabled = book.isAutoCost;
        if (!isAutoCostEnabled && book.printCost !== undefined) {
            printCostEl.value = book.printCost;
            costAutoBadgeEl.className = 'cost-badge manual';
            costAutoBadgeEl.textContent = '手動編集';
            if (btnResetCostEl) btnResetCostEl.style.display = 'inline-block';
        } else {
            if (btnResetCostEl) btnResetCostEl.style.display = 'none';
        }
    } else {
        // 過去の保存データ互換用 (以前は自動計算前提)
        isAutoCostEnabled = true;
        if (btnResetCostEl) btnResetCostEl.style.display = 'none';
    }

    // 頒布スタイルチップの表示同期
    const fee = parseInt(eventFeeEl.value) || 0;
    const isCons = useConsignmentEl.checked;
    if (fee === 0 && isCons) {
        btnDistEventEl?.classList.remove('active');
        btnDistOnlineEl?.classList.add('active');
    } else if (fee > 0 && !isCons) {
        btnDistEventEl?.classList.add('active');
        btnDistOnlineEl?.classList.remove('active');
    } else {
        btnDistEventEl?.classList.remove('active');
        btnDistOnlineEl?.classList.remove('active');
    }

    // 頒布数スライダー同期
    salesSliderEl.max   = book.printVolume;
    salesSliderEl.value = book.salesCount ?? 0;
    if (salesCountInputEl) salesCountInputEl.value = book.salesCount ?? 0;

    // 保存用アコーディオンを開いてタイトルフォールドを表示
    if (accordionSaveMetaEl) accordionSaveMetaEl.open = true;

    if (isAutoCostEnabled) {
        updateAutoPrintCost();
    }
    calculateAll();
    updateQuickPriceActiveBadge(null);

    showToast(`🔄「${book.title}」の条件をシミュレーターに読み込みました`);
    $('tab-calculator')?.click();
}

/* ================================================================
   15. 作品データ削除
================================================================ */
async function deleteBook(bookId) {
    const book = getBooks().find(b => b.id === bookId);
    if (!book) return;

    const ok = await showDialog(`「${book.title}」の記録を削除してよろしいですか？\nこの操作は元に戻せません。`);
    if (!ok) return;

    setBooks(getBooks().filter(b => b.id !== bookId));
    renderDashboard();
    showToast(`🗑️「${book.title}」を削除しました`);
}

/* ================================================================
   16. JSON バックアップ & インポート
================================================================ */

/** 全データを JSON ファイルとしてダウンロードする */
function exportBooksJson() {
    const books = getBooks();
    if (!books.length) { showToast('⚠️ 保存されたデータがありません'); return; }

    const payload = {
        version:    '1.0',
        exportedAt: new Date().toISOString(),
        tool:       '同人誌の発行部数＆黒字化シミュレーター',
        books,
    };
    const url  = URL.createObjectURL(
        new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    );
    const link = Object.assign(document.createElement('a'), {
        href:     url,
        download: `doujin_data_backup_${new Date().toISOString().slice(0, 10)}.json`,
    });
    link.click();
    URL.revokeObjectURL(url);
    showToast(`💾 ${books.length}件のデータをバックアップ保存しました`);
}

/** 作品オブジェクトのバリデーションチェック */
function isValidBook(book) {
    if (!book || typeof book !== 'object') return false;
    const requiredKeys = ['id', 'savedAt', 'title', 'printVolume', 'sellingPrice', 'totalExpenses', 'salesCount', 'netProfit'];
    for (const key of requiredKeys) {
        if (!(key in book)) return false;
    }
    if (typeof book.id !== 'string' || book.id.trim() === '') return false;
    if (typeof book.title !== 'string' || book.title.trim() === '') return false;
    if (typeof book.printVolume !== 'number' || isNaN(book.printVolume) || book.printVolume < 0) return false;
    if (typeof book.sellingPrice !== 'number' || isNaN(book.sellingPrice) || book.sellingPrice < 0) return false;
    if (typeof book.totalExpenses !== 'number' || isNaN(book.totalExpenses) || book.totalExpenses < 0) return false;
    if (typeof book.salesCount !== 'number' || isNaN(book.salesCount) || book.salesCount < 0) return false;
    if (typeof book.netProfit !== 'number' || isNaN(book.netProfit)) return false;

    // 日付の妥当性検証
    if (isNaN(Date.parse(book.savedAt))) return false;

    return true;
}

/** JSON ファイルからデータを復元する */
function importBooksJson(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ({ target }) => {
        try {
            const parsed = JSON.parse(target.result);
            if (!parsed || typeof parsed !== 'object') throw new Error('invalid format');
            if (!Array.isArray(parsed.books)) throw new Error('invalid format');

            // データバージョンに応じたスキーママイグレーション
            const dataVersion = parsed.version || '1.0';
            let booksToImport = parsed.books;

            if (dataVersion === '1.0') {
                // v1.0 データの補正（もし以前のバージョンで保存されていた場合はデフォルト値を補完）
                booksToImport = booksToImport.map(b => {
                    if (b.isAutoCost === undefined) b.isAutoCost = true;
                    return b;
                });
            }

            // インポートデータのバリデーション
            const validBooks = booksToImport.filter(isValidBook);
            if (validBooks.length === 0 && parsed.books.length > 0) {
                throw new Error('no valid books');
            }

            const existing    = getBooks();
            const existingIds = new Set(existing.map(b => b.id));
            const newBooks    = validBooks.filter(b => !existingIds.has(b.id));

            setBooks([...newBooks, ...existing]);
            renderDashboard();
            showToast(`✅ ${newBooks.length}件を復元しました（重複 ${validBooks.length - newBooks.length}件はスキップ）`);
        } catch (err) {
            console.error('インポートエラー:', err);
            showToast('❌ ファイルの読み込みに失敗しました。正しいバックアップJSONファイルを選択してください。');
        } finally {
            if (inputImportFileEl) inputImportFileEl.value = '';
        }
    };
    reader.readAsText(file);
}

/* ================================================================
   17. イベントリスナー登録
================================================================ */

// --- 印刷費 手動編集 ---
printCostEl.addEventListener('input', debounce(() => {
    isAutoCostEnabled           = false;
    costAutoBadgeEl.className   = 'cost-badge manual';
    costAutoBadgeEl.textContent = '手動編集';
    btnResetCostEl.style.display = 'inline-block';
    calculateAll();
}, CONFIG.DEBOUNCE_WAIT_MS));
btnResetCostEl.addEventListener('click', resetToAutoPrintCost);

// --- 即時反映（select / range / checkbox） ---
[bookSizeEl, printTypeEl, salesSliderEl, useConsignmentEl].forEach(el => {
    el?.addEventListener('change', calculateAll);
    el?.addEventListener('input',  calculateAll);
});

// --- デバウンス（数値テキスト入力） ---
[bookPagesEl, printVolumeEl, eventFeeEl, otherExpensesEl, sellingPriceEl].forEach(el => {
    el?.addEventListener('input', debouncedCalculateAll);
});

// --- 頒布価格 手動編集 → クイックバッジ解除 ---
sellingPriceEl.addEventListener('input', () => updateQuickPriceActiveBadge(null));

// --- 販売部数入力 ↔ スライダー 双方向同期 ---
salesCountInputEl.addEventListener('input', () => {
    const max = parseInt(salesSliderEl.max) || 100;
    const val = clamp(parseInt(salesCountInputEl.value) || 0, 0, max);
    salesCountInputEl.value = val;
    salesSliderEl.value     = val;
    calculateAll();
});

// --- クイック価格ボタン ---
btnQuick500El?.addEventListener('click', () => {
    sellingPriceEl.value = 500;
    updateQuickPriceActiveBadge(btnQuick500El);
    calculateAll();
});
btnQuick1000El?.addEventListener('click', () => {
    sellingPriceEl.value = 1000;
    updateQuickPriceActiveBadge(btnQuick1000El);
    calculateAll();
});
btnQuickAutoEl?.addEventListener('click', () => {
    const exp = (parseInt(printCostEl.value)     || 0)
              + (parseInt(eventFeeEl.value)       || 0)
              + (parseInt(otherExpensesEl.value)  || 0);
    const vol = Math.max(1, parseInt(printVolumeEl.value) || 1);
    sellingPriceEl.value = Math.max(100, Math.ceil((exp / vol * 1.5) / 50) * 50);
    updateQuickPriceActiveBadge(btnQuickAutoEl);
    calculateAll();
});

// --- 保存ボタンのクリック時にオープン保存アコーディオン (save-meta) ---

// --- 全リセット ---
btnResetAllEl?.addEventListener('click', () => {
    bookSizeEl.value         = 'A5';
    printTypeEl.value        = 'monochrome';
    bookPagesEl.value        = '32';
    printVolumeEl.value      = '100';
    eventFeeEl.value         = '7000';
    otherExpensesEl.value    = '5000';
    sellingPriceEl.value     = '500';
    useConsignmentEl.checked = false;
    customCircleEl.value     = '';
    customTitleEl.value      = '';
    if (customEventNameEl) customEventNameEl.value = '';
    if (customEventDateEl) customEventDateEl.value = '';
    salesSliderEl.value      = '50';
    salesCountInputEl.value  = '50';

    // 頒布スタイルチップのリセット
    btnDistEventEl?.classList.add('active');
    btnDistOnlineEl?.classList.remove('active');

    // アコーディオンもリセット（保存メタは閉じる）
    if (accordionSaveMetaEl)  accordionSaveMetaEl.open  = false; // 保存メタは閉じる

    // バリデーション状態のリセット
    if (saveValidationMsgEl) saveValidationMsgEl.style.display = 'none';
    customTitleEl.style.borderColor = '';

    updateQuickPriceActiveBadge(null);
    isAutoCostEnabled = true;
    updateAutoPrintCost();
    calculateAll();
});

// --- ＋/ー ボタンによる数値増減コントロール ---
document.querySelectorAll('.btn-adjust').forEach(btn => {
    btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        const step = parseInt(btn.getAttribute('data-step')) || 1;
        const inputEl = $(targetId);
        if (!inputEl) return;

        let val = parseInt(inputEl.value) || 0;
        const min = parseInt(inputEl.getAttribute('min')) ?? 0;
        const max = parseInt(inputEl.getAttribute('max')) ?? 999999;

        if (btn.classList.contains('plus')) {
            val += step;
        } else {
            val -= step;
        }
        inputEl.value = clamp(val, min, max);

        if (targetId === 'selling-price') {
            updateQuickPriceActiveBadge(null);
        }
        calculateAll();
    });
});

// --- クイックチップ選択ハンドラー ---
document.querySelectorAll('.quick-chips').forEach(container => {
    const targetId = container.getAttribute('data-target');
    const inputEl = $(targetId);
    if (!inputEl) return;

    container.addEventListener('click', e => {
        const chip = e.target.closest('.chip-val');
        if (!chip) return;
        
        inputEl.value = chip.getAttribute('data-val');
        if (targetId === 'selling-price') {
            updateQuickPriceActiveBadge(null);
        }
        calculateAll();
    });
});

// --- 新刊プリセット選択ハンドラー ---
document.querySelectorAll('.btn-preset').forEach(btn => {
    btn.addEventListener('click', () => {
        const presetType = btn.getAttribute('data-preset');
        
        // プリセットのアクティブクラス切り替え
        document.querySelectorAll('.btn-preset').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        if (presetType === 'copy') {
            bookSizeEl.value = 'A5';
            printTypeEl.value = 'copybook';
            bookPagesEl.value = '16';
            printVolumeEl.value = '30';
            sellingPriceEl.value = '300';
            eventFeeEl.value = '0';
            otherExpensesEl.value = '0';
            useConsignmentEl.checked = false;
        } else if (presetType === 'manga') {
            bookSizeEl.value = 'A5';
            printTypeEl.value = 'monochrome';
            bookPagesEl.value = '32';
            printVolumeEl.value = '100';
            sellingPriceEl.value = '500';
            eventFeeEl.value = '7000';
            otherExpensesEl.value = '5000';
            useConsignmentEl.checked = false;
        } else if (presetType === 'novel') {
            bookSizeEl.value = 'A6';
            printTypeEl.value = 'monochrome';
            bookPagesEl.value = '100';
            printVolumeEl.value = '50';
            sellingPriceEl.value = '800';
            eventFeeEl.value = '7000';
            otherExpensesEl.value = '5000';
            useConsignmentEl.checked = false;
        } else if (presetType === 'color') {
            bookSizeEl.value = 'B5';
            printTypeEl.value = 'color';
            bookPagesEl.value = '24';
            printVolumeEl.value = '100';
            sellingPriceEl.value = '1000';
            eventFeeEl.value = '7000';
            otherExpensesEl.value = '5000';
            useConsignmentEl.checked = false;
        }

        // 印刷費は自動計算フラグを有効にして強制再計算
        isAutoCostEnabled = true;
        updateAutoPrintCost();

        // 頒布スタイルチップの表示同期
        const fee = parseInt(eventFeeEl.value) || 0;
        if (fee === 0) {
            btnDistEventEl?.classList.remove('active');
            btnDistOnlineEl?.classList.add('active');
        } else {
            btnDistEventEl?.classList.add('active');
            btnDistOnlineEl?.classList.remove('active');
        }

        calculateAll();
        updateQuickPriceActiveBadge(null);
        showToast(`📋 プリセット「${btn.textContent.trim()}」を適用しました`);
    });
});

// --- 頒布スタイル切り替えトグル ---
btnDistEventEl?.addEventListener('click', () => {
    btnDistEventEl.classList.add('active');
    btnDistOnlineEl?.classList.remove('active');
    
    eventFeeEl.value = '7000';
    otherExpensesEl.value = '5000';
    useConsignmentEl.checked = false;
    
    calculateAll();
});

btnDistOnlineEl?.addEventListener('click', () => {
    btnDistEventEl?.classList.remove('active');
    btnDistOnlineEl.classList.add('active');
    
    eventFeeEl.value = '0';
    otherExpensesEl.value = '0';
    useConsignmentEl.checked = true;
    
    calculateAll();
});

// 手動で経費が編集された場合はチップのアクティブ状態を消す
[eventFeeEl, otherExpensesEl, useConsignmentEl].forEach(el => {
    el?.addEventListener('input', () => {
        btnDistEventEl?.classList.remove('active');
        btnDistOnlineEl?.classList.remove('active');
    });
    el?.addEventListener('change', () => {
        btnDistEventEl?.classList.remove('active');
        btnDistOnlineEl?.classList.remove('active');
    });
});

// --- モーダル ---
btnCloseModalEl.addEventListener('click', closeModal);
modalOverlayEl.addEventListener('click',  closeModal);

// --- Canvas 出力 ---
btnExportEl.addEventListener('click', exportSummaryImage);


// --- 作品保存 ---
btnSaveBookEl?.addEventListener('click', () => {
    // タイトル未入力の場合→アコーディオンを自動展開してフォーカス
    const title = customTitleEl.value.trim();
    if (!title) {
        if (accordionSaveMetaEl) accordionSaveMetaEl.open = true;
        if (saveValidationMsgEl) saveValidationMsgEl.style.display = 'block';
        // 展開アニメの完了を待ってからフォーカス
        setTimeout(() => {
            customTitleEl.focus();
            customTitleEl.style.borderColor = 'var(--danger)';
            customTitleEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 80);
        return;
    }
    if (saveValidationMsgEl) saveValidationMsgEl.style.display = 'none';
    customTitleEl.style.borderColor = '';

    const { totalExpenses, netProfit, breakevenSales, isPossibleBreakeven } = appState;

    const volume       = Math.max(1, parseInt(printVolumeEl.value)   || 1);
    const sellingPrice = Math.max(0, parseInt(sellingPriceEl.value)  || 0);
    const salesCount   = Math.max(0, parseInt(salesSliderEl.value)   || 0);
    const revenueRate  = useConsignmentEl.checked ? CONFIG.CONSIGNMENT_REVENUE_RATE : 1.0;
    const salesRevenue = Math.round(salesCount * sellingPrice * revenueRate);

    const newBook = {
        id:           Date.now().toString(),
        savedAt:      new Date().toISOString(),
        title,
        circle:       customCircleEl.value.trim() || '（サークル名未設定）',
        eventName:    customEventNameEl?.value.trim()  ?? '',
        eventDate:    customEventDateEl?.value         ?? '',
        bookSize:     bookSizeEl.value,
        printType:    printTypeEl.value,
        bookPages:    parseInt(bookPagesEl.value)   || 0,
        printVolume:  volume,
        sellingPrice,
        totalExpenses,
        salesCount,
        salesRevenue,
        netProfit,
        breakevenSales: isPossibleBreakeven ? breakevenSales : null,

        // 経費パラメータの完全保存 (再ロード時の完全再現用)
        eventFee:       parseInt(eventFeeEl.value)       || 0,
        otherExpenses:  parseInt(otherExpensesEl.value)  || 0,
        useConsignment: useConsignmentEl.checked,
        isAutoCost:     isAutoCostEnabled,
        printCost:      parseInt(printCostEl.value)      || 0,
    };

    const books = getBooks();
    books.unshift(newBook);
    setBooks(books);
    showToast(`💾「${title}」を作品リストに保存しました！`);
    $('tab-dashboard')?.click();
});

// タイトル入力中はバリデーションエラーを自動解除
customTitleEl?.addEventListener('input', () => {
    if (customTitleEl.value.trim()) {
        if (saveValidationMsgEl) saveValidationMsgEl.style.display = 'none';
        customTitleEl.style.borderColor = '';
    }
});

// --- タブ切り替え（イベント委譲で1つのリスナーに集約） ---
document.querySelector('.tab-navigation')?.addEventListener('click', e => {
    const btn = e.target.closest('.tab-button');
    if (!btn) return;

    const targetId = btn.getAttribute('aria-controls');

    tabButtons.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
    tabPanes.forEach(p   => { p.classList.remove('active'); p.style.display = 'none'; });

    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');

    const pane = document.getElementById(targetId);
    if (pane) { pane.style.display = 'block'; pane.classList.add('active'); }

    if (targetId === 'pane-dashboard') renderDashboard();
});

// --- ダッシュボード カード操作（イベント委譲） ---
savedBooksGridEl?.addEventListener('click', e => {
    const reloadBtn = e.target.closest('.btn-card-reload');
    const deleteBtn = e.target.closest('.btn-card-delete');
    if (reloadBtn) applyBookToSimulator(reloadBtn.dataset.id);
    if (deleteBtn) deleteBook(deleteBtn.dataset.id);
});

// --- バックアップ & インポート ---
btnExportDataEl?.addEventListener('click', exportBooksJson);
inputImportFileEl?.addEventListener('change', e => importBooksJson(e.target.files[0]));

// --- グローバルキーボードショートカット（Escape） ---
document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (exportModalEl.classList.contains('open')) closeModal();
    if (customDialogEl?.style.display !== 'none') _closeDialog(false);
});

/* ================================================================
   18. 初期化
================================================================ */
calculateAll();
renderDashboard();
// SNSアコーディオンは HTML属性 open で常時展開、保存メタは閉じた状態で起動。
if (accordionSaveMetaEl) accordionSaveMetaEl.open = false;

