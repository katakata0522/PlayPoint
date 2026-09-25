(function () {
    'use strict';

    // ===========================================
    // Configuration Constants
    // ===========================================
    const CONFIG = {
        articlesUrl: 'articles.json?v=20260925_sidebar1',
        itemsPerPage: 6,
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
                page: params.get('page') || '1',
                sort: ['newest', 'oldest', 'updated', 'relevance'].includes(params.get('sort')) ? params.get('sort') : null
            };
        },
        set: function (state) {
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
            window.history.replaceState({}, '', url);
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

    function sanitizeArticleFile(value) {
        if (typeof value !== 'string') return '#';
        const standardArticle = /^\.\.\/articles\/[^/]+\.html$/.test(value);
        const gameGuideArticle = /^\.\.\/games\/[a-z0-9-]+\/[a-z0-9-]+\/index\.html$/.test(value);
        if (!standardArticle && !gameGuideArticle) return '#';
        if (/[<>"']/.test(value)) return '#';
        return value;
    }

    function sanitizeArticleThumbnail(value) {
        if (typeof value !== 'string') return BlogUtils.getPlaceholderImage();
        const standardThumbnail = /^\.\.\/articles\/ogp\/[^/]+\.png$/.test(value);
        const gameIcon = /^\.\.\/images\/game-icons\/[a-z0-9-]+\.(?:png|jpe?g|webp)$/.test(value);
        const sharedSiteOgp = value === '../ogp.png';
        if (!standardThumbnail && !gameIcon && !sharedSiteOgp) return BlogUtils.getPlaceholderImage();
        if (/[<>"']/.test(value)) return BlogUtils.getPlaceholderImage();
        return value;
    }

    function sanitizeArticleThumbnailKind(value) {
        return ['generic', 'app-icon', 'event-visual'].includes(value) ? value : 'generic';
    }

    // 記事JSONの値を描画前に正規化する
    function normalizeArticle(article) {
        article = article && typeof article === 'object' ? article : {};
        const tags = Array.isArray(article.tags) ? article.tags.filter(tag => typeof tag === 'string') : [];
        const title = typeof article.title === 'string' ? article.title : '';
        const description = typeof article.description === 'string' ? article.description : '';
        const category = typeof article.category === 'string' ? article.category : '';

        return {
            id: typeof article.id === 'string' ? article.id : '',
            title,
            listTitle: typeof article.listTitle === 'string' && article.listTitle.trim() ? article.listTitle.trim() : title,
            date: BlogUtils.validArticleDate(article.date),
            modified: BlogUtils.validArticleDate(article.modified),
            category,
            browseCategory: typeof article.browseCategory === 'string' ? article.browseCategory : '',
            tags,
            description,
            listDescription: typeof article.listDescription === 'string' ? article.listDescription : description,
            file: sanitizeArticleFile(article.file),
            thumbnail: sanitizeArticleThumbnail(article.thumbnail),
            thumbnailKind: sanitizeArticleThumbnailKind(article.thumbnailKind),
            listed: article.listed !== false,
            searchIndex: BlogUtils.buildArticleSearchIndex({
                title,
                description,
                tags,
                category
            })
        };
    }

    const COMPACT_THUMBNAIL_QUERY = '(max-width: 760px)';
    const COMPACT_THUMBNAIL_ROOT_MARGIN = '96px 0px';
    const TRANSPARENT_THUMBNAIL_PLACEHOLDER = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
    let compactThumbnailObserver = null;

    function isCompactArticleList() {
        return Boolean(window.matchMedia && window.matchMedia(COMPACT_THUMBNAIL_QUERY).matches);
    }

    function shouldRenderArticleThumbnail(article) {
        if (!isCompactArticleList()) return true;
        return article?.thumbnailKind === 'app-icon' || article?.thumbnailKind === 'event-visual';
    }

    function loadDeferredThumbnail(image) {
        const source = image?.dataset?.src;
        if (!source) return;
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
        if (!dom.grid) return;
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
        sortIsExplicit = Boolean(urlState.sort || storedSort);
        sortMode = urlState.sort || storedSort || (currentSearch ? 'relevance' : 'newest');
        if (!currentSearch && sortMode === 'relevance') sortMode = 'newest';
        if (dom.searchInput && currentSearch) dom.searchInput.value = currentSearch;
        updateSortControl();
        syncFilterPanelState();

        await loadArticles();
    }

    // 本文検索は検索欄を使う時に取得し、記事一覧の初期表示を待たせない。
    let bodySearchPromise = null;
    let bodySearchReady = false;
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
        bodySearchPromise = fetch('article-search-index.json', { signal: controller.signal }).then(response => {
            if (!response.ok) throw new Error('Search index unavailable');
            return response.json();
        }).then(index => {
            if (!Array.isArray(index?.articles)) throw new Error('Invalid search index');
            const byPath = new Map(index.articles.map(item => [item.path, item]));
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

            // 入力を待たせず暫定結果を描画し、本文索引の取得後も最新の条件だけで描画する。
            if (dom.searchInput && !dom.searchInput.dataset.bound) {
                dom.searchInput.dataset.bound = 'true';
                const debouncedSearch = debounce(async value => {
                    currentSearch = value;
                    if (!sortIsExplicit) sortMode = value ? 'relevance' : 'newest';
                    if (!value && sortMode === 'relevance') sortMode = Storage.getSortOrder() || 'newest';
                    currentPage = 1;
                    updateURLState();
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
                    updateURLState(); render();
                });
            }



            // Handle browser back/forward buttons
            window.addEventListener('popstate', () => {
                const state = URLState.get();
                currentCategory = state.category;
                currentBrowseCategory = state.topic;
                currentSearch = state.search;
                currentGameTitle = state.game;
                currentPage = state.page;
                sortIsExplicit = Boolean(state.sort || Storage.getSortOrder());
                sortMode = state.sort || Storage.getSortOrder() || (currentSearch ? 'relevance' : 'newest');

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
            });

            render();
            if (currentSearch) { await loadBodySearch(); render(); }

        } catch (e) {
            console.error('Article loading error:', e);
            fetchRetryCount++;
            showErrorWithRetry();
        }
    }

    // Show error with retry button
    function showErrorWithRetry() {
        if (dom.loading) dom.loading.classList.add('hidden');
        if (dom.grid) {
            const canRetry = fetchRetryCount < CONFIG.maxRetries;
            dom.grid.innerHTML = `
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
    function updateURLState() {
        URLState.set({
            category: currentCategory,
            topic: currentBrowseCategory,
            search: currentSearch,
            game: currentGameTitle,
            page: currentPage,
            sort: sortMode
        });
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
        BlogUtils.GAME_TITLE_FILTERS.forEach(name => {
            if (existing.has(name)) return;
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            select.appendChild(option);
        });

        if (currentGameTitle && !BlogUtils.GAME_TITLE_FILTERS.includes(currentGameTitle)) {
            currentGameTitle = '';
        }
        select.value = currentGameTitle;

        if (select.dataset.bound === 'true') return;
        select.dataset.bound = 'true';
        select.addEventListener('change', () => {
            currentGameTitle = select.value;
            currentPage = 1;
            updateURLState();
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
        if (hasOptionalFilter) dom.filterPanel.open = true;
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
        updateURLState();
        render();
    }

    function setBrowseCategory(topic) {
        currentBrowseCategory = topic;
        currentCategory = 'all';
        currentPage = 1;

        updateURLState();
        Analytics.trackCategoryFilter(topic || 'all');

        syncCategoryActiveState();
        render();
    }

    function render() {
        if (!dom.grid) return;

        let filtered = filterArticles();

        updateSortControl();
        syncFilterPanelState();
        filtered = BlogUtils.sortListedArticles(filtered, { mode: sortMode, search: currentSearch });

        // 通常一覧は件数を繰り返さず、絞り込み中だけ条件と実際の件数を短く見せる。
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

        // Render Grid
        if (dom.loading) dom.loading.classList.add('hidden');
        compactThumbnailObserver?.disconnect();
        for (const child of Array.from(dom.grid.childNodes)) { if (child !== listingAd) child.remove(); }

        if (pageItems.length === 0) {
          var q = BlogUtils.escapeHtml(currentSearch);
          dom.grid.insertAdjacentHTML('afterbegin', '<div class="empty-state"><h2>' + (q ? '「' + q + '」の記事は見つかりませんでした' : '該当する記事はありません') + '</h2><p>表記を短くするか、「必要額」「反映」「キャンペーン」などでもお試しください。</p><button class="reset-btn" id="reset-filters">検索とカテゴリーをリセット</button></div>');
          document.getElementById('reset-filters').addEventListener('click', resetFilters);
          const recovery = document.createElement('div'); recovery.className = 'search-recovery';
          if (currentBrowseCategory || currentCategory !== 'all' || currentGameTitle) {
              const widen = document.createElement('button'); widen.type = 'button'; widen.textContent = '検索語を残して、全カテゴリーから探す';
              widen.addEventListener('click', () => { currentBrowseCategory = ''; currentCategory = 'all'; currentGameTitle = ''; currentPage = 1; if (dom.gameTitleFilter) dom.gameTitleFilter.value = ''; syncCategoryActiveState(); updateURLState(); render(); }); recovery.append(widen);
          }
          const related = window.PlayPointSearch?.suggest(allArticles, currentSearch, 'ja') || [];
          const label = document.createElement('p'); label.textContent = related.length ? '一部のキーワードに関連する記事' : '目的から探す'; recovery.append(label);
          const choices = related.length ? related.map(a => ({ href: a.file, title: a.title })) : [
              { href: '../articles/2026-08-05-play-points-levels-guide.html', title: 'ランクの条件を調べる' },
              { href: '../articles/2026-03-10-play-points-reflection-timing.html', title: 'ポイントが反映されない時の確認' },
              { href: '../articles/2025-12-25-best-use.html', title: 'ポイントの使い方を選ぶ' }
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
            const safeTitle = BlogUtils.escapeHtml(article.listTitle);
            card.setAttribute('aria-label', article.title);
            const snippet = window.PlayPointSearch?.excerpt(article, currentSearch, 'ja');
            const safeDesc = BlogUtils.escapeHtml(currentSearch ? (snippet?.text || article.description) : article.listDescription);
            const safeCategory = BlogUtils.escapeHtml(article.category);
            const safeFile = BlogUtils.escapeHtml(article.file);
            const safeThumbnail = BlogUtils.escapeHtml(article.thumbnail);
            const updated = article.modified && article.modified > article.date ? article.modified : '';
            const dateMarkup = `<time datetime="${updated || article.date}">${updated ? '更新 ' : ''}${BlogUtils.formatDate(updated || article.date)}</time>`;
            const categoryColor = getCategoryColor(article.category);
            const isNew = isNewArticle(article.date);
            const newBadge = isNew ? '<span class="badge-new">NEW</span>' : '';

            card.href = safeFile;
            if (currentSearch && snippet?.id) card.href = article.file + '#' + encodeURIComponent(snippet.id);
            card.className = 'article-card';
            card.addEventListener('click', () => {
                Analytics.trackArticleClick(article.title, article.category);
            });
            const renderThumbnail = shouldRenderArticleThumbnail(article);
            const thumbnailKind = sanitizeArticleThumbnailKind(article.thumbnailKind);
            const compactExplicitThumbnail = renderThumbnail
                && isCompactArticleList()
                && (thumbnailKind === 'app-icon' || thumbnailKind === 'event-visual');
            const loadCompactThumbnailImmediately = compactExplicitThumbnail && compactThumbnailIndex === 0;
            if (compactExplicitThumbnail) compactThumbnailIndex += 1;
            const deferThumbnail = compactExplicitThumbnail && !loadCompactThumbnailImmediately;
            const thumbnailWidth = thumbnailKind === 'app-icon' ? 96 : 600;
            const thumbnailHeight = thumbnailKind === 'app-icon' ? 96 : 400;
            const thumbnailLoading = loadCompactThumbnailImmediately ? 'eager' : 'lazy';
            const thumbnailFetchPriority = loadCompactThumbnailImmediately ? 'high' : 'low';
            const thumbnailMarkup = renderThumbnail
                ? `<img src="${deferThumbnail ? TRANSPARENT_THUMBNAIL_PLACEHOLDER : safeThumbnail}"${deferThumbnail ? ` data-src="${safeThumbnail}"` : ''} alt="" width="${thumbnailWidth}" height="${thumbnailHeight}" loading="${thumbnailLoading}" decoding="async" fetchpriority="${thumbnailFetchPriority}">`
                : '';
            const thumbnailClass = renderThumbnail
                ? `card-thumb card-thumb--${thumbnailKind}`
                : 'card-thumb card-thumb--text-only';
            const thumbnailStyle = '';

            card.innerHTML = `
                <div class="${thumbnailClass}"${thumbnailStyle}>
                    ${thumbnailMarkup}
                    <span class="card-category badge" >${safeCategory}</span>
                    ${newBadge}
                </div>
                <div class="card-content">
                    ${dateMarkup}
                    <h3>${safeTitle}</h3>
                    ${currentSearch && snippet?.heading ? '<span class="search-snippet-heading">' + BlogUtils.escapeHtml(snippet.heading) + '</span>' : ''}
                    <p class="card-desc">${safeDesc}</p>
                    <div class="card-tags">
                        ${article.tags.map(t => `#${BlogUtils.escapeHtml(t)}`).join(' ')}
                    </div>
                </div>
            `;

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

        const prev = document.createElement('button');
        prev.textContent = '← 前へ';
        prev.disabled = currentPage === 1;
        prev.className = 'pagination-nav pagination-box pagination-prev';
        prev.addEventListener('click', function () { changePage(currentPage - 1); });

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

        const next = document.createElement('button');
        next.textContent = '次へ →';
        next.disabled = currentPage === totalPages;
        next.className = 'pagination-nav pagination-box pagination-next';
        next.addEventListener('click', function () { changePage(currentPage + 1); });

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
        updateURLState();
        render();
        // Scroll to top of grid (with null check)
        const scrollTarget = dom.categoryFilter || dom.grid;
        if (scrollTarget) {
            const topOfGrid = scrollTarget.getBoundingClientRect().top + window.scrollY - 100;
            window.scrollTo({ top: topOfGrid, behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
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
