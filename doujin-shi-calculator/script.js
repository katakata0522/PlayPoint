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

const eventFeeEl       = $('event-fee');
const otherExpensesEl  = $('other-expenses');
const sellingPriceEl   = $('selling-price');
const useConsignmentEl = $('use-consignment');

const btnQuick500El    = $('btn-quick-500');
const btnQuick1000El   = $('btn-quick-1000');
const btnQuickAutoEl   = $('btn-quick-auto');
const btnDistEventEl   = $('btn-dist-event');
const btnDistOnlineEl  = $('btn-dist-online');

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

// --- 損益分岐点（トントンライン）の主役化・スマホフローティング ---
const heroBreakevenValueEl     = $('hero-breakeven-value');
const heroBreakevenDescEl      = $('hero-breakeven-desc');
const mobileBreakevenDisplayEl = $('mobile-breakeven-display');
const mobileCurrentProfitEl    = $('mobile-current-profit');

// --- ボタン ---
const btnResetAllEl       = $('btn-reset-all');

// --- アフィリエイト ---
const dynamicAffiliateBoxEl = $('dynamic-affiliate-box');

// --- ページ数警告 ---
const pagesWarningEl      = $('pages-warning');


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

    // 損益分岐点（巨大ヒーロー表示 & 標準表示）
    if (isPossibleBreakeven) {
        breakevenSalesDisplayEl.textContent = String(breakevenSales);
        breakevenLineEl.style.left    = `${(breakevenSales / volume) * 100}%`;
        breakevenLineEl.style.display = 'block';

        if (heroBreakevenValueEl) heroBreakevenValueEl.textContent = String(breakevenSales);
        if (heroBreakevenDescEl) {
            const percent = volume > 0 ? Math.round((breakevenSales / volume) * 100) : 0;
            heroBreakevenDescEl.textContent = `予定部数 ${volume}部 のうち、${breakevenSales}部（全体の ${percent}%）が売れれば黒字に達します。`;
        }
    } else {
        breakevenSalesDisplayEl.textContent = '達成不可';
        breakevenLineEl.style.display = 'none';

        if (heroBreakevenValueEl) heroBreakevenValueEl.textContent = '達成不可';
        if (heroBreakevenDescEl) {
            if (sellingPrice === 0) {
                heroBreakevenDescEl.textContent = '頒布価格が「0円（無料配布）」のため、経費を回収できません。';
            } else {
                heroBreakevenDescEl.textContent = '完売しても黒字になりません。価格を見直すか、部数・経費を調整してください。';
            }
        }
    }

    // スマホ用フローティングバー同期
    if (mobileBreakevenDisplayEl) {
        mobileBreakevenDisplayEl.textContent = isPossibleBreakeven ? `${breakevenSales}` : '達成不可';
    }
    if (mobileCurrentProfitEl) {
        const prefix = netProfit >= 0 ? '+' : '-';
        mobileCurrentProfitEl.textContent = `${prefix}${yen(Math.abs(netProfit))}円`;
        mobileCurrentProfitEl.className = netProfit >= 0 ? 'floating-value gain-text' : 'floating-value loss-text';
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
   17. イベントリスナー登録
================================================================ */

// --- 印刷費 手動編集 ---
printCostEl.addEventListener('input', debounce(() => {
    isAutoCostEnabled = false;
    calculateAll();
}, CONFIG.DEBOUNCE_WAIT_MS));

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
    salesSliderEl.value      = '50';
    salesCountInputEl.value  = '50';

    // 頒布スタイルチップのリセット
    btnDistEventEl?.classList.add('active');
    btnDistOnlineEl?.classList.remove('active');

    updateQuickPriceActiveBadge(null);
    isAutoCostEnabled = true;
    updateAutoPrintCost();
    calculateAll();
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

/* ================================================================
   18. 初期化
================================================================ */
calculateAll();

