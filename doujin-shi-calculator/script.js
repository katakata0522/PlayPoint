/* ==========================================================================
   同人誌の発行部数&黒字化シミュレーター | script.js  v2.0
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
            24:  [3500,  6000,  9500, 15000, 20000],
            32:  [4000,  7000, 11000, 17500, 23000],
            40:  [4500,  8000, 12500, 20000, 26000],
            48:  [5000,  9000, 14000, 22500, 29000],
            64:  [6000, 11000, 17000, 27500, 35000],
            80:  [7000, 13000, 20000, 32500, 41000],
            100: [8500, 15500, 24000, 38500, 48000],
        },
    },
    B5: {
        pages:   [24, 32, 40, 48, 64, 80, 100],
        volumes: [20, 50, 100, 200, 300],
        prices: {
            24:  [4500,  8000, 12000, 18500, 25000],
            32:  [5200,  9200, 14000, 21500, 29000],
            40:  [6000, 10500, 16000, 24500, 33000],
            48:  [6800, 11800, 18000, 27500, 37000],
            64:  [8200, 14200, 22000, 33500, 45000],
            80:  [9600, 16600, 26000, 39500, 53000],
            100: [11500,19500, 31000, 47000, 63000],
        },
    },
    B6: {
        pages:   [24, 32, 40, 48, 64, 80, 100],
        volumes: [20, 50, 100, 200, 300],
        prices: {
            24:  [3200,  5500,  8500, 13500, 18000],
            32:  [3700,  6400, 10000, 15500, 21000],
            40:  [4200,  7300, 11500, 18000, 24000],
            48:  [4700,  8200, 13000, 20500, 27000],
            64:  [5600, 10000, 15500, 25000, 32000],
            80:  [6500, 11800, 18500, 29500, 37500],
            100: [7800, 14000, 22000, 35000, 44000],
        },
    },
    A6: {
        pages:   [40, 64, 80, 100, 150, 200],
        volumes: [20, 50, 100, 200, 300],
        prices: {
            40:  [3200,  5500,  8000, 12500, 17000],
            64:  [4000,  7000, 10500, 16500, 22000],
            80:  [4600,  8000, 12000, 19000, 25000],
            100: [5200,  9200, 14000, 22000, 29500],
            150: [7000, 12000, 18500, 29500, 39500],
            200: [8800, 15000, 23000, 37000, 49500],
        },
    },
    shinsho: {
        pages:   [40, 64, 80, 100, 150, 200],
        volumes: [20, 50, 100, 200, 300],
        prices: {
            40:  [3500,  6000,  8800, 14000, 19000],
            64:  [4400,  7700, 11500, 18000, 24500],
            80:  [5000,  8800, 13200, 21000, 28000],
            100: [5700, 10000, 15500, 24000, 32500],
            150: [7700, 13200, 20500, 32500, 43500],
            200: [9700, 16500, 25500, 41000, 54500],
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
                url:    'https://www.amazon.co.jp/dp/B000FHPDFQ?tag=katakata-22',
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

const snsFollowersEl   = $('sns-followers');
const snsLikesEl       = $('sns-likes');
const pixivBookmarksEl = $('pixiv-bookmarks');
const eventScaleEl     = $('event-scale');
const pastSalesEl      = $('past-sales');

const eventFeeEl       = $('event-fee');
const otherExpensesEl  = $('other-expenses');
const sellingPriceEl   = $('selling-price');
const useConsignmentEl = $('use-consignment');

const btnQuick500El    = $('btn-quick-500');
const btnQuick1000El   = $('btn-quick-1000');
const btnQuickAutoEl   = $('btn-quick-auto');

const customCircleEl      = $('custom-circle');
const customTitleEl       = $('custom-title');
const customEventNameEl   = $('custom-event-name');
const customEventDateEl   = $('custom-event-date');
const saveValidationMsgEl = $('save-validation-msg');
const accordionSnsPredictEl = $('accordion-sns-predict');

// --- 出力エリア ---
const predictionCardSectionEl = $('prediction-card-section');
const predSafeValueEl        = $('pred-safe-value');
const predStandardValueEl    = $('pred-standard-value');
const predAggressiveValueEl  = $('pred-aggressive-value');
const snsWarningBoxEl        = $('sns-warning-box');

const totalExpensesDisplayEl = $('total-expenses-display');
const unitCostDisplayEl      = $('unit-cost-display');

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
    safeVal:             0,
    standardVal:         0,
    aggressiveVal:       0,
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

/** 線形補間（1次元） */
function interpolate1D(x, xArr, yArr) {
    if (x <= xArr[0])                return yArr[0];
    if (x >= xArr[xArr.length - 1]) return yArr[yArr.length - 1];
    for (let i = 0; i < xArr.length - 1; i++) {
        if (x >= xArr[i] && x <= xArr[i + 1]) {
            const t = (x - xArr[i]) / (xArr[i + 1] - xArr[i]);
            return yArr[i] + t * (yArr[i + 1] - yArr[i]);
        }
    }
    return yArr[0];
}

