'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ARTICLE_DIRECTORIES = Object.freeze([
  'articles',
  'en/articles',
  'ko/articles',
  'tw/articles'
]);

const JSON_LD_SCRIPT_PATTERN = /<script\b([^>]*\btype\s*=\s*["']application\/ld\+json["'][^>]*)>([\s\S]*?)<\/script>/gi;
const ROBOTS_META_PATTERN = /<meta\b([^>]*\bname\s*=\s*["']robots["'][^>]*)>/i;
const FAQ_ITEM_PATTERN = /<div\b(?=[^>]*\bclass\s*=\s*["'][^"']*\bfaq-item\b[^"']*["'])[^>]*>([\s\S]*?)<\/div>/gi;

function decodeHtmlEntities(value) {
  return String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function stripHtml(value) {
  return decodeHtmlEntities(String(value).replace(/<[^>]*>/g, ' '));
}

function cleanVisibleText(value) {
  return stripHtml(value)
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeComparableText(value) {
  return cleanVisibleText(value).toLowerCase();
}

function removeFaqLabel(value, label) {
  return String(value)
    .replace(new RegExp(`^${label}\\s*[.．:：]\\s*`, 'i'), '')
    .trim();
}

function getVisibleText(html) {
  return normalizeComparableText(
    String(html)
      .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
      .replace(/<!--([\s\S]*?)-->/g, ' ')
  );
}

function extractVisibleFaqPairs(html) {
  const pairs = [];
  for (const match of String(html).matchAll(FAQ_ITEM_PATTERN)) {
    const questionMatch = match[1].match(/<h[2-6]\b[^>]*>([\s\S]*?)<\/h[2-6]>/i);
    const answerMatch = match[1].match(/<p\b[^>]*>([\s\S]*?)<\/p>/i);
    if (!questionMatch || !answerMatch) continue;

    const question = removeFaqLabel(cleanVisibleText(questionMatch[1]), 'Q');
    const answer = removeFaqLabel(cleanVisibleText(answerMatch[1]), 'A');
    if (question && answer) pairs.push({ question, answer });
  }
  return pairs;
}

function hasType(value, expectedType) {
  const type = value?.['@type'];
  return Array.isArray(type) ? type.includes(expectedType) : type === expectedType;
}

function collectFaqPages(value, output = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectFaqPages(item, output);
    return output;
  }
  if (!value || typeof value !== 'object') return output;

  if (hasType(value, 'FAQPage')) output.push(value);
  for (const child of Object.values(value)) collectFaqPages(child, output);
  return output;
}

function getFaqPairs(faqPage) {
  const entities = Array.isArray(faqPage.mainEntity)
    ? faqPage.mainEntity
    : faqPage.mainEntity
      ? [faqPage.mainEntity]
      : [];

  return entities
    .filter(entity => entity && typeof entity === 'object' && hasType(entity, 'Question'))
    .map(entity => {
      const acceptedAnswer = Array.isArray(entity.acceptedAnswer)
        ? entity.acceptedAnswer[0]
        : entity.acceptedAnswer;
      return {
        question: entity.name || '',
        answer: acceptedAnswer?.text || ''
      };
    });
}

function faqPairsMatch(left, right) {
  if (left.length !== right.length) return false;
  return left.every((pair, index) =>
    normalizeComparableText(pair.question) === normalizeComparableText(right[index].question) &&
    normalizeComparableText(pair.answer) === normalizeComparableText(right[index].answer)
  );
}

function findHiddenFaqItems(html) {
  const visibleText = getVisibleText(html);
  const hiddenItems = [];

  for (const match of String(html).matchAll(JSON_LD_SCRIPT_PATTERN)) {
    let data;
    try {
      data = JSON.parse(match[2]);
    } catch {
      continue;
    }

    for (const faqPage of collectFaqPages(data)) {
      for (const pair of getFaqPairs(faqPage)) {
        const normalizedQuestion = normalizeComparableText(pair.question);
        const normalizedAnswer = normalizeComparableText(pair.answer);
        if (!normalizedQuestion || !normalizedAnswer) {
          hiddenItems.push(pair);
          continue;
        }
        if (!visibleText.includes(normalizedQuestion) || !visibleText.includes(normalizedAnswer)) {
          hiddenItems.push(pair);
        }
      }
    }
  }

  return hiddenItems;
}

function buildFaqEntities(pairs) {
  return pairs.map(pair => ({
    '@type': 'Question',
    name: pair.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: pair.answer
    }
  }));
}

function synchronizeFaqNodes(value, visiblePairs, stats) {
  if (Array.isArray(value)) {
    return value
      .map(item => synchronizeFaqNodes(item, visiblePairs, stats))
      .filter(item => item !== null && item !== undefined);
  }
  if (!value || typeof value !== 'object') return value;

  if (hasType(value, 'FAQPage')) {
    if (visiblePairs.length === 0) {
      stats.removed += 1;
      return null;
    }
    if (faqPairsMatch(getFaqPairs(value), visiblePairs)) return value;
    stats.synchronized += 1;
    return {
      ...value,
      mainEntity: buildFaqEntities(visiblePairs)
    };
  }

  const output = {};
  for (const [key, child] of Object.entries(value)) {
    const normalizedChild = synchronizeFaqNodes(child, visiblePairs, stats);
    if (normalizedChild === null || normalizedChild === undefined) continue;
    if (Array.isArray(normalizedChild) && normalizedChild.length === 0) continue;
    output[key] = normalizedChild;
  }
  return output;
}

function isEmptyStructuredData(value) {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value !== 'object') return false;
  const meaningfulKeys = Object.keys(value).filter(key => key !== '@context');
  return meaningfulKeys.length === 0;
}

function synchronizeFaqStructuredData(html) {
  const visiblePairs = extractVisibleFaqPairs(html);
  const stats = { removed: 0, synchronized: 0 };

  const updatedHtml = String(html).replace(JSON_LD_SCRIPT_PATTERN, (fullMatch, attributes, jsonText) => {
    let data;
    try {
      data = JSON.parse(jsonText);
    } catch {
      return fullMatch;
    }

    if (collectFaqPages(data).length === 0) return fullMatch;
    const before = stats.removed + stats.synchronized;
    const cleaned = synchronizeFaqNodes(data, visiblePairs, stats);
    if (stats.removed + stats.synchronized === before) return fullMatch;
    if (isEmptyStructuredData(cleaned)) return '';
    return `<script${attributes}>\n${JSON.stringify(cleaned, null, 2)}\n</script>`;
  });

  return {
    html: updatedHtml,
    changed: stats.removed > 0 || stats.synchronized > 0,
    removedFaqPageCount: stats.removed,
    synchronizedFaqPageCount: stats.synchronized
  };
}

function updateRobotsContent(content) {
  const directives = String(content)
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
    .filter(value => !/^max-image-preview\s*:/i.test(value));
  directives.push('max-image-preview:large');
  return directives.join(', ');
}

function ensureLargeImagePreview(html) {
  const source = String(html);
  const robotsMatch = source.match(ROBOTS_META_PATTERN);
  if (!robotsMatch) {
    const tag = '    <meta name="robots" content="index, follow, max-image-preview:large">\n';
    const updatedHtml = source.replace(/<\/head>/i, `${tag}</head>`);
    return {
      html: updatedHtml,
      changed: updatedHtml !== source
    };
  }

  const fullTag = robotsMatch[0];
  const contentMatch = fullTag.match(/\bcontent\s*=\s*(["'])(.*?)\1/i);
  const currentContent = contentMatch?.[2] || '';
  const nextContent = updateRobotsContent(currentContent);
  if (currentContent === nextContent) return { html: source, changed: false };

  const nextTag = contentMatch
    ? fullTag.replace(contentMatch[0], `content=${contentMatch[1]}${nextContent}${contentMatch[1]}`)
    : fullTag.replace(/>$/, ` content="${nextContent}">`);
  return {
    html: source.replace(fullTag, nextTag),
    changed: true
  };
}

function hasLargeImagePreview(html) {
  const match = String(html).match(ROBOTS_META_PATTERN);
  if (!match) return false;
  const content = match[0].match(/\bcontent\s*=\s*(["'])(.*?)\1/i)?.[2] || '';
  return /(?:^|,)\s*max-image-preview\s*:\s*large\s*(?:,|$)/i.test(content);
}

function normalizeArticleHtml(html) {
  const faqResult = synchronizeFaqStructuredData(html);
  const robotsResult = ensureLargeImagePreview(faqResult.html);
  return {
    html: robotsResult.html,
    changed: faqResult.changed || robotsResult.changed,
    removedFaqPageCount: faqResult.removedFaqPageCount,
    synchronizedFaqPageCount: faqResult.synchronizedFaqPageCount,
    addedLargeImagePreview: robotsResult.changed
  };
}

function getArticleFiles(rootDir) {
  return ARTICLE_DIRECTORIES.flatMap(directory => {
    const absoluteDirectory = path.join(rootDir, directory);
    if (!fs.existsSync(absoluteDirectory)) return [];
    return fs.readdirSync(absoluteDirectory, { withFileTypes: true })
      .filter(entry => entry.isFile() && entry.name.endsWith('.html'))
      .map(entry => path.join(directory, entry.name));
  });
}

function normalizeArticleFiles(rootDir, { checkOnly = false } = {}) {
  const summary = {
    scanned: 0,
    changed: 0,
    faqPagesRemoved: 0,
    faqPagesSynchronized: 0,
    largePreviewUpdated: 0,
    changedFiles: []
  };

  for (const relativePath of getArticleFiles(rootDir)) {
    summary.scanned += 1;
    const absolutePath = path.join(rootDir, relativePath);
    const original = fs.readFileSync(absolutePath, 'utf8');
    const result = normalizeArticleHtml(original);
    if (!result.changed) continue;

    summary.changed += 1;
    summary.changedFiles.push(relativePath.replaceAll('\\', '/'));
    summary.faqPagesRemoved += result.removedFaqPageCount;
    summary.faqPagesSynchronized += result.synchronizedFaqPageCount;
    if (result.addedLargeImagePreview) summary.largePreviewUpdated += 1;
    if (!checkOnly) fs.writeFileSync(absolutePath, result.html, 'utf8');
  }

  return summary;
}

function main() {
  const rootArg = process.argv.find(argument => argument.startsWith('--root='));
  const rootDir = rootArg ? path.resolve(rootArg.slice('--root='.length)) : path.resolve(__dirname, '..');
  const checkOnly = process.argv.includes('--check');
  const summary = normalizeArticleFiles(rootDir, { checkOnly });

  console.log(`記事SEO正規化: ${summary.scanned}件確認、${summary.changed}件更新対象`);
  console.log(`- FAQPage本文同期: ${summary.faqPagesSynchronized}件`);
  console.log(`- 可視FAQなしのFAQPage除去: ${summary.faqPagesRemoved}件`);
  console.log(`- max-image-preview:large更新: ${summary.largePreviewUpdated}件`);

  if (checkOnly && summary.changed > 0) {
    summary.changedFiles.forEach(file => console.error(`SEO正規化が必要です: ${file}`));
    process.exitCode = 1;
  }
}

if (require.main === module) main();

module.exports = {
  ARTICLE_DIRECTORIES,
  collectFaqPages,
  ensureLargeImagePreview,
  extractVisibleFaqPairs,
  findHiddenFaqItems,
  getArticleFiles,
  hasLargeImagePreview,
  normalizeArticleFiles,
  normalizeArticleHtml,
  normalizeComparableText,
  synchronizeFaqStructuredData
};
