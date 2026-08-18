(function () {
    'use strict';

    // Configuration
    const CONFIG = {
        articlesUrl: '../blog/articles.json',
        recommendedCount: 3,
        placeholderImage: 'https://placehold.co/300x200/e0e0e0/999999?text=No+Image',
        officialSources: {
            default: [
                { label: 'Play Pointsを貯める・管理する（Google公式）', url: 'https://support.google.com/googleplay/answer/9077192?co=GENIE.CountryCode%3DJP&hl=ja' }
            ],
            'play-games': [
                { label: 'Google PlayとPlay Gamesの最新機能（Google公式ブログ）', url: 'https://blog.google/intl/ja-jp/products/android-chrome-play/google-play-curation-update-september-2025/' },
                { label: 'Play Pointsを貯める・管理する（Google公式）', url: 'https://support.google.com/googleplay/answer/9077192?co=GENIE.CountryCode%3DJP&hl=ja' }
            ],
            weekly: [
                { label: '通常のウィークリーリワード（Google公式）', url: 'https://support.google.com/googleplay/answer/9077192?co=GENIE.CountryCode%3DJP&hl=ja' },
                { label: 'Play Pass加入者向け週次特典（Google公式）', url: 'https://support.google.com/googleplay/answer/16507543?hl=ja' }
            ],
            family: [
                { label: 'Play Pointsのアカウント間移動について（Google公式）', url: 'https://support.google.com/googleplay/answer/9077192?co=GENIE.CountryCode%3DJP&hl=ja' },
                { label: 'ファミリーライブラリの対象と設定（Google公式）', url: 'https://support.google.com/googleplay/answer/7007852?hl=ja' }
            ],
            rank: [
                { label: 'ステータス・獲得率・特典（Google公式）', url: 'https://support.google.com/googleplay/answer/9080348?co=GENIE.CountryCode%3DJP&hl=ja' }
            ],
            refund: [
                { label: '返金時のPlay Pointsの扱い（Google公式）', url: 'https://support.google.com/googleplay/answer/15576539?hl=ja' }
            ],
            gift: [
                { label: 'Google Playギフトカードの仕組み（Google公式）', url: 'https://support.google.com/googleplay/answer/3422734?hl=ja' },
                { label: 'Play Pointsの獲得対象（Google公式）', url: 'https://support.google.com/googleplay/answer/9077192?co=GENIE.CountryCode%3DJP&hl=ja' }
            ],
            trouble: [
                { label: 'Play Pointsの問題を解決する（Google公式）', url: 'https://support.google.com/googleplay/answer/9077247?hl=ja' }
            ],
            use: [
                { label: 'ポイントの交換先・期限・払い戻し（Google公式）', url: 'https://support.google.com/googleplay/answer/9079840?co=GENIE.Platform%3DAndroid&hl=ja' }
            ]
        }
    };

    // Flags
    let scrollListenerAdded = false;
    let articleAdsenseLoaded = false;

    // Local fallback utilities (in case BlogUtils is not loaded)
    const fallbackUtils = {
        escapeHtml: function (text) {
            if (!text) return '';
            return text.replace(/[&<>"']/g, function (m) {
                return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
            });
        },
        formatDate: function (dateStr) {
            if (!dateStr) return '';
            return dateStr.replace(/-/g, '.');
        }
    };

    // Use BlogUtils if available, otherwise fallback
    function getUtils() {
        return window.BlogUtils || fallbackUtils;
    }

    function getOfficialSources() {
        const path = window.location.pathname;
        if (path.includes('play-games')) return CONFIG.officialSources['play-games'];
        if (path.includes('weekly-reward')) return CONFIG.officialSources.weekly;
        if (path.includes('family-sharing') || path.includes('multiple-accounts')) return CONFIG.officialSources.family;
        if (path.includes('diamond') || path.includes('rank-maintenance')) return CONFIG.officialSources.rank;
        if (path.includes('refund')) return CONFIG.officialSources.refund;
        if (path.includes('best-use')) return CONFIG.officialSources.use;
        if (path.includes('gift-card')) return CONFIG.officialSources.gift;
        if (path.includes('not-reflected') || path.includes('reflection-timing')) return CONFIG.officialSources.trouble;
        return CONFIG.officialSources.default;
    }

    // 記事のテーマに対応する一次情報を示し、読者が根拠を確認できるようにする
    function setupOfficialSourceNotice() {
        if (document.querySelector('.official-source-note')) return;
        const article = document.querySelector('article');
        if (!article) return;

        if (!document.querySelector('link[data-article-source-style]')) {
            const stylesheet = document.createElement('link');
            stylesheet.rel = 'stylesheet';
            stylesheet.href = '../articles/source-notice.css?v=3c2ec22615';
            stylesheet.dataset.articleSourceStyle = 'true';
            document.head.appendChild(stylesheet);
        }

        const notice = document.createElement('aside');
        notice.className = 'official-source-note';
        notice.setAttribute('aria-label', '公式情報の確認先');
        const sources = getOfficialSources();
        notice.innerHTML = `
            <strong>この記事の確認に使った公式情報</strong>
            <p>Play Pointsの条件や特典は、国・時期・アカウントによって変わることがあります。購入や交換の直前は、Playストアに表示された条件を優先してください。</p>
            <ul>
                ${sources.map(source => `<li><a href="${fallbackUtils.escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${fallbackUtils.escapeHtml(source.label)}</a></li>`).join('')}
            </ul>
        `;
        article.appendChild(notice);
    }

    function setupCalculatorPrompt() {
        if (document.querySelector('.article-calculator-prompt')) return;
        const content = document.querySelector('.content');
        if (!content) return;

        const prompt = document.createElement('aside');
        prompt.className = 'article-calculator-prompt cta-box';
        prompt.setAttribute('aria-label', 'あなたの場合の必要額を計算');
        prompt.innerHTML = `
            <p class="article-calculator-prompt__label">記事の条件を自分の数字で確認</p>
            <h2>あなたの場合はいくら必要？</h2>
            <p>先に概算を出してから本文を読むと、一般条件と自分の状況を分けて確認できます。</p>
            <a class="article-calculator-prompt__button" href="../">計算機で自分の必要額を見る</a>
        `;

        const anchor = content.querySelector('.answer-box, .summary-box, .intro');
        if (anchor && anchor.nextSibling) {
            anchor.parentNode.insertBefore(prompt, anchor.nextSibling);
            return;
        }
        content.insertBefore(prompt, content.firstChild);
    }

    function getContextualGuides() {
        const path = window.location.pathname;
        const groups = {
            start: [
                { href: './2025-12-25-check-balance.html', text: '残高・履歴・有効期限の確認方法' },
                { href: './2026-03-10-play-points-reflection-timing.html', text: 'ポイントが反映されない時の確認手順' },
                { href: './2025-12-25-expiration.html', text: 'Play Pointsの有効期限と失効対策' }
            ],
            earn: [
                { href: './2025-12-25-movies-books.html', text: '本・アプリ・定期購入の獲得条件' },
                { href: './2025-12-25-campaign.html', text: 'ポイント増量キャンペーンの確認方法' },
                { href: './2025-12-25-gift-card.html', text: 'ギフトカードのチャージと付与タイミング' }
            ],
            rank: [
                { href: './2025-12-25-playpoints-rank-maintenance.html', text: 'ランク維持期間と翌年の再判定' },
                { href: './2025-12-25-weekly-reward.html', text: 'ウィークリーリワードの受け取り方' },
                { href: './2025-12-25-diamond-worth-it.html', text: 'ダイヤモンドとプラチナの費用比較' }
            ],
            use: [
                { href: './2025-12-25-best-use.html', text: 'クーポン・アイテム・クレジットの選び方' },
                { href: './2025-12-25-expiration.html', text: '交換前に確認したい有効期限' },
                { href: './2025-12-25-refund.html', text: '返金時の残高・ランクへの影響' }
            ]
        };
        let selected = groups.start;
        if (/movies-books|subscription|campaign|promo-code|gift-card|discount-gift-cards/.test(path)) selected = groups.earn;
        if (/rank-maintenance|weekly-reward|diamond/.test(path)) selected = groups.rank;
        if (/best-use|expiration|refund|family-sharing/.test(path)) selected = groups.use;

        const currentFile = path.substring(path.lastIndexOf('/') + 1);
        return selected.filter(item => !item.href.endsWith(currentFile)).slice(0, 3);
    }

    function setupContextualGuideLinks() {
        // 記事固有の関連記事欄を優先し、同じ役割の汎用リンク群を重ねない。
        if (document.querySelector('.contextual-guide-links, .related-links-section, .article-related-guides')) return;
        const content = document.querySelector('.content');
        if (!content) return;
        const guides = getContextualGuides();
        if (!guides.length) return;

        const box = document.createElement('aside');
        box.className = 'contextual-guide-links';
        box.setAttribute('aria-label', '次に確認したい関連記事');
        box.innerHTML = `
            <h2>次に確認したいこと</h2>
            <ul>
                ${guides.map(guide => `<li><a href="${fallbackUtils.escapeHtml(guide.href)}">${fallbackUtils.escapeHtml(guide.text)}</a></li>`).join('')}
            </ul>
        `;
        content.appendChild(box);
    }

    function setupBreadcrumbStructuredData() {
        if (document.querySelector('script[data-article-breadcrumbs]')) return;
        const title = document.querySelector('h1')?.textContent.replace(/\s+/g, ' ').trim() || document.title;
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.dataset.articleBreadcrumbs = 'true';
        script.textContent = JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Playポイント計算機', item: 'https://playpoint-sim.com/' },
                { '@type': 'ListItem', position: 2, name: '記事一覧', item: 'https://playpoint-sim.com/blog/' },
                { '@type': 'ListItem', position: 3, name: title, item: window.location.origin + window.location.pathname }
            ]
        });
        document.head.appendChild(script);
    }

    function getArticleNextStepCta() {
        const path = window.location.pathname;
        if (path.includes('2025-12-25-campaign') || path.includes('2025-12-25-new-year-campaign')) {
            return {
                label: 'キャンペーン判断',
                title: '今課金するか、待つかを比較する',
                body: '通常獲得率と、Google Playに表示された2pt/100円・3pt/100円などの特別獲得率で必要額を比べ、キャンペーンを待つ価値があるか確認できます。',
                links: [
                    { href: '../campaign/wait/', text: 'キャンペーン待ちを判断' },
                    { href: '../campaign/2x/', text: '2pt/100円で計算' },
                    { href: '../campaign/3x/', text: '3pt/100円で計算' }
                ]
            };
        }
        if (path.includes('2026-06-20-discount-gift-cards.html') || path.includes('2025-12-25-gift-card')) {
            return {
                label: '購入前チェック',
                title: '買う前に必要額と還元上限を確認する',
                body: 'ギフトコードやキャンペーンを使う前に、目標ランクまでの不足額と買いすぎのリスクを確認できます。',
                links: [
                    { href: '../amount/10000/', text: '1万円で何ポイント？' },
                    { href: '../status/gold/', text: 'ゴールド到達を見る' },
                    { href: '../campaign/wait/', text: 'キャンペーン待ちを見る' }
                ]
            };
        }
        if (path.includes('playpoints-not-reflected') || path.includes('reflection-timing')) {
            return {
                label: '反映後の次アクション',
                title: '反映後に不足ポイントを再計算する',
                body: 'ポイント履歴を確認したら、あと何ポイント必要かを入れて次の判断に進めます。',
                links: [
                    { href: '../', text: '計算機で不足分を見る' },
                    { href: '../status/silver/', text: 'シルバー到達を見る' },
                    { href: '../status/gold/', text: 'ゴールド到達を見る' }
                ]
            };
        }
        return {
            label: '次に確認',
            title: 'あなたの条件で必要額を確認する',
            body: '記事の内容を読んだら、現在ステータスと不足ポイントで実際の目安を確認できます。',
            links: [
                { href: '../', text: '計算機で見る' },
                { href: '../status/silver/', text: 'シルバー到達' },
                { href: '../status/gold/', text: 'ゴールド到達' }
            ]
        };
    }

    function setupArticleNextStepCta() {
        // 記事固有の末尾導線があれば、汎用CTAを追加して選択肢を重複させない。
        if (document.querySelector('.article-next-step-cta, .related-links-section, .article-related-guides')) return;
        const content = document.querySelector('.content');
        if (!content) return;

        const cta = getArticleNextStepCta();
        const box = document.createElement('aside');
        box.className = 'article-next-step-cta';
        box.setAttribute('aria-label', '記事を読んだ後の次アクション');
        box.innerHTML = `
            <p class="article-next-step-cta__label">${fallbackUtils.escapeHtml(cta.label)}</p>
            <h2>${fallbackUtils.escapeHtml(cta.title)}</h2>
            <p>${fallbackUtils.escapeHtml(cta.body)}</p>
            <div class="article-next-step-cta__links">
                ${cta.links.map(link => `<a href="${fallbackUtils.escapeHtml(link.href)}">${fallbackUtils.escapeHtml(link.text)}</a>`).join('')}
            </div>
        `;

        const authorBox = content.querySelector('.author-box');
        if (authorBox) {
            content.insertBefore(box, authorBox);
            return;
        }
        content.appendChild(box);
    }

    // 記事が計算機の利用につながったかだけを計測し、入力値は送信しない
    function setupCalculatorLinkTracking() {
        document.addEventListener('click', (event) => {
            const link = event.target && typeof event.target.closest === 'function'
                ? event.target.closest('a[href]')
                : null;
            if (!link) return;
            const url = new URL(link.href, window.location.href);
            if (url.origin !== window.location.origin || url.pathname !== '/') return;

            const analytics = window.PlayPointAnalytics;
            if (!analytics) return;
            const context = {
                source_path: window.location.pathname,
                link_context: link.closest('.article-calculator-prompt')
                    ? 'article_calculator_prompt'
                    : (link.closest('.cta-box, .cta-banner') ? 'article_cta' : 'article_link')
            };
            analytics.rememberCalculatorEntry(url, context);
            analytics.track('article_to_calculator_clicked', {
                ...context,
                destination_path: url.pathname
            });
        });
    }

    const MANAGED_ADSENSE_SLOT = '8250492620';

    function initializeManagedArticleAds() {
        document.querySelectorAll('.article-ad-container ins.adsbygoogle').forEach((ad) => {
            if (!ad.dataset.adSlot) ad.dataset.adSlot = MANAGED_ADSENSE_SLOT;
            if (ad.dataset.playpointAdRequested === 'true' || ad.dataset.adsbygoogleStatus) return;
            ad.dataset.playpointAdRequested = 'true';
            try {
                (window.adsbygoogle = window.adsbygoogle || []).push({});
            } catch (error) {
                delete ad.dataset.playpointAdRequested;
                console.error('AdSense slot initialization failed:', error);
            }
        });
    }

    // AdSense本体はページ解析をブロックしないasyncで早期取得し、固定スクロール量による機会損失を避ける。
    function loadArticleAdsense() {
        if (articleAdsenseLoaded) {
            initializeManagedArticleAds();
            return;
        }
        articleAdsenseLoaded = true;
        initializeManagedArticleAds();

        if (document.querySelector('script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]')) return;

        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3845885843809455';
        script.crossOrigin = 'anonymous';
        script.onerror = () => {
            articleAdsenseLoaded = false;
            console.error('AdSense load failed');
        };
        document.head.appendChild(script);
    }

    function scheduleArticleAdsenseLoad() {
        if (!window.PlayPointConsent) return;
        if (typeof window.PlayPointConsent.whenAdsAllowed === 'function') {
            window.PlayPointConsent.whenAdsAllowed(loadArticleAdsense);
            return;
        }
        window.PlayPointConsent.whenGranted(loadArticleAdsense);
    }

    function setupArticleAdsense() {
        if (window.PlayPointConsent) {
            scheduleArticleAdsenseLoad();
            return;
        }
        document.addEventListener('playpoint:consent-ready', scheduleArticleAdsenseLoad, { once: true });
    }

    function sanitizeArticleFile(value) {
        if (typeof value !== 'string') return '#';
        if (!value.startsWith('../articles/')) return '#';
        if (!value.endsWith('.html')) return '#';
        if (/[<>"']/.test(value)) return '#';
        return value.replace('../articles/', './');
    }

    function sanitizeArticleThumbnail(value) {
        if (typeof value !== 'string') return CONFIG.placeholderImage;
        if (!value.startsWith('../articles/ogp/')) return CONFIG.placeholderImage;
        if (!value.endsWith('.png')) return CONFIG.placeholderImage;
        if (/[<>"']/.test(value)) return CONFIG.placeholderImage;
        return value.replace('../articles/', './');
    }

    // 記事JSONの値を描画前に正規化する
    function normalizeArticle(article) {
        article = article && typeof article === 'object' ? article : {};
        return {
            title: typeof article.title === 'string' ? article.title : '',
            date: typeof article.date === 'string' ? article.date : '',
            category: typeof article.category === 'string' ? article.category : '',
            file: sanitizeArticleFile(article.file),
            thumbnail: sanitizeArticleThumbnail(article.thumbnail)
        };
    }

    // Get current article's category from meta tag or data attribute
    function getCurrentCategory() {
        const metaCategory = document.querySelector('meta[name="article:category"]');
        if (metaCategory) return metaCategory.content;

        const categoryBadge = document.querySelector('.badge, .hero-badge');
        if (categoryBadge) {
            const text = categoryBadge.textContent.trim();
            // カテゴリーの表示名が含まれる場合だけ抽出する。
            const match = text.match(/ランク|トラブル|使い方|キャンペーン/);
            if (match) return match[0];
        }
        return null;
    }

    function setupArticleUsability() {
      var meta = document.querySelector('.hero-meta, .article-meta, .post-meta');
      var pub = document.querySelector('meta[property="article:published_time"]')?.content?.slice(0, 10).replace(/-/g, '/');
      var mod = document.querySelector('meta[property="article:modified_time"]')?.content?.slice(0, 10).replace(/-/g, '/');
      var note = Array.from(document.querySelectorAll('.source-list .small, .official-sources .small, p.small')).find(function (e) { return /最終確認日/.test(e.textContent || ''); });
      var checked = note && note.textContent.match(/最終確認日は?(\d{4})年(\d{1,2})月(\d{1,2})日/);
      if (meta && pub) { meta.classList.add('article-verification-meta'); meta.textContent = '公開 ' + pub + (checked ? ' ｜ 最終確認 ' + checked[1] + '/' + String(checked[2]).padStart(2, '0') + '/' + String(checked[3]).padStart(2, '0') : (mod && mod !== pub ? ' ｜ 更新 ' + mod : '')); }
      document.querySelectorAll('.table-wrap, .table-card').forEach(function (w, i) { w.tabIndex = 0; w.setAttribute('role', 'region'); w.setAttribute('aria-label', '比較表' + (i + 1) + '（横にスクロールできます）'); });
    }

    function setupInlineCalculatorWidgets() {
        const widgets = document.querySelectorAll('.inline-calc-widget');
        if (!widgets.length) return;

        widgets.forEach((widget) => {
            const input = widget.querySelector('.inline-calc-input');
            const normalVal = widget.querySelector('.ic-normal');
            const boostVal = widget.querySelector('.ic-boost');
            const detailLink = widget.querySelector('.inline-calc-link');

            if (!input || !normalVal || !boostVal) return;

            function update() {
                const pts = Math.max(1, parseInt(input.value, 10) || 0);
                normalVal.textContent = '約' + Math.ceil(pts * 100).toLocaleString('ja-JP') + '円';
                boostVal.textContent = '約' + Math.ceil((pts / 5) * 100).toLocaleString('ja-JP') + '円';

                if (detailLink) {
                    detailLink.href = '../?points=' + pts;
                }
            }

            input.addEventListener('input', update);
            input.addEventListener('change', update);
            update();
        });
    }

    function getLocale() {
        const path = window.location.pathname;
        if (path.includes('/en/')) return 'en';
        if (path.includes('/ko/')) return 'ko';
        if (path.includes('/tw/')) return 'tw';
        return 'ja';
    }

    function setupReadingProgressBar() {
        let progressBar = document.getElementById('reading-progress');
        if (!progressBar) {
            progressBar = document.createElement('div');
            progressBar.id = 'reading-progress';
            document.body.prepend(progressBar);
        }

        if (scrollListenerAdded) return;
        scrollListenerAdded = true;

        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop;
                    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
                    if (scrollHeight > 0) {
                        const scrolled = Math.min(100, Math.max(0, (scrollTop / scrollHeight) * 100));
                        progressBar.style.width = scrolled + '%';
                    }
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    }

    function setupReadingTime() {
        if (document.querySelector('.reading-time-badge')) return;
        const content = document.querySelector('.content, .main-content-column, article');
        if (!content) return;

        const loc = getLocale();
        const text = content.innerText || content.textContent || '';
        let minutes = 1;

        if (loc === 'en') {
            const words = text.trim().split(/\s+/).length;
            minutes = Math.max(1, Math.ceil(words / 200));
        } else {
            const chars = text.replace(/\s+/g, '').length;
            minutes = Math.max(1, Math.ceil(chars / 500));
        }

        const labels = {
            ja: `⏱️ 約${minutes}分で読めます`,
            en: `⏱️ Approx. ${minutes} min read`,
            ko: `⏱️ 약 ${minutes}분 소요`,
            tw: `⏱️ 約需 ${minutes} 分鐘閱讀`
        };

        const badge = document.createElement('span');
        badge.className = 'reading-time-badge';
        badge.textContent = labels[loc] || labels.ja;

        const targetMeta = document.querySelector('.article-verification-meta, .article-header-meta, .hero-meta, .article-meta, .post-meta');
        if (targetMeta) {
            targetMeta.appendChild(badge);
        } else {
            const h1 = document.querySelector('h1');
            if (h1 && h1.parentNode) {
                const metaWrap = document.createElement('div');
                metaWrap.className = 'reading-time-wrap';
                metaWrap.style.margin = '8px 0 16px';
                metaWrap.appendChild(badge);
                h1.parentNode.insertBefore(metaWrap, h1.nextSibling);
            }
        }
    }

    function setupMobileStickyCta() {
        if (document.querySelector('.mobile-sticky-cta')) return;
        if (sessionStorage.getItem('dismiss_mobile_sticky_cta') === '1') return;

        const loc = getLocale();
        const config = {
            ja: {
                title: '💡 あなたの場合はいくら必要？',
                sub: '条件を入力して必要額をすぐ確認',
                btn: '計算機を開く',
                href: '../'
            },
            en: {
                title: '💡 How much do you need?',
                sub: 'Simulate with your regional settings',
                btn: 'Open Calculator',
                href: '/en/'
            },
            ko: {
                title: '💡 내 조건에서 필요한 금액은?',
                sub: '내 계정 조건으로 바로 계산',
                btn: '계산기 열기',
                href: '/ko/'
            },
            tw: {
                title: '💡 你的情況需要花費多少？',
                sub: '輸入目前條件立即試算',
                btn: '開啟計算機',
                href: '/tw/'
            }
        };

        const t = config[loc] || config.ja;

        const cta = document.createElement('div');
        cta.className = 'mobile-sticky-cta';
        cta.innerHTML = `
            <div class="mobile-sticky-cta-content">
                <div class="mobile-sticky-cta-title">${t.title}</div>
                <div class="mobile-sticky-cta-sub">${t.sub}</div>
            </div>
            <a href="${t.href}" class="mobile-sticky-cta-btn">${t.btn}</a>
            <button class="mobile-sticky-cta-close" aria-label="閉じる">&times;</button>
        `;

        const closeBtn = cta.querySelector('.mobile-sticky-cta-close');
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            cta.classList.remove('visible');
            sessionStorage.setItem('dismiss_mobile_sticky_cta', '1');
            setTimeout(() => cta.remove(), 300);
        });

        document.body.appendChild(cta);

        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
                    const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) : 0;

                    if (progress > 0.20 && progress < 0.96) {
                        cta.classList.add('visible');
                    } else {
                        cta.classList.remove('visible');
                    }
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    }

    async function init() {
        setupReadingProgressBar();
        setupReadingTime();
        setupMobileStickyCta();
        setupArticleUsability();
        setupCalculatorPrompt();
        setupInlineCalculatorWidgets();
        setupContextualGuideLinks();
        setupArticleNextStepCta();
        setupOfficialSourceNotice();
        setupBreadcrumbStructuredData();
        setupCalculatorLinkTracking();
        setupArticleAdsense();
        if (window.BlogUtils) {
            BlogUtils.updateFooterYear();
            BlogUtils.setupShareButton();
        }

        // Reading Progress Bar Setup (only add once)
        if (!scrollListenerAdded) {
            scrollListenerAdded = true;
            window.addEventListener('scroll', () => {
                const progressBar = document.getElementById('reading-progress');
                if (!progressBar) return;

                const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
                const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
                if (scrollHeight <= 0) return; // Prevent division by zero
                const scrolled = (scrollTop / scrollHeight) * 100;

                progressBar.style.width = scrolled + '%';
            });
        }

        try {
            const response = await fetch(CONFIG.articlesUrl);
            if (!response.ok) throw new Error('Failed to load articles for recommendation');
            const articles = await response.json();
            const allArticles = Array.isArray(articles) ? articles.map(normalizeArticle) : [];

            // Get current article info
            const currentPath = window.location.pathname;
            const currentFilename = currentPath.substring(currentPath.lastIndexOf('/') + 1);
            const currentCategory = getCurrentCategory();

            setupPrevNextNav(allArticles);

            // Related Articles
            const container = document.getElementById('recommended-grid') || document.getElementById('related-articles');
            if (!container) return;

            // Filter out current article
            const others = allArticles.filter(a => !a.file.includes(currentFilename));

            // Prioritize same category articles
            let recommended = [];
            if (currentCategory) {
                const sameCategory = others.filter(a => a.category === currentCategory);
                const differentCategory = others.filter(a => a.category !== currentCategory);

                const byNewest = (a, b) => new Date(b.date) - new Date(a.date) || a.title.localeCompare(b.title, 'ja');
                sameCategory.sort(byNewest);
                differentCategory.sort(byNewest);

                // 同じカテゴリーを優先し、毎回同じ関連リンクを表示する
                recommended = [...sameCategory, ...differentCategory].slice(0, CONFIG.recommendedCount);
            } else {
                recommended = others
                    .sort((a, b) => new Date(b.date) - new Date(a.date) || a.title.localeCompare(b.title, 'ja'))
                    .slice(0, CONFIG.recommendedCount);
            }

            if (container && recommended.length > 0) {
                // Clear loading state
                container.innerHTML = '';

                recommended.forEach(article => {
                const utils = getUtils();
                const safeTitle = utils.escapeHtml(article.title);
                const safeCategory = utils.escapeHtml(article.category);
                const formattedDate = utils.formatDate(article.date);

                const card = document.createElement('a');
                card.href = article.file;
                card.className = 'related-card';
                card.innerHTML = `
                    <div class="related-card-thumb">
                        <img src="${article.thumbnail}" alt="${safeTitle}" loading="lazy">
                        <span class="related-card-category">${safeCategory}</span>
                    </div>
                    <div class="related-card-content">
                        <time>${formattedDate}</time>
                        <h4>${safeTitle}</h4>
                    </div>
                `;
                const img = card.querySelector('img');
                if (img) {
                    img.addEventListener('error', () => {
                        img.src = CONFIG.placeholderImage;
                    }, { once: true });
                }
                container.appendChild(card);
                });
            }

        } catch (e) {
            console.error('Related Articles Error:', e);
            if (container) {
                container.innerHTML = '<p style="text-align: center; color: #999;">関連記事の読み込みに失敗しました。</p>';
            }
        }
    }

    // Previous / Next Article Navigation
    function setupPrevNextNav(articles) {
        const navContainer = document.getElementById('article-nav');
        if (!navContainer) return;

        const currentPath = window.location.pathname;
        const currentFilename = currentPath.substring(currentPath.lastIndexOf('/') + 1);

        // Sort articles by date (newest first)
        const sorted = [...articles].sort((a, b) => new Date(b.date) - new Date(a.date));

        // Find current article index
        const currentIndex = sorted.findIndex(a => a.file.includes(currentFilename));
        if (currentIndex === -1) return;

        const utils = getUtils();
        const prevArticle = currentIndex > 0 ? sorted[currentIndex - 1] : null;
        const nextArticle = currentIndex < sorted.length - 1 ? sorted[currentIndex + 1] : null;

        navContainer.innerHTML = `
            ${prevArticle ? `
                <a href="${prevArticle.file.replace('../articles/', './')}" class="article-nav-link prev">
                    <span class="article-nav-label">← 前の記事</span>
                    <span class="article-nav-title">${utils.escapeHtml(prevArticle.title)}</span>
                </a>
            ` : '<div class="article-nav-link disabled"><span class="article-nav-label">前の記事はありません</span></div>'}
            ${nextArticle ? `
                <a href="${nextArticle.file.replace('../articles/', './')}" class="article-nav-link next">
                    <span class="article-nav-label">次の記事 →</span>
                    <span class="article-nav-title">${utils.escapeHtml(nextArticle.title)}</span>
                </a>
            ` : '<div class="article-nav-link disabled next"><span class="article-nav-label">次の記事はありません</span></div>'}
        `;
    }

    document.addEventListener('DOMContentLoaded', init);

})();