/** ページ数・部数を 2次元補間して印刷費を推定する */
function estimatePrintCost(size, pageCount, volume) {
    const db = PRINT_PRICE_DB[size];
    if (!db) return 0;

    const safePage = clamp(pageCount, db.pages[0],   db.pages[db.pages.length - 1]);
    const safeVol  = clamp(volume,    db.volumes[0],  db.volumes[db.volumes.length - 1]);

    // 各ページ行で「部数」方向に補間した価格列を作る
    const pricesAtVol = db.pages.map(p => interpolate1D(safeVol, db.volumes, db.prices[p]));

    return Math.round(interpolate1D(safePage, db.pages, pricesAtVol));
}

/** 自動印刷費を計算して入力欄を更新する */
function updateAutoPrintCost() {
    if (!isAutoCostEnabled) return;

    const size      = bookSizeEl.value;
    const printType = printTypeEl.value;
    const pages     = clamp(parseInt(bookPagesEl.value)   || 1, 1,  500);
    const volume    = clamp(parseInt(printVolumeEl.value)  || 1, 1, 50000);

    let cost;
    if (printType === 'copybook') {
        cost = Math.round(6 * pages * volume);
    } else {
        cost = estimatePrintCost(size, pages, volume);
        if (printType === 'color') cost = Math.round(cost * 2.5);
    }

    printCostEl.value           = cost;
    costAutoBadgeEl.className   = 'cost-badge auto';
    costAutoBadgeEl.textContent = '自動計算中';
    btnResetCostEl.style.display = 'none';
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
        followers:     safeInt(snsFollowersEl,   0,  1000000),
        likes:         safeInt(snsLikesEl,       0,   100000),
        bookmarks:     safeInt(pixivBookmarksEl, 0,   100000),
        pastSales:     safeInt(pastSalesEl,      0,    50000),
        eventFee:      safeInt(eventFeeEl,       0,  1000000),
        otherExp:      safeInt(otherExpensesEl,  0,  1000000),
        sellingPrice:  safeInt(sellingPriceEl,   0,   100000),
        scale:         eventScaleEl.value,
        isConsignment: useConsignmentEl.checked,
        salesCount:    clamp(parseInt(salesSliderEl.value) || 0, 0, salesMax),
    };
}

/** SNS数値の矛盾を検出して警告を表示する */
function _updateWarnings({ likes, followers, bookmarks }) {
    const msgs = [];
    if (likes > followers && followers > 0)
        msgs.push('⚠️ いいね数がフォロワー数を上回っています。');
    if (bookmarks > followers * 10 && followers > 0)
        msgs.push('⚠️ pixivブクマ数がフォロワー数に対して極端に高密度です。');

    if (msgs.length) {
        snsWarningBoxEl.innerHTML =
            msgs.join('<br>') +
            '<br><small>※SNSの反応値のバランスが不自然なため、予測部数がぶれる可能性があります。</small>';
        snsWarningBoxEl.style.display = 'block';
    } else {
        snsWarningBoxEl.style.display = 'none';
    }
}

/** SNS・過去実績から推奨発行部数を計算する */
function _calcPredictions({ followers, likes, bookmarks, scale, pastSales }) {
    const scaleFactor = scale === 'large' ? 1.25 : 0.85;
    let base = (bookmarks * 0.15) + (likes * 0.08) + (followers * 0.008);
    if (pastSales > 0) base = base * 0.3 + pastSales * 0.7;

    const roundTo5 = (v) => Math.max(10, Math.round(v / 5) * 5);
    const wrap     = (v) => base > 0 ? roundTo5(v * scaleFactor) : 0;

    return {
        safeVal:       wrap(base * 0.7  +  8),
        standardVal:   wrap(base * 1.0  + 15),
        aggressiveVal: wrap(base * 1.4  + 25),
    };
}

