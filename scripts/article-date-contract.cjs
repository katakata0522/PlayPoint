'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ARTICLE_DIRECTORIES = Object.freeze([
  'articles',
  'en/articles',
  'ko/articles',
  'tw/articles'
]);
const REGISTRY_RELATIVE_PATH = 'scripts/article-official-verification-dates.json';
const JSON_LD_SCRIPT_PATTERN = /<script\b[^>]*\btype\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
const HERO_META_PATTERN = /<p\b(?=[^>]*\bclass\s*=\s*["'][^"']*\bhero-meta\b[^"']*["'])[^>]*>[\s\S]*?<\/p>/i;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const MONTHS_EN = Object.freeze([
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]);

function normalizeRelativePath(value) {
  return String(value).replaceAll('\\', '/').replace(/^\.\//, '');
}

function getLocaleKey(relativePath) {
  const normalized = normalizeRelativePath(relativePath);
  if (normalized.startsWith('en/')) return 'en';
  if (normalized.startsWith('ko/')) return 'ko';
  if (normalized.startsWith('tw/')) return 'tw';
  return 'ja';
}

function getArticleFiles(rootDir) {
  return ARTICLE_DIRECTORIES.flatMap(directory => {
    const absoluteDirectory = path.join(rootDir, directory);
    if (!fs.existsSync(absoluteDirectory)) return [];
    return fs.readdirSync(absoluteDirectory, { withFileTypes: true })
      .filter(entry => entry.isFile() && entry.name.endsWith('.html') && entry.name !== 'index.html')
      .map(entry => normalizeRelativePath(path.join(directory, entry.name)));
  }).sort();
}

function loadOfficialVerificationRegistry(rootDir) {
  const registryPath = path.join(rootDir, REGISTRY_RELATIVE_PATH);
  if (!fs.existsSync(registryPath)) {
    throw new Error(`公式情報確認日のSSOTがありません: ${REGISTRY_RELATIVE_PATH}`);
  }

  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  if (!registry || Array.isArray(registry) || typeof registry !== 'object') {
    throw new Error(`${REGISTRY_RELATIVE_PATH} は { "article/path.html": "YYYY-MM-DD" } 形式で管理してください。`);
  }

  return registry;
}

function hasArticleType(value) {
  const type = value?.['@type'];
  const values = Array.isArray(type) ? type : [type];
  return values.some(item => ['Article', 'BlogPosting', 'NewsArticle'].includes(item));
}

function collectArticleNodes(value, output = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectArticleNodes(item, output);
    return output;
  }
  if (!value || typeof value !== 'object') return output;

  if (hasArticleType(value)) output.push(value);
  for (const child of Object.values(value)) collectArticleNodes(child, output);
  return output;
}

function extractArticleStructuredData(html) {
  const nodes = [];
  for (const match of String(html).matchAll(JSON_LD_SCRIPT_PATTERN)) {
    let parsed;
    try {
      parsed = JSON.parse(match[1]);
    } catch {
      continue;
    }
    collectArticleNodes(parsed, nodes);
  }
  return nodes[0] || null;
}

function normalizeDate(value, fieldName, relativePath = '') {
  const date = String(value || '').slice(0, 10);
  if (!ISO_DATE_PATTERN.test(date)) {
    const suffix = relativePath ? ` (${relativePath})` : '';
    throw new Error(`${fieldName} は YYYY-MM-DD で指定してください${suffix}: ${value || '(empty)'}`);
  }
  return date;
}

function stripTags(value) {
  return String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&middot;|&#183;/gi, '·')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractReadTime(heroMetaHtml, localeKey) {
  const text = stripTags(heroMetaHtml);
  const patterns = {
    ja: /読了\s*\d+\s*分/,
    en: /\b\d+\s*min(?:ute)?s?\s*read\b/i,
    ko: /(?:약\s*)?\d+\s*분(?:\s*읽기)?/,
    tw: /(?:約\s*)?\d+\s*分鐘/
  };
  return text.match(patterns[localeKey])?.[0] || '';
}

function formatDate(date, localeKey) {
  const [yearText, monthText, dayText] = date.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (localeKey === 'en') return `${MONTHS_EN[month - 1]} ${day}, ${year}`;
  if (localeKey === 'ko') return `${year}년 ${month}월 ${day}일`;
  if (localeKey === 'tw') return `${year}年${month}月${day}日`;
  return `${yearText}/${monthText}/${dayText}`;
}

