'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const contractPath = path.join(root, 'scripts/article-date-contract.cjs');
const testPath = path.join(root, 'tests/article-date-contract.test.cjs');
const registryPath = path.join(root, 'scripts/article-official-verification-dates.json');
const branchName = 'feat/article-date-contract';

function replaceOnce(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`patch target not found: ${label}`);
  return source.replace(before, after);
}

function patchContract() {
  let source = fs.readFileSync(contractPath, 'utf8');

  source = replaceOnce(
    source,
    'const JSON_LD_SCRIPT_PATTERN = /<script\\b[^>]*\\btype\\s*=\\s*["\']application\\/ld\\+json["\'][^>]*>([\\s\\S]*?)<\\/script>/gi;\n',
    'const JSON_LD_SCRIPT_PATTERN = /<script\\b[^>]*\\btype\\s*=\\s*["\']application\\/ld\\+json["\'][^>]*>([\\s\\S]*?)<\\/script>/gi;\nconst JSON_LD_FULL_SCRIPT_PATTERN = /(<script\\b[^>]*\\btype\\s*=\\s*["\']application\\/ld\\+json["\'][^>]*>)([\\s\\S]*?)(<\\/script>)/gi;\n',
    'JSON-LD full script pattern'
  );

  source = replaceOnce(
    source,
    `function extractTrailingAuthorHtml(visibleMetaHtml, localeKey) {\n  if (localeKey !== 'ja') return '';\n  return String(visibleMetaHtml).match(/著者：([\\s\\S]*?)(?=<\\/p>)/i)?.[1]?.trim() || '';\n}\n`,
    `function extractTrailingAuthorHtml(visibleMetaHtml, localeKey) {\n  if (localeKey !== 'ja') return '';\n  return String(visibleMetaHtml).match(/著者：([\\s\\S]*?)(?=<\\/p>)/i)?.[1]?.trim() || '';\n}\n\nfunction extractSupplementalMetaItems(visibleMetaHtml, localeKey) {\n  const segments = stripTags(visibleMetaHtml)\n    .split(/\\s*(?:・|·|｜|\\|)\\s*/u)\n    .map(segment => segment.trim())\n    .filter(Boolean);\n\n  const generatedPrefixes = {\n    ja: /^(?:📅\\s*)?(?:公開|更新|公式情報確認)\\b|^著者[:：]/,\n    en: /^(?:Published|Updated|Official info checked)\\b/i,\n    ko: /^(?:공개|업데이트|공식 정보 확인)\\b/,\n    tw: /^(?:發布|更新|官方資訊確認)\\b/\n  };\n\n  return [...new Set(segments.filter(segment => {\n    if (generatedPrefixes[localeKey].test(segment)) return false;\n    if (extractReadTime(segment, localeKey)) return false;\n    if (/\\d{4}[./-]\\d{1,2}[./-]\\d{1,2}/.test(segment) && /(?:公開|更新|Published|Updated|공개|업데이트|發布|更新)/i.test(segment)) return false;\n    return true;\n  }))];\n}\n`,
    'supplemental visible metadata extractor'
  );

  source = replaceOnce(
    source,
    `function renderVisibleDateMeta({ variant, authorHtml = '', ...values }) {\n  const content = renderDateMetaContent(values);\n  if (variant === 'article-post-meta') {\n    return \`<div class="article-post-meta">\\n                <span>\${content}</span>\\n            </div>\`;\n  }\n  if (variant === 'article-meta') {\n    const author = authorHtml ? \` / 著者：\${authorHtml}\` : '';\n    return \`<p class="article-meta">\${content}\${author}</p>\`;\n  }\n  return \`<p class="hero-meta">\${content}</p>\`;\n}\n`,
    `function renderVisibleDateMeta({ variant, authorHtml = '', supplementalItems = [], ...values }) {\n  const content = renderDateMetaContent(values);\n  const separator = values.localeKey === 'ja' ? ' ・ ' : ' · ';\n  const supplemental = supplementalItems.length > 0 ? \`\${separator}\${supplementalItems.join(separator)}\` : '';\n  if (variant === 'article-post-meta') {\n    return \`<div class="article-post-meta">\\n                <span>\${content}\${supplemental}</span>\\n            </div>\`;\n  }\n  if (variant === 'article-meta') {\n    const author = authorHtml ? \` / 著者：\${authorHtml}\` : '';\n    return \`<p class="article-meta">\${content}\${supplemental}\${author}</p>\`;\n  }\n  return \`<p class="hero-meta">\${content}\${supplemental}</p>\`;\n}\n`,
    'visible metadata renderer'
  );

  source = replaceOnce(
    source,
    `function setNamedMeta(html, name, value) {\n  const pattern = new RegExp(\`<meta\\\\b(?=[^>]*\\\\bname\\\\s*=\\\\s*["']\${escapeRegExp(name)}["'])[^>]*>\`, 'i');\n  const match = String(html).match(pattern);\n  if (match) return String(html).replace(pattern, updateTagContentAttribute(match[0], value));\n\n  const tag = \`  <meta name="\${name}" content="\${value}">\\n\`;\n  const authorPattern = /<meta\\b(?=[^>]*\\bname\\s*=\\s*["']author["'])[^>]*>\\s*/i;\n  if (authorPattern.test(html)) return String(html).replace(authorPattern, matchText => \`\${matchText}\${tag}\`);\n  return String(html).replace(/<\\/head>/i, \`\${tag}</head>\`);\n}\n`,
    `function setNamedMeta(html, name, value) {\n  const pattern = new RegExp(\`<meta\\\\b(?=[^>]*\\\\bname\\\\s*=\\\\s*["']\${escapeRegExp(name)}["'])[^>]*>\`, 'i');\n  const match = String(html).match(pattern);\n  if (match) return String(html).replace(pattern, updateTagContentAttribute(match[0], value));\n\n  const tag = \`  <meta name="\${name}" content="\${value}">\\n\`;\n  const authorPattern = /<meta\\b(?=[^>]*\\bname\\s*=\\s*["']author["'])[^>]*>\\s*/i;\n  if (authorPattern.test(html)) return String(html).replace(authorPattern, matchText => \`\${matchText}\${tag}\`);\n  return String(html).replace(/<\\/head>/i, \`\${tag}</head>\`);\n}\n\nfunction extractNamedMetaDate(html, name) {\n  const pattern = new RegExp(\`<meta\\\\b(?=[^>]*\\\\bname\\\\s*=\\\\s*["']\${escapeRegExp(name)}["'])[^>]*>\`, 'i');\n  const tag = String(html).match(pattern)?.[0] || '';\n  const value = tag.match(/\\bcontent\\s*=\\s*(["'])(.*?)\\1/i)?.[2] || '';\n  return value ? normalizeDate(value, name) : '';\n}\n\nfunction synchronizeArticleStructuredDataDates(html, publishedAt, modifiedAt) {\n  return String(html).replace(JSON_LD_FULL_SCRIPT_PATTERN, (full, openTag, body, closeTag) => {\n    let parsed;\n    try {\n      parsed = JSON.parse(body);\n    } catch {\n      return full;\n    }\n    if (collectArticleNodes(parsed, []).length === 0) return full;\n\n    const synchronized = body\n      .replace(/("datePublished"\\s*:\\s*")[^"]*(")/g, \`$1\${publishedAt}$2\`)\n      .replace(/("dateModified"\\s*:\\s*")[^"]*(")/g, \`$1\${modifiedAt}$2\`);\n    return \`\${openTag}\${synchronized}\${closeTag}\`;\n  });\n}\n`,
    'named meta reader and JSON-LD synchronizer'
  );

  const noteStart = source.indexOf('function synchronizeVisibleOfficialVerificationNote');
  const noteEnd = source.indexOf('\nfunction synchronizeArticleDateHtml', noteStart);
  if (noteStart < 0 || noteEnd < 0) throw new Error('patch target not found: official verification note synchronizer');
  const noteReplacement = `function synchronizeVisibleOfficialVerificationNote(html, localeKey, officialVerifiedAt) {\n  const formatted = formatDate(officialVerifiedAt, localeKey);\n  const patterns = {\n    ja: /最終公式確認日：\\s*(?:\\d{4}-\\d{2}-\\d{2}|\\d{4}年\\d{1,2}月\\d{1,2}日)/g,\n    en: /(?:Last official(?: source)? check(?:ed)?|Official (?:information|info|sources?) (?:checked|verified))(?:\\s+on|:)?\\s*(?:\\d{4}-\\d{2}-\\d{2}|[A-Z][a-z]+\\s+\\d{1,2},\\s+\\d{4})/gi,\n    ko: /(?:공식 정보 최종 확인|공식 정보 확인|공식 확인일)[^<\\n]{0,16}?(?:\\d{4}-\\d{2}-\\d{2}|\\d{4}년\\s*\\d{1,2}월\\s*\\d{1,2}일)/g,\n    tw: /(?:官方資訊最後確認|官方資訊確認|官方確認日)[^<\\n]{0,16}?(?:\\d{4}-\\d{2}-\\d{2}|\\d{4}年\\s*\\d{1,2}月\\s*\\d{1,2}日)/g\n  };\n  const replacements = {\n    ja: \`最終公式確認日：\${formatJapaneseLongDate(officialVerifiedAt)}\`,\n    en: \`Official sources checked: \${formatted}\`,\n    ko: \`공식 정보 최종 확인: \${formatted}\`,\n    tw: \`官方資訊最後確認：\${formatted}\`\n  };\n  return String(html).replace(patterns[localeKey], replacements[localeKey]);\n}\n`;
  source = source.slice(0, noteStart) + noteReplacement + source.slice(noteEnd);

  source = replaceOnce(
    source,
    `  const publishedAt = normalizeDate(article.datePublished, 'datePublished', normalizedPath);\n  const modifiedAt = normalizeDate(article.dateModified, 'dateModified', normalizedPath);\n  const verifiedAt = normalizeDate(officialVerifiedAt, 'officialVerifiedAt', normalizedPath);\n`,
    `  const publishedAt = normalizeDate(article.datePublished, 'datePublished', normalizedPath);\n  const modifiedAt = extractNamedMetaDate(html, 'last-modified')\n    || normalizeDate(article.dateModified, 'dateModified', normalizedPath);\n  const verifiedAt = normalizeDate(officialVerifiedAt, 'officialVerifiedAt', normalizedPath);\n`,
    'modified date source of truth'
  );

  source = replaceOnce(
    source,
    `  const readTime = extractReadTime(visibleMeta.html, localeKey);\n  const authorHtml = extractTrailingAuthorHtml(visibleMeta.html, localeKey);\n`,
    `  const readTime = extractReadTime(visibleMeta.html, localeKey);\n  const authorHtml = extractTrailingAuthorHtml(visibleMeta.html, localeKey);\n  const supplementalItems = extractSupplementalMetaItems(visibleMeta.html, localeKey);\n`,
    'supplemental metadata capture'
  );

  source = replaceOnce(
    source,
    `  output = synchronizeOptionalArticlePropertyMeta(output, 'article:published_time', publishedAt);\n  output = synchronizeOptionalArticlePropertyMeta(output, 'article:modified_time', modifiedAt);\n  output = output.replace(visibleMeta.pattern, renderVisibleDateMeta({\n`,
    `  output = synchronizeOptionalArticlePropertyMeta(output, 'article:published_time', publishedAt);\n  output = synchronizeOptionalArticlePropertyMeta(output, 'article:modified_time', modifiedAt);\n  output = synchronizeArticleStructuredDataDates(output, publishedAt, modifiedAt);\n  output = output.replace(visibleMeta.pattern, renderVisibleDateMeta({\n`,
    'JSON-LD date synchronization'
  );

  source = replaceOnce(
    source,
    `    authorHtml,\n    localeKey,\n`,
    `    authorHtml,\n    supplementalItems,\n    localeKey,\n`,
    'supplemental metadata rendering'
  );

  source = replaceOnce(
    source,
    `  extractArticleStructuredData,\n  extractReadTime,\n`,
    `  extractArticleStructuredData,\n  extractReadTime,\n  extractSupplementalMetaItems,\n`,
    'export supplemental helper'
  );
  source = replaceOnce(
    source,
    `  syncArticleDateContract,\n  synchronizeArticleDateHtml\n`,
    `  syncArticleDateContract,\n  synchronizeArticleDateHtml,\n  synchronizeArticleStructuredDataDates\n`,
    'export JSON-LD helper'
  );

  fs.writeFileSync(contractPath, source, 'utf8');
}