/** 収支・損益分岐点を計算する */
function _calcProfit({ printCost, eventFee, otherExp, volume, sellingPrice, salesCount, isConsignment }) {
    const totalExpenses = printCost + eventFee + otherExp;
    const unitCost      = Math.round(totalExpenses / volume);
    const revenueRate   = isConsignment ? 0.7 : 1.0;
    const salesRevenue  = Math.round(salesCount * sellingPrice * revenueRate);
    const netProfit     = salesRevenue - totalExpenses;

    let breakevenSales      = 0;
    let isPossibleBreakeven = false;
    if (sellingPrice > 0) {
        breakevenSales      = Math.ceil(totalExpenses / (sellingPrice * revenueRate));
        isPossibleBreakeven = breakevenSales <= volume;
    }

    return { totalExpenses, unitCost, salesRevenue, netProfit, breakevenSales, isPossibleBreakeven };
}

/** 計算結果を画面に描画する */
function _renderCalcResults(inputs, preds, profit) {
    const { volume, salesCount, sellingPrice } = inputs;
    const { safeVal, standardVal, aggressiveVal } = preds;
    const { totalExpenses, unitCost, netProfit, breakevenSales, isPossibleBreakeven } = profit;

    // 推奨部数
    predSafeValueEl.textContent       = safeVal.toLocaleString('ja-JP');
    predStandardValueEl.textContent   = standardVal.toLocaleString('ja-JP');
    predAggressiveValueEl.textContent = aggressiveVal.toLocaleString('ja-JP');

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
            profitAdviceTextEl.textContent =
                `警告：本の価格設定（${sellingPrice}円）が低すぎるか、経費が高すぎます。` +
                `完売しても黒字になりません。1冊あたり最低でも ${Math.ceil(totalExpenses / volume)} 円以上に設定することをお勧めします。`;
        } else {
            profitAdviceTextEl.textContent =
                `あと ${breakevenSales - salesCount} 部の頒布で黒字に達します。` +
                `価格を少し上げるか、お品書きのデザインを工夫してアピールしてみましょう！`;
        }
    }
}

/** メイン計算エントリーポイント */
function calculateAll() {
    updateAutoPrintCost();

    const inputs = _readInputs();
    _updateWarnings(inputs);

    const preds  = _calcPredictions(inputs);
    const profit = _calcProfit(inputs);

    _renderCalcResults(inputs, preds, profit);

    // appState を最新値で更新（保存処理で使用）
    Object.assign(appState, {
        totalExpenses:       profit.totalExpenses,
        unitCost:            profit.unitCost,
        breakevenSales:      profit.breakevenSales,
        isPossibleBreakeven: profit.isPossibleBreakeven,
        safeVal:             preds.safeVal,
        standardVal:         preds.standardVal,
        aggressiveVal:       preds.aggressiveVal,
        netProfit:           profit.netProfit,
        salesRevenue:        profit.salesRevenue,
        salesCount:          inputs.salesCount,
    });

    updateAffiliateBox();
}

const debouncedCalculateAll = debounce(calculateAll, 120);

/* ================================================================
   6. クイック価格ボタン
================================================================ */

