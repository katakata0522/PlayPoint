from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def extract_original_patch():
    workflow = (ROOT / '.github/workflows/apply-intl-article-ux-audit.yml').read_text()
    start_marker = "          python3 - <<'PY'\n"
    end_marker = "\n          PY\n\n      - name: Validate sources"
    start = workflow.index(start_marker) + len(start_marker)
    end = workflow.index(end_marker, start)
    lines = workflow[start:end].splitlines()
    script = '\n'.join(line[10:] if line.startswith('          ') else line for line in lines) + '\n'
    replacements = {
        "seo = pattern.sub(new_hub + '\\nfunction ensureDir', seo, count=1)": "seo = pattern.sub(lambda _: new_hub + '\\nfunction ensureDir', seo, count=1)",
        "if (!shared) throw new Error(relativePath + ': shared article stylesheet is missing');": "if (!shared) return next;",
    }
    for old, new in replacements.items():
        if old not in script:
            raise RuntimeError(f'expected patch fragment not found: {old}')
        script = script.replace(old, new, 1)
    return script


def run_original_patch():
    script = extract_original_patch()
    namespace = {'__name__': '__main__'}
    exec(compile(script, '<intl-ux-base-patch>', 'exec'), namespace, namespace)


def preserve_semantic_hub_lists():
    layout_path = ROOT / 'scripts/intl-article-layout.cjs'
    layout = layout_path.read_text()
    replacements = {
        '.intl-hub-section {': '.intl-article-hub .related-links-section {',
        '.intl-hub-section h2 {': '.intl-article-hub .related-links-section h2 {',
        '.intl-hub-grid {': '.intl-article-hub .related-links-section ul {',
        '.content .intl-hub-card {': '.intl-article-hub .related-links-section a {',
        '.content .intl-hub-card:hover {': '.intl-article-hub .related-links-section a:hover {',
    }
    for old, new in replacements.items():
        layout = layout.replace(old, new)
    marker = '.intl-article-hub .related-links-section a {\ndisplay: flex;'
    extra = (
        '.intl-article-hub .related-links-section ul {\n'
        'list-style: none;\n'
        'padding-left: 0;\n'
        'margin-bottom: 0;\n'
        '}\n\n'
        '.intl-article-hub .related-links-section li {\n'
        'margin: 0;\n'
        '}\n\n'
    )
    if marker not in layout:
        raise RuntimeError('hub card CSS marker not found')
    layout = layout.replace(marker, extra + marker, 1)
    layout_path.write_text(layout)

    seo_path = ROOT / 'scripts/intl-seo-pages.cjs'
    seo = seo_path.read_text()
    start = seo.index('  const categorySections = categoryOrder')
    end = seo.index("  const canonical = `https://playpoint-sim.com/${localeKey}/articles/`;", start)
    semantic = '''  const categorySections = categoryOrder
    .filter(key => buckets[key].length)
    .map(key => `<section class="section related-links-section" aria-labelledby="intl-hub-${key}">
            <h2 id="intl-hub-${key}">${escapeHtml(categoryLabels[key])}</h2>
            <ul>
${buckets[key].map(([href, title]) => `                <li><a href="${escapeHtml(href)}">${escapeHtml(title)}</a></li>`).join('\\n')}
            </ul>
          </section>`)
    .join('\\n');
'''
    seo = seo[:start] + semantic + seo[end:]
    seo_path.write_text(seo)

    test_path = ROOT / 'tests/intl-article-ux-audit.test.cjs'
    test = test_path.read_text()
    test = test.replace('assert.match(html, /intl-hub-grid/);', 'assert.match(html, /section related-links-section/);')
    test_path.write_text(test)


def harden_index_link_insertion():
    path = ROOT / 'scripts/intl-content-expansion.cjs'
    text = path.read_text()
    old = "  const anchor = '            <ul>\\n';\n  if (!html.includes(anchor)) throw new Error(`Could not find article-list anchor in ${relativePath}`);\n  html = html.replace(anchor, `${anchor}${links}\\n`);"
    new = "  const anchor = /(<section class=\\\"section related-links-section\\\"[^>]*>[\\s\\S]*?<ul>)/;\n  if (!anchor.test(html)) throw new Error(`Could not find article-list anchor in ${relativePath}`);\n  html = html.replace(anchor, `$1\\n${links}`);"
    if old not in text:
        raise RuntimeError('international content expansion index anchor not found')
    path.write_text(text.replace(old, new, 1))


def main():
    run_original_patch()
    preserve_semantic_hub_lists()
    harden_index_link_insertion()


if __name__ == '__main__':
    main()