function renderHeroMeta({ localeKey, publishedAt, modifiedAt, officialVerifiedAt, readTime }) {
  const published = `<time data-article-date="published" datetime="${publishedAt}">${formatDate(publishedAt, localeKey)}</time>`;
  const modified = `<time data-article-date="modified" datetime="${modifiedAt}">${formatDate(modifiedAt, localeKey)}</time>`;
  const verified = `<time data-article-date="official-verified" datetime="${officialVerifiedAt}">${formatDate(officialVerifiedAt, localeKey)}</time>`;

  let content;
  if (localeKey === 'en') {
    content = `Published ${published} · Updated ${modified} · Official info checked ${verified}`;
  } else if (localeKey === 'ko') {
    content = `공개 ${published} · 업데이트 ${modified} · 공식 정보 확인 ${verified}`;
  } else if (localeKey === 'tw') {
    content = `發布 ${published} · 更新 ${modified} · 官方資訊確認 ${verified}`;
  } else {
    content = `公開 ${published} ・ 更新 ${modified} ・ 公式情報確認 ${verified}`;
  }

  if (readTime) {
    content += localeKey === 'ja' ? ` ・ ${readTime}` : ` · ${readTime}`;
  }
  return `<p class="hero-meta">${content}</p>`;
}

function updateTagContentAttribute(tag, value) {
  if (/\bcontent\s*=\s*(["']).*?\1/i.test(tag)) {
    return tag.replace(/\bcontent\s*=\s*(["']).*?\1/i, `content="${value}"`);
  }
  return tag.replace(/\s*\/?\s*>$/, ` content="${value}">`);
}

function setNamedMeta(html, name, value) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`<meta\\b(?=[^>]*\\bname\\s*=\\s*["']${escapedName}["'])[^>]*>`, 'i');
  const match = String(html).match(pattern);
  if (match) return String(html).replace(pattern, updateTagContentAttribute(match[0], value));

  const tag = `  <meta name="${name}" content="${value}">\n`;
  const authorPattern = /<meta\b(?=[^>]*\bname\s*=\s*["']author["'])[^>]*>\s*/i;
  if (authorPattern.test(html)) return String(html).replace(authorPattern, matchText => `${matchText}${tag}`);
  return String(html).replace(/<\/head>/i, `${tag}</head>`);
}

function synchronizeOptionalArticlePropertyMeta(html, propertyName, date) {
  const escapedName = propertyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`<meta\\b(?=[^>]*\\bproperty\\s*=\\s*["']${escapedName}["'])[^>]*>`, 'i');
  const match = String(html).match(pattern);
  if (!match) return String(html);

  const currentContent = match[0].match(/\bcontent\s*=\s*(["'])(.*?)\1/i)?.[2] || '';
  const suffix = /^\d{4}-\d{2}-\d{2}/.test(currentContent) ? currentContent.slice(10) : '';
  return String(html).replace(pattern, updateTagContentAttribute(match[0], `${date}${suffix}`));
}

function synchronizeVisibleOfficialVerificationNote(html, localeKey, officialVerifiedAt) {
  const formatted = formatDate(officialVerifiedAt, localeKey);
  const patterns = {
    ja: /最終公式確認日：\d{4}年\d{1,2}月\d{1,2}日/g,
    en: /(?:Last official(?: source)? check|Official sources checked):?\s*[A-Z][a-z]+\s+\d{1,2},\s+\d{4}/g,
    ko: /(?:공식 정보 최종 확인|공식 정보 확인|공식 확인일)\s*[:：]?\s*\d{4}년\s*\d{1,2}월\s*\d{1,2}일/g,
    tw: /(?:官方資訊最後確認|官方資訊確認|官方確認日)\s*[:：]?\s*\d{4}年\d{1,2}月\d{1,2}日/g
  };
  const replacements = {
    ja: `最終公式確認日：${formatted.replaceAll('/', '').replace(/^(\d{4})(\d{2})(\d{2})$/, '$1年$2月$3日').replace(/年0/g, '年').replace(/月0/g, '月')}`,
    en: `Official sources checked: ${formatted}`,
    ko: `공식 정보 최종 확인: ${formatted}`,
    tw: `官方資訊最後確認：${formatted}`
  };
  return String(html).replace(patterns[localeKey], replacements[localeKey]);
}

function synchronizeArticleDateHtml(html, { relativePath, officialVerifiedAt }) {
  const normalizedPath = normalizeRelativePath(relativePath);
  const localeKey = getLocaleKey(normalizedPath);
  const article = extractArticleStructuredData(html);
  if (!article) throw new Error(`Article構造化データがありません: ${normalizedPath}`);

  const publishedAt = normalizeDate(article.datePublished, 'datePublished', normalizedPath);
  const modifiedAt = normalizeDate(article.dateModified, 'dateModified', normalizedPath);
  const verifiedAt = normalizeDate(officialVerifiedAt, 'officialVerifiedAt', normalizedPath);
  if (publishedAt > modifiedAt) {
    throw new Error(`datePublished が dateModified より後です: ${normalizedPath} (${publishedAt} > ${modifiedAt})`);
  }

  const heroMeta = String(html).match(HERO_META_PATTERN)?.[0];
  if (!heroMeta) throw new Error(`hero-meta がありません: ${normalizedPath}`);
  const readTime = extractReadTime(heroMeta, localeKey);

  let output = String(html);
  output = setNamedMeta(output, 'last-modified', modifiedAt);
  output = setNamedMeta(output, 'playpoint:official-verified', verifiedAt);
  output = synchronizeOptionalArticlePropertyMeta(output, 'article:published_time', publishedAt);
  output = synchronizeOptionalArticlePropertyMeta(output, 'article:modified_time', modifiedAt);
  output = output.replace(HERO_META_PATTERN, renderHeroMeta({
    localeKey,
    publishedAt,
    modifiedAt,
    officialVerifiedAt: verifiedAt,
    readTime
  }));
  output = synchronizeVisibleOfficialVerificationNote(output, localeKey, verifiedAt);

  return {
    html: output,
    changed: output !== String(html),
    publishedAt,
    modifiedAt,
    officialVerifiedAt: verifiedAt,
    localeKey
  };
}

function assertRegistryCoverage(articleFiles, registry) {
  const articleSet = new Set(articleFiles);
  const missing = articleFiles.filter(file => !registry[file]);
  const stale = Object.keys(registry).filter(file => !articleSet.has(normalizeRelativePath(file)));
  if (missing.length || stale.length) {
    const messages = [];
    if (missing.length) messages.push(`公式情報確認日が未登録です:\n${missing.map(file => `- ${file}`).join('\n')}`);
    if (stale.length) messages.push(`削除済み記事の公式情報確認日が残っています:\n${stale.map(file => `- ${file}`).join('\n')}`);
    throw new Error(messages.join('\n'));
  }
}

function syncArticleDateContract(rootDir, { checkOnly = false } = {}) {
  const articleFiles = getArticleFiles(rootDir);
  const registry = loadOfficialVerificationRegistry(rootDir);
  assertRegistryCoverage(articleFiles, registry);

  const summary = {
    checked: articleFiles.length,
    changed: 0,
    changedFiles: []
  };

  for (const relativePath of articleFiles) {
    const absolutePath = path.join(rootDir, relativePath);
    const original = fs.readFileSync(absolutePath, 'utf8');
    const result = synchronizeArticleDateHtml(original, {
      relativePath,
      officialVerifiedAt: registry[relativePath]
    });
    if (!result.changed) continue;

    summary.changed += 1;
    summary.changedFiles.push(relativePath);
    if (!checkOnly) fs.writeFileSync(absolutePath, result.html, 'utf8');
  }

  return summary;
}

function main() {
  const rootArg = process.argv.find(argument => argument.startsWith('--root='));
  const rootDir = rootArg ? path.resolve(rootArg.slice('--root='.length)) : path.resolve(__dirname, '..');
  const checkOnly = process.argv.includes('--check');

  try {
    const summary = syncArticleDateContract(rootDir, { checkOnly });
    console.log(`記事日付契約: ${summary.checked}件確認、${summary.changed}件同期対象`);
    if (checkOnly && summary.changed > 0) {
      for (const file of summary.changedFiles) console.error(`記事日付の同期が必要です: ${file}`);
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

if (require.main === module) main();

module.exports = {
  ARTICLE_DIRECTORIES,
  REGISTRY_RELATIVE_PATH,
  extractArticleStructuredData,
  extractReadTime,
  formatDate,
  getArticleFiles,
  getLocaleKey,
  loadOfficialVerificationRegistry,
  renderHeroMeta,
  syncArticleDateContract,
  synchronizeArticleDateHtml
};
