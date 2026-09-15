from pathlib import Path

path = Path('scripts/sitemap-sync.cjs')
text = path.read_text(encoding='utf-8')
old = "    const next = html.replace(pattern, `$1${escapeHtml(label)}$2`);"
new = "    const next = html.replace(pattern, (_match, prefix, suffix) => `${prefix}${escapeHtml(label)}${suffix}`);"
if text.count(old) != 1:
    raise SystemExit(f'unexpected replacement-site count: {text.count(old)}')
path.write_text(text.replace(old, new), encoding='utf-8')
