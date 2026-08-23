from pathlib import Path

path = Path('scripts/apply-hk-in-postlaunch-audit-fixes.py')
text = path.read_text(encoding='utf-8')
anchor = 'I need approx. {symbol}{yen} to reach my goal '
start = text.index(anchor) + len(anchor)
end = text.index('! 💰', start)
if text[start:end] != '“{status}”':
    text = text[:start] + '“{status}”' + text[end:]
    path.write_text(text, encoding='utf-8')
print('audit helper quoting normalized')