function patchTests() {
  let source = fs.readFileSync(testPath, 'utf8');
  source = replaceOnce(
    source,
    `  <meta name="author" content="かたかた">\n  <meta property="article:published_time"`,
    `  <meta name="author" content="かたかた">\n  <meta name="last-modified" content="2026-08-04">\n  <meta property="article:published_time"`,
    'fixture semantic modified date'
  );

  source = source
    .replace(/data-article-date="modified" datetime="2026-08-17"/g, 'data-article-date="modified" datetime="2026-08-04"')
    .replace(/更新 <time\[\^>\]\*>2026\\\/08\\\/17<\\\/time>/g, '更新 <time[^>]*>2026\\/08\\/04<\\/time>')
    .replace(/<meta name="last-modified" content="2026-08-17">/g, '<meta name="last-modified" content="2026-08-04">');

  source = replaceOnce(
    source,
    `  assert.match(result.html, /<meta name="playpoint:official-verified" content="2026-07-31">/);\n  assert.match(result.html, /最終公式確認日：2026年7月31日/);\n`,
    `  assert.match(result.html, /<meta name="playpoint:official-verified" content="2026-07-31">/);\n  assert.match(result.html, /article:modified_time[^>]*content="2026-08-04T00:00:00\\+09:00"/);\n  assert.match(result.html, /"dateModified":"2026-08-04"/);\n  assert.match(result.html, /最終公式確認日：2026年7月31日/);\n`,
    'structured data assertions'
  );

  source = replaceOnce(
    source,
    `function legacyArticleMetaFixture() {\n  return japaneseFixture().replace(\n    '<p class="hero-meta">2026/07/31 更新 ・ 読了 6分</p>',\n    '<p class="article-meta">公開日：2025-12-25 / 更新日：2026-08-17 / 著者：<a href="../author/katakata.html" rel="author">かたかた</a></p>'\n  );\n}\n`,
    `function legacyArticleMetaFixture() {\n  return japaneseFixture().replace(\n    '<p class="hero-meta">2026/07/31 更新 ・ 読了 6分</p>',\n    '<p class="article-meta">公開日：2025-12-25 / 更新日：2026-08-17 / 著者：<a href="../author/katakata.html" rel="author">かたかた</a></p>'\n  );\n}\n\nfunction englishFixture() {\n  return \`<!doctype html>\n<html lang="en">\n<head>\n  <meta name="author" content="Katakata">\n  <meta name="last-modified" content="2026-08-21">\n  <meta property="article:published_time" content="2026-07-07T00:00:00+09:00">\n  <meta property="article:modified_time" content="2026-08-21T00:00:00+09:00">\n  <script type="application/ld+json">{"@context":"https://schema.org","@type":"Article","datePublished":"2026-07-07","dateModified":"2026-08-21"}</script>\n</head>\n<body>\n  <div class="hero"><h1>US comparison</h1><p class="hero-meta">Updated 2026-08-21 ・ US official conditions</p></div>\n  <aside class="official-source-note"><p>Official information checked on 2026-08-05. Conditions can change.</p></aside>\n</body>\n</html>\`;\n}\n`,
    'English supplemental fixture'
  );

  const insertBefore = `test('記事日付同期は冪等である', () => {`;
  if (!source.includes(insertBefore)) throw new Error('patch target not found: English supplemental test insertion');
  source = source.replace(insertBefore, `test('日付正規化で地域注記を消さず、明示された公式確認日を同期できる', () => {\n  const result = synchronizeArticleDateHtml(englishFixture(), {\n    relativePath: 'en/articles/example.html',\n    officialVerifiedAt: '2026-08-05'\n  });\n\n  assert.match(result.html, /US official conditions/);\n  assert.match(result.html, /Official info checked <time[^>]*datetime="2026-08-05"/);\n  assert.match(result.html, /Official sources checked: August 5, 2026/);\n});\n\n${insertBefore}`);

  fs.writeFileSync(testPath, source, 'utf8');
}

