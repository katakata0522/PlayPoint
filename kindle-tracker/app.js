/* ==========================================================================
   Kindle Unlimited お得度メーター - JavaScript Logic (Light Theme & Flat Bar)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // --- State Management (Single Source of Truth) ---
    const state = {
        books: [],
        activeFilter: 'all',
        activePeriodFilter: 'all', // 📅 期間フィルター ('all', 'month-current', 'month-prev', 'three-months')
        settings: {
            monthlyFee: 980,
            duration: 3,
            subscriptionType: 'kindle',
            subscriptionName: 'Kindle Unlimited'
        },
        calculated: {
            totalValue: 0,
            netSavings: 0,
            bookCount: 0,
            percent: 0,
            targetCost: 2940
        },
        chartMode: 'count'
    };

    // --- DOM Elements ---
    const monthlyFeeInput = document.getElementById('monthly-fee');
    const durationInput = document.getElementById('duration');
    const targetCostDisplay = document.getElementById('target-cost-display');
    const targetCostVal = document.getElementById('target-cost-val');
    const subscriptionTypeSelect = document.getElementById('subscription-type');
    const subscriptionNameInput = document.getElementById('subscription-name');
    
    const progressPercentText = document.getElementById('progress-percent');
    const totalValueText = document.getElementById('total-value');
    const netSavingsText = document.getElementById('net-savings');
    const bookCountText = document.getElementById('book-count');
    const statusBadge = document.getElementById('status-badge');
    
    const bookForm = document.getElementById('book-form');
    const bookTitleInput = document.getElementById('book-title');
    const bookCategorySelect = document.getElementById('book-category');
    const bookPriceInput = document.getElementById('book-price');
    const readDateInput = document.getElementById('read-date');
    const bookNotesInput = document.getElementById('book-notes');
    const quickPriceButtons = document.querySelectorAll('.btn-quick-price');
    
    const sortSelect = document.getElementById('sort-select');
    const logsContainer = document.getElementById('logs-container');
    
    const btnShareX = document.getElementById('btn-share-x');
    const btnExport = document.getElementById('btn-export');
    const dropZone = document.getElementById('drop-zone');
    const inputImport = document.getElementById('input-import');
    
    // Celebration Modal Elements
    const celebrationModal = document.getElementById('celebration-modal');
    const celebrationClose = document.getElementById('celebration-close');
    const celebrationSavings = document.getElementById('celebration-savings');
    const btnCelebrationShareX = document.getElementById('btn-celebration-share-x');

    // Analytics Chart Elements
    const analyticsContainer = document.querySelector('.analytics-container');
    const statsChart = document.getElementById('stats-chart');
    const chartCenterVal = document.getElementById('chart-center-val');
    const chartCenterLabel = document.querySelector('.chart-center-label');
    const chartLegend = document.getElementById('chart-legend');
    const btnChartToggleCount = document.getElementById('btn-chart-toggle-count');
    const btnChartTogglePrice = document.getElementById('btn-chart-toggle-price');

    const progressBarFill = document.getElementById('progress-bar-fill');
    const confettiCanvas = document.getElementById('confetti-canvas');
    const ctx = confettiCanvas.getContext('2d');

    // UI Feedback Components (Toast & Custom Modal)
    const toastContainer = document.getElementById('toast-container');
    const customModal = document.getElementById('custom-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const modalBtnCancel = document.getElementById('modal-btn-cancel');
    const modalBtnConfirm = document.getElementById('modal-btn-confirm');

    // Confetti Animation State
    let confettiParticles = [];
    let animationFrameId = null;

    // Modal Promise Resolver
    let modalResolver = null;
    
    // --- 決定論的ハッシュ値生成ヘルパー ---
    function getStringHash(str) {
        let hash = 0;
        if (str.length === 0) return hash;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0; // 32bit整数に変換
        }
        return Math.abs(hash);
    }

    // --- Bookshelf Spine Styles Configurations by Category ---
    const categoryBookStyles = {
        business: { color: '#1A5F7A', minHeight: 76, maxHeight: 84, minWidth: 18, maxWidth: 22 },
        novel:    { color: '#A24838', minHeight: 74, maxHeight: 80, minWidth: 12, maxWidth: 16 },
        comic:    { color: '#D99E32', minHeight: 64, maxHeight: 70, minWidth: 16, maxWidth: 20 },
        magazine: { color: '#5C7A5C', minHeight: 84, maxHeight: 90, minWidth: 8,  maxWidth: 12 },
        other:    { color: '#837568', minHeight: 70, maxHeight: 76, minWidth: 14, maxWidth: 18 }
    };

    // Debounce Timer for Canvas Resize Performance Optimization
    let resizeTimeout = null;

    // --- Toast Notification System ---
    function showToast(message, type = 'success') {
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        toastContainer.appendChild(toast);

        // Slide out and remove toast after 5 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                if (toast.parentNode === toastContainer) {
                    toastContainer.removeChild(toast);
                }
            }, 300);
        }, 5000);
    }

    // --- Custom Modal Dialog (confirm fallback) ---
    // --- Helper to get Scrollbar Width to prevent layout shift ---
    function getScrollbarWidth() {
        return window.innerWidth - document.documentElement.clientWidth;
    }

    // --- Custom Confirm Modal Dialog (Focus Trap & Inert & Scroll Lock Support) ---
    function showConfirmModal(title, message) {
        if (!customModal) {
            return Promise.resolve(confirm(message));
        }

        const previousActiveElement = document.activeElement;

        modalTitle.textContent = title;
        modalMessage.textContent = message;
        customModal.style.display = 'flex';
        customModal.style.opacity = '0';
        
        // Transition fade-in
        requestAnimationFrame(() => {
            customModal.style.opacity = '1';
        });

        // Prevent background interaction for Assistive Tech (A11y)
        const mainElements = document.querySelectorAll('header, main, footer');
        mainElements.forEach(el => el.setAttribute('inert', ''));

        // Lock background scroll without shifting layout
        const scrollbarWidth = getScrollbarWidth();
        document.body.style.paddingRight = `${scrollbarWidth}px`;
        document.body.classList.add('modal-open');

        // Default focus on cancel button
        setTimeout(() => {
            modalBtnCancel.focus();
        }, 50);

        // Keyboard navigation and Focus Trap handler
        const modalKeydownHandler = (e) => {
            if (e.key === 'Escape') {
                closeConfirmModal(false);
            }
            if (e.key === 'Tab') {
                const focusableElements = [modalBtnCancel, modalBtnConfirm];
                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];

                if (e.shiftKey) { // Shift + Tab
                    if (document.activeElement === firstElement) {
                        lastElement.focus();
                        e.preventDefault();
                    }
                } else { // Tab
                    if (document.activeElement === lastElement) {
                        firstElement.focus();
                        e.preventDefault();
                    }
                }
            }
        };

        window.addEventListener('keydown', modalKeydownHandler);

        return new Promise((resolve) => {
            modalResolver = (result) => {
                window.removeEventListener('keydown', modalKeydownHandler);
                mainElements.forEach(el => el.removeAttribute('inert'));
                
                // Unlock background scroll
                document.body.style.paddingRight = '';
                document.body.classList.remove('modal-open');

                if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
                    previousActiveElement.focus();
                }
                resolve(result);
            };
        });
    }

    function closeConfirmModal(result) {
        if (!customModal) return;

        customModal.style.opacity = '0';
        setTimeout(() => {
            customModal.style.display = 'none';
        }, 200);

        if (modalResolver) {
            modalResolver(result);
            modalResolver = null;
        }
    }

    modalBtnCancel.addEventListener('click', () => closeConfirmModal(false));
    modalBtnConfirm.addEventListener('click', () => closeConfirmModal(true));

    // --- Celebration Modal Logic ---
    function showCelebrationModal(netSavings) {
        if (!celebrationModal) return;

        if (celebrationSavings) {
            celebrationSavings.textContent = netSavings.toLocaleString();
        }

        celebrationModal.style.display = 'flex';
        celebrationModal.style.opacity = '0';
        requestAnimationFrame(() => {
            celebrationModal.style.opacity = '1';
        });

        const mainElements = document.querySelectorAll('header, main, footer');
        mainElements.forEach(el => el.setAttribute('inert', ''));

        const scrollbarWidth = getScrollbarWidth();
        document.body.style.paddingRight = `${scrollbarWidth}px`;
        document.body.classList.add('modal-open');

        setTimeout(() => {
            celebrationClose.focus();
        }, 50);

        const celebrationKeydownHandler = (e) => {
            if (e.key === 'Escape') {
                closeCelebrationModal();
            }
            if (e.key === 'Tab') {
                const focusableElements = [celebrationClose, btnCelebrationShareX];
                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];

                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        lastElement.focus();
                        e.preventDefault();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        firstElement.focus();
                        e.preventDefault();
                    }
                }
            }
        };

        window.addEventListener('keydown', celebrationKeydownHandler);
        celebrationModal.activeKeydownHandler = celebrationKeydownHandler;
    }

    function closeCelebrationModal() {
        if (!celebrationModal) return;

        celebrationModal.style.opacity = '0';
        setTimeout(() => {
            celebrationModal.style.display = 'none';
        }, 200);

        // モーダルを閉じたと同時に紙吹雪アニメーションを停止・クリーンアップ
        stopConfetti();

        const mainElements = document.querySelectorAll('header, main, footer');
        mainElements.forEach(el => el.removeAttribute('inert'));
        
        document.body.style.paddingRight = '';
        document.body.classList.remove('modal-open');

        if (celebrationModal.activeKeydownHandler) {
            window.removeEventListener('keydown', celebrationModal.activeKeydownHandler);
            celebrationModal.activeKeydownHandler = null;
        }
    }

    if (celebrationClose) {
        celebrationClose.addEventListener('click', closeCelebrationModal);
    }
    if (celebrationModal) {
        celebrationModal.addEventListener('click', (e) => {
            if (e.target === celebrationModal) {
                closeCelebrationModal();
            }
        });
    }

    // --- Helper to Check and Wrap LocalStorage (Resolves Private Browsing/Storage Block Crashes) ---
    let isStorageAvailable = null;
    function checkStorageAvailability() {
        if (isStorageAvailable !== null) return isStorageAvailable;
        try {
            const testKey = '__storage_test__';
            localStorage.setItem(testKey, testKey);
            localStorage.removeItem(testKey);
            isStorageAvailable = true;
        } catch (e) {
            isStorageAvailable = false;
            console.warn('localStorage is not available. Falling back to in-memory storage.', e);
        }
        return isStorageAvailable;
    }

    function safeGet(key) {
        if (!checkStorageAvailability()) return null;
        try {
            return localStorage.getItem(key);
        } catch (e) {
            console.error('Failed to get item from localStorage', e);
            return null;
        }
    }

    function safeSave(key, value) {
        if (!checkStorageAvailability()) {
            return true; // Fallback to memory
        }
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (e) {
            if (e.name === 'QuotaExceededError' || e.code === 22 || e.number === 0x8007000E) {
                showToast('保存容量（5MB）の上限に達しました。不要なログを削除してください。', 'error');
            } else {
                showToast('データの保存に失敗しました: ' + e.message, 'error');
            }
            return false;
        }
    }

    // --- Initialize ---
    function init() {
        // Load data from localStorage
        const storedBooks = safeGet('ku_tracker_books');
        const storedSettings = safeGet('ku_tracker_settings');
        
        if (storedBooks) {
            try {
                state.books = JSON.parse(storedBooks);
            } catch (e) {
                console.error('Failed to parse stored books', e);
                state.books = [];
            }
        }
        
        if (storedSettings) {
            try {
                const parsed = JSON.parse(storedSettings);
                state.settings = { ...state.settings, ...parsed };
                monthlyFeeInput.value = state.settings.monthlyFee || 980;
                durationInput.value = state.settings.duration || 3;
                if (subscriptionTypeSelect) subscriptionTypeSelect.value = state.settings.subscriptionType || 'kindle';
                if (subscriptionNameInput) subscriptionNameInput.value = state.settings.subscriptionName || 'Kindle Unlimited';
            } catch (e) {
                console.error('Failed to parse stored settings', e);
            }
        }

        // Set default date to local timezone today (Resolves UTC timezone offset bug)
        const now = new Date();
        const offset = now.getTimezoneOffset() * 60000; // Minutes to ms
        const localISOTime = (new Date(now - offset)).toISOString().split('T')[0];
        readDateInput.value = localISOTime;

        // 期間フィルタータブイベントリスナーの登録
        const periodTabs = document.querySelectorAll('.period-tab');
        periodTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                periodTabs.forEach(t => {
                    t.classList.remove('active');
                    t.setAttribute('aria-selected', 'false');
                });
                tab.classList.add('active');
                tab.setAttribute('aria-selected', 'true');
                state.activePeriodFilter = tab.getAttribute('data-period') || 'all';
                
                updateCalculations();
                renderLogs();
            });
        });

        // サブスク設定変更イベントの登録
        const subPresets = {
            kindle: { name: 'Kindle Unlimited', fee: 980 },
            prime: { name: 'Amazon Prime', fee: 600 },
            youtube: { name: 'YouTube Premium', fee: 1280 },
            netflix: { name: 'Netflix', fee: 1490 }
        };

        if (subscriptionTypeSelect) {
            subscriptionTypeSelect.addEventListener('change', () => {
                const type = subscriptionTypeSelect.value;
                state.settings.subscriptionType = type;
                if (type !== 'custom' && subPresets[type]) {
                    state.settings.subscriptionName = subPresets[type].name;
                    state.settings.monthlyFee = subPresets[type].fee;
                    
                    if (subscriptionNameInput) subscriptionNameInput.value = subPresets[type].name;
                    monthlyFeeInput.value = subPresets[type].fee;
                }
                updateSubscriptionContext();
                updateCalculations();
                renderLogs();
                // サブスクの種類変更に伴い、カテゴリの初期デフォルト価格を即座に連動反映させる
                if (bookCategorySelect) {
                    bookCategorySelect.dispatchEvent(new Event('change'));
                }
            });
        }

        if (subscriptionNameInput) {
            subscriptionNameInput.addEventListener('input', () => {
                const name = subscriptionNameInput.value.trim();
                state.settings.subscriptionName = name || 'カスタムサブスク';
                
                if (subscriptionTypeSelect && subscriptionTypeSelect.value !== 'custom') {
                    const currentType = subscriptionTypeSelect.value;
                    if (!subPresets[currentType] || subPresets[currentType].name !== name) {
                        subscriptionTypeSelect.value = 'custom';
                        state.settings.subscriptionType = 'custom';
                    }
                }
                updateSubscriptionContext();
                updateCalculations();
                renderLogs();
            });
        }

        // 初回テキストマッピング
        updateSubscriptionContext();

        // Render everything
        updateCalculations();
        renderLogs();
        setupCanvasSize();
        handleResponsiveLayout(); // 初期配置を画面サイズに合わせて決定
        updateQuickPriceActiveState(); // 初期価格に対するクイック価格ボタンのアクティブ連動
    }

    // --- 期間別 ＆ 検索キーワードでフィルタリングされた本リストを返すヘルパー ---
    function getFilteredBooksByPeriod() {
        const period = state.activePeriodFilter || 'all';
        let filtered = [...state.books];
        
        // 1. 期間フィルターの適用
        if (period !== 'all') {
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth(); // 0-indexed
            
            filtered = filtered.filter(book => {
                if (!book.readDate) return false;
                const bookDateObj = new Date(book.readDate + 'T00:00:00');
                const bookYear = bookDateObj.getFullYear();
                const bookMonth = bookDateObj.getMonth();
                
                if (period === 'month-current') {
                    return bookYear === currentYear && bookMonth === currentMonth;
                } else if (period === 'month-prev') {
                    const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
                    return bookYear === prevMonthDate.getFullYear() && bookMonth === prevMonthDate.getMonth();
                } else if (period === 'three-months') {
                    const threeMonthsAgoLimit = new Date(currentYear, currentMonth - 2, 1);
                    return bookDateObj >= threeMonthsAgoLimit && bookDateObj <= new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
                }
                return true;
            });
        }
        
        // 2. キーワード検索フィルターの適用
        const searchInput = document.getElementById('log-search-input');
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        if (query) {
            filtered = filtered.filter(book => {
                const titleMatch = (book.title || '').toLowerCase().includes(query);
                const notesMatch = (book.notes || '').toLowerCase().includes(query);
                return titleMatch || notesMatch;
            });
        }
        
        return filtered;
    }

    // --- サブスク設定に基づく画面全体のテキスト切り替え ---
    function updateSubscriptionContext() {
        const type = state.settings.subscriptionType || 'kindle';
        const name = state.settings.subscriptionName || 'Kindle Unlimited';
        
        // 1. タイトル
        const appTitle = document.getElementById('app-title');
        if (appTitle) {
            appTitle.textContent = `${name} お得度メーター`;
        }
        document.title = `${name} お得度メーター - PlayPoint`;

        // 2. 各種ラベルと見出し
        const bookshelfTitle = document.getElementById('bookshelf-title');
        const formCardTitle = document.getElementById('form-card-title');
        const labelBookTitle = document.getElementById('label-book-title');
        const labelBookPrice = document.getElementById('label-book-price');
        const btnSubmitBook = document.getElementById('btn-submit-book');
        const logsCardTitle = document.getElementById('logs-card-title');
        const bookTitleInput = document.getElementById('book-title');
        const bookCategorySelect = document.getElementById('book-category');
        const introTitle = document.getElementById('intro-title');
        const introDesc = document.getElementById('intro-desc');
        const celebrationSubName = document.getElementById('celebration-sub-name');
        const celebrationSub = document.getElementById('celebration-sub');
        const adsText = document.getElementById('ads-text');
        const footerNote = document.getElementById('footer-note');

        const isVideo = ['prime', 'netflix', 'youtube'].includes(type);

        const statLabels = document.querySelectorAll('.stat-label');
        const statUnits = document.querySelectorAll('.stat-unit');

        if (isVideo) {
            if (bookshelfTitle) bookshelfTitle.textContent = `🎬 あなたの視聴コレクション棚`;
            if (formCardTitle) formCardTitle.textContent = `✍️ 視聴した作品・動画を記録する`;
            if (labelBookTitle) labelBookTitle.innerHTML = `作品・動画タイトル <span class="required">*</span>`;
            if (labelBookPrice) labelBookPrice.innerHTML = `見放題相当価値 (円) <span class="required">*</span>`;
            if (btnSubmitBook) btnSubmitBook.textContent = `🎬 ログを追加する`;
            if (logsCardTitle) logsCardTitle.textContent = `🎬 視聴ログ履歴`;
            if (bookTitleInput) bookTitleInput.placeholder = `例: インターステラー`;
            if (introTitle) introTitle.textContent = `🎬 視聴した作品の価値を記録して、サブスクの「お得度」を見える化しよう！`;
            if (introDesc) introDesc.textContent = `NetflixやAmazonプライム等の月額料金に対してどれだけ元を取れたかをリアルタイムで計算・可視化する視聴管理ツールです。お得度を見える化し、賢く楽しく使いこなしましょう！`;
            if (celebrationSubName) celebrationSubName.textContent = name;
            if (celebrationSub) celebrationSub.textContent = `これからの視聴はすべて「純粋な利益」になります。この喜びをみんなに共有しましょう！`;
            if (adsText) adsText.textContent = `あなたのエンタメライフをさらに豊かにするサービスをご紹介予定です。`;
            if (footerNote) footerNote.textContent = `${name} お得度メーターは、あなたの視聴ライフとサブスクライフを応援する個人開発のツールです。`;
            
            if (bookCategorySelect && bookCategorySelect.options.length >= 5) {
                bookCategorySelect.options[0].text = '💼 教養/ドキュメンタリー';
                bookCategorySelect.options[1].text = '📕 映画/ドラマ';
                bookCategorySelect.options[2].text = '🎨 アニメ';
                bookCategorySelect.options[3].text = '📖 番組/バラエティ';
                bookCategorySelect.options[4].text = '📚 その他';
            }

            if (statLabels[0]) statLabels[0].textContent = `🎬 累計視聴価値`;
            if (statLabels[2]) statLabels[2].textContent = `🎬 視聴数`;
            if (statUnits[2]) statUnits[2].textContent = `作品`;
        } else {
            if (bookshelfTitle) bookshelfTitle.textContent = `📚 あなたの本棚`;
            if (formCardTitle) formCardTitle.textContent = `✍️ 読んだ本を記録する`;
            if (labelBookTitle) labelBookTitle.innerHTML = `本のタイトル <span class="required">*</span>`;
            if (labelBookPrice) labelBookPrice.innerHTML = `定価・元値 (円) <span class="required">*</span>`;
            if (btnSubmitBook) btnSubmitBook.textContent = `📖 本のログを追加する`;
            if (logsCardTitle) logsCardTitle.textContent = `📖 読書ログ履歴`;
            if (bookTitleInput) bookTitleInput.placeholder = `例: 限りある時間の使い方`;
            if (introTitle) introTitle.textContent = `📚 読んだ本の定価を記録して、サブスクの「お得度」を見える化しよう！`;
            if (introDesc) introDesc.textContent = `Kindle Unlimitedなどの月額料金に対してどれだけ元を取れたかをリアルタイムで計算・可視化する読書管理ツールです。お得度を見える化し、賢く楽しく使いこなしましょう！`;
            if (celebrationSubName) celebrationSubName.textContent = name;
            if (celebrationSub) celebrationSub.textContent = `これからの読書はすべて「純粋な利益」になります。この喜びをみんなに共有しましょう！`;
            if (adsText) adsText.textContent = `あなたの読書ライフをさらに豊かにするサービスをご紹介予定です。`;
            if (footerNote) footerNote.textContent = `${name} お得度メーターは、あなたの読書ライフとサブスクライフを応援する個人開発のツールです。`;
            
            if (bookCategorySelect && bookCategorySelect.options.length >= 5) {
                bookCategorySelect.options[0].text = '💼 ビジネス書/実用書';
                bookCategorySelect.options[1].text = '📕 小説/ライトノベル';
                bookCategorySelect.options[2].text = '🎨 マンガ';
                bookCategorySelect.options[3].text = '📖 雑誌';
                bookCategorySelect.options[4].text = '📚 その他';
            }

            if (statLabels[0]) statLabels[0].textContent = `📚 累計本棚価値`;
            if (statLabels[2]) statLabels[2].textContent = `📖 読了数`;
            if (statUnits[2]) statUnits[2].textContent = `冊`;
        }
    }

    // --- Core Calculations ---
    function updateCalculations() {
        let monthlyFee = parseInt(monthlyFeeInput.value);
        let duration = parseInt(durationInput.value);

        // Guard extreme config settings values
        if (isNaN(monthlyFee) || monthlyFee < 0) monthlyFee = 980;
        if (monthlyFee > 1000000) monthlyFee = 1000000;
        
        if (isNaN(duration) || duration < 1) duration = 3;
        if (duration > 120) duration = 120;

        // 期間別フィルターに基づき、目標の月数を変動させる
        let activeDuration = duration;
        if (state.activePeriodFilter === 'month-current' || state.activePeriodFilter === 'month-prev') {
            activeDuration = 1;
        } else if (state.activePeriodFilter === 'three-months') {
            activeDuration = 3;
        }

        const targetCost = monthlyFee * activeDuration;

        // Save settings securely
        state.settings.monthlyFee = monthlyFee;
        state.settings.duration = duration;
        state.settings.subscriptionType = subscriptionTypeSelect ? subscriptionTypeSelect.value : 'kindle';
        state.settings.subscriptionName = subscriptionNameInput ? subscriptionNameInput.value.trim() : 'Kindle Unlimited';
        safeSave('ku_tracker_settings', JSON.stringify(state.settings));

        targetCostDisplay.textContent = targetCost.toLocaleString();
        if (targetCostVal) {
            targetCostVal.textContent = targetCost.toLocaleString();
        }

        // 期間別で絞り込んだ本のみを計算に使う
        const periodBooks = getFilteredBooksByPeriod();

        const totalValue = periodBooks.reduce((sum, book) => sum + (book.price || 0), 0);
        const netSavings = totalValue - targetCost;
        const bookCount = periodBooks.length;

        // Calculate percent
        let percent = 0;
        if (targetCost > 0) {
            percent = Math.round((totalValue / targetCost) * 100);
        } else if (totalValue > 0) {
            percent = 100;
        }

        // Store calculations to state (Single Source of Truth)
        state.calculated.totalValue = totalValue;
        state.calculated.netSavings = netSavings;
        state.calculated.bookCount = bookCount;
        state.calculated.percent = percent;
        state.calculated.targetCost = targetCost;

        // Update basic text
        totalValueText.textContent = totalValue.toLocaleString();
        bookCountText.textContent = bookCount.toLocaleString();
        
        const type = state.settings.subscriptionType || 'kindle';
        const isVideo = ['prime', 'netflix', 'youtube'].includes(type);

        // Net savings display with +/- classes
        if (bookCount === 0) {
            netSavingsText.textContent = isVideo ? '1本目を記録しよう！' : '1冊目を記録しよう！';
            netSavingsText.className = 'stat-value number savings-zero';
            const unit = netSavingsText.nextElementSibling;
            if (unit && unit.classList.contains('stat-unit')) {
                unit.style.display = 'none';
            }
        } else {
            netSavingsText.textContent = (netSavings >= 0 ? '+' : '') + netSavings.toLocaleString();
            if (netSavings >= 0) {
                netSavingsText.className = 'stat-value number savings-plus';
            } else {
                netSavingsText.className = 'stat-value number savings-minus';
            }
            const unit = netSavingsText.nextElementSibling;
            if (unit && unit.classList.contains('stat-unit')) {
                unit.style.display = '';
            }
        }

        // Toggle X share actions based on books count
        const shareActions = document.querySelector('.share-actions');
        if (shareActions) {
            // 全体の登録数が0件なら非表示にする
            shareActions.style.display = state.books.length === 0 ? 'none' : '';
        }

        // Update progress bar
        updateProgressBar(percent);

        // Update Status Badge and trigger confetti if just achieved target
        updateStatusBadge(percent, totalValue, targetCost);

        // Update wooden bookshelf visualization
        updateBookshelfUI();

        // Update analytics pie chart visualization
        updateAnalyticsChart();

        // プレミアム機能：称号スタンプとバックアップ推奨ふせんの更新
        updateAchievementStamp(netSavings, bookCount);
        updateBackupReminder();
    }

    function updateBookshelfUI() {
        const bookshelfContainer = document.querySelector('.bookshelf-wrapper');
        const bookshelf = document.getElementById('bookshelf');
        if (!bookshelfContainer || !bookshelf) return;

        // Toggle wood glow effect on target achieved
        const percent = state.calculated.percent;
        if (percent >= 100 && state.calculated.targetCost > 0) {
            bookshelfContainer.classList.add('achieved');
        } else {
            bookshelfContainer.classList.remove('achieved');
        }

        // Clear bookshelf
        bookshelf.textContent = '';

        // 期間絞り込みを適用
        const books = getFilteredBooksByPeriod();
        const type = state.settings.subscriptionType || 'kindle';
        const isVideo = ['prime', 'netflix', 'youtube'].includes(type);

        if (books.length === 0) {
            const emptyGuide = document.createElement('div');
            emptyGuide.className = 'bookshelf-empty-guide';
            const guideText = isVideo 
                ? '<p>まず1本登録すると、<br>ここに作品が並びます 🎬</p>'
                : '<p>まず1冊登録すると、<br>ここに本が並びます 📚</p>';
            emptyGuide.innerHTML = guideText;
            bookshelf.appendChild(emptyGuide);
            return;
        }

        const booksPerShelf = 8; // 1段あたり8冊配置
        const maxShelves = 5; // 最大5段（40冊）まで本棚を描画
        const shelfCount = Math.max(1, Math.min(maxShelves, Math.ceil(books.length / booksPerShelf)));

        for (let i = 0; i < shelfCount; i++) {
            const shelfRow = document.createElement('div');
            shelfRow.className = 'shelf-row';

            const booksRow = document.createElement('div');
            booksRow.className = 'books-row';
            booksRow.id = `bookshelf-row-${i + 1}`;

            const shelfPlank = document.createElement('div');
            shelfPlank.className = 'shelf-plank';

            // その段に配置する本をスライスしてレンダリング
            const startIndex = i * booksPerShelf;
            const endIndex = Math.min(startIndex + booksPerShelf, books.length);
            const booksToRender = books.slice(startIndex, endIndex);

            booksToRender.forEach((book, idx) => {
                const bookDiv = document.createElement('div');
                
                const styleCfg = categoryBookStyles[book.category || 'other'];
                // タイトルと定価からハッシュ値を算出し、決定論的なランダムシードとして活用
                const hashSeed = getStringHash(book.title + (book.price || 0));
                
                const heightRange = styleCfg.maxHeight - styleCfg.minHeight;
                const widthRange = styleCfg.maxWidth - styleCfg.minWidth;
                
                // でこぼこな本棚を再現する高さ・太さの計算
                const resolvedHeight = styleCfg.minHeight + (hashSeed % 13) * (heightRange / 12);
                const resolvedWidth = styleCfg.minWidth + (hashSeed % 7) * (widthRange / 6);
                
                // 装幀デコレーションパターンの決定論的適用 (0: ストライプ, 1: 金箔, 2: 中央ラベル)
                const decorClasses = ['spine-decor-stripes', 'spine-decor-gold', 'spine-decor-label'];
                const chosenDecor = decorClasses[hashSeed % decorClasses.length];
                
                bookDiv.className = `shelf-book ${chosenDecor}`;
                bookDiv.style.setProperty('--book-height', `${resolvedHeight}px`);
                bookDiv.style.setProperty('--book-width', `${resolvedWidth}px`);
                bookDiv.style.setProperty('--book-color', styleCfg.color);
                bookDiv.title = `${book.title} (${book.price.toLocaleString()}円)`;
                
                // カテゴリシンボル絵文字を追加
                const categorySymbols = {
                    business: '💼',
                    novel: '📕',
                    comic: '🎨',
                    magazine: '📖',
                    other: '📚'
                };
                
                const categorySymbolsVideo = {
                    business: '💼',
                    novel: '🎬',
                    comic: '🎨',
                    magazine: '📺',
                    other: '📦'
                };

                const symbolSpan = document.createElement('span');
                symbolSpan.className = 'shelf-book-symbol';
                const symbols = isVideo ? categorySymbolsVideo : categorySymbols;
                symbolSpan.textContent = symbols[book.category || 'other'] || '📚';
                bookDiv.appendChild(symbolSpan);
                
                bookDiv.addEventListener('click', () => {
                    const logElements = logsContainer.querySelectorAll('.book-item');
                    const targetLog = Array.from(logElements).find(el => {
                        const titleSpan = el.querySelector('.book-title');
                        return titleSpan && titleSpan.textContent === book.title;
                    });
                    
                    if (targetLog) {
                        targetLog.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        targetLog.style.outline = '2px dashed var(--accent)';
                        targetLog.style.outlineOffset = '2px';
                        setTimeout(() => {
                            targetLog.style.outline = '';
                            targetLog.style.outlineOffset = '';
                        }, 1500);
                    }
                });

                booksRow.appendChild(bookDiv);
            });

            shelfRow.appendChild(booksRow);
            shelfRow.appendChild(shelfPlank);
            bookshelf.appendChild(shelfRow);
        }
    }

    function updateAnalyticsChart() {
        if (!analyticsContainer || !statsChart || !chartLegend) return;

        // 期間で絞り込んだ本を使用
        const periodBooks = getFilteredBooksByPeriod();
        const totalBooks = periodBooks.length;
        
        const type = state.settings.subscriptionType || 'kindle';
        const isVideo = ['prime', 'netflix', 'youtube'].includes(type);

        // グラフコンテナは常に表示
        analyticsContainer.style.display = 'flex';

        if (totalBooks === 0) {
            if (chartCenterVal) {
                chartCenterVal.textContent = '0';
                chartCenterVal.style.fontSize = '';
            }
            if (chartCenterLabel) {
                chartCenterLabel.textContent = isVideo ? '作品' : '冊';
            }
            statsChart.textContent = '';
            
            // セピア調の破線（ダッシュ）プレースホルダー円を描画
            const radius = 35;
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', '50');
            circle.setAttribute('cy', '50');
            circle.setAttribute('r', radius.toString());
            circle.setAttribute('stroke', '#D3C8BA'); // セピア調の境界線色
            circle.setAttribute('stroke-dasharray', '4, 3'); // 破線（ダッシュ）
            circle.setAttribute('fill', 'none');
            circle.setAttribute('stroke-width', '10');
            circle.style.opacity = '0.6';
            statsChart.appendChild(circle);

            chartLegend.textContent = '';
            const emptyLegend = document.createElement('div');
            emptyLegend.className = 'chart-empty-legend';
            emptyLegend.textContent = isVideo
                ? '作品を登録すると、カテゴリ別の視聴割合グラフが表示されます。'
                : '本を登録すると、カテゴリ別の読書割合グラフが表示されます。';
            chartLegend.appendChild(emptyLegend);
            return;
        }

        analyticsContainer.style.display = 'flex';

        // 1. 各カテゴリの統計（冊数・金額）を計算
        const categoryDataKindle = {
            business: { count: 0, price: 0, label: 'ビジネス書/実用書', color: '#1A5F7A' },
            novel:    { count: 0, price: 0, label: '小説/ライトノベル', color: '#A24838' },
            comic:    { count: 0, price: 0, label: 'マンガ', color: '#D99E32' },
            magazine: { count: 0, price: 0, label: '雑誌', color: '#5C7A5C' },
            other:    { count: 0, price: 0, label: 'その他', color: '#837568' }
        };

        const categoryDataVideo = {
            business: { count: 0, price: 0, label: '教養/ドキュメンタリー', color: '#1A5F7A' },
            novel:    { count: 0, price: 0, label: '映画/ドラマ', color: '#A24838' },
            comic:    { count: 0, price: 0, label: 'アニメ', color: '#D99E32' },
            magazine: { count: 0, price: 0, label: '番組/バラエティ', color: '#5C7A5C' },
            other:    { count: 0, price: 0, label: 'その他', color: '#837568' }
        };

        const categoryData = isVideo ? categoryDataVideo : categoryDataKindle;

        periodBooks.forEach(book => {
            const cat = book.category || 'other';
            if (categoryData[cat]) {
                categoryData[cat].count++;
                categoryData[cat].price += book.price;
            }
        });

        // 2. SVGドーナツグラフ（パイチャート）の描画
        statsChart.textContent = ''; // SVGをクリア
        
        const isPriceMode = state.chartMode === 'price';
        const totalValue = periodBooks.reduce((sum, b) => sum + b.price, 0);
        const totalForChart = isPriceMode ? totalValue : totalBooks;

        // 総冊数・金額テキスト更新とフォントサイズの動的調整
        if (chartCenterVal) {
            if (isPriceMode) {
                const valStr = totalValue.toLocaleString();
                chartCenterVal.textContent = valStr;
                chartCenterVal.style.fontSize = valStr.length > 6 ? '0.95rem' : (valStr.length > 4 ? '1.2rem' : '1.5rem');
                if (chartCenterLabel) chartCenterLabel.textContent = '円';
            } else {
                chartCenterVal.textContent = totalBooks;
                chartCenterVal.style.fontSize = '';
                if (chartCenterLabel) chartCenterLabel.textContent = isVideo ? '本' : '冊';
            }
        }

        const radius = 35;
        const circumference = 2 * Math.PI * radius; // 219.9
        let accumulatedPercent = 0;

        Object.keys(categoryData).forEach(cat => {
            const data = categoryData[cat];
            if (data.count === 0) return;

            const ratio = isPriceMode ? (totalForChart > 0 ? data.price / totalForChart : 0) : data.count / totalBooks;
            const sliceLength = ratio * circumference;
            const percentText = (ratio * 100).toFixed(1);

            // ドーナツの円弧 (スライス) を生成
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('class', 'chart-slice');
            circle.setAttribute('cx', '50');
            circle.setAttribute('cy', '50');
            circle.setAttribute('r', radius.toString());
            circle.setAttribute('stroke', data.color);
            circle.setAttribute('stroke-dasharray', `${sliceLength} ${circumference}`);
            circle.setAttribute('stroke-dashoffset', '0');
            circle.setAttribute('transform', `rotate(${accumulatedPercent * 360 - 90} 50 50)`);
            
            const tooltipText = isVideo
                ? `${data.label}: ${data.count}本 (${data.price.toLocaleString()}円) - ${percentText}%`
                : `${data.label}: ${data.count}冊 (${data.price.toLocaleString()}円) - ${percentText}%`;
            circle.setAttribute('title', tooltipText);
            
            // 初回描画時にクルリとアニメーションさせるための設定
            circle.style.strokeDashoffset = sliceLength.toString();
            circle.style.strokeDasharray = `${sliceLength} ${circumference}`;
            
            statsChart.appendChild(circle);

            // アニメーション発火 (少し遅らせて stroke-dashoffset を 0 にして円弧を描く)
            requestAnimationFrame(() => {
                setTimeout(() => {
                    circle.style.strokeDashoffset = '0';
                }, 50);
            });

            // 累積比率を更新
            accumulatedPercent += ratio;

            // グラフスライスをクリックするとそのカテゴリでフィルタリング
            circle.style.cursor = 'pointer';
            circle.addEventListener('click', () => {
                const tab = document.querySelector(`.filter-tab[data-category="${cat}"]`);
                if (tab) tab.click();
            });
        });

        // 3. 凡例（Legend）の生成
        chartLegend.textContent = '';
        Object.keys(categoryData).forEach(cat => {
            const data = categoryData[cat];
            if (data.count === 0) return;

            const legendItem = document.createElement('div');
            legendItem.className = 'legend-item';
            legendItem.setAttribute('data-category', cat);

            const labelGroup = document.createElement('div');
            labelGroup.className = 'legend-label-group';

            const dot = document.createElement('span');
            dot.className = 'legend-color-dot';
            dot.style.backgroundColor = data.color;

            const label = document.createElement('span');
            label.textContent = data.label;

            labelGroup.appendChild(dot);
            labelGroup.appendChild(label);

            const ratio = isPriceMode ? (totalForChart > 0 ? data.price / totalForChart : 0) : data.count / totalBooks;
            const percentText = (ratio * 100).toFixed(1);

            const valGroup = document.createElement('div');
            valGroup.className = 'legend-val-group';
            if (isPriceMode) {
                valGroup.textContent = `${data.price.toLocaleString()}円 (${percentText}%)`;
            } else {
                const countUnit = isVideo ? '本' : '冊';
                valGroup.textContent = `${data.count}${countUnit} (${data.price.toLocaleString()}円)`;
            }

            legendItem.appendChild(labelGroup);
            legendItem.appendChild(valGroup);

            // 凡例をクリックした時もフィルタリング
            legendItem.addEventListener('click', () => {
                const tab = document.querySelector(`.filter-tab[data-category="${cat}"]`);
                if (tab) tab.click();
            });

            chartLegend.appendChild(legendItem);
        });
    }

    function updateProgressBar(percent) {
        if (!progressBarFill) return;
        
        // Limit width to 100% but keep text displaying full percentage
        const fillWidth = Math.min(percent, 100);
        progressBarFill.style.width = `${fillWidth}%`;
        
        // Dynamically update ARIA tags for Screen Readers
        progressBarFill.setAttribute('aria-valuenow', percent.toString());
        
        if (percent >= 100) {
            progressBarFill.classList.add('target-achieved');
        } else {
            progressBarFill.classList.remove('target-achieved');
        }
        
        // Count up animation for text
        animateNumberValue(progressPercentText, percent);
    }

    function animateNumberValue(element, targetValue) {
        const startValue = parseInt(element.textContent) || 0;
        if (startValue === targetValue) return;

        // Reset running animation for the specific element to prevent flickers
        if (element.activeAnimationId) {
            cancelAnimationFrame(element.activeAnimationId);
        }

        const duration = 800; // ms
        const startTime = performance.now();

        function update(currentTime) {
            const elapsedTime = currentTime - startTime;
            if (element.textContent === undefined) return; // Guard destroyed element
            
            if (elapsedTime >= duration) {
                element.textContent = targetValue;
                element.activeAnimationId = null;
            } else {
                const progress = elapsedTime / duration;
                // Easing function outQuad
                const easeProgress = progress * (2 - progress);
                const currentValue = Math.round(startValue + (targetValue - startValue) * easeProgress);
                element.textContent = currentValue;
                element.activeAnimationId = requestAnimationFrame(update);
            }
        }
        element.activeAnimationId = requestAnimationFrame(update);
    }

    let lastCompletedState = false; // Tracks if target was achieved in previous state

    function updateStatusBadge(percent, totalValue, targetCost) {
        statusBadge.className = 'status-badge';
        
        const isCompleted = percent >= 100 && targetCost > 0;
        
        // Confetti & Celebration trigger condition: target newly reached
        if (isCompleted && !lastCompletedState && state.books.length > 0) {
            startConfetti();
            const netSavings = totalValue - targetCost;
            showCelebrationModal(netSavings);
        }
        lastCompletedState = isCompleted;

        const type = state.settings.subscriptionType || 'kindle';
        const isVideo = ['prime', 'netflix', 'youtube'].includes(type);

        if (state.books.length === 0) {
            statusBadge.className = 'status-badge badge-gray';
            statusBadge.textContent = isVideo ? '視聴を始めましょう！' : '読書を始めましょう！';
        } else if (percent < 50) {
            statusBadge.className = 'status-badge badge-info';
            statusBadge.textContent = isVideo
                ? 'お得への第一歩！元取りを目指して視聴を進めましょう。'
                : 'お得への第一歩！元取りを目指して読み進めましょう。';
        } else if (percent < 100) {
            statusBadge.className = 'status-badge badge-info';
            statusBadge.textContent = `元取りまであと少し！現在 ${percent}% 達成！`;
        } else if (percent < 200) {
            statusBadge.className = 'status-badge badge-success';
            statusBadge.textContent = '🎉 元取り達成！ここからは全て「純粋なお得」です！';
        } else {
            statusBadge.className = 'status-badge badge-gold';
            statusBadge.textContent = `👑 圧倒的お得！元値の ${Math.floor(percent / 100)}倍 以上の価値を回収しました！`;
        }
    }

    // --- Render Book Logs (Secure DOM Construction) ---
    function renderLogs() {
        const sortMode = sortSelect.value;
        
        // 期間別で絞り込んだ本のみを使用
        const periodBooks = getFilteredBooksByPeriod();

        // Copy and sort (LocaleCompare for robust timezone-independent sorting)
        const sortedBooks = [...periodBooks].sort((a, b) => {
            if (sortMode === 'date-desc') {
                const dateA = a.readDate || '';
                const dateB = b.readDate || '';
                return dateB.localeCompare(dateA) || b.id - a.id;
            } else if (sortMode === 'date-asc') {
                const dateA = a.readDate || '';
                const dateB = b.readDate || '';
                return dateA.localeCompare(dateB) || a.id - b.id;
            } else if (sortMode === 'price-desc') {
                return b.price - a.price;
            } else if (sortMode === 'price-asc') {
                return a.price - b.price;
            } else if (sortMode === 'rating-desc') {
                return b.rating - a.rating;
            }
            return 0;
        });

        // Clear container securely
        logsContainer.textContent = '';

        // 並び替えドロップダウンは常に表示させて一貫性を保ちます

        const type = state.settings.subscriptionType || 'kindle';
        const isVideo = ['prime', 'netflix', 'youtube'].includes(type);

        if (sortedBooks.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            const emptyText = document.createElement('p');
            emptyText.textContent = isVideo
                ? '登録された視聴ログがありません。'
                : '登録された読書ログがありません。';
            emptyText.appendChild(document.createElement('br'));
            const helperText = isVideo
                ? '上のフォームから視聴した作品を登録してみましょう！'
                : '上のフォームから読んだ本を登録してみましょう！';
            emptyText.appendChild(document.createTextNode(helperText));
            emptyState.appendChild(emptyText);
            logsContainer.appendChild(emptyState);
            return;
        }

        sortedBooks.forEach(book => {
            const item = document.createElement('div');
            const catClass = book.category ? ` book-item-${book.category}` : ' book-item-other';
            item.className = `book-item animating${catClass}`;
            item.addEventListener('animationend', () => {
                item.classList.remove('animating');
            }, { once: true });
            
            // Price Badge
            const priceBadge = document.createElement('div');
            priceBadge.className = 'book-badge-price';
            priceBadge.textContent = `${book.price.toLocaleString()}円`;
            
            // Title Container (for CSS Grid placement)
            const titleContainer = document.createElement('div');
            titleContainer.className = 'book-title-container';
            
            const titleSpan = document.createElement('span');
            titleSpan.className = 'book-title';
            titleSpan.textContent = book.title;
            titleContainer.appendChild(titleSpan);
            
            // Rating Stars
            const starsSpan = document.createElement('span');
            starsSpan.className = 'book-rating-stars';
            
            const rating = parseFloat(book.rating) || 0;
            const fullStars = Math.floor(rating);
            const hasHalf = rating % 1 !== 0;
            const emptyStars = Math.max(0, 5 - fullStars - (hasHalf ? 1 : 0));
            
            let starsHtml = '★'.repeat(fullStars);
            if (hasHalf) {
                starsHtml += '<span class="star-half">★</span>';
            }
            starsHtml += '☆'.repeat(emptyStars);
            starsSpan.innerHTML = starsHtml;
            
            // Read Date
            const dateSpan = document.createElement('span');
            dateSpan.className = 'book-date';
            dateSpan.textContent = book.readDate ? book.readDate.replace(/-/g, '/') : '';
            
            // Optional Notes
            let notesDiv = null;
            if (book.notes && book.notes.trim()) {
                notesDiv = document.createElement('div');
                notesDiv.className = 'book-notes';
                notesDiv.textContent = book.notes;
            }
            
            // Delete Button
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn-delete';
            deleteBtn.setAttribute('aria-label', `${book.title}のログを削除`);
            deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;
            
            deleteBtn.addEventListener('click', () => deleteBook(book.id));
            
            item.appendChild(priceBadge);
            item.appendChild(titleContainer);
            item.appendChild(starsSpan);
            item.appendChild(dateSpan);
            item.appendChild(deleteBtn);
            if (notesDiv) {
                item.appendChild(notesDiv);
            }
            
            logsContainer.appendChild(item);
        });

        // 描画完了後に現在のフィルターを適用
        applyFilter();
    }

    function applyFilter() {
        const filter = state.activeFilter || 'all';
        const items = logsContainer.querySelectorAll('.book-item');
        
        // 検索クエリをリアルタイム取得
        const searchInput = document.getElementById('log-search-input');
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        
        let visibleCount = 0;

        items.forEach(item => {
            const isCatMatch = filter === 'all' || item.classList.contains(`book-item-${filter}`);
            
            // DOMからタイトルとメモを取得し部分一致を判定
            const titleText = item.querySelector('.book-title')?.textContent.toLowerCase() || '';
            const notesText = item.querySelector('.book-notes')?.textContent.toLowerCase() || '';
            const isSearchMatch = !query || titleText.includes(query) || notesText.includes(query);
            
            const isMatch = isCatMatch && isSearchMatch;
            
            if (isMatch) {
                item.classList.remove('filtered-out');
                visibleCount++;
            } else {
                item.classList.add('filtered-out');
            }
        });

        // フィルターした結果、該当する本がない場合はプレースホルダーを表示
        const existingEmpty = logsContainer.querySelector('.filter-empty-state');
        if (existingEmpty) {
            existingEmpty.remove();
        }

        const type = state.settings.subscriptionType || 'kindle';
        const isVideo = ['prime', 'netflix', 'youtube'].includes(type);

        if (visibleCount === 0 && items.length > 0) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'empty-state filter-empty-state';
            const p = document.createElement('p');
            p.textContent = isVideo
                ? '選択されたカテゴリに該当する視聴ログがありません。'
                : '選択されたカテゴリに該当する読書ログがありません。';
            emptyDiv.appendChild(p);
            logsContainer.appendChild(emptyDiv);
        }
    }

    async function deleteBook(id) {
        const bookToDelete = state.books.find(b => b.id === id);
        const title = bookToDelete ? bookToDelete.title : 'この本';
        
        const type = state.settings.subscriptionType || 'kindle';
        const isVideo = ['prime', 'netflix', 'youtube'].includes(type);

        // Show custom modal
        const confirmTitle = isVideo ? 'ログの削除' : 'ログの削除';
        const confirmMsg = isVideo 
            ? `「${title}」の視聴ログを削除します。よろしいですか？`
            : `「${title}」の読書ログを削除します。よろしいですか？`;

        const confirmed = await showConfirmModal(confirmTitle, confirmMsg);
        if (!confirmed) return;

        state.books = state.books.filter(b => b.id !== id);
        if (safeSave('ku_tracker_books', JSON.stringify(state.books))) {
            updateCalculations();
            renderLogs();
            showToast(isVideo ? '視聴ログを削除しました。' : '読書ログを削除しました。', 'info');
        }
    }

    // --- Event Handlers ---
    
    // カテゴリ選択時の自動価格補完（手入力値を優先するガード付き）
    const categoryDefaultPricesBooks = {
        business: 1500,
        novel: 1000,
        comic: 500,
        magazine: 800,
        other: 1200
    };

    const categoryDefaultPricesVideos = {
        business: 400,   // 教養/ドキュメンタリー
        novel: 500,      // 映画/ドラマ
        comic: 250,      // アニメ
        magazine: 300,   // 番組/バラエティ
        other: 400       // その他
    };

    bookCategorySelect.addEventListener('change', () => {
        const selectedCategory = bookCategorySelect.value;
        const currentPrice = bookPriceInput.value.trim();
        
        const type = state.settings.subscriptionType || 'kindle';
        const isVideo = ['prime', 'netflix', 'youtube'].includes(type);
        const categoryDefaultPrices = isVideo ? categoryDefaultPricesVideos : categoryDefaultPricesBooks;

        // 現在の入力値が空、または「書籍デフォルト」「動画デフォルト」のいずれかの値と一致している場合のみ自動補完する
        // これにより、ユーザーが完全手動でカスタム価格を入れている場合の意図しない上書きを防ぐ
        const isCurrentValEmpty = currentPrice === '';
        const allDefaults = [
            ...Object.values(categoryDefaultPricesBooks),
            ...Object.values(categoryDefaultPricesVideos)
        ];
        const isCurrentValDefault = allDefaults.some(val => val.toString() === currentPrice);

        if (isCurrentValEmpty || isCurrentValDefault) {
            const defaultPrice = categoryDefaultPrices[selectedCategory || 'other'];
            bookPriceInput.value = defaultPrice;
        }
        updateQuickPriceActiveState();
    });

    // --- Quick Price Button Active State Manager ---
    function updateQuickPriceActiveState() {
        const currentPrice = bookPriceInput.value.trim();
        quickPriceButtons.forEach(btn => {
            const price = btn.getAttribute('data-price');
            if (currentPrice !== '' && price === currentPrice) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    // Monitor manual price inputs for active quick price alignment
    bookPriceInput.addEventListener('input', updateQuickPriceActiveState);

    // Quick price selection
    quickPriceButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const price = btn.getAttribute('data-price');
            bookPriceInput.value = price;
            updateQuickPriceActiveState();
        });
    });

    // Form Submission (Strict Edge Case and overflow protection)
    bookForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const title = bookTitleInput.value.trim();
        const category = bookCategorySelect ? bookCategorySelect.value : 'other';
        const price = parseInt(bookPriceInput.value) || 0;
        const readDate = readDateInput.value;
        const notes = bookNotesInput.value.trim();
        
        // Find checked rating radio
        const checkedRating = document.querySelector('input[name="rating"]:checked');
        const rating = checkedRating ? parseFloat(checkedRating.value) : 3.0;

        // Extreme bounds and empty values protection
        if (!title || title.length > 100) {
            showToast('タイトルは1文字以上、100文字以内で入力してください。', 'warning');
            return;
        }

        if (isNaN(price) || price < 1 || price > 100000) {
            showToast('定価は1円〜100,000円の間で入力してください。', 'warning');
            return;
        }

        if (notes.length > 500) {
            showToast('メモは500文字以内で入力してください。', 'warning');
            return;
        }

        const newBook = {
            id: Date.now(),
            title,
            price,
            readDate,
            rating,
            notes,
            category
        };

        // Add to array
        state.books.push(newBook);
        
        // Save to localStorage with QuotaExceededError checking
        if (safeSave('ku_tracker_books', JSON.stringify(state.books))) {
            // Update UI
            updateCalculations();
            renderLogs();
            showToast(`「${title}」を記録しました！`);

            // Reset fields except readDate
            bookTitleInput.value = '';
            bookPriceInput.value = '';
            bookNotesInput.value = '';
            const defaultStar = document.getElementById('star3_0');
            if (defaultStar) defaultStar.checked = true; // reset to 3.0 stars
            updateQuickPriceActiveState();

            // Refocus on title input for fast entry
            bookTitleInput.focus();
        } else {
            // Revert push if save failed
            state.books.pop();
        }
    });

    // Inputs settings change
    monthlyFeeInput.addEventListener('change', updateCalculations);
    durationInput.addEventListener('change', updateCalculations);
    sortSelect.addEventListener('change', renderLogs);

    // --- Confetti (Celebration) Animation Logic ---
    function setupCanvasSize() {
        confettiCanvas.width = window.innerWidth;
        confettiCanvas.height = window.innerHeight;
    }

    // --- Responsive Layout Inserter (Ads and settings position adjustment on mobile) ---
    function handleResponsiveLayout() {
        const adsCard = document.querySelector('.ads-card');
        const settingsCard = document.querySelector('.settings-card');
        const sidebar = document.querySelector('.sidebar-content');
        const mainContent = document.querySelector('.main-content');
        const logsCard = document.querySelector('.logs-card');
        const recordFormCard = document.querySelector('.record-form-card');

        if (!sidebar || !mainContent) return;

        const isMobile = window.innerWidth <= 1024;

        if (isMobile) {
            // モバイル時: 「記録フォーム」と「読書ログ履歴」の間に動的インサート
            if (adsCard && logsCard && (adsCard.parentNode !== mainContent || adsCard.nextSibling !== logsCard)) {
                mainContent.insertBefore(adsCard, logsCard);
            }
            // モバイル時: 「サブスク設定」を「読んだ本を記録する（フォーム）」の直前に動的インサート
            if (settingsCard && recordFormCard && (settingsCard.parentNode !== mainContent || settingsCard.nextSibling !== recordFormCard)) {
                mainContent.insertBefore(settingsCard, recordFormCard);
            }
        } else {
            // デスクトップ時: 右サイドバーの最上部に広告
            if (adsCard && (adsCard.parentNode !== sidebar || adsCard !== sidebar.firstChild)) {
                sidebar.insertBefore(adsCard, sidebar.firstChild);
            }
            // デスクトップ時: 広告の直後にサブスク設定（サイドバーの2番目）
            if (settingsCard) {
                const insertTarget = adsCard ? adsCard.nextSibling : sidebar.firstChild;
                if (settingsCard.parentNode !== sidebar || settingsCard.nextSibling !== insertTarget) {
                    sidebar.insertBefore(settingsCard, insertTarget);
                }
            }
        }
    }

    // Debounced window resize event listener (Performance optimization)
    window.addEventListener('resize', () => {
        if (resizeTimeout) {
            clearTimeout(resizeTimeout);
        }
        resizeTimeout = setTimeout(() => {
            setupCanvasSize();
            handleResponsiveLayout(); // 画面リサイズ時に広告・設定の配置を動的最適化
            resizeTimeout = null;
        }, 150);
    });

    function startConfetti() {
        // Stop any previous running animations
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        
        // canvasを表示状態に戻す（前回のアニメ終了時に非表示にしたため）
        confettiCanvas.style.display = 'block';
        
        confettiParticles = [];
        const colors = ['#B9944A', '#D4AF6A', '#8C6A28', '#F5E6C8', '#3F5E4D', '#1A5F7A'];
        
        // Generate particles
        const particleCount = 100;
        for (let i = 0; i < particleCount; i++) {
            confettiParticles.push({
                x: Math.random() * confettiCanvas.width,
                y: Math.random() * -confettiCanvas.height - 20, // Start above viewport
                size: Math.random() * 8 + 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                speedX: Math.random() * 4 - 2,
                speedY: Math.random() * 5 + 3,
                rotation: Math.random() * 360,
                rotationSpeed: Math.random() * 6 - 3
            });
        }
        
        animateConfetti();
    }

    function animateConfetti() {
        ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        
        let alive = false;
        
        confettiParticles.forEach(p => {
            p.y += p.speedY;
            p.x += p.speedX;
            p.rotation += p.rotationSpeed;
            
            // Draw particle
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation * Math.PI / 180);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            ctx.restore();
            
            // Check if still on screen
            if (p.y < confettiCanvas.height) {
                alive = true;
            }
        });
        
        if (alive) {
            animationFrameId = requestAnimationFrame(animateConfetti);
        } else {
            // アニメーション終了後は canvas を完全にクリアして非表示にする
            ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
            confettiCanvas.style.display = 'none';
            animationFrameId = null;
        }
    }

    // 紙吹雪を即座に停止してクリーンアップする関数（モーダルクローズ時などに呼び出す）
    function stopConfetti() {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        confettiParticles = [];
        confettiCanvas.style.display = 'none';
    }

    function shareOnX() {
        const targetCost = state.calculated.targetCost;
        const totalValue = state.calculated.totalValue;
        const netSavings = state.calculated.netSavings;
        const bookCount = state.calculated.bookCount;
        const percent = state.calculated.percent;

        const type = state.settings.subscriptionType || 'kindle';
        const name = state.settings.subscriptionName || 'Kindle Unlimited';
        const isVideo = ['prime', 'netflix', 'youtube'].includes(type);

        const contentName = isVideo ? "動画" : "本";
        const unitName = isVideo ? "作品" : "冊";
        const actionName = isVideo ? "見ました" : "読みました";
        const hashTag = isVideo ? `#お得度計算機 #動画記録 #playpoint` : `#KindleUnlimitedお得度計算機 #読書記録 #playpoint`;

        let shareText = `📖 ${name} お得度メーター 📖\n` +
            `元値目標 ${targetCost.toLocaleString()}円 に対し、\n` +
            `累計 ${totalValue.toLocaleString()}円 分の${contentName}を${actionName}！\n` +
            `【元取り達成率: ${percent}% 🎉 (+${netSavings.toLocaleString()}円のお得！)】\n\n` +
            `${isVideo ? '視聴数' : '読了数'}: ${bookCount}${unitName}\n`;

        if (percent < 100) {
            shareText = `📖 ${name} お得度メーター 📖\n` +
                `元値目標 ${targetCost.toLocaleString()}円 に対し、\n` +
                `累計 ${totalValue.toLocaleString()}円 分の${contentName}を${actionName}！\n` +
                `【元取り達成率: ${percent}% (元取りまであと ${(targetCost - totalValue).toLocaleString()}円)】\n\n` +
                `${isVideo ? '視聴数' : '読了数'}: ${bookCount}${unitName}\n`;
        }

        shareText += `${hashTag}\n`;
        const shareUrl = "https://playpoint-sim.com/kindle-tracker/";
        const twitterUrl = "https://x.com/intent/post?text=" + encodeURIComponent(shareText) + "&url=" + encodeURIComponent(shareUrl);
        window.open(twitterUrl, "_blank");
    }

    btnShareX.addEventListener('click', shareOnX);
    if (btnCelebrationShareX) {
        btnCelebrationShareX.addEventListener('click', shareOnX);
    }

    if (statusBadge) {
        statusBadge.style.cursor = 'pointer';
        statusBadge.addEventListener('click', () => {
            if (state.calculated.percent >= 100) {
                showCelebrationModal(state.calculated.netSavings);
            } else {
                const type = state.settings.subscriptionType || 'kindle';
                const isVideo = ['prime', 'netflix', 'youtube'].includes(type);
                const hintMsg = isVideo 
                    ? '視聴した作品を記録して、元取りメーターを達成しましょう！🎬'
                    : '読んだ本を記録して、元取りメーターを達成しましょう！📚';
                showToast(hintMsg, 'info');
            }
        });
    }

    if (btnChartToggleCount && btnChartTogglePrice) {
        const toggleChartMode = (mode) => {
            if (state.chartMode === mode) return;
            state.chartMode = mode;
            
            if (mode === 'count') {
                btnChartToggleCount.classList.add('active');
                btnChartToggleCount.setAttribute('aria-checked', 'true');
                btnChartTogglePrice.classList.remove('active');
                btnChartTogglePrice.setAttribute('aria-checked', 'false');
            } else {
                btnChartTogglePrice.classList.add('active');
                btnChartTogglePrice.setAttribute('aria-checked', 'true');
                btnChartToggleCount.classList.remove('active');
                btnChartToggleCount.setAttribute('aria-checked', 'false');
            }
            updateAnalyticsChart();
        };

        btnChartToggleCount.addEventListener('click', () => toggleChartMode('count'));
        btnChartTogglePrice.addEventListener('click', () => toggleChartMode('price'));
    }

    btnExport.addEventListener('click', () => {
        const type = state.settings.subscriptionType || 'kindle';
        const isVideo = ['prime', 'netflix', 'youtube'].includes(type);
        if (state.books.length === 0) {
            showToast(isVideo ? 'エクスポートする視聴ログがありません。' : 'エクスポートする読書ログがありません。', 'warning');
            return;
        }

        const dataStr = JSON.stringify({
            version: '1.0.0',
            settings: state.settings,
            books: state.books
        }, null, 2);

        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // Correct filename timestamp in JST timezone
        const now = new Date();
        const offset = now.getTimezoneOffset() * 60000;
        const localDateStr = (new Date(now - offset)).toISOString().split('T')[0];

        const name = state.settings.subscriptionName || 'Kindle Unlimited';
        const safeName = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'subscription';

        const link = document.createElement('a');
        link.href = url;
        link.download = `${safeName}_savings_backup_${localDateStr}.json`;
        document.body.appendChild(link);
        link.click();
        
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast('データをファイルとして保存しました！');
    });

    // --- Data Import Logic ---
    function handleImportFile(file) {
        if (!file) return;

        // Cache old state before starting import for rollback fallback
        const oldBooks = [...state.books];
        const oldSettings = { ...state.settings };

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const importedData = JSON.parse(event.target.result);
                
                // 1. Basic array check
                if (!importedData.books || !Array.isArray(importedData.books)) {
                    throw new Error('無効なファイル形式です（読書ログのデータが見つかりません）。');
                }

                // 2. Strict item property & data type schema validation
                const validatedBooks = importedData.books.filter(b => {
                    const isValid = b &&
                           typeof b.id === 'number' &&
                           typeof b.title === 'string' && b.title.trim().length > 0 && b.title.length <= 100 &&
                           typeof b.price === 'number' && b.price >= 1 && b.price <= 100000 &&
                           (typeof b.readDate === 'string' || !b.readDate) &&
                           typeof b.rating === 'number' && b.rating >= 1 && b.rating <= 5 &&
                           (typeof b.notes === 'string' || !b.notes || b.notes.length <= 500) &&
                           (!b.category || (typeof b.category === 'string' && ['business', 'novel', 'comic', 'magazine', 'other'].includes(b.category)));
                    
                    if (isValid && !b.category) {
                        b.category = 'other';
                    }
                    return isValid;
                });

                if (validatedBooks.length === 0) {
                    throw new Error('復元可能な有効な読書ログが含まれていません。');
                }

                const warningMsg = validatedBooks.length !== importedData.books.length 
                    ? `\n※一部の破損・上限オーバーのデータ（${importedData.books.length - validatedBooks.length}件）は除外されます。` 
                    : '';

                // Custom confirm modal
                const confirmed = await showConfirmModal('データの復元', `インポートを実行しますか？現在のログデータは上書きされ、${validatedBooks.length}件のデータが復元されます。${warningMsg}`);
                if (!confirmed) return;

                // Update state in memory
                state.books = validatedBooks;
                
                if (importedData.settings) {
                    const fee = parseInt(importedData.settings.monthlyFee);
                    const dur = parseInt(importedData.settings.duration);
                    state.settings.monthlyFee = isNaN(fee) || fee < 0 ? 980 : Math.min(fee, 1000000);
                    state.settings.duration = isNaN(dur) || dur < 1 ? 3 : Math.min(dur, 120);
                    state.settings.subscriptionType = importedData.settings.subscriptionType || 'kindle';
                    state.settings.subscriptionName = importedData.settings.subscriptionName || 'Kindle Unlimited';
                    
                    monthlyFeeInput.value = state.settings.monthlyFee;
                    durationInput.value = state.settings.duration;
                    if (subscriptionTypeSelect) subscriptionTypeSelect.value = state.settings.subscriptionType;
                    if (subscriptionNameInput) subscriptionNameInput.value = state.settings.subscriptionName;
                }

                // Save to localStorage with validation
                const saveBooksSuccess = safeSave('ku_tracker_books', JSON.stringify(state.books));
                const saveSettingsSuccess = saveBooksSuccess && safeSave('ku_tracker_settings', JSON.stringify(state.settings));

                if (saveBooksSuccess && saveSettingsSuccess) {
                    // Update UI
                    updateSubscriptionContext();
                    updateCalculations();
                    renderLogs();
                    showToast('データの復元が完了しました！');
                } else {
                    // Revert state in memory and attempt storage rollback (safeguarded)
                    throw new Error('ブラウザの保存容量制限により保存できません。');
                }
            } catch (err) {
                showToast('インポートに失敗しました: ' + err.message, 'error');
                
                // Rollback memory state and restore inputs
                try {
                    state.books = oldBooks;
                    state.settings = oldSettings;
                    monthlyFeeInput.value = oldSettings.monthlyFee;
                    durationInput.value = oldSettings.duration;
                    
                    // Attempt to restore original storage
                    safeSave('ku_tracker_books', JSON.stringify(oldBooks));
                    safeSave('ku_tracker_settings', JSON.stringify(oldSettings));
                    
                    updateCalculations();
                    renderLogs();
                } catch (rollbackErr) {
                    console.error('Fatal crash prevented during rollback: ', rollbackErr);
                }
            } finally {
                // Ensure input element is always cleared
                inputImport.value = '';
            }
        };
        reader.readAsText(file);
    }

    if (inputImport) {
        inputImport.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) handleImportFile(file);
        });
    }

    if (dropZone) {
        dropZone.addEventListener('click', () => {
            if (inputImport) inputImport.click();
        });

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file) handleImportFile(file);
        });
    }

    // Filter Tabs Interaction
    const filterTabs = document.querySelectorAll('.filter-tab');
    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            filterTabs.forEach(t => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');
            state.activeFilter = tab.getAttribute('data-category') || 'all';
            
            applyFilter();
        });
    });

    // しおり風検索窓のインプット入力監視とリアルタイム連動
    const logSearchInput = document.getElementById('log-search-input');
    if (logSearchInput) {
        logSearchInput.addEventListener('input', () => {
            // 検索クエリに基づき再計算 ＆ 本棚・円グラフ・統計を自動同期
            updateCalculations();
            // 履歴ログのDOMを再生成
            renderLogs();
        });
    }

    // プレミアム機能：消印風アンティーク称号スタンプの動的更新
    function updateAchievementStamp(netSavings, bookCount) {
        const container = document.getElementById('achievement-stamp-container');
        if (!container) return;
        
        if (bookCount === 0) {
            container.innerHTML = '';
            return;
        }
        
        let rank = '見習い';
        let subtitle = 'Novice';
        let isBlue = false;
        
        const type = state.settings.subscriptionType || 'kindle';
        const isVideo = ['prime', 'netflix', 'youtube'].includes(type);
        
        if (netSavings < 980) {
            rank = isVideo ? '視聴見習い' : '読書見習い';
            subtitle = 'BRONZE';
        } else if (netSavings < 2940) {
            rank = '元取り修行';
            subtitle = 'SILVER';
            isBlue = true; // シルバー・ブルーインク
        } else if (netSavings < 6000) {
            rank = '元取り達人';
            subtitle = 'GOLD';
        } else {
            rank = isVideo ? 'サブスク神' : '読書の支配者';
            subtitle = 'LEGEND';
        }
        
        container.innerHTML = `
            <div class="achievement-stamp ${isBlue ? 'stamp-blue' : ''}" title="現在の達成称号: ${rank}">
                <div class="achievement-stamp-title">${subtitle}</div>
                <div class="achievement-stamp-rank">${rank}</div>
            </div>
        `;
    }

    // プレミアム機能：ふせん風バックアップ保存推奨リマインダー
    function updateBackupReminder() {
        const backupCard = document.querySelector('.backup-card');
        if (!backupCard) return;
        
        const dismissedCount = parseInt(localStorage.getItem('dismissed_backup_reminder_count') || '0');
        const currentCount = state.books.length;
        
        const existingSticky = backupCard.querySelector('.backup-reminder-sticky');
        if (existingSticky) {
            existingSticky.remove();
        }
        
        const triggerCounts = [5, 10, 20];
        if (triggerCounts.includes(currentCount) && dismissedCount !== currentCount) {
            const sticky = document.createElement('div');
            sticky.className = 'backup-reminder-sticky';
            sticky.innerHTML = `
                <div class="backup-reminder-text">📝 ログが${currentCount}件貯まりました！消えてしまう前にデータをファイルに保存しておきましょう 💾</div>
                <div class="backup-reminder-btn-group">
                    <button class="btn-sticky-action" id="btn-sticky-dismiss">閉じる</button>
                    <button class="btn-sticky-action primary" id="btn-sticky-backup">今すぐ保存</button>
                </div>
            `;
            
            backupCard.appendChild(sticky);
            
            const dismissBtn = sticky.querySelector('#btn-sticky-dismiss');
            const backupBtn = sticky.querySelector('#btn-sticky-backup');
            
            dismissBtn.addEventListener('click', () => {
                localStorage.setItem('dismissed_backup_reminder_count', currentCount.toString());
                sticky.remove();
            });
            
            backupBtn.addEventListener('click', () => {
                localStorage.setItem('dismissed_backup_reminder_count', currentCount.toString());
                const exportBtn = document.getElementById('btn-export');
                if (exportBtn) exportBtn.click();
                sticky.remove();
            });
        }
    }

    init();

    // --- PWA Service Worker Registration ---
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            const isLocalhost = Boolean(
                window.location.hostname === 'localhost' ||
                window.location.hostname === '[::1]' ||
                window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
            );
            const isHttps = window.location.protocol === 'https:';

            if (isHttps || isLocalhost) {
                navigator.serviceWorker.register('./sw.js')
                    .then((reg) => {
                        console.log('ServiceWorker registration successful with scope: ', reg.scope);
                    })
                    .catch((err) => {
                        console.warn('ServiceWorker registration failed: ', err);
                    });
            }
        });
    }
});
