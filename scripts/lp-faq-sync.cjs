'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MANUAL_LP_FILES = Object.freeze([
  'status/silver/index.html',
  'status/gold/index.html',
  'status/platinum/index.html',
  'status/diamond/index.html',
  'campaign/2x/index.html',
  'campaign/3x/index.html',
  'campaign/wait/index.html'
]);

const JSON_LD_SCRIPT_PATTERN = /<script\b([^>]*\btype\s*=\s*["']application\/ld\+json["'][^>]*)>([\s\S]*?)<\/script>/gi;
const LP_FAQ_SECTION_PATTERN = /<section\b(?=[^>]*\bclass\s*=\s*["'][^"']*\blp-faq\b[^"']*["'])[^>]*>([\s\S]*?)<\/section>/i;
const DETAILS_PATTERN = /<details\b[^>]*>([\s\S]*?)<\/details>/gi;

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

function cleanVisibleText(value) {
  return decodeHtmlEntities(String(value).replace(/<[^>]*>/g, ' '))
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractVisibleLpFaqPairs(html) {
  const section = String(html).match(LP_FAQ_SECTION_PATTERN)?.[1];
  if (!section) return [];

  const pairs = [];
  for (const match of section.matchAll(DETAILS_PATTERN)) {
    const body = match[1];
    const summary = body.match(/<summary\b[^>]*>([\s\S]*?)<\/summary>/i)?.[1];
    const answer = body.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i)?.[1];
    if (!summary || !answer) continue;

    const question = cleanVisibleText(summary);
    const answerText = cleanVisibleText(answer);
    if (question && answerText) pairs.push({ question, answer: answerText });
  }
  return pairs;
}

function hasType(value, expectedType) {
  const type = value?.['@type'];
  return Array.isArray(type) ? type.includes(expectedType) : type === expectedType;
}

function containsFaqPage(value) {
  if (Array.isArray(value)) return value.some(containsFaqPage);
  if (!value || typeof value !== 'object') return false;
  if (hasType(value, 'FAQPage')) return true;
  return Object.values(value).some(containsFaqPage);
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

function replaceFaqPage(value, pairs, stats) {
  if (Array.isArray(value)) return value.map(item => replaceFaqPage(item, pairs, stats));
  if (!value || typeof value !== 'object') return value;

  if (hasType(value, 'FAQPage')) {
    stats.replaced += 1;
    return {
      ...value,
      mainEntity: buildFaqEntities(pairs)
    };
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [key, replaceFaqPage(child, pairs, stats)])
  );
}

function collectFaqPairs(value, output) {
  if (Array.isArray(value)) {
    value.forEach(item => collectFaqPairs(item, output));
    return;
  }
  if (!value || typeof value !== 'object') return;

  if (hasType(value, 'FAQPage')) {
    const entities = Array.isArray(value.mainEntity) ? value.mainEntity : value.mainEntity ? [value.mainEntity] : [];
    for (const entity of entities) {
      if (!entity || !hasType(entity, 'Question')) continue;
      const answer = Array.isArray(entity.acceptedAnswer) ? entity.acceptedAnswer[0] : entity.acceptedAnswer;
      output.push({
        question: cleanVisibleText(entity.name || ''),
        answer: cleanVisibleText(answer?.text || '')
      });
    }
  }

  Object.values(value).forEach(child => collectFaqPairs(child, output));
}

function stableFaqPairsFromStructuredData(html) {
  const pairs = [];
  for (const match of String(html).matchAll(JSON_LD_SCRIPT_PATTERN)) {
    let data;
    try {
      data = JSON.parse(match[2]);
    } catch {
      continue;
    }
    collectFaqPairs(data, pairs);
  }
  return pairs;
}

function faqPairsEqual(left, right) {
  if (left.length !== right.length) return false;
  return left.every((pair, index) => pair.question === right[index].question && pair.answer === right[index].answer);
}

function synchronizeLpFaqStructuredData(html) {
  const source = String(html);
  const visiblePairs = extractVisibleLpFaqPairs(source);
  if (visiblePairs.length === 0) return { html: source, changed: false, pairCount: 0 };

  const currentPairs = stableFaqPairsFromStructuredData(source);
  if (faqPairsEqual(currentPairs, visiblePairs)) {
    return { html: source, changed: false, pairCount: visiblePairs.length };
  }

  let foundFaqPage = false;
  let updated = source.replace(JSON_LD_SCRIPT_PATTERN, (fullMatch, attributes, jsonText) => {
    let data;
    try {
      data = JSON.parse(jsonText);
    } catch {
      return fullMatch;
    }
    if (!containsFaqPage(data)) return fullMatch;

    foundFaqPage = true;
    const stats = { replaced: 0 };
    const synchronized = replaceFaqPage(data, visiblePairs, stats);
    if (stats.replaced === 0) return fullMatch;
    return `<script${attributes}>\n${JSON.stringify(synchronized, null, 2)}\n</script>`;
  });

  if (!foundFaqPage) {
    const faqSchema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: buildFaqEntities(visiblePairs)
    };
    const script = `<script type="application/ld+json">\n${JSON.stringify(faqSchema, null, 2)}\n</script>\n`;
    updated = updated.replace(/<\/head>/i, `${script}</head>`);
  }

  return {
    html: updated,
    changed: updated !== source,
    pairCount: visiblePairs.length
  };
}

function syncManualLpFaqFiles(rootDir, { checkOnly = false } = {}) {
  const summary = { scanned: 0, changed: 0, changedFiles: [] };

  for (const relativePath of MANUAL_LP_FILES) {
    const absolutePath = path.join(rootDir, relativePath);
    if (!fs.existsSync(absolutePath)) throw new Error(`Manual LP is missing: ${relativePath}`);

    summary.scanned += 1;
    const original = fs.readFileSync(absolutePath, 'utf8');
    const result = synchronizeLpFaqStructuredData(original);
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
  const summary = syncManualLpFaqFiles(rootDir, { checkOnly });

  console.log(`手動LP FAQ同期: ${summary.scanned}件確認、${summary.changed}件更新対象`);
  if (checkOnly && summary.changed > 0) {
    summary.changedFiles.forEach(file => console.error(`FAQPage同期が必要です: ${file}`));
    process.exitCode = 1;
  }
}

if (require.main === module) main();

module.exports = {
  MANUAL_LP_FILES,
  extractVisibleLpFaqPairs,
  stableFaqPairsFromStructuredData,
  synchronizeLpFaqStructuredData,
  syncManualLpFaqFiles
};
