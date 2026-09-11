from pathlib import Path


def require_once(text, needle, label):
    count = text.count(needle)
    if count != 1:
        raise SystemExit(f'{label}: expected one match, found {count}')


nav = Path('scripts/intl-navigation-sidebar-v1.cjs')
text = nav.read_text(encoding='utf-8')
old_region = "const REGION_PATHS = Object.freeze({ ja: '/', en: '/en/', ko: '/ko/', tw: '/tw/' });"
new_region = "const REGION_PATHS = Object.freeze({ ja: '/', en: '/en/', ko: '/ko/', tw: '/tw/', hk: '/hk/', in: '/in/' });"
require_once(text, old_region, 'navigation REGION_PATHS')
text = text.replace(old_region, new_region)

old_style = "if (intlCss.test(html)) return String(html).replace(intlCss, match => match + newline + '  <link rel=\"stylesheet\" href=\"' + SHELL_STYLESHEET + '\">');\n  return String(html).replace(/<\\/head>/i, '  <link rel=\"stylesheet\" href=\"' + SHELL_STYLESHEET + '\">' + newline + '</head>');"
new_style = "if (intlCss.test(html)) return String(html).replace(intlCss, match => match + newline + '<link rel=\"stylesheet\" href=\"' + SHELL_STYLESHEET + '\">');\n  return String(html).replace(/<\\/head>/i, '<link rel=\"stylesheet\" href=\"' + SHELL_STYLESHEET + '\">' + newline + '</head>');"
require_once(text, old_style, 'navigation stylesheet insertion')
text = text.replace(old_style, new_style)

marker = "\nfunction renderChrome(localeKey, title, section, variant, newline) {"
require_once(text, marker, 'navigation renderChrome marker')
breadcrumb_helpers = r'''

const SITE_ORIGIN = 'https://playpoint-sim.com';

function canonicalUrlForPath(relativePath) {
  let normalized = '/' + String(relativePath).replace(/^\/+/, '');
  if (normalized.endsWith('/index.html')) normalized = normalized.slice(0, -'index.html'.length);
  return SITE_ORIGIN + normalized;
}

function buildBreadcrumbItems(localeKey, title, section, variant, relativePath) {
  const locale = LOCALES[localeKey];
  const copy = COPY[localeKey];
  const homeHref = '/' + localeKey + '/';
  const guidesHref = homeHref + 'articles/';
  const items = [{ name: locale.home, item: SITE_ORIGIN + homeHref }];

  if (variant === 'hub') {
    items.push({ name: locale.blog, item: SITE_ORIGIN + guidesHref });
    return items;
  }

  if (variant === 'policy') {
    items.push({ name: title, item: canonicalUrlForPath(relativePath) });
    return items;
  }

  items.push({ name: locale.blog, item: SITE_ORIGIN + guidesHref });
  if (SECTION_ANCHORS[section] && copy.nav[section]) {
    items.push({ name: copy.nav[section], item: SITE_ORIGIN + categoryHref(localeKey, section) });
  }
  items.push({ name: title, item: canonicalUrlForPath(relativePath) });
  return items;
}

function renderBreadcrumbSchema(localeKey, title, section, variant, relativePath) {
  const itemListElement = buildBreadcrumbItems(localeKey, title, section, variant, relativePath)
    .map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.name, item: item.item }));
  const schema = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement };
  return '<script type="application/ld+json" data-intl-breadcrumbs>' + JSON.stringify(schema) + '</script>';
}

function upsertBreadcrumbSchema(html, localeKey, title, section, variant, relativePath, newline) {
  const rendered = renderBreadcrumbSchema(localeKey, title, section, variant, relativePath);
  const managed = /<script\b[^>]*data-intl-breadcrumbs[^>]*>[\s\S]*?<\/script>/i;
  if (managed.test(html)) return String(html).replace(managed, rendered);
  if (/"@type"\s*:\s*"BreadcrumbList"/.test(html)) return html;
  return String(html).replace(/<\/head>/i, rendered + newline + '</head>');
}
'''
text = text.replace(marker, breadcrumb_helpers + marker)

old_sync = "after = replaceChrome(after, renderChrome(localeKey, title, section, variant, newline));\n  after = replaceSidebar(after, renderSidebar(localeKey, relativePath, section, role, relatedArticles, variant, newline));"
new_sync = "after = replaceChrome(after, renderChrome(localeKey, title, section, variant, newline));\n  after = upsertBreadcrumbSchema(after, localeKey, title, section, variant, relativePath, newline);\n  after = replaceSidebar(after, renderSidebar(localeKey, relativePath, section, role, relatedArticles, variant, newline));"
require_once(text, old_sync, 'navigation syncPage')
text = text.replace(old_sync, new_sync)
nav.write_text(text, encoding='utf-8')

