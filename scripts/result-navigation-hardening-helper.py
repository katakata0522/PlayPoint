from pathlib import Path


def replace_once(file_name: str, before: str, after: str) -> None:
    path = Path(file_name)
    current = path.read_text(encoding='utf-8')
    count = current.count(before)
    if count != 1:
        raise RuntimeError(f'Expected exactly one match in {file_name}, got {count}: {before[:120]}')
    path.write_text(current.replace(before, after, 1), encoding='utf-8')


def append_once(file_name: str, marker: str, addition: str) -> None:
    path = Path(file_name)
    current = path.read_text(encoding='utf-8')
    if marker in current:
        raise RuntimeError(f'Marker already exists in {file_name}: {marker}')
    path.write_text(current.rstrip() + '\n\n' + addition.strip() + '\n', encoding='utf-8')


replace_once(
    'js/analytics-core.js',
    """        result_related_article_clicked: ['source_path', 'target_path', 'target_status', 'calculation_mode', 'link_position'],
        result_decision_link_clicked: ['source_path', 'target_path', 'target_status', 'calculation_mode', 'link_position'],""",
    """        result_related_article_clicked: ['source_path', 'target_path', 'destination_type', 'target_status', 'calculation_mode', 'link_position'],
        result_decision_link_clicked: ['source_path', 'target_path', 'destination_type', 'target_status', 'calculation_mode', 'link_position'],""",
)

replace_once(
    'js/main.js',
    """function getResultLinkAnalyticsParams(link) {
    const targetUrl = new URL(link.href, window.location.href);
    return {
        source_path: window.location.pathname,
        target_path: targetUrl.pathname,
        target_status: STATE.dom.result?.dataset?.targetStatusLabel || '',
        calculation_mode: 'rank_up',
        link_position: link.dataset.linkPosition
    };
}""",
    """function getResultLinkDestinationType(targetUrl) {
    if (targetUrl.origin === window.location.origin) return 'internal';
    if (
        targetUrl.protocol === 'https:'
        && targetUrl.hostname === 'support.google.com'
        && targetUrl.pathname.startsWith('/googleplay/')
    ) {
        return 'official_google_support';
    }
    return 'external';
}

function getResultLinkAnalyticsParams(link) {
    const targetUrl = new URL(link.href, window.location.href);
    const destinationType = getResultLinkDestinationType(targetUrl);
    return {
        source_path: window.location.pathname,
        target_path: destinationType === 'internal' ? targetUrl.pathname : undefined,
        destination_type: destinationType,
        target_status: STATE.dom.result?.dataset?.targetStatusLabel || '',
        calculation_mode: 'rank_up',
        link_position: link.dataset.linkPosition
    };
}""",
)

replace_once(
    'js/result-navigation-config.js',
    """const RESULT_NAVIGATION_CONFIGS = Object.freeze({ JP, US, KR, TW, HK, IN });

export function getResultNavigationConfig(region) {
    return RESULT_NAVIGATION_CONFIGS[region] || RESULT_NAVIGATION_CONFIGS.JP;
}""",
    """function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
}

const RESULT_NAVIGATION_CONFIGS = deepFreeze({ JP, US, KR, TW, HK, IN });

export function assertResultNavigationCoverage(regionCodes) {
    const missingRegions = [...new Set(regionCodes || [])]
        .filter(region => !Object.prototype.hasOwnProperty.call(RESULT_NAVIGATION_CONFIGS, region));
    if (missingRegions.length > 0) {
        throw new Error(`Missing result navigation config for region(s): ${missingRegions.join(', ')}`);
    }
    return true;
}

export function getResultNavigationConfig(region) {
    return RESULT_NAVIGATION_CONFIGS[region] || RESULT_NAVIGATION_CONFIGS.JP;
}""",
)

replace_once(
    'js/region-navigation.js',
    """import { createExpansionConfigs } from './region-expansion-config.js';

Object.assign(CONFIGS, createExpansionConfigs(CONFIGS));""",
    """import { createExpansionConfigs } from './region-expansion-config.js';
import { assertResultNavigationCoverage } from './result-navigation-config.js';

Object.assign(CONFIGS, createExpansionConfigs(CONFIGS));
assertResultNavigationCoverage(Object.keys(CONFIGS));""",
)

replace_once(
    'tests/result-navigation-config.test.cjs',
    """const source = fs.readFileSync(path.join(root, 'js/result-navigation-config.js'), 'utf8')
  .replace('export function getResultNavigationConfig', 'function getResultNavigationConfig')
  + '\\nglobalThis.__getResultNavigationConfig = getResultNavigationConfig;\\n';
const context = {};
vm.createContext(context);
vm.runInContext(source, context, { filename: 'result-navigation-config.js' });
const getConfig = context.__getResultNavigationConfig;""",
    """const source = fs.readFileSync(path.join(root, 'js/result-navigation-config.js'), 'utf8')
  .replace('export function assertResultNavigationCoverage', 'function assertResultNavigationCoverage')
  .replace('export function getResultNavigationConfig', 'function getResultNavigationConfig')
  + '\\nglobalThis.__assertResultNavigationCoverage = assertResultNavigationCoverage;\\n'
  + 'globalThis.__getResultNavigationConfig = getResultNavigationConfig;\\n';
const context = {};
vm.createContext(context);
vm.runInContext(source, context, { filename: 'result-navigation-config.js' });
const assertCoverage = context.__assertResultNavigationCoverage;
const getConfig = context.__getResultNavigationConfig;""",
)

