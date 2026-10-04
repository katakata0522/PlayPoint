(function () {
    'use strict';

    // ===========================================
    // Configuration Constants
    // ===========================================
    const CONFIG = {
        articlesUrl: '/blog/articles.json?v=20260925_sidebar1',
        itemsPerPage: 12,
        adInterval: 3,
        newThresholdDays: 7,
        searchDebounceMs: 300,
        storageKey: 'katakata_blog_settings',
        maxRetries: 3
    };

    // AdSense Configuration (centralized)
    const ADSENSE = {
        client: 'ca-pub-3845885843809455',
        slot: '8250492620'
    };

    // Category Configuration (consolidated: order + color)
    const CATEGORIES = {
        'ランク': { order: 1, color: '#8b5cf6' },
        'トラブル': { order: 2, color: '#ef4444' },
        '使い方': { order: 3, color: '#3b82f6' },
        'キャンペーン': { order: 4, color: '#f59e0b' }
    };

    // 読者が「何を知りたいか」で探すための表示用分類。
    // 既存の4カテゴリは互換性と記事カード表示のため残し、一覧フィルタはこの分類を使う。
    const BROWSE_CATEGORIES = [
        'はじめて・基本',
        'ランク・ステータス',
        '貯める・キャンペーン',
        '使う・交換',
        'トラブル・アカウント',
        'ゲーム別課金',
        '最新情報・イベント'
    ];

    // ===========================================
    // LocalStorage Manager
    // ===========================================
    const Storage = {
        get: function () {
            try {
                const data = localStorage.getItem(CONFIG.storageKey);
                return data ? JSON.parse(data) : {};
            } catch (e) {
                console.warn('LocalStorage read error:', e);
                return {};
            }
        },
        set: function (settings) {
            try {
                const current = this.get();
                const merged = { ...current, ...settings };
                localStorage.setItem(CONFIG.storageKey, JSON.stringify(merged));
            } catch (e) {
                console.warn('LocalStorage write error:', e);
            }
        },
        getSortOrder: function () {
            const saved = this.get();
            if (['newest', 'oldest', 'updated'].includes(saved.sortMode)) return saved.sortMode;
            return typeof saved.sortNewestFirst === 'boolean' ? (saved.sortNewestFirst ? 'newest' : 'oldest') : null;
        },
        setSortOrder: function (mode) {
            if (mode !== 'relevance') this.set({ sortMode: mode, sortNewestFirst: mode !== 'oldest' });
        }
    };

    // ===========================================
    // Google Analytics 4 Event Tracking
    // ===========================================
    const Analytics = {
        track: function (eventName, params) {
            if (!window.PlayPointAnalytics) return;
            window.PlayPointAnalytics.track(eventName, params);
        },
        trackArticleClick: function (title, category) {
            this.track('article_click', {
                article_title: title,
                article_category: category
            });
        },
        trackSearch: function (query, resultsCount) {
            this.track('search', {
                intent_id: window.PlayPointSearch?.intentId(query, 'ja') || 'other',
                results_count: resultsCount
            });
        },
        trackCategoryFilter: function (category) {
            this.track('category_filter', {
                category_name: category
            });
        }
    };

    // ===========================================
    // URL State Management
    // ===========================================
    const URLState = {
        get: function () {
            const params = new URLSearchParams(window.location.search);
            return {
                category: params.get('category') || 'all',
                topic: params.get('topic') || '',
                search: params.get('q') || '',
                game: params.get('game') || '',
                page: params.get('page') || window.location.pathname.match(/^\/blog\/page\/(\d+)\/$/)?.[1] || '1',
                sort: ['newest', 'oldest', 'updated', 'relevance'].includes(params.get('sort')) ? params.get('sort') : null
            };
        },
        set: function (state, mode = 'replace') {
            const url = new URL(window.location);
            // Category
            if (state.category && state.category !== 'all') {
                url.searchParams.set('category', state.category);
            } else {
                url.searchParams.delete('category');
            }
            // Reader-facing browse taxonomy. Legacy ?category= stays supported.
            if (state.topic) {
                url.searchParams.set('topic', state.topic);
            } else {
                url.searchParams.delete('topic');
            }
            // Search
            if (state.search) {
                url.searchParams.set('q', state.search);
            } else {
                url.searchParams.delete('q');
            }
            if (state.game) {
                url.searchParams.set('game', state.game);
            } else {
                url.searchParams.delete('game');
            }
            // Page
            if (state.page && state.page > 1) {
                url.searchParams.set('page', state.page);
            } else {
                url.searchParams.delete('page');
            }
            // Sort
            if (state.sort && (sortIsExplicit || state.sort !== (state.search ? 'relevance' : 'newest'))) {
                url.searchParams.set('sort', state.sort);
            } else {
                url.searchParams.delete('sort');
            }
            url.pathname = '/blog/';
            if (!state.search && !state.game && !state.topic && (!state.category || state.category === 'all') && (!state.sort || state.sort === 'newest')) {
                if (Number(state.page) > 1) url.pathname = '/blog/page/' + state.page + '/';
                url.searchParams.delete('page');
            }
            if (url.href !== window.location.href) window.history[mode === 'push' ? 'pushState' : 'replaceState']({}, '', url);
            const canonicalPath = /^\/blog\/page\/\d+\/$/.test(url.pathname) ? url.pathname : '/blog/';
            document.querySelector('link[rel="canonical"]')?.setAttribute('href', 'https://playpoint-sim.com' + canonicalPath);
        }
    };

    // State
    let allArticles = [];
    let currentCategory = 'all';
    let currentBrowseCategory = '';
    let currentSearch = '';
    let currentGameTitle = '';
    let currentPage = 1;
    let sortMode = 'newest';
    let sortIsExplicit = false;
    let searchDebounceTimer = null;
    let fetchRetryCount = 0;

    // ===========================================
    // Utility Functions
    // ===========================================

    // Debounce utility
    function debounce(fn, delay) {
        return function (...args) {
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    // Get category color with fallback
    function getCategoryColor(category) {
        return CATEGORIES[category]?.color || '#58a6ff';
    }

    // Check if article is new (within threshold days) - timezone safe
    function isNewArticle(dateStr) {
        if (!dateStr) return false;
        const [y, m, d] = dateStr.split('-').map(Number);
        const articleDate = new Date(y, m - 1, d); // Local timezone
        const now = new Date();
        const diffTime = now - articleDate;
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= CONFIG.newThresholdDays;
    }

    const normalizeArticle = BlogUtils.normalizeArticle;

    const COMPACT_THUMBNAIL_QUERY = '(max-width: 760px)';
    const COMPACT_THUMBNAIL_ROOT_MARGIN = '96px 0px';
    const TRANSPARENT_THUMBNAIL_PLACEHOLDER = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
    let compactThumbnailObserver = null;

    function isCompactArticleList() {
        return Boolean(window.matchMedia && window.matchMedia(COMPACT_THUMBNAIL_QUERY).matches);
    }

    function loadDeferredThumbnail(image) {
        const source = image?.dataset?.src;
        if (!source) return;
        if (image.dataset.srcset) { image.srcset = image.dataset.srcset; delete image.dataset.srcset; }
        image.closest('picture')?.querySelector('source')?.remove();
        image.src = source;
        delete image.dataset.src;
    }

    function getCompactThumbnailObserver() {
        if (!('IntersectionObserver' in window)) return null;
        if (!compactThumbnailObserver) {
            compactThumbnailObserver = new IntersectionObserver((entries, observer) => {
                for (const entry of entries) {
                    if (!entry.isIntersecting) continue;
                    loadDeferredThumbnail(entry.target);
                    observer.unobserve(entry.target);
                }
            }, { rootMargin: COMPACT_THUMBNAIL_ROOT_MARGIN });
        }
        return compactThumbnailObserver;
    }

    function observeDeferredThumbnail(image) {
        if (!image?.dataset?.src) return;
        const observer = getCompactThumbnailObserver();
        if (!observer) {
            loadDeferredThumbnail(image);
            return;
        }
        observer.observe(image);
    }

    let listingAd = null;
    // Create AdSense ad element
    function createAdElement() {
        const adContainer = document.createElement('div');
        adContainer.className = 'article-ad';
        adContainer.innerHTML = `
            <ins class="adsbygoogle"
                 style="display:block"
                 data-ad-client="${ADSENSE.client}"
                 data-ad-slot="${ADSENSE.slot}"
                 data-ad-format="auto"
                 data-full-width-responsive="true"></ins>
        `;
        return adContainer;
    }

    const dom = {
        grid: document.getElementById('article-grid'),
        pagination: document.getElementById('pagination'),
        categoryFilter: document.getElementById('category-filter'),
        searchInput: document.getElementById('search-input'),
        gameTitleFilter: document.getElementById('game-title-filter'),
        sortToggle: document.getElementById('sort-toggle'),
        loading: null,
        error: null,
        resultStatus: document.getElementById('article-result-status'),
        categoryScrollHint: document.getElementById('category-scroll-hint'),
        filterPanel: document.getElementById('article-filter-panel')
    };

    // Create Skeleton Loading Cards
    function showSkeletonLoading() {
        if (!dom.grid || dom.grid.querySelector('[data-blog-initial-card]')) return;
        compactThumbnailObserver?.disconnect();
        if (dom.grid.querySelectorAll('.skeleton-card').length === CONFIG.itemsPerPage) return;
        dom.grid.innerHTML = '';
        for (let i = 0; i < CONFIG.itemsPerPage; i++) {
            const skeleton = document.createElement('div');
            skeleton.className = 'skeleton-card';
            skeleton.setAttribute('aria-hidden', 'true');
            skeleton.innerHTML = `
                <div class="skeleton-thumb"></div>
                <div class="skeleton-content">
                    <div class="skeleton-line short"></div>
                    <div class="skeleton-line long"></div>
                    <div class="skeleton-line medium"></div>
                </div>
            `;
            dom.grid.appendChild(skeleton);
        }
    }

    // Helper functions moved to utils.js

    // Initialize
    async function init() {
        // Dynamic Footer Year
        if (window.BlogUtils) BlogUtils.updateFooterYear();

        // Initialize theme from storage
        initTheme();

        // Show skeleton loading while fetching
        showSkeletonLoading();

        window.matchMedia?.(COMPACT_THUMBNAIL_QUERY).addEventListener?.('change', () => { if (allArticles.length) render(); });

        // Restore state from URL and LocalStorage
        const urlState = URLState.get();
        currentCategory = urlState.category;
        currentBrowseCategory = urlState.topic;
        currentSearch = urlState.search;
        currentGameTitle = urlState.game;
        currentPage = urlState.page;
        const storedSort = Storage.getSortOrder();
        sortIsExplicit = Boolean(urlState.sort);
        sortMode = urlState.sort || (currentSearch ? 'relevance' : storedSort || 'newest');
        if (!currentSearch && sortMode === 'relevance') sortMode = 'newest';
        if (dom.searchInput && currentSearch) dom.searchInput.value = currentSearch;
        updateSortControl();
        syncFilterPanelState();

        dom.grid?.querySelectorAll('[data-blog-initial-card] img').forEach(image => {
            image.onerror = () => BlogUtils.handleImageError(image);
            if (image.dataset.src) {
                if (isCompactArticleList()) observeDeferredThumbnail(image);
                else loadDeferredThumbnail(image);
            }
        });

        dom.grid?.setAttribute('aria-busy', 'true');
        [dom.searchInput, dom.sortToggle, dom.gameTitleFilter].forEach(control => { if (control) control.disabled = true; });
        await loadArticles();
    }

    // 本文検索は検索欄を使う時に取得し、記事一覧の初期表示を待たせない。
    let bodySearchPromise = null;
    let bodySearchReady = false;
    let searchDestinations = [];
    function searchNotice(message, retry = false) {
        let notice = document.getElementById('body-search-notice');
        if (!notice) {
            notice = document.createElement('div');
            notice.id = 'body-search-notice';
            notice.className = 'body-search-notice';
            notice.setAttribute('role', 'status');
            document.querySelector('.search-sort-row')?.after(notice);
        }
        notice.replaceChildren(); notice.hidden = !message;
        if (!message) return;
        const text = document.createElement('span'); text.textContent = message; notice.append(text);
        if (retry) {
            const button = document.createElement('button'); button.type = 'button'; button.textContent = '本文検索を再試行';
            button.addEventListener('click', async () => { if (await loadBodySearch()) render(); });
            notice.append(button);
        }
    }
    function loadBodySearch() {
        if (bodySearchReady) return Promise.resolve(true);
        if (bodySearchPromise) return bodySearchPromise;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);
        searchNotice('本文も検索できるように読み込んでいます…');
        dom.grid?.setAttribute('aria-busy', 'true');
        bodySearchPromise = fetch('/blog/article-search-index.json', { signal: controller.signal }).then(response => {
            if (!response.ok) throw new Error('Search index unavailable');
            return response.json();
        }).then(index => {
            if (!Array.isArray(index?.articles)) throw new Error('Invalid search index');
            const byPath = new Map(index.articles.map(item => [item.path, item]));
            searchDestinations = (index.destinations || []).filter(item => /^\/(?:latest\/|guides\/(?:ranks|using-points|troubleshooting)\/)$/.test(item.path));
            allArticles.forEach(article => { article.sections = byPath.get(new URL(article.file, window.location.href).pathname)?.sections || []; });
            bodySearchReady = true;
            searchNotice('');
            return true;
        }).catch(() => {
            searchNotice('本文検索を読み込めませんでした。現在はタイトル・説明・タグから検索できます。', true);
            return false;
        }).finally(() => {
            clearTimeout(timeout);
            bodySearchPromise = null;
            dom.grid?.setAttribute('aria-busy', 'false');
        });
        return bodySearchPromise;
    }

    function renderSearchDestinations() {
        const search = window.PlayPointSearch;
        const matches = currentSearch && !currentGameTitle && !currentBrowseCategory && currentCategory === 'all' && search?.intentId(currentSearch) !== 'other'
            ? searchDestinations.filter(item => search.matches(item, currentSearch, 'ja') && search.score(item, currentSearch, 'ja') >= 100).slice(0, 1) : [];
        let panel = document.getElementById('search-destinations');
        if (!matches.length) { panel?.remove(); return; }
        const signature = JSON.stringify(matches.map(item => item.path));
        if (panel?.dataset.signature === signature) return;
        if (!panel) {
            panel = document.createElement('section'); panel.id = 'search-destinations'; panel.className = 'search-destinations';
            panel.setAttribute('aria-label', '質問に合う案内'); dom.grid.before(panel);
        }
        panel.dataset.signature = signature; panel.replaceChildren();
        const heading = document.createElement('h2'); heading.textContent = '質問に合う案内'; panel.append(heading);
        matches.forEach(item => {
            const link = document.createElement('a'); link.href = item.path; link.textContent = item.title;
            link.dataset.readerQuestion = search.intentId(currentSearch);
            const description = document.createElement('p'); description.textContent = item.description;
            const group = document.createElement('div'); group.append(link, description); panel.append(group);
        });
    }

    let gameCalculators = [];
    let gameCalculatorsLoaded = false;
    function loadGameCalculators() {
        if (gameCalculatorsLoaded) return;
        gameCalculatorsLoaded = true;
        fetch('/blog/game-calculators.json').then(response => {
            if (!response.ok) throw new Error('Game links unavailable');
            return response.json();
        }).then(items => { gameCalculators = Array.isArray(items) ? items : []; renderGameCalculatorLinks(); })
            .catch(() => { gameCalculatorsLoaded = false; });
    }

    // 案内の到着で記事やフォーカスを作り直さない。通信が遅い場合も操作中の要素を保つ。
    function renderGameCalculatorLinks() {
        if (!dom.grid) return;
        dom.grid.querySelector('.game-search-links')?.remove();
        const calculatorMatches = BlogUtils.relatedGameCalculators(gameCalculators, currentSearch, currentGameTitle);
        if (calculatorMatches.length) {
            const section = document.createElement('section'); section.className = 'game-search-links';
            section.setAttribute('aria-label', '関連するゲームの計算機');
            const label = document.createElement('p'); label.textContent = '購入額が決まっている方はこちら'; section.append(label);
            const links = document.createElement('ul');
            calculatorMatches.forEach(game => {
                const li = document.createElement('li'), link = document.createElement('a');
                link.href = game.href; link.textContent = game.title + 'のポイントを計算する'; li.append(link); links.append(li);
            });
            section.append(links);
            const emptyState = dom.grid.querySelector('.empty-state');
            if (emptyState) emptyState.after(section);
            else dom.grid.append(section);
        }
    }

    // Load articles with retry logic
    async function loadArticles() {
        try {
            const response = await fetch(CONFIG.articlesUrl);
            if (!response.ok) throw new Error('Failed to load articles');
            const articles = await response.json();
            allArticles = (Array.isArray(articles) ? articles.map(normalizeArticle) : []).filter(a => a.file !== '#' && a.listed !== false && !/side[ -]?fire|サイドfire/i.test(a.title + ' ' + a.description + ' ' + a.tags.join(' ')));
            if (currentBrowseCategory && !BROWSE_CATEGORIES.includes(currentBrowseCategory)) currentBrowseCategory = '';
            fetchRetryCount = 0; // Reset on success

            // Extract categories
            setupCategories(allArticles);
            setupCategoryOverflow();
            setupGameTitleFilter();
            loadGameCalculators();

            // 入力を待たせず暫定結果を描画し、本文索引の取得後も最新の条件だけで描画する。
            if (dom.searchInput && !dom.searchInput.dataset.bound) {
                dom.searchInput.dataset.bound = 'true';
                const debouncedSearch = debounce(async value => {
                    const changed = value !== currentSearch;
                    currentSearch = value;
                    // 新しい質問は関連度順。検索後に読者が選んだ順序は次の入力まで保つ。
                    if (changed) { sortIsExplicit = false; sortMode = value ? 'relevance' : Storage.getSortOrder() || 'newest'; }
                    if (!value && sortMode === 'relevance') sortMode = Storage.getSortOrder() || 'newest';
                    currentPage = 1;
                    updateURLState('push');
                    render();
                    if (value) await loadBodySearch();
                    if (currentSearch !== value) return;
                    render();
                    if (value) Analytics.trackSearch(value, filterArticles().length);
                }, CONFIG.searchDebounceMs);
                dom.searchInput.addEventListener('focus', () => { loadBodySearch(); });
                dom.searchInput.addEventListener('input', event => debouncedSearch(event.target.value.trim()));
            }
            if (dom.sortToggle && !dom.sortToggle.dataset.bound) {
                dom.sortToggle.dataset.bound = 'true';
                dom.sortToggle.addEventListener('change', () => {
                    sortMode = dom.sortToggle.value;
                    sortIsExplicit = true;
                    Storage.setSortOrder(sortMode);
                    currentPage = 1;
                    updateURLState('push'); render();
                });
            }



            // Handle browser back/forward buttons
            window.addEventListener('popstate', () => {
                clearTimeout(searchDebounceTimer);
                const state = URLState.get();
                currentCategory = state.category;
                currentBrowseCategory = state.topic;
                currentSearch = state.search;
                currentGameTitle = state.game;
                currentPage = state.page;
                sortIsExplicit = Boolean(state.sort);
                sortMode = state.sort || (currentSearch ? 'relevance' : Storage.getSortOrder() || 'newest');

                if (dom.searchInput) {
                    dom.searchInput.value = currentSearch;
                }
                if (dom.gameTitleFilter) {
                    dom.gameTitleFilter.value = currentGameTitle;
                }

                syncCategoryActiveState();
                syncFilterPanelState();
                if (currentSearch) loadBodySearch().then(render);
                render();
                focusResults();
            });

            [dom.searchInput, dom.sortToggle, dom.gameTitleFilter].forEach(control => { if (control) control.disabled = false; });
            dom.grid?.setAttribute('aria-busy', 'false');
            render();
            if (currentSearch) { await loadBodySearch(); render(); }

        } catch (e) {
            console.error('Article loading error:', e);
            fetchRetryCount++;
            dom.grid?.setAttribute('aria-busy', 'false');
            showErrorWithRetry();
        }
    }

    // Show error with retry button
    function showErrorWithRetry() {
        if (dom.loading) dom.loading.classList.add('hidden');
        if (dom.grid) {
            const canRetry = fetchRetryCount < CONFIG.maxRetries;
            const errorMarkup = `
                <div class="error-state">
                    <p style="color: #dc3545; font-size: 1.2rem; margin-bottom: 1rem;">
                        ⚠️ 記事の読み込みに失敗しました
                    </p>
                    <p style="color: var(--text-muted); margin-bottom: 1.5rem;">
                        ${canRetry ? `再試行回数: ${fetchRetryCount}/${CONFIG.maxRetries}` : 'ページを再読み込みしてください'}
                    </p>
                    ${canRetry ? `
                        <button class="reset-btn retry-btn" id="retry-load">
                            🔄 再試行する
                        </button>
                    ` : `
                        <button class="reset-btn reload-btn">
                            🔄 ページを再読み込み
                        </button>
                    `}
                </div>
            `;
            dom.grid.querySelector('.error-state')?.remove();
            if (dom.grid.querySelector('[data-blog-initial-card]')) dom.grid.insertAdjacentHTML('beforeend', errorMarkup);
            else dom.grid.innerHTML = errorMarkup;
            const retryBtn = document.getElementById('retry-load');
            if (retryBtn) {
                retryBtn.addEventListener('click', () => {
                    showSkeletonLoading();
                    loadArticles();
                });
            }
            const reloadBtn = dom.grid.querySelector('.reload-btn');
            if (reloadBtn) {
                reloadBtn.addEventListener('click', () => {
                    location.reload();
                });
            }
        }
    }

    // Update URL state
    function updateURLState(mode = 'replace') {
        URLState.set({
            category: currentCategory,
            topic: currentBrowseCategory,
            search: currentSearch,
            game: currentGameTitle,
            page: currentPage,
            sort: sortMode
        }, mode);
    }

    // Filter articles (extracted for reuse)
    function filterArticles() {
        return BlogUtils.filterListedArticles(allArticles, {
            category: currentCategory,
            browseCategory: currentBrowseCategory,
            search: currentSearch,
            gameTitle: currentGameTitle
        });
    }

    function setupGameTitleFilter() {
        const select = dom.gameTitleFilter;
        if (!select) return;

        const existing = new Set(Array.from(select.options).map(option => option.value));
        const gameNames = BlogUtils.gameTitleFilters(allArticles);
        gameNames.forEach(name => {
            if (existing.has(name)) return;
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            select.appendChild(option);
        });

        if (currentGameTitle && !gameNames.includes(currentGameTitle)) {
            currentGameTitle = '';
        }
        select.value = currentGameTitle;

        if (select.dataset.bound === 'true') return;
        select.dataset.bound = 'true';
        select.addEventListener('change', () => {
            currentGameTitle = select.value;
            currentPage = 1;
            updateURLState('push');
            render();
        });
    }

    // テーマの読込・保存・他ページとの共有はreading-theme.jsだけが所有する。
    function initTheme() { window.PlayPointReadingTheme?.refresh(); }
    function setupThemeToggle() { window.PlayPointReadingTheme?.mount(); }
    function updateSortControl() {
        if (!dom.sortToggle) return;
        const relevance = dom.sortToggle.querySelector('[value="relevance"]');
        if (relevance) { relevance.disabled = !currentSearch; relevance.hidden = !currentSearch; }
        if (!currentSearch && sortMode === 'relevance') sortMode = 'newest';
        dom.sortToggle.value = sortMode;
    }

    function syncFilterPanelState() {
        if (!dom.filterPanel) return;
        const hasOptionalFilter = Boolean(
            currentGameTitle ||
            currentBrowseCategory ||
            currentCategory !== 'all' ||
            sortMode === 'oldest' ||
            sortMode === 'updated'
        );
        dom.filterPanel.classList.toggle('has-active-filter', hasOptionalFilter);
        // 開閉は読者の操作を保持し、検索の再描画では変更しない。
    }


    function setupCategories(articles) {
        if (!dom.categoryFilter) return;

        const topicCounts = Object.fromEntries(BROWSE_CATEGORIES.map(topic => [topic, 0]));
        articles.forEach(article => {
            if (Object.prototype.hasOwnProperty.call(topicCounts, article.browseCategory)) {
                topicCounts[article.browseCategory] += 1;
            }
        });

        dom.categoryFilter.innerHTML = '';
        const topics = ['', ...BROWSE_CATEGORIES.filter(topic => topicCounts[topic] > 0)];
        topics.forEach(topic => {
            const btn = document.createElement('button');
            const count = topic ? topicCounts[topic] : articles.length;
            btn.textContent = topic ? `${topic} (${count})` : `すべて (${count})`;
            btn.dataset.topic = topic;
            const active = topic === currentBrowseCategory && (topic || currentCategory === 'all');
            btn.className = active ? 'active' : '';
            btn.setAttribute('aria-pressed', String(Boolean(active)));
            btn.addEventListener('click', () => setBrowseCategory(topic));
            dom.categoryFilter.appendChild(btn);
        });
    }

    function syncCategoryActiveState() {
        if (dom.categoryFilter) {
            dom.categoryFilter.querySelectorAll('button').forEach(btn => {
                const active = btn.dataset.topic === currentBrowseCategory
                    && (btn.dataset.topic || currentCategory === 'all');
                btn.classList.toggle('active', Boolean(active));
                btn.setAttribute('aria-pressed', String(Boolean(active)));
            });
        }
    }

    function resetFilters() {
        currentCategory = 'all';
        currentBrowseCategory = '';
        currentSearch = '';
        currentGameTitle = '';
        currentPage = 1;
        if (dom.searchInput) dom.searchInput.value = '';
        if (dom.gameTitleFilter) dom.gameTitleFilter.value = '';
        syncCategoryActiveState();
        updateURLState('push');
        render();
    }

    function setBrowseCategory(topic) {
        currentBrowseCategory = topic;
        currentCategory = 'all';
        currentPage = 1;

        updateURLState('push');
        Analytics.trackCategoryFilter(topic || 'all');

        syncCategoryActiveState();
        render();
    }

    function render() {
        if (!dom.grid) return;

        let filtered = filterArticles();
        renderSearchDestinations();

        updateSortControl();
        syncFilterPanelState();
        filtered = BlogUtils.sortListedArticles(filtered, { mode: sortMode, search: currentSearch });
        syncBrowseFacets();

        // 全件・絞り込みとも実際の件数を示し、適用中の条件を解除できる。
        if (dom.resultStatus) {
            const active = Boolean(currentSearch || currentGameTitle || currentBrowseCategory || currentCategory !== 'all');
            const conditions = [currentSearch ? '「' + currentSearch + '」' : '', currentGameTitle, currentBrowseCategory, currentCategory !== 'all' ? currentCategory : ''].filter(Boolean);
            dom.resultStatus.classList.toggle('visually-hidden', !active);
            dom.resultStatus.replaceChildren(document.createTextNode((conditions.length ? conditions.join(' / ') + '：' : '') + filtered.length + '件'));
            if (active) {
                const clear = document.createElement('button'); clear.type = 'button'; clear.className = 'filter-reset-inline'; clear.textContent = '条件を解除';
                clear.addEventListener('click', () => { resetFilters(); dom.searchInput?.focus(); });
                dom.resultStatus.append(clear);
            }
        }


        // 3. Paginate
        const totalPages = Math.ceil(filtered.length / CONFIG.itemsPerPage);
        currentPage = BlogUtils.clampPageJump(currentPage, totalPages);
        updateURLState();

        const start = (currentPage - 1) * CONFIG.itemsPerPage;
        const end = start + CONFIG.itemsPerPage;
        const pageItems = filtered.slice(start, end);

        // 追加通信が完了しても、同じ初期カードの本文と画像は作り直さない。
        const initialCards = [...dom.grid.querySelectorAll('[data-blog-initial-card]')];
        if (initialCards.length && !currentSearch && !currentGameTitle && !currentBrowseCategory && currentCategory === 'all' && currentPage === Number(document.body.dataset.blogPage || 1) && sortMode === 'newest'
            && initialCards.length === pageItems.length && initialCards.every((card, i) => card.dataset.blogInitialSignature === BlogUtils.articleCardIdentity(pageItems[i]))) {
            initialCards.forEach((card, i) => {
                const article = pageItems[i];
                delete card.dataset.blogInitialCard;
                card.addEventListener('click', () => Analytics.trackArticleClick(article.title, article.category));
                const image = card.querySelector('img');
                if (image) {
                    image.onerror = () => BlogUtils.handleImageError(image);
                    if (image.complete && !image.naturalWidth) BlogUtils.handleImageError(image);
                }
                if (isNewArticle(article.date)) card.querySelector('.card-topic')?.insertAdjacentHTML('afterend', '<span class="badge-new" title="公開から7日以内">新着</span>');
            });
            dom.grid.querySelector('.error-state')?.remove();
            listingAd = createAdElement();
            initialCards[CONFIG.adInterval - 1]?.after(listingAd);
            listingAd.dataset.requestScheduled = 'true';
            void window.PlayPointBlogAds?.request(dom.grid);
            renderPagination(totalPages);
            return;
        }

        // Render Grid
        if (dom.loading) dom.loading.classList.add('hidden');
        compactThumbnailObserver?.disconnect();
        for (const child of Array.from(dom.grid.childNodes)) { if (child !== listingAd) child.remove(); }


        if (pageItems.length === 0) {
          var q = BlogUtils.escapeHtml(currentSearch);
          dom.grid.insertAdjacentHTML('afterbegin', '<div class="empty-state"><h2>' + (q ? '「' + q + '」に一致する記事は見つかりませんでした' : 'この絞り込みに一致する記事はありません') + '</h2><p>ゲーム名や困っていることを短くして検索できます。関連する確認先もご覧ください。</p><button class="reset-btn" id="reset-filters">検索とカテゴリーをリセット</button></div>');
          document.getElementById('reset-filters').addEventListener('click', resetFilters);
          const recovery = document.createElement('div'); recovery.className = 'search-recovery';
          if (currentBrowseCategory || currentCategory !== 'all' || currentGameTitle) {
              const widen = document.createElement('button'); widen.type = 'button'; widen.textContent = '検索語を残して、全カテゴリーから探す';
              widen.addEventListener('click', () => { currentBrowseCategory = ''; currentCategory = 'all'; currentGameTitle = ''; currentPage = 1; if (dom.gameTitleFilter) dom.gameTitleFilter.value = ''; syncCategoryActiveState(); updateURLState(); render(); }); recovery.append(widen);
          }
          const related = window.PlayPointSearch?.suggest(allArticles, currentSearch, 'ja') || [];
          const label = document.createElement('p'); label.textContent = related.length ? '入力した言葉に関連する記事' : '目的から探す'; recovery.append(label);
          const choices = related.length ? related.map(a => ({ href: a.file, title: a.title })) : [
              { href: '../articles/2026-08-05-play-points-levels-guide.html', title: '各ランクの必要ポイント・特典を比較' },
              { href: '../articles/2026-03-10-play-points-reflection-timing.html', title: 'ポイントが付かないときの確認手順' },
              { href: '../articles/2025-12-25-best-use.html', title: 'クーポン・アイテム・Playクレジットの使い道を比較' }
          ];
          const list = document.createElement('ul');
          choices.forEach(item => { const li = document.createElement('li'), link = document.createElement('a'); link.href = item.href; link.textContent = item.title; li.append(link); list.append(li); });
          recovery.append(list);
          const latestLink = document.createElement('a');
          const benefitQuery = /steel\s*series|スチール\s*シリーズ|pixel|ピクセル/i.test(currentSearch.normalize('NFKC'));
          latestLink.href = benefitQuery ? '/latest/?filter=other' : '/latest/';
          latestLink.textContent = benefitQuery ? 'Pixel・SteelSeriesなど「その他の特典」を見る' : '記事になっていないキャンペーンは最新情報で確認する';
          const latestChoice = document.createElement('p'); latestChoice.append(latestLink); recovery.append(latestChoice);
          dom.grid.append(recovery);
          renderGameCalculatorLinks();
          renderPagination(0); return;
        }

        // 結果件数・ページ番号だけを通知し、一覧全文の重複読上げを避ける。
        dom.grid.removeAttribute('aria-live');

        let articleIndex = 0;
        let compactThumbnailIndex = 0;
        pageItems.forEach((article, idx) => {
            // Insert ad after every adInterval articles
            if (idx > 0 && idx % CONFIG.adInterval === 0) {
                const adEl = listingAd || (listingAd = createAdElement());
                if (!adEl.isConnected) dom.grid.appendChild(adEl);
                if (!adEl.dataset.requestScheduled) {
                    adEl.dataset.requestScheduled = 'true';
                    void window.PlayPointBlogAds?.request(dom.grid);
                }
            }

            const card = document.createElement('a');
            card.setAttribute('aria-label', article.title);
            const snippet = window.PlayPointSearch?.excerpt(article, currentSearch, 'ja');
            card.href = new URL(article.file, location.origin + '/blog/').pathname;
            if (currentSearch && snippet?.id) card.href += '#' + encodeURIComponent(snippet.id);
            card.className = 'article-card';
            card.classList.toggle('article-card--visual', article.thumbnailKind !== 'app-icon');
            card.addEventListener('click', () => Analytics.trackArticleClick(article.title, article.category));
            const compact = isCompactArticleList();
            card.innerHTML = BlogUtils.articleCardMarkup(article, { search: currentSearch, snippet, isNew: isNewArticle(article.date), compact, first: compact && compactThumbnailIndex++ === 0 });
            card.querySelectorAll('img, source').forEach(node => {
                ['src', 'data-src'].forEach(attr => { const value = node.getAttribute(attr); if (value?.startsWith('../')) node.setAttribute(attr, new URL(value, location.origin + '/blog/').pathname); });
                ['srcset', 'data-srcset'].forEach(attr => { const value = node.getAttribute(attr); if (value) node.setAttribute(attr, value.replace(/\.\.\//g, '/')); });
            });

            // Attach error handler
            const img = card.querySelector('img');
            if (img) {
                img.onerror = () => BlogUtils.handleImageError(img);
                if (img.dataset.src) observeDeferredThumbnail(img);
            }

            if (listingAd?.isConnected && idx < CONFIG.adInterval) dom.grid.insertBefore(card, listingAd);
            else dom.grid.appendChild(card);
            articleIndex++;
        });

        renderPagination(totalPages);
        renderGameCalculatorLinks();

    }

    function renderPagination(totalPages) {
        if (!dom.pagination) return;
        const focused = dom.pagination.contains(document.activeElement) ? document.activeElement : null;
        const focusSelector = focused?.matches('.pagination-next') ? '.pagination-next'
            : focused?.matches('.pagination-prev') ? '.pagination-prev'
            : focused?.matches('.pagination-page-input') ? '.pagination-page-input' : null;
        dom.pagination.innerHTML = '';
        if (totalPages <= 1) { if (focusSelector) { dom.grid.tabIndex = -1; dom.grid.focus({ preventScroll: true }); } return; }

        const wrapper = document.createElement('div');
        wrapper.className = 'pagination-compact-wrapper';

        const pageHref = page => {
            const url = new URL(location.href);
            const plain = !currentSearch && !currentGameTitle && !currentBrowseCategory && currentCategory === 'all' && sortMode === 'newest';
            url.pathname = plain && page > 1 ? '/blog/page/' + page + '/' : '/blog/';
            if (!plain && page > 1) url.searchParams.set('page', page); else url.searchParams.delete('page');
            return url.pathname + url.search;
        };
        const navigate = (event, page) => {
            if (event.currentTarget.getAttribute('aria-disabled') === 'true') { event.preventDefault(); return; }
            if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
            event.preventDefault(); changePage(page);
        };
        const prev = document.createElement('a');
        prev.textContent = '← 前へ';
        prev.disabled = currentPage === 1;
        prev.href = pageHref(Math.max(1, currentPage - 1));
        if (prev.disabled) { prev.setAttribute('aria-disabled', 'true'); prev.tabIndex = -1; }
        prev.className = 'pagination-nav pagination-box pagination-prev';
        prev.addEventListener('click', event => navigate(event, currentPage - 1));

        const inputWrap = document.createElement('div');
        inputWrap.className = 'pagination-box pagination-input-wrap';
        inputWrap.setAttribute('title', 'ページ番号を入力してEnterで移動');

        const pageInput = document.createElement('input');
        pageInput.type = 'text';
        pageInput.className = 'pagination-page-input';
        pageInput.inputMode = 'numeric';
        pageInput.setAttribute('aria-label', 'ページ番号を入力して移動');
        pageInput.value = String(currentPage);
        pageInput.addEventListener('focus', function () { pageInput.select(); });

        function jumpFromInput() {
            const targetPage = BlogUtils.clampPageJump(pageInput.value, totalPages);
            if (targetPage !== currentPage) {
                changePage(targetPage);
                return;
            }
            pageInput.value = String(currentPage);
        }

        pageInput.addEventListener('keydown', function (event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                jumpFromInput();
            }
        });
        pageInput.addEventListener('change', jumpFromInput);

        const slash = document.createElement('span');
        slash.className = 'pagination-page-slash';
        slash.setAttribute('aria-hidden', 'true');
        slash.textContent = '/';

        const total = document.createElement('span');
        total.className = 'pagination-page-total';
        total.textContent = String(totalPages);

        inputWrap.appendChild(pageInput);
        inputWrap.appendChild(slash);
        inputWrap.appendChild(total);
        inputWrap.addEventListener('click', function (event) {
            if (event.target !== pageInput) pageInput.focus();
        });

        const status = document.createElement('span');
        status.className = 'pagination-status visually-hidden';
        status.textContent = currentPage + ' / ' + totalPages;
        status.setAttribute('aria-current', 'page');
        status.setAttribute('role', 'status');
        status.setAttribute('aria-live', 'polite');

        const next = document.createElement('a');
        next.textContent = '次へ →';
        next.disabled = currentPage === totalPages;
        next.href = pageHref(Math.min(totalPages, currentPage + 1));
        if (next.disabled) { next.setAttribute('aria-disabled', 'true'); next.tabIndex = -1; }
        next.className = 'pagination-nav pagination-box pagination-next';
        next.addEventListener('click', event => navigate(event, currentPage + 1));

        wrapper.append(prev, inputWrap, next, status);
        dom.pagination.append(wrapper);
        if (focusSelector) {
            const target = dom.pagination.querySelector(focusSelector);
            (target && !target.disabled ? target : pageInput).focus({ preventScroll: true });
        }
    }

    function setupCategoryOverflow() {
      if (!dom.categoryFilter || !dom.categoryScrollHint) return;
      function sync() { var overflow = dom.categoryFilter.scrollWidth > dom.categoryFilter.clientWidth + 2; var end = dom.categoryFilter.scrollLeft + dom.categoryFilter.clientWidth >= dom.categoryFilter.scrollWidth - 4; dom.categoryScrollHint.hidden = !overflow; dom.categoryFilter.classList.toggle('is-scrollable', overflow && !end); }
      sync(); dom.categoryFilter.addEventListener('scroll', sync, { passive: true }); window.addEventListener('resize', sync);
    }

    function changePage(num) {
        currentPage = num;
        updateURLState('push');
        render();
        focusResults();
    }

    function focusResults() {
        const target = dom.grid?.querySelector('.article-card') || document.getElementById('article-list-title');
        target?.focus({ preventScroll: true });
        const heading = document.getElementById('article-list-title');
        if (heading) window.scrollTo({ top: Math.max(0, heading.getBoundingClientRect().top + window.scrollY - 16), behavior: 'auto' });
    }

    function syncBrowseFacets() {
        const candidates = BlogUtils.filterListedArticles(allArticles, { search: currentSearch, gameTitle: currentGameTitle });
        const counts = Object.fromEntries(BROWSE_CATEGORIES.map(topic => [topic, candidates.filter(a => a.browseCategory === topic).length]));
        dom.categoryFilter?.querySelectorAll('button').forEach(button => {
            const topic = button.dataset.topic;
            button.textContent = topic ? `${topic} (${counts[topic] || 0})` : `すべて (${candidates.length})`;
        });
        document.querySelectorAll('.sidebar-browse-category').forEach(link => {
            const topic = link.dataset.topic || new URL(link.href, location.href).searchParams.get('topic');
            const count = counts[topic] || 0;
            const badge = link.querySelector('.sidebar-browse-count');
            if (badge) { badge.textContent = count; badge.setAttribute('aria-label', count + '件'); }
            const url = new URL('/blog/', location.href);
            if (topic !== currentBrowseCategory) url.searchParams.set('topic', topic);
            if (currentSearch) url.searchParams.set('q', currentSearch);
            if (currentGameTitle) url.searchParams.set('game', currentGameTitle);
            if (sortIsExplicit) url.searchParams.set('sort', sortMode);
            link.href = url.pathname + url.search;
            // topicは元の分類名を保持し、選択解除後の再描画でも失わない。
            link.dataset.topic = link.dataset.topic || topic;
            link.parentElement.classList.toggle('is-current-topic', link.dataset.topic === currentBrowseCategory);
            if (link.dataset.topic === currentBrowseCategory) link.setAttribute('aria-current', 'true'); else link.removeAttribute('aria-current');
            if (link.dataset.filterBound) return;
            link.dataset.filterBound = 'true';
            link.addEventListener('click', event => {
                if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
                event.preventDefault(); setBrowseCategory(currentBrowseCategory === link.dataset.topic ? '' : link.dataset.topic);
            });
        });
        document.querySelectorAll('.sidebar-search-input, .sidebar-search input[type="search"], #guide-menu input[name="q"]').forEach(input => { input.value = currentSearch; });
        document.querySelectorAll('.sidebar-search-form').forEach(form => {
            for (const [name, value] of Object.entries({ game: currentGameTitle, topic: currentBrowseCategory, category: currentCategory === 'all' ? '' : currentCategory })) {
                let input = form.querySelector(`input[name="${name}"]`);
                if (!value) { input?.remove(); continue; }
                if (!input) { input = document.createElement('input'); input.type = 'hidden'; input.name = name; form.append(input); }
                input.value = value;
            }
        });
        const totalPages = Math.max(1, Math.ceil(filterArticles().length / CONFIG.itemsPerPage));
        const current = Math.min(Math.max(1, Number(currentPage) || 1), totalPages);
        const summary = document.getElementById('article-page-summary');
        if (summary) {
            const total = filterArticles().length;
            summary.textContent = total ? `${(current - 1) * CONFIG.itemsPerPage + 1}〜${Math.min(current * CONFIG.itemsPerPage, total)}件目 / ${total}件 · ${current} / ${totalPages}ページ` : '';
        }
    }

    // Back to Top Button
    function setupBackToTop() {
        const backToTopBtn = document.getElementById('back-to-top');
        if (!backToTopBtn) return;

        // Show/hide based on scroll position
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    if (window.scrollY > 300) {
                        backToTopBtn.classList.add('visible');
                    } else {
                        backToTopBtn.classList.remove('visible');
                    }
                    ticking = false;
                });
                ticking = true;
            }
        });

        // Scroll to top on click
        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        });
    }



    function setupStaticReloadButton() {
        const reloadBtn = document.getElementById('error-reload');
        if (reloadBtn) {
            reloadBtn.addEventListener('click', () => {
                location.reload();
            });
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        init();
        setupBackToTop();
        setupThemeToggle();
        setupStaticReloadButton();
    });

})();
