from pathlib import Path

css_path = Path('articles/article-shared.css')
css = css_path.read_text(encoding='utf-8')
guard = '''

/*
 * Published Japanese article title color contract.
 * Keep the H1 on the shared #1a202c heading token even when compatibility
 * stylesheets contain historical hero/title rules.
 */
body[data-article-category] .main-content-column > .hero .article-title,
body[data-article-category] .main-content-column > .hero h1 {
color: var(--cocoon-heading);
}
'''
if 'Published Japanese article title color contract.' not in css:
    css_path.write_text(css.rstrip() + guard + '\n', encoding='utf-8')

smoke_path = Path('.github/scripts/article-css-smoke.cjs')
smoke = smoke_path.read_text(encoding='utf-8')
old = """        mainBackground: mainStyle?.backgroundColor || '',\n        hasCompatibility: stylesheets.some(href => href.includes(compatibility)),"""
new = """        mainBackground: mainStyle?.backgroundColor || '',\n        headingToken: getComputedStyle(document.documentElement).getPropertyValue('--cocoon-heading').trim(),\n        hasCompatibility: stylesheets.some(href => href.includes(compatibility)),"""
if 'headingToken:' not in smoke:
    if old not in smoke:
        raise SystemExit('article-css-smoke result anchor not found')
    smoke = smoke.replace(old, new, 1)
old_assert = """    assert(result.title.color === 'rgb(26, 32, 44)', `${article.key}/${viewport.key}: title color ${result.title.color}`);"""
new_assert = """    assert(result.headingToken.toLowerCase() === '#1a202c', `${article.key}/${viewport.key}: heading token ${result.headingToken || '(empty)'}`);\n    assert(result.title.color === 'rgb(26, 32, 44)', `${article.key}/${viewport.key}: title color ${result.title.color}`);"""
if 'heading token ${result.headingToken' not in smoke:
    if old_assert not in smoke:
        raise SystemExit('article-css-smoke assertion anchor not found')
    smoke = smoke.replace(old_assert, new_assert, 1)
smoke_path.write_text(smoke, encoding='utf-8')

test_path = Path('tests/japanese-article-css-contract.test.cjs')
test = test_path.read_text(encoding='utf-8')
extra = r'''

test('published Japanese H1 is guarded by the shared heading token', () => {
  const css = fs.readFileSync(path.join(articleDir, 'article-shared.css'), 'utf8');
  assert.match(
    css,
    /body\[data-article-category\]\s+\.main-content-column\s*>\s*\.hero\s+\.article-title,\s*body\[data-article-category\]\s+\.main-content-column\s*>\s*\.hero\s+h1\s*\{[^}]*color:\s*var\(--cocoon-heading\)/is
  );
});
'''
if "published Japanese H1 is guarded by the shared heading token" not in test:
    test_path.write_text(test.rstrip() + extra + '\n', encoding='utf-8')
