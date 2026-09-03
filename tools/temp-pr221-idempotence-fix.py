from pathlib import Path

path = Path('scripts/static-calculator-layout.cjs')
text = path.read_text(encoding='utf-8')

old = '''function ensureCriticalFirstViewAssets(content) {
  if (!content.includes('</head>')) return content;
  const stylePattern = new RegExp(`<style id="${ADVANCED_SETTINGS_STYLE_ID}">[\\s\\S]*?<\\/style>`, 'i');
  const statePattern = new RegExp(`<script id="${ADVANCED_SETTINGS_STATE_SCRIPT_ID}">[\\s\\S]*?<\\/script>`, 'i');
  const additions = [];

  if (stylePattern.test(content)) content = content.replace(stylePattern, ADVANCED_SETTINGS_CRITICAL_STYLE);
  else additions.push(ADVANCED_SETTINGS_CRITICAL_STYLE);

  if (statePattern.test(content)) content = content.replace(statePattern, ADVANCED_SETTINGS_STATE_SCRIPT);
  else additions.push(ADVANCED_SETTINGS_STATE_SCRIPT);

  if (!additions.length) return content;
  return content.replace('</head>', `${additions.map(item => `    ${item}`).join('\\n    ')}\\n</head>`);
}
'''

new = '''function replaceElementById(content, tagName, id, replacement) {
  const opening = `<${tagName} id="${id}">`;
  const start = content.indexOf(opening);
  if (start < 0) return { content, replaced: false };
  const closing = `</${tagName}>`;
  const end = content.indexOf(closing, start + opening.length);
  if (end < 0) throw new Error(`${id} の終了タグを取得できません。`);
  return {
    content: `${content.slice(0, start)}${replacement}${content.slice(end + closing.length)}`,
    replaced: true
  };
}

function ensureCriticalFirstViewAssets(content) {
  if (!content.includes('</head>')) return content;
  const additions = [];

  const styleResult = replaceElementById(
    content,
    'style',
    ADVANCED_SETTINGS_STYLE_ID,
    ADVANCED_SETTINGS_CRITICAL_STYLE
  );
  content = styleResult.content;
  if (!styleResult.replaced) additions.push(ADVANCED_SETTINGS_CRITICAL_STYLE);

  const stateResult = replaceElementById(
    content,
    'script',
    ADVANCED_SETTINGS_STATE_SCRIPT_ID,
    ADVANCED_SETTINGS_STATE_SCRIPT
  );
  content = stateResult.content;
  if (!stateResult.replaced) additions.push(ADVANCED_SETTINGS_STATE_SCRIPT);

  if (!additions.length) return content;
  return content.replace('</head>', `${additions.map(item => `    ${item}`).join('\\n    ')}\\n</head>`);
}
'''

if old not in text:
    raise SystemExit('expected ensureCriticalFirstViewAssets block not found')
path.write_text(text.replace(old, new, 1), encoding='utf-8')
