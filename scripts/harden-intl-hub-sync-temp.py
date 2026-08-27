from pathlib import Path

root = Path(__file__).resolve().parents[1]
path = root / 'scripts/intl-manual-content-sync.cjs'
text = path.read_text()
old = '  const insertionPoint = /(<section class="section related-links-section">\\s*<ul>)/;'
new = '  const insertionPoint = /(<section class="section related-links-section"[^>]*>[\\s\\S]*?<ul>)/;'
if old not in text:
    raise RuntimeError('manual international hub insertion selector not found')
path.write_text(text.replace(old, new, 1))