function getMainFile(relativePath) {
  try {
    return execFileSync('git', ['show', `origin/main:${relativePath}`], { cwd: root, encoding: 'utf8' });
  } catch {
    return '';
  }
}

function updateNamedMeta(html, name, value) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`<meta\\b(?=[^>]*\\bname\\s*=\\s*["']${escaped}["'])[^>]*>`, 'i');
  const tag = html.match(pattern)?.[0];
  if (!tag) return html;
  return html.replace(pattern, tag.replace(/\\bcontent\\s*=\\s*(["']).*?\\1/i, `content="${value}"`));
}

function metaDate(html, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tag = html.match(new RegExp(`<meta\\b(?=[^>]*\\bname\\s*=\\s*["']${escaped}["'])[^>]*>`, 'i'))?.[0] || '';
  return tag.match(/\\bcontent\\s*=\\s*(["'])(.*?)\\1/i)?.[2]?.slice(0, 10) || '';
}

function isoDate(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function explicitOfficialDate(html) {
  const isoPatterns = [
    /Official (?:information|info|sources?) (?:checked|verified)(?: on|:)\s*(\d{4}-\d{2}-\d{2})/i,
    /Last official(?: source)? check(?:ed)?(?: on|:)\s*(\d{4}-\d{2}-\d{2})/i,
    /공식[^<\n]{0,40}(?:확인|검증)[^<\n]{0,20}(\d{4}-\d{2}-\d{2})/,
    /官方[^<\n]{0,40}(?:確認|查核|驗證)[^<\n]{0,20}(\d{4}-\d{2}-\d{2})/
  ];
  for (const pattern of isoPatterns) {
    const match = html.match(pattern);
    if (match) return match[1];
  }
  const ja = html.match(/最終公式確認日：\s*(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (ja) return isoDate(ja[1], ja[2], ja[3]);
  const en = html.match(/(?:Official (?:information|info|sources?) (?:checked|verified)|Last official(?: source)? check(?:ed)?)(?: on|:)?\s*([A-Z][a-z]+)\s+(\d{1,2}),\s+(\d{4})/i);
  if (en) {
    const months = { january:1,february:2,march:3,april:4,may:5,june:6,july:7,august:8,september:9,october:10,november:11,december:12 };
    const month = months[en[1].toLowerCase()];
    if (month) return isoDate(en[3], month, en[2]);
  }
  const ko = html.match(/공식[^<\n]{0,40}(?:확인|검증)[^<\n]{0,20}(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
  if (ko) return isoDate(ko[1], ko[2], ko[3]);
  const tw = html.match(/官方[^<\n]{0,40}(?:確認|查核|驗證)[^<\n]{0,20}(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/);
  if (tw) return isoDate(tw[1], tw[2], tw[3]);
  return '';
}

function migrateFromMain() {
  execFileSync('git', ['fetch', 'origin', 'main', '--quiet'], { cwd: root, stdio: 'inherit' });
  delete require.cache[require.resolve('./article-date-contract.cjs')];
  const contract = require('./article-date-contract.cjs');
  const articleFiles = contract.getArticleFiles(root);
  const currentRegistry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  const nextRegistry = {};
  let restoredModified = 0;
  let restoredVisibleMeta = 0;
  let explicitOfficial = 0;

  for (const relativePath of articleFiles) {
    const mainHtml = getMainFile(relativePath);
    const currentPath = path.join(root, relativePath);
    let currentHtml = fs.readFileSync(currentPath, 'utf8');
    if (!mainHtml) {
      nextRegistry[relativePath] = currentRegistry[relativePath];
      continue;
    }

    const mainModified = metaDate(mainHtml, 'last-modified')
      || String(contract.extractArticleStructuredData(mainHtml)?.dateModified || '').slice(0, 10);
    if (mainModified && metaDate(currentHtml, 'last-modified') !== mainModified) {
      currentHtml = updateNamedMeta(currentHtml, 'last-modified', mainModified);
      restoredModified += 1;
    }

    const mainVisible = contract.findVisibleDateMeta(mainHtml);
    const currentVisible = contract.findVisibleDateMeta(currentHtml);
    if (mainVisible && currentVisible && currentVisible.html !== mainVisible.html) {
      currentHtml = currentHtml.replace(currentVisible.pattern, mainVisible.html);
      restoredVisibleMeta += 1;
    }
    fs.writeFileSync(currentPath, currentHtml, 'utf8');

    const explicit = explicitOfficialDate(mainHtml);
    if (explicit) explicitOfficial += 1;
    nextRegistry[relativePath] = explicit || mainModified || currentRegistry[relativePath];
    if (!nextRegistry[relativePath]) throw new Error(`cannot seed official verification date: ${relativePath}`);
  }

  fs.writeFileSync(registryPath, `${JSON.stringify(nextRegistry, null, 2)}\n`, 'utf8');
  console.log(`[date-contract-migration] restored modified=${restoredModified}, visible-meta=${restoredVisibleMeta}, explicit-official=${explicitOfficial}, articles=${articleFiles.length}`);
}

function main() {
  if (execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim() !== branchName) {
    throw new Error(`must run on ${branchName}`);
  }
  patchContract();
  patchTests();
  migrateFromMain();
}

main();
