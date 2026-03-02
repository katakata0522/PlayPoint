(function () {
    'use strict';

    // ===========================================
    // Configuration Constants
    // ===========================================
    const CONFIG = {
        articlesUrl: 'articles.json',
        itemsPerPage: 6,
        adInterval: 3,
        newThresholdDays: 7,
        searchDebounceMs: 300,
        placeholderImage: 'https://placehold.co/600x400/e0e0e0/999999?text=No+Image',
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
        '入門': { order: 1, color: '#22c55e' },
        '攻略': { order: 2, color: '#f59e0b' },
        '活用術': { order: 3, color: '#3b82f6' },
        '検証': { order: 4, color: '#8b5cf6' },
        'トラブル対処': { order: 5, color: '#ef4444' }
    };

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
        getTheme: function () {
            return this.get().theme || 'dark';
        },
        setTheme: function (theme) {
            this.set({ theme });
        },
        getSortOrder: function () {
            const saved = this.get().sortNewestFirst;
            return saved !== undefined ? saved : true;
        },
        setSortOrder: function (newestFirst) {
            this.set({ sortNewestFirst: newestFirst });
        }
    };

    // ===========================================
    // Google Analytics 4 Event Tracking
    // ===========================================
    const Analytics = {
        track: function (eventName, params) {
            if (typeof gtag === 'function') {
                gtag('event', eventName, params);
            }
        },
        trackArticleClick: function (title, category) {
            this.track('article_click', {
                article_title: title,
                article_category: category
            });
        },
        trackSearch: function (query, resultsCount) {
            this.track('search', {
                search_term: query,
                results_count: resultsCount
            });
        },
        trackCategoryFilter: function (category) {
            this.track('category_filter', {
                category_name: category
            });
        },
        trackThemeChange: function (theme) {
            this.track('theme_change', {
                theme_mode: theme
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
                search: params.get('q') || '',
                page: parseInt(params.get('page'), 10) || 1,
                sort: params.get('sort') !== 'oldest'
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
            // Search
            if (state.search) {
                url.searchParams.set('q', state.search);
            } else {
                url.searchParams.delete('q');
            }
            // Page
            if (state.page && state.page > 1) {
                url.searchParams.set('page', state.page);
            } else {
                url.searchParams.delete('page');
            }
            // Sort
            if (state.sort === false) {
                url.searchParams.set('sort', 'oldest');
            } else {
                url.searchParams.delete('sort');
            }
            window.history.replaceState({}, '', url);
        }
    };

    // State
    let allArticles = [];
    let currentCategory = 'all';
    let currentSearch = '';
    let currentPage = 1;
    let sortNewestFirst = true;
    let searchDebounceTimer = null;
    let scrollObserver = null;
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

    // Get category order with fallback
    function getCategoryOrder(category) {
        return CATEGORIES[category]?.order || 999;
    }

    // Check if article is new (within threshold days) - timezone safe
    function isNewArticle(dateStr) {
        if (!dateStr) return false;
        const [y, m, d] = dateStr.split('-').map(Number);
        const articleDate = new Date(y, m - 1, d); // Local timezone
        const now = new Date();
        const diffTime = now - articleDate;
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        return diffDays <= CONFIG.newThresholdDays;
    }

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
        sortToggle: document.getElementById('sort-toggle'),
        loading: document.getElementById('loading-spinner'),
        error: document.getElementById('error-message'),
        // Sidebar elements
        sidebarToggle: document.getElementById('sidebar-toggle'),
        sidebar: document.getElementById('sidebar'),
        sidebarOverlay: document.getElementById('sidebar-overlay'),
        sidebarClose: document.getElementById('sidebar-close'),
        sidebarCategories: document.getElementById('sidebar-categories'),
        sidebarRecent: document.getElementById('sidebar-recent')
    };

    // Create Particles in Hero Section
    function createParticles() {
        const heroSection = document.querySelector('.hero-section');
        if (!heroSection) return;

        // Create container if not exists
        let container = document.getElementById('particles-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'particles-container';
            heroSection.insertBefore(container, heroSection.firstChild);
        }

        // Create particles
        for (let i = 0; i < 15; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 8 + 's';
            particle.style.animationDuration = (6 + Math.random() * 4) + 's';
            container.appendChild(particle);
        }
    }

    // Create Skeleton Loading Cards
    function showSkeletonLoading() {
        if (!dom.grid) return;
        dom.grid.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const skeleton = document.createElement('div');
            skeleton.className = 'skeleton-card';
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

    // Intersection Observer for Scroll Fade-In
    function setupScrollAnimations() {
        // Cleanup previous observer to prevent memory leaks
        if (scrollObserver) {
            scrollObserver.disconnect();
        }

        scrollObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    // Unobserve after animation to save resources
                    scrollObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        // Observe all article cards with fade-in-up class
        document.querySelectorAll('.fade-in-up').forEach(el => {
            scrollObserver.observe(el);
        });
    }

    // Helper functions moved to utils.js

    // Sidebar Toggle Functions
    function openSidebar() {
        if (dom.sidebar) dom.sidebar.classList.add('active');
        if (dom.sidebarOverlay) dom.sidebarOverlay.classList.add('active');
        if (dom.sidebarToggle) dom.sidebarToggle.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
        if (dom.sidebar) dom.sidebar.classList.remove('active');
        if (dom.sidebarOverlay) dom.sidebarOverlay.classList.remove('active');
        if (dom.sidebarToggle) dom.sidebarToggle.classList.remove('active');
        document.body.style.overflow = '';
    }

    function populateSidebarCategories(articles) {
        if (!dom.sidebarCategories) return;

        // Get unique categories that exist in articles
        const existingCategories = new Set(articles.map(a => a.category).filter(Boolean));

        // Build ordered list using CATEGORIES config
        const orderedCategories = ['all'];
        Object.keys(CATEGORIES)
            .sort((a, b) => CATEGORIES[a].order - CATEGORIES[b].order)
            .forEach(cat => {
                if (existingCategories.has(cat)) orderedCategories.push(cat);
            });
        // Add any new categories not in config
        existingCategories.forEach(cat => {
            if (!orderedCategories.includes(cat)) orderedCategories.push(cat);
        });

        dom.sidebarCategories.innerHTML = '';
        orderedCategories.forEach(cat => {
            const li = document.createElement('li');
            const btn = document.createElement('button');
            btn.textContent = cat === 'all' ? '📚 すべての記事' : `📂 ${cat}`;
            btn.dataset.category = cat;
            btn.className = cat === currentCategory ? 'active' : '';
            btn.addEventListener('click', () => {
                setCategory(cat);
                closeSidebar();
                // Update active state
                dom.sidebarCategories.querySelectorAll('button').forEach(b => {
                    b.classList.toggle('active', b.dataset.category === cat);
                });
            });
            li.appendChild(btn);
            dom.sidebarCategories.appendChild(li);
        });
    }

    function populateSidebarRecent(articles) {
        if (!dom.sidebarRecent) return;
        // Get latest 5 articles
        const sorted = [...articles].sort((a, b) => new Date(b.date) - new Date(a.date));
        const recent = sorted.slice(0, 5);

        dom.sidebarRecent.innerHTML = '';
        recent.forEach(article => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = article.file;
            a.textContent = BlogUtils.escapeHtml(article.title);
            a.title = article.title;
            li.appendChild(a);
            dom.sidebarRecent.appendChild(li);
        });
    }

    // Initialize
    async function init() {
        // Dynamic Footer Year
        if (window.BlogUtils) BlogUtils.updateFooterYear();

        // Initialize theme from storage
        initTheme();

        // Create hero particles
        createParticles();

        // Show skeleton loading while fetching
        showSkeletonLoading();

        // Sidebar Event Listeners
        if (dom.sidebarToggle) {
            dom.sidebarToggle.addEventListener('click', () => {
                if (dom.sidebar.classList.contains('active')) {
                    closeSidebar();
                } else {
                    openSidebar();
                }
            });
        }
        if (dom.sidebarClose) {
            dom.sidebarClose.addEventListener('click', closeSidebar);
        }
        if (dom.sidebarOverlay) {
            dom.sidebarOverlay.addEventListener('click', closeSidebar);
        }
        // Close sidebar on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && dom.sidebar && dom.sidebar.classList.contains('active')) {
                closeSidebar();
            }
        });

        // Restore state from URL and LocalStorage
        const urlState = URLState.get();
        currentCategory = urlState.category;
        currentSearch = urlState.search;
        currentPage = urlState.page;
        sortNewestFirst = urlState.sort !== undefined ? urlState.sort : Storage.getSortOrder();

        // Restore search input from URL
        if (dom.searchInput && currentSearch) {
            dom.searchInput.value = currentSearch;
        }

        // Update sort button UI
        if (dom.sortToggle) {
            if (sortNewestFirst) {
                dom.sortToggle.innerHTML = '<span class="sort-icon">↓</span> 新しい順';
            } else {
                dom.sortToggle.innerHTML = '<span class="sort-icon">↑</span> 古い順';
            }
        }

        await loadArticles();
    }

    // Load articles with retry logic
    async function loadArticles() {
        try {
            const response = await fetch(CONFIG.articlesUrl);
            if (!response.ok) throw new Error('Failed to load articles');
            allArticles = await response.json();
            fetchRetryCount = 0; // Reset on success

            // Extract categories
            setupCategories(allArticles);

            // Populate sidebar
            populateSidebarCategories(allArticles);
            populateSidebarRecent(allArticles);
            populateTagCloud(allArticles);

            // Search setup with debounce
            if (dom.searchInput) {
                const debouncedSearch = debounce((value) => {
                    currentSearch = value;
                    currentPage = 1;
                    updateURLState();
                    render();
                    // Track search in GA4
                    if (value) {
                        const filtered = filterArticles();
                        Analytics.trackSearch(value, filtered.length);
                    }
                }, CONFIG.searchDebounceMs);

                dom.searchInput.addEventListener('input', (e) => {
                    debouncedSearch(e.target.value.toLowerCase().trim());
                });
            }

            // Sort toggle setup
            if (dom.sortToggle) {
                dom.sortToggle.addEventListener('click', () => {
                    sortNewestFirst = !sortNewestFirst;
                    Storage.setSortOrder(sortNewestFirst);
                    if (sortNewestFirst) {
                        dom.sortToggle.innerHTML = '<span class="sort-icon">↓</span> 新しい順';
                    } else {
                        dom.sortToggle.innerHTML = '<span class="sort-icon">↑</span> 古い順';
                    }
                    currentPage = 1;
                    updateURLState();
                    render();
                });
            }

            // Handle browser back/forward buttons
            window.addEventListener('popstate', () => {
                const state = URLState.get();
                currentCategory = state.category;
                currentSearch = state.search;
                currentPage = state.page;
                sortNewestFirst = state.sort;

                if (dom.searchInput) {
                    dom.searchInput.value = currentSearch;
                }

                if (dom.categoryFilter) {
                    const buttons = dom.categoryFilter.querySelectorAll('button');
                    buttons.forEach(btn => {
                        btn.classList.toggle('active', btn.dataset.category === currentCategory);
                    });
                }

                render();
            });

            render();

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
                        <button class="reset-btn" onclick="location.reload()">
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
        }
    }

    // Update URL state
    function updateURLState() {
        URLState.set({
            category: currentCategory,
            search: currentSearch,
            page: currentPage,
            sort: sortNewestFirst
        });
    }

    // Filter articles (extracted for reuse)
    function filterArticles() {
        let filtered = allArticles;
        if (currentCategory !== 'all') {
            filtered = filtered.filter(a => a.category === currentCategory);
        }
        if (currentSearch) {
            filtered = filtered.filter(a => {
                const title = (a.title || '').toLowerCase();
                const desc = (a.description || '').toLowerCase();
                const tags = (a.tags || []).join(' ').toLowerCase();
                return title.includes(currentSearch) || desc.includes(currentSearch) || tags.includes(currentSearch);
            });
        }
        return filtered;
    }

    // Theme toggle
    function initTheme() {
        const savedTheme = Storage.getTheme();
        document.body.dataset.theme = savedTheme;
        updateThemeToggleUI();
    }

    function toggleTheme() {
        const currentTheme = document.body.dataset.theme || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.body.dataset.theme = newTheme;
        Storage.setTheme(newTheme);
        updateThemeToggleUI();
        Analytics.trackThemeChange(newTheme);
    }

    function updateThemeToggleUI() {
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            const isDark = document.body.dataset.theme === 'dark';
            themeToggle.innerHTML = isDark ? '☀️' : '🌙';
            themeToggle.setAttribute('aria-label', isDark ? 'ライトモードに切替' : 'ダークモードに切替');
        }
    }

    // Populate Tag Cloud
    function populateTagCloud(articles) {
        const tagContainer = document.getElementById('tag-cloud');
        if (!tagContainer) return;

        // Count tag occurrences
        const tagCounts = {};
        articles.forEach(article => {
            (article.tags || []).forEach(tag => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        });

        // Sort by count (descending) and take top 15
        const sortedTags = Object.entries(tagCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15);

        if (sortedTags.length === 0) {
            tagContainer.innerHTML = '<p style="color: var(--text-muted);">タグがありません</p>';
            return;
        }

        const maxCount = sortedTags[0][1];
        tagContainer.innerHTML = '';

        sortedTags.forEach(([tag, count]) => {
            const size = 0.75 + (count / maxCount) * 0.5; // 0.75rem to 1.25rem
            const tagEl = document.createElement('button');
            tagEl.className = 'tag-item';
            tagEl.textContent = `#${tag}`;
            tagEl.style.fontSize = `${size}rem`;
            tagEl.title = `${count}件の記事`;
            tagEl.addEventListener('click', () => {
                if (dom.searchInput) {
                    dom.searchInput.value = tag;
                    currentSearch = tag.toLowerCase();
                    currentPage = 1;
                    updateURLState();
                    render();
                    closeSidebar();
                }
            });
            tagContainer.appendChild(tagEl);
        });
    }

    function setupCategories(articles) {
        if (!dom.categoryFilter) return;

        // Count articles per category
        const categoryCounts = { 'all': articles.length };
        articles.forEach(a => {
            if (a.category) {
                categoryCounts[a.category] = (categoryCounts[a.category] || 0) + 1;
            }
        });

        // Get unique categories that exist in articles
        const existingCategories = new Set(articles.map(a => a.category).filter(Boolean));

        // Build ordered list using CATEGORIES config
        const orderedCategories = ['all'];
        Object.keys(CATEGORIES)
            .sort((a, b) => CATEGORIES[a].order - CATEGORIES[b].order)
            .forEach(cat => {
                if (existingCategories.has(cat)) orderedCategories.push(cat);
            });
        // Add any new categories not in config
        existingCategories.forEach(cat => {
            if (!orderedCategories.includes(cat)) orderedCategories.push(cat);
        });

        dom.categoryFilter.innerHTML = '';
        orderedCategories.forEach(cat => {
            const btn = document.createElement('button');
            const count = categoryCounts[cat] || 0;
            btn.textContent = cat === 'all' ? `すべて (${count})` : `${cat} (${count})`;
            btn.dataset.category = cat;
            btn.className = cat === currentCategory ? 'active' : '';
            btn.addEventListener('click', () => {
                setCategory(cat);
            });
            dom.categoryFilter.appendChild(btn);
        });
    }

    function setCategory(cat) {
        currentCategory = cat;
        currentPage = 1;

        // Update URL state
        updateURLState();

        // Track in GA4
        Analytics.trackCategoryFilter(cat);

        // Update UI buttons
        if (dom.categoryFilter) {
            const buttons = dom.categoryFilter.querySelectorAll('button');
            buttons.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.category === cat);
            });
        }

        render();
    }

    function render() {
        if (!dom.grid) return;

        // 1. Filter (Category + Search)
        let filtered = allArticles;

        // Category Filter
        if (currentCategory !== 'all') {
            filtered = filtered.filter(a => a.category === currentCategory);
        }

        // Search Filter
        if (currentSearch) {
            filtered = filtered.filter(a => {
                const title = (a.title || '').toLowerCase();
                const desc = (a.description || '').toLowerCase();
                const tags = (a.tags || []).join(' ').toLowerCase();
                return title.includes(currentSearch) || desc.includes(currentSearch) || tags.includes(currentSearch);
            });
        }

        // 2. Sort (based on direction)
        if (sortNewestFirst) {
            filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
        } else {
            filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
        }

        // 3. Paginate
        const totalPages = Math.ceil(filtered.length / CONFIG.itemsPerPage);
        if (currentPage > totalPages) currentPage = 1;

        const start = (currentPage - 1) * CONFIG.itemsPerPage;
        const end = start + CONFIG.itemsPerPage;
        const pageItems = filtered.slice(start, end);

        // Render Grid
        if (dom.loading) dom.loading.classList.add('hidden');
        dom.grid.innerHTML = '';

        if (pageItems.length === 0) {
            dom.grid.innerHTML = `
                <div class="empty-state">
                    <p>😢 該当する記事が見つかりませんでした。</p>
                    <button class="reset-btn" id="reset-filters">フィルターをリセット</button>
                </div>
            `;
            const resetBtn = document.getElementById('reset-filters');
            if (resetBtn) {
                resetBtn.addEventListener('click', () => {
                    currentCategory = 'all';
                    currentSearch = '';
                    if (dom.searchInput) dom.searchInput.value = '';
                    // Reset URL
                    window.history.pushState({}, '', window.location.pathname);
                    // Reset category buttons
                    if (dom.categoryFilter) {
                        dom.categoryFilter.querySelectorAll('button').forEach(btn => {
                            btn.classList.toggle('active', btn.dataset.category === 'all');
                        });
                    }
                    render();
                });
            }
            renderPagination(0);
            return;
        }

        // Accessibility: Announce updates
        dom.grid.setAttribute('aria-live', 'polite');

        // Show article count
        const countLabel = currentCategory === 'all' ? '全' : currentCategory;
        const countInfo = document.createElement('div');
        countInfo.className = 'article-count-info';
        countInfo.innerHTML = `📚 <strong>${countLabel}${filtered.length}件</strong>の記事`;
        dom.grid.appendChild(countInfo);

        let articleIndex = 0;

        pageItems.forEach((article, idx) => {
            // Insert ad after every adInterval articles
            if (idx > 0 && idx % CONFIG.adInterval === 0) {
                const adEl = createAdElement();
                dom.grid.appendChild(adEl);
                // Push ad
                try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) { }
            }

            const card = document.createElement('a');
            const safeTitle = BlogUtils.escapeHtml(article.title);
            const safeDesc = BlogUtils.escapeHtml(article.description);
            const safeCategory = BlogUtils.escapeHtml(article.category);
            const categoryColor = getCategoryColor(article.category);
            const isNew = isNewArticle(article.date);
            const newBadge = isNew ? '<span class="badge-new">NEW</span>' : '';

            card.href = article.file;
            card.className = 'article-card fade-in-up';
            card.innerHTML = `
                <div class="card-thumb">
                    <img src="${article.thumbnail}" alt="${safeTitle}" loading="lazy">
                    <span class="card-category badge" style="background: ${categoryColor};">${safeCategory}</span>
                    ${newBadge}
                </div>
                <div class="card-content">
                    <time datetime="${article.date}">${BlogUtils.formatDate(article.date)}</time>
                    <h3>${safeTitle}</h3>
                    <p class="card-desc">${safeDesc}</p>
                    <div class="card-tags">
                        ${article.tags.map(t => `#${BlogUtils.escapeHtml(t)}`).join(' ')}
                    </div>
                </div>
            `;

            // Attach error handler
            const img = card.querySelector('img');
            if (img) img.onerror = () => BlogUtils.handleImageError(img);

            dom.grid.appendChild(card);
            articleIndex++;
        });

        renderPagination(totalPages);

        // Setup scroll animations after cards are rendered
        setupScrollAnimations();
    }

    function renderPagination(totalPages) {
        if (!dom.pagination) return;
        dom.pagination.innerHTML = '';

        if (totalPages <= 1) return;

        // Prev
        const prevBtn = document.createElement('button');
        prevBtn.innerHTML = '← 前へ';
        prevBtn.disabled = currentPage === 1;
        prevBtn.className = 'pagination-nav';
        prevBtn.addEventListener('click', () => changePage(currentPage - 1));
        dom.pagination.appendChild(prevBtn);

        // Numbers (show limited range for many pages)
        const maxVisible = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);
        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        if (startPage > 1) {
            const firstBtn = document.createElement('button');
            firstBtn.textContent = '1';
            firstBtn.addEventListener('click', () => changePage(1));
            dom.pagination.appendChild(firstBtn);
            if (startPage > 2) {
                const dots = document.createElement('span');
                dots.textContent = '...';
                dots.className = 'pagination-dots';
                dom.pagination.appendChild(dots);
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.textContent = i;
            if (i === currentPage) pageBtn.classList.add('active');
            pageBtn.addEventListener('click', () => changePage(i));
            dom.pagination.appendChild(pageBtn);
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                const dots = document.createElement('span');
                dots.textContent = '...';
                dots.className = 'pagination-dots';
                dom.pagination.appendChild(dots);
            }
            const lastBtn = document.createElement('button');
            lastBtn.textContent = totalPages;
            lastBtn.addEventListener('click', () => changePage(totalPages));
            dom.pagination.appendChild(lastBtn);
        }

        // Next
        const nextBtn = document.createElement('button');
        nextBtn.innerHTML = '次へ →';
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.className = 'pagination-nav';
        nextBtn.addEventListener('click', () => changePage(currentPage + 1));
        dom.pagination.appendChild(nextBtn);
    }

    function changePage(num) {
        currentPage = num;
        render();
        // Scroll to top of grid (with null check)
        const scrollTarget = dom.categoryFilter || dom.grid;
        if (scrollTarget) {
            const topOfGrid = scrollTarget.getBoundingClientRect().top + window.scrollY - 100;
            window.scrollTo({ top: topOfGrid, behavior: 'smooth' });
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
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // Theme Toggle Button
    function setupThemeToggle() {
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', toggleTheme);
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        init();
        setupBackToTop();
        setupThemeToggle();
    });

})();