/** クイック価格ボタンのアクティブクラスを更新する */
function updateQuickPriceActiveBadge(activeBtn) {
    [btnQuick500El, btnQuick1000El, btnQuickAutoEl].forEach(b => b?.classList.remove('active'));
    activeBtn?.classList.add('active');
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
function exportSummaryImage() {
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
        ctx.fillText(customCircle || 'サークル名未設定', 720, 74);
        ctx.fillStyle = '#1f2937';
        ctx.font      = 'bold 15px "Noto Sans JP", sans-serif';
        ctx.fillText(`\uD83D\uDCD6 ${customTitle || '新刊計画'}`, 720, 96);
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
    const sizeLabel = bookSizeEl.options[bookSizeEl.selectedIndex].text.split('\uff08')[0];
    const typeLabel = printTypeEl.options[printTypeEl.selectedIndex].text.split('\uff08')[0];

    ctx.fillStyle = '#4b5563';
    ctx.font      = 'bold 16px "Noto Sans JP", sans-serif';
    ctx.fillText('\uD83D\uDCD6 本の仕様と価格設定', 60, 170);

    ctx.font      = '14px "Noto Sans JP", sans-serif';
    ctx.fillStyle = '#1f2937';
    [
        `\u30B5\u30A4\u30BA: ${sizeLabel}`,
        `\u5370\u5237\u4ED5\u69D8: ${typeLabel}`,
        `\u7DCF\u30DA\u30FC\u30B8\u6570: ${bookPagesEl.value} \u30DA\u30FC\u30B8`,
        `\u767A\u884C\u90E8\u6570: ${printVolumeEl.value} \u90E8`,
        `\u9811\u5E03\u4FA1\u683C: ${sellingPriceEl.value} \u5186 / 1\u518A`,
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
            ? `\u26A0\uFE0F \u640D\u76CA\u5206\u5C90\u70B9: ${breakevenSales} \u90E8 \u306E\u9811\u5E03\u3067\u9ED2\u5B57\u5316`
            : `\u26A0\uFE0F \u640D\u76CA\u5206\u5C90\u70B9: \u9054\u6210\u4E0D\u53EF`,
        85, 371);

    // 右カラム：推奨部数
    ctx.fillStyle = '#4b5563';
    ctx.font      = 'bold 16px "Noto Sans JP", sans-serif';
    ctx.fillText('\uD83D\uDCC8 \u63A8\u5968\u767A\u884C\u90E8\u6570', 440, 170);

    [
        { color: '#10b981', label: `\u624B\u5805\u3044\u90E8\u6570: ${appState.safeVal.toLocaleString('ja-JP')} \u90E8`,       bold: false },
        { color: '#8b5cf6', label: `\u304A\u3059\u3059\u3081\u6A19\u6E96\u90E8\u6570: ${appState.standardVal.toLocaleString('ja-JP')} \u90E8`, bold: true },
        { color: '#f59e0b', label: `\u5F37\u6C17\u306A\u90E8\u6570: ${appState.aggressiveVal.toLocaleString('ja-JP')} \u90E8`,   bold: false },
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
    ctx.fillText('\u7DCF\u7D4C\u8CBB (\u5370\u5237\u8CBB\uff0B\u30A4\u30D9\u30F3\u30C8\u7D4C\u8CBB)', 458, 375);
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
    ctx.fillText('\u304B\u305F\u304B\u305F\u306E\u540C\u4EBA\u30C4\u30FC\u30EB', sx + 10, sy + 18);
    ctx.fillStyle = '#8b5cf6'; ctx.fillRect(sx + 150, sy + 1, 39, 26);
    ctx.fillStyle = '#ffffff';
    ctx.font      = 'bold 10px "Noto Sans JP", sans-serif';
    ctx.fillText('\u691C\u7D22', sx + 158, sy + 17);

    // フッター
    ctx.fillStyle = '#9ca3af';
    ctx.font      = '11px "Noto Sans JP", sans-serif';
    ctx.fillText('Designed by \u304B\u305F\u304B\u305F (katakatalab.com)', 60, 452);

    try {
        openModal(exportCanvasEl.toDataURL('image/png'), exportCanvasEl.toDataURL('image/png'));
    } catch (err) {
        console.error('\u753B\u50CF\u751F\u6210\u30A8\u30E9\u30FC:', err);
        showToast('\u274C \u753B\u50CF\u306E\u66F8\u304D\u51FA\u3057\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002\u30D6\u30E9\u30A6\u30B6\u306ECanvas\u6A5F\u80FD\u3092\u3054\u78BA\u8A8D\u304F\u3060\u3055\u3044\u3002');
    }
}

/* ================================================================
   10. トースト通知
================================================================ */
function showToast(message) {
    document.querySelector('.toast-message')?.remove();
    const toast       = document.createElement('div');
    toast.className   = 'toast-message';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2700);
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
        showToast('\u274C \u30C7\u30FC\u30BF\u306E\u4FDD\u5B58\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002\u30B9\u30C8\u30EC\u30FC\u30B8\u5BB9\u91CF\u3092\u3054\u78BA\u8A8D\u304F\u3060\u3055\u3044\u3002');
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

    statBookCountEl.textContent     = `${books.length} \u4F5C\u54C1`;
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
                ? `<span>\uD83C\uDFAA ${escapeHtml(book.eventName)}</span>` : '';
            const evDate = book.eventDate
                ? `<span>\uD83D\uDCC5 ${new Date(book.eventDate).toLocaleDateString('ja-JP', {
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
                    <div class="book-card-title">\uD83D\uDCD6 ${escapeHtml(book.title)}</div>
                    <div class="book-card-circle">${escapeHtml(book.circle)}</div>
                </div>
                <span class="book-card-badge ${isGain ? 'gain' : 'loss'}">${isGain ? '\u2705 \u9ED2\u5B57' : '\uD83D\uDD34 \u8D64\u5B57'}</span>
            </div>
            ${eventHtml}
            <div class="book-card-meta">
                <div class="book-card-meta-item">
                    <span>\u5370\u5237\u90E8\u6570</span>
                    <strong class="font-outfit">${book.printVolume.toLocaleString('ja-JP')} \u90E8</strong>
                </div>
                <div class="book-card-meta-item">
                    <span>\u9811\u5E03\u6570</span>
                    <strong class="font-outfit">${book.salesCount.toLocaleString('ja-JP')} \u90E8</strong>
                </div>
                <div class="book-card-meta-item">
                    <span>\u9811\u5E03\u4FA1\u683C</span>
                    <strong class="font-outfit">${yen(book.sellingPrice)}</strong>
                </div>
                <div class="book-card-meta-item">
                    <span>\u7DCF\u7D4C\u8CBB</span>
                    <strong class="font-outfit">${yen(book.totalExpenses)}</strong>
                </div>
            </div>
            <div class="book-card-profit-row">
                <span class="book-card-profit-label">\u5B9F\u7E3E\u53CE\u652F</span>
                <span class="book-profit-amount ${isGain ? 'gain' : 'loss'}">
                    ${isGain ? '+' : '-'}${yen(Math.abs(book.netProfit))}
                </span>
            </div>
            <div class="book-card-saved-date">\u4FDD\u5B58\u65E5\uFF1A${savedDate}</div>
            <div class="book-card-actions">
                <button type="button" class="btn-card-action btn-card-reload"
                    data-id="${book.id}" title="\u3053\u306E\u4ED5\u69D8\u3092\u30B7\u30DF\u30E5\u30EC\u30FC\u30BF\u30FC\u306B\u8AAD\u307F\u8FBC\u3080">\uD83D\uDD01 \u518D\u30B7\u30DF\u30E5\u30EC\u30FC\u30B7\u30E7\u30F3</button>
                <button type="button" class="btn-card-action btn-card-delete"
                    data-id="${book.id}" title="\u3053\u306E\u8A18\u9332\u3092\u524A\u9664\u3059\u308B">\uD83D\uDDD1\uFE0F \u524A\u9664</button>
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

    if (book.bookSize)    bookSizeEl.value     = book.bookSize;
    if (book.printType)   printTypeEl.value    = book.printType;
    if (book.bookPages)   bookPagesEl.value    = book.bookPages;
    if (book.printVolume) printVolumeEl.value  = book.printVolume;
    if (book.sellingPrice)sellingPriceEl.value = book.sellingPrice;

    customCircleEl.value   = (book.circle && book.circle !== '\uff08\u30B5\u30FC\u30AF\u30EB\u540D\u672A\u8A2D\u5B9A\uff09') ? book.circle : '';
    customTitleEl.value    = book.title    ?? '';
    if (customEventNameEl) customEventNameEl.value = book.eventName ?? '';
    if (customEventDateEl) customEventDateEl.value = book.eventDate ?? '';

    salesSliderEl.max   = book.printVolume;
    salesSliderEl.value = book.salesCount ?? 0;
    if (salesCountInputEl) salesCountInputEl.value = book.salesCount ?? 0;

    // 予測値が保存されている場合はアコーディオンを展開、そうでなければ折りたたむ
    const hasPrediction = (book.predSafe > 0 || book.predStandard > 0 || book.predAggressive > 0);
    if (accordionSnsPredictEl) {
        accordionSnsPredictEl.open = hasPrediction;
        togglePredictionCard(hasPrediction);
    }

    isAutoCostEnabled = true;
    updateAutoPrintCost();
    calculateAll();
    updateQuickPriceActiveBadge(null);

    showToast(`\uD83D\uDD01\u300C${book.title}\u300D\u306E\u6761\u4EF6\u3092\u30B7\u30DF\u30E5\u30EC\u30FC\u30BF\u30FC\u306B\u8AAD\u307F\u8FBC\u307F\u307E\u3057\u305F`);
    $('tab-calculator')?.click();
}

/* ================================================================
   15. 作品データ削除
================================================================ */
async function deleteBook(bookId) {
    const book = getBooks().find(b => b.id === bookId);
    if (!book) return;

    const ok = await showDialog(`\u300C${book.title}\u300D\u306E\u8A18\u9332\u3092\u524A\u9664\u3057\u3066\u3088\u308D\u3057\u3044\u3067\u3059\u304B\uFF1F\n\u3053\u306E\u64CD\u4F5C\u306F\u5143\u306B\u623B\u305B\u307E\u305B\u3093\u3002`);
    if (!ok) return;

    setBooks(getBooks().filter(b => b.id !== bookId));
    renderDashboard();
    showToast(`\uD83D\uDDD1\uFE0F\u300C${book.title}\u300D\u3092\u524A\u9664\u3057\u307E\u3057\u305F`);
}

/* ================================================================
   16. JSON バックアップ & インポート
================================================================ */

/** 全データを JSON ファイルとしてダウンロードする */
function exportBooksJson() {
    const books = getBooks();
    if (!books.length) { showToast('\u26A0\uFE0F \u4FDD\u5B58\u3055\u308C\u305F\u30C7\u30FC\u30BF\u304C\u3042\u308A\u307E\u305B\u3093'); return; }

    const payload = {
        version:    '1.0',
        exportedAt: new Date().toISOString(),
        tool:       '\u540C\u4EBA\u8A8C\u306E\u767A\u884C\u90E8\u6570\uFF06\u9ED2\u5B57\u5316\u30B7\u30DF\u30E5\u30EC\u30FC\u30BF\u30FC',
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
    showToast(`\uD83D\uDCBE ${books.length}\u4EF6\u306E\u30C7\u30FC\u30BF\u3092\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u4FDD\u5B58\u3057\u307E\u3057\u305F`);
}

/** JSON ファイルからデータを復元する */
function importBooksJson(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ({ target }) => {
        try {
            const parsed = JSON.parse(target.result);
            if (!Array.isArray(parsed.books)) throw new Error('invalid format');

            const existing    = getBooks();
            const existingIds = new Set(existing.map(b => b.id));
            const newBooks    = parsed.books.filter(b => !existingIds.has(b.id));

            setBooks([...newBooks, ...existing]);
            renderDashboard();
            showToast(`\u2705 ${newBooks.length}\u4EF6\u3092\u5FA9\u5143\u3057\u307E\u3057\u305F\uff08\u91CD\u8907 ${parsed.books.length - newBooks.length}\u4EF6\u306F\u30B9\u30AD\u30C3\u30D7\uff09`);
        } catch {
            showToast('\u274C \u30D5\u30A1\u30A4\u30EB\u306E\u8AAD\u307F\u8FBC\u307F\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002\u30D5\u30A9\u30FC\u30DE\u30C3\u30C8\u3092\u3054\u78BA\u8A8D\u304F\u3060\u3055\u3044\u3002');
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
    costAutoBadgeEl.textContent = '\u624B\u52D5\u7DE8\u96C6';
    btnResetCostEl.style.display = 'inline-block';
    calculateAll();
}, 120));
btnResetCostEl.addEventListener('click', resetToAutoPrintCost);

// --- 即時反映（select / range / checkbox） ---
[bookSizeEl, printTypeEl, eventScaleEl, salesSliderEl, useConsignmentEl].forEach(el => {
    el?.addEventListener('change', calculateAll);
    el?.addEventListener('input',  calculateAll);
});

// --- デバウンス（数値テキスト入力） ---
[bookPagesEl, printVolumeEl, snsFollowersEl, snsLikesEl, pixivBookmarksEl,
 pastSalesEl, eventFeeEl, otherExpensesEl, sellingPriceEl].forEach(el => {
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

// --- 全表示/非表示制御関数 (アコーディオン連動) ---
function togglePredictionCard(isOpen) {
    if (!predictionCardSectionEl) return;
    if (isOpen) {
        predictionCardSectionEl.style.display = 'block';
        requestAnimationFrame(() => {
            predictionCardSectionEl.classList.add('show');
        });
    } else {
        predictionCardSectionEl.classList.remove('show');
        const handleTransitionEnd = (e) => {
            if (e.propertyName === 'opacity') {
                predictionCardSectionEl.style.display = 'none';
                predictionCardSectionEl.removeEventListener('transitionend', handleTransitionEnd);
            }
        };
        predictionCardSectionEl.addEventListener('transitionend', handleTransitionEnd);
        setTimeout(() => {
            if (!predictionCardSectionEl.classList.contains('show')) {
                predictionCardSectionEl.style.display = 'none';
            }
        }, 350);
    }
}

// --- 全リセット ---
btnResetAllEl?.addEventListener('click', () => {
    bookSizeEl.value         = 'A5';
    printTypeEl.value        = 'monochrome';
    bookPagesEl.value        = '32';
    printVolumeEl.value      = '100';
    snsFollowersEl.value     = '';
    snsLikesEl.value         = '';
    pixivBookmarksEl.value   = '';
    eventScaleEl.value       = 'medium';
    pastSalesEl.value        = '';
    eventFeeEl.value         = '8000';
    otherExpensesEl.value    = '5000';
    sellingPriceEl.value     = '500';
    useConsignmentEl.checked = false;
    customCircleEl.value     = '';
    customTitleEl.value      = '';
    if (customEventNameEl) customEventNameEl.value = '';
    if (customEventDateEl) customEventDateEl.value = '';
    salesSliderEl.value      = '50';
    salesCountInputEl.value  = '50';

    // アコーディオンもリセット
    if (accordionSnsPredictEl) {
        accordionSnsPredictEl.open = false;
        togglePredictionCard(false);
    }

    // バリデーション状態のリセット
    if (saveValidationMsgEl) saveValidationMsgEl.style.display = 'none';
    customTitleEl.style.borderColor = '';

    updateQuickPriceActiveBadge(null);
    isAutoCostEnabled = true;
    updateAutoPrintCost();
    calculateAll();
});

// --- アコーディオンの開閉監視 ---
accordionSnsPredictEl?.addEventListener('toggle', () => {
    togglePredictionCard(accordionSnsPredictEl.open);
});

// --- モーダル ---
btnCloseModalEl.addEventListener('click', closeModal);
modalOverlayEl.addEventListener('click',  closeModal);

// --- Canvas 出力 ---
btnExportEl.addEventListener('click', exportSummaryImage);


// --- 作品保存 ---
btnSaveBookEl?.addEventListener('click', () => {
    const title = customTitleEl.value.trim();
    if (!title) {
        if (saveValidationMsgEl) saveValidationMsgEl.style.display = 'block';
        customTitleEl.focus();
        customTitleEl.style.borderColor = 'var(--danger)';
        return;
    }
    if (saveValidationMsgEl) saveValidationMsgEl.style.display = 'none';
    customTitleEl.style.borderColor = '';

    const { totalExpenses, netProfit, breakevenSales, isPossibleBreakeven,
            safeVal, standardVal, aggressiveVal } = appState;

    const volume       = Math.max(1, parseInt(printVolumeEl.value)   || 1);
    const sellingPrice = Math.max(0, parseInt(sellingPriceEl.value)  || 0);
    const salesCount   = Math.max(0, parseInt(salesSliderEl.value)   || 0);
    const revenueRate  = useConsignmentEl.checked ? 0.7 : 1.0;
    const salesRevenue = Math.round(salesCount * sellingPrice * revenueRate);

    const newBook = {
        id:           Date.now().toString(),
        savedAt:      new Date().toISOString(),
        title,
        circle:       customCircleEl.value.trim() || '\uff08\u30B5\u30FC\u30AF\u30EB\u540D\u672A\u8A2D\u5B9A\uff09',
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
        predSafe:        safeVal,
        predStandard:    standardVal,
        predAggressive:  aggressiveVal,
    };

    const books = getBooks();
    books.unshift(newBook);
    setBooks(books);
    showToast(`\uD83D\uDCBE\u300C${title}\u300D\u3092\u4F5C\u54C1\u30EA\u30B9\u30C8\u306B\u4FDD\u5B58\u3057\u307E\u3057\u305F\uFF01`);
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

// 初期状態のアコーディオン開閉状態を右側カードへ適用
if (accordionSnsPredictEl) {
    togglePredictionCard(accordionSnsPredictEl.open);
}

