from pathlib import Path


def replace_once(file_name: str, before: str, after: str) -> None:
    path = Path(file_name)
    current = path.read_text(encoding='utf-8')
    count = current.count(before)
    if count != 1:
        raise RuntimeError(f'Expected exactly one match in {file_name}, got {count}: {before[:120]}')
    path.write_text(current.replace(before, after, 1), encoding='utf-8')


replace_once(
    'tests/result-navigation-config.test.cjs',
    """  assert.throws(() => { config.decisionTitle = 'changed'; }, TypeError);
  assert.throws(() => { config.relatedArticleGroups.default.push({ href: 'x', title: 'x' }); }, TypeError);""",
    """  assert.throws(() => { config.decisionTitle = 'changed'; }, error => error?.name === 'TypeError');
  assert.throws(() => { config.relatedArticleGroups.default.push({ href: 'x', title: 'x' }); }, error => error?.name === 'TypeError');""",
)

replace_once(
    'tests/region-navigation-behavior.test.cjs',
    """    CONFIGS: { JP: {}, US: {}, KR: {}, TW: {} },
    createExpansionConfigs() { return { HK: {}, IN: {} }; },
    STATE: { currentRegion },""",
    """    CONFIGS: { JP: {}, US: {}, KR: {}, TW: {} },
    createExpansionConfigs() { return { HK: {}, IN: {} }; },
    assertResultNavigationCoverage(regionCodes) {
      if (regionCodes.some(region => !['JP', 'US', 'KR', 'TW', 'HK', 'IN'].includes(region))) {
        throw new Error('missing result navigation config');
      }
    },
    STATE: { currentRegion },""",
)

replace_once(
    'tests/region-runtime-wiring.test.cjs',
    """assert.match(resultNavigation, /const RESULT_NAVIGATION_CONFIGS = Object\\.freeze\\(\\{ JP, US, KR, TW, HK, IN \\}\\);/);""",
    """assert.match(resultNavigation, /const RESULT_NAVIGATION_CONFIGS = deepFreeze\\(\\{ JP, US, KR, TW, HK, IN \\}\\);/);
assert.match(resultNavigation, /export function assertResultNavigationCoverage\\(regionCodes\\)/);
assert.match(regionNavigation, /assertResultNavigationCoverage\\(Object\\.keys\\(CONFIGS\\)\\)/);""",
)