append_once(
    'tests/result-navigation-config.test.cjs',
    '結果ナビ設定の全リンクを契約として検証する',
    r"""test('結果ナビ設定の全リンクを契約として検証する', () => {
  const regionBasePaths = { JP: '', US: 'en', KR: 'ko', TW: 'tw', HK: 'hk', IN: 'in' };
  const actionKeys = ['highSpend', 'campaign', 'diamond', 'platinum', 'nearYearEnd', 'notShowing', 'giftCards'];

  for (const [region, basePath] of Object.entries(regionBasePaths)) {
    const config = getConfig(region);
    for (const [groupName, group] of Object.entries(config.relatedArticleGroups)) {
      assert.equal(new Set(group.map(link => link.href)).size, group.length, `${region}/${groupName}: duplicate href`);
    }

    const links = [
      ...Object.values(config.relatedArticleGroups).flat(),
      ...actionKeys.map(key => config[key])
    ];

    for (const link of links) {
      assert.equal(typeof link.href, 'string', `${region}: href must be a string`);
      assert.ok(link.href.trim(), `${region}: href must not be empty`);
      assert.equal(typeof link.title, 'string', `${region}: title must be a string`);
      assert.ok(link.title.trim(), `${region}: title must not be empty`);

      if (/^https:\/\//i.test(link.href)) {
        const url = new URL(link.href);
        assert.equal(url.protocol, 'https:', `${region}: external links must use HTTPS`);
        assert.equal(url.hostname, 'support.google.com', `${region}: unexpected external host ${url.hostname}`);
        assert.match(url.pathname, /^\/googleplay\//, `${region}: unexpected Google support path ${url.pathname}`);
        continue;
      }

      const cleanHref = link.href.split(/[?#]/, 1)[0];
      let target = cleanHref.startsWith('/')
        ? path.join(root, cleanHref)
        : path.resolve(root, basePath, cleanHref);
      if (fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target, 'index.html');
      assert.ok(fs.existsSync(target), `${region}: missing result navigation target ${link.href}`);
    }
  }
});

test('結果ナビ設定は深くfreezeされ実行中に汚染できない', () => {
  const config = getConfig('JP');
  assert.equal(Object.isFrozen(config), true);
  assert.equal(Object.isFrozen(config.relatedArticleGroups), true);
  assert.equal(Object.isFrozen(config.relatedArticleGroups.default), true);
  assert.equal(Object.isFrozen(config.relatedArticleGroups.default[0]), true);
  assert.throws(() => { config.decisionTitle = 'changed'; }, TypeError);
  assert.throws(() => { config.relatedArticleGroups.default.push({ href: 'x', title: 'x' }); }, TypeError);
});

test('公開地域に結果ナビ設定が無い場合は明示的に失敗する', () => {
  const publicRegions = ['JP', 'US', 'KR', 'TW', 'HK', 'IN'];
  assert.doesNotThrow(() => assertCoverage(publicRegions));
  assert.throws(() => assertCoverage([...publicRegions, 'SG']), /SG/);

  const regionNavigation = fs.readFileSync(path.join(root, 'js/region-navigation.js'), 'utf8');
  assert.match(regionNavigation, /assertResultNavigationCoverage\(Object\.keys\(CONFIGS\)\)/);
});""",
)

append_once(
    'tests/calculator-funnel-analytics.test.cjs',
    '結果リンク計測は外部URLを内部pathへ偽装せず遷移種別だけ残す',
    r"""test('結果リンク計測は外部URLを内部pathへ偽装せず遷移種別だけ残す', () => {
  const context = createRuntime();
  const analytics = context.PlayPointAnalytics;

  analytics.track('result_decision_link_clicked', {
    source_path: '/hk/',
    target_path: 'https://support.google.com/googleplay/answer/9080348',
    destination_type: 'official_google_support',
    target_status: '鑽石級',
    calculation_mode: 'rank_up',
    link_position: 1
  });
  assert.deepEqual(latestEventParams(context, 'result_decision_link_clicked'), {
    source_path: '/hk/',
    destination_type: 'official_google_support',
    target_status: '鑽石級',
    calculation_mode: 'rank_up',
    link_position: 1
  });

  analytics.track('result_related_article_clicked', {
    source_path: '/en/',
    target_path: '/en/articles/google-play-points-levels.html',
    destination_type: 'internal',
    target_status: 'Platinum',
    calculation_mode: 'rank_up',
    link_position: 2
  });
  assert.deepEqual(latestEventParams(context, 'result_related_article_clicked'), {
    source_path: '/en/',
    target_path: '/en/articles/google-play-points-levels.html',
    destination_type: 'internal',
    target_status: 'Platinum',
    calculation_mode: 'rank_up',
    link_position: 2
  });

  assert.match(mainSource, /targetUrl\.origin === window\.location\.origin/);
  assert.match(mainSource, /targetUrl\.hostname === 'support\.google\.com'/);
  assert.match(mainSource, /destination_type:\s*destinationType/);
  assert.match(mainSource, /target_path:\s*destinationType === 'internal' \? targetUrl\.pathname : undefined/);
});""",
)