copy = Path('scripts/intl-shell-copy.cjs')
text = copy.read_text(encoding='utf-8')
replacements = {
    "regionNames: Object.freeze({ ja: 'Japan', en: 'United States', ko: 'Korea', tw: 'Taiwan' })": "regionNames: Object.freeze({ ja: 'Japan', en: 'United States', ko: 'Korea', tw: 'Taiwan', hk: 'Hong Kong', in: 'India' })",
    "regionNames: Object.freeze({ ja: '일본', en: '미국', ko: '대한민국', tw: '대만' })": "regionNames: Object.freeze({ ja: '일본', en: '미국', ko: '대한민국', tw: '대만', hk: '홍콩', in: '인도' })",
    "regionNames: Object.freeze({ ja: '日本', en: '美國', ko: '韓國', tw: '台灣' })": "regionNames: Object.freeze({ ja: '日本', en: '美國', ko: '韓國', tw: '台灣', hk: '香港', in: '印度' })",
}
for old, new in replacements.items():
    require_once(text, old, f'copy regionNames {old}')
    text = text.replace(old, new)
copy.write_text(text, encoding='utf-8')

expansion = Path('scripts/intl-content-expansion.cjs')
text = expansion.read_text(encoding='utf-8')
old = "  const missingTopics = TOPICS.filter(topic => !html.includes(`/${articlePath(locale, topic.slug)}`));\n  if (!missingTopics.length) return;"
new = "  const articleList = html.match(/<section class=\\\"section related-links-section\\\"[^>]*>[\\s\\S]*?<\\/section>/)?.[0] || '';\n  const missingTopics = TOPICS.filter(topic => !articleList.includes(`href=\\\"/${articlePath(locale, topic.slug)}\\\"`));\n  if (!missingTopics.length) return;"
require_once(text, old, 'content expansion topic detection')
text = text.replace(old, new)
expansion.write_text(text, encoding='utf-8')

css = Path('articles/intl-shell-v1.css')
text = css.read_text(encoding='utf-8')
old = '''@media (max-width: 420px) {
  .site-header-tools { align-items: stretch; flex-direction: column; }
  .site-about-link, .site-region-switcher summary { justify-content: center; width: 100%; }
  .site-region-menu { width: min(280px, calc(100vw - 28px)); }
}
'''
new = '''@media (max-width: 420px) {
  .site-header-tools { display: grid; grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr); width: 100%; gap: 8px; align-items: stretch; }
  .site-about-link, .site-region-switcher, .site-region-switcher summary { min-width: 0; width: 100%; }
  .site-about-link, .site-region-switcher summary { justify-content: center; padding-left: 8px; padding-right: 8px; }
  .site-about-link, .site-region-switcher summary > span:last-of-type { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .site-region-menu { width: min(280px, calc(100vw - 28px)); }
}
@media (max-width: 340px) {
  .site-header-tools { grid-template-columns: 1fr; }
}
'''
require_once(text, old, 'mobile shell CSS')
css.write_text(text.replace(old, new), encoding='utf-8')

test_path = Path('tests/intl-navigation-sidebar-v1.test.cjs')
text = test_path.read_text(encoding='utf-8')
if 'Play country switcher exposes all six supported calculator regions' in text:
    raise SystemExit('final audit tests already exist unexpectedly')
append = r'''

test('Play country switcher exposes all six supported calculator regions', () => {
  const destinations = ['/', '/en/', '/ko/', '/tw/', '/hk/', '/in/'];
  for (const locale of locales) {
    const html = read(locale, 'google-play-points-not-showing.html');
    const switcher = html.match(/<details class="site-region-switcher">[\s\S]*?<\/details>/i)?.[0] || '';
    for (const href of destinations) {
      if (href === `/${locale}/`) continue;
      assert.ok(switcher.includes(`href="${href}"`), `${locale}: ${href}`);
    }
  }
});

test('visible category breadcrumbs are paired with BreadcrumbList structured data', () => {
  for (const locale of locales) {
    const html = read(locale, 'google-play-points-not-showing.html');
    const match = html.match(/<script type="application\/ld\+json" data-intl-breadcrumbs>([\s\S]*?)<\/script>/i);
    assert.ok(match, `${locale}: managed BreadcrumbList`);
    const schema = JSON.parse(match[1]);
    assert.strictEqual(schema['@type'], 'BreadcrumbList', `${locale}: schema type`);
    assert.strictEqual(schema.itemListElement.at(-1).item, `https://playpoint-sim.com/${locale}/articles/google-play-points-not-showing.html`, `${locale}: current URL`);
    assert.ok(schema.itemListElement.some(item => item.item === `https://playpoint-sim.com/${locale}/articles/#intl-hub-trouble`), `${locale}: category URL`);
  }
});

test('guide hub BreadcrumbList ends at the canonical directory URL', () => {
  for (const locale of locales) {
    const html = fs.readFileSync(path.join(root, locale, 'articles', 'index.html'), 'utf8');
    const match = html.match(/<script type="application\/ld\+json" data-intl-breadcrumbs>([\s\S]*?)<\/script>/i);
    assert.ok(match, `${locale}: hub BreadcrumbList`);
    const schema = JSON.parse(match[1]);
    assert.strictEqual(schema.itemListElement.at(-1).item, `https://playpoint-sim.com/${locale}/articles/`, `${locale}: hub canonical URL`);
  }
});
'''
test_path.write_text(text.rstrip() + append + '\n', encoding='utf-8')

for temp in [Path('.github/workflows/intl-shell-finalize-temp.yml'), Path('.github/scripts/finalize-intl-shell-temp.py')]:
    if not temp.exists():
        raise SystemExit(f'temporary file missing before self-cleanup: {temp}')
    temp.unlink()
