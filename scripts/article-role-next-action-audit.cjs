'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  ROLE_DEFINITIONS,
  classifyArticleRole,
  shouldGenerateGenericCalculatorPrompt
} = require('./article-role-registry.cjs');
const { shouldGenerateIntlArticlePrompt } = require('./intl-article-reading-flow.cjs');

const INTERNATIONAL_LOCALES = Object.freeze(['en', 'ko', 'tw']);
const GENERATED_JA_PROMPT = /data-generated-article-prompt=["']true["']/g;
const GENERATED_INTL_PROMPT = /data-generated-intl-article-prompt=["']true["']/g;
const PRIMARY_CALCULATOR_PROMPT = /<aside\b[^>]*class=["'][^"']*\barticle-calculator-prompt\b[^"']*["'][^>]*>/i;
const RELATED_SECTION_PATTERN = /<section\b[^>]*class=["'][^"']*\b(?:related-links-section|contextual-guide-links|article-related-guides)\b[^"']*["'][^>]*>[\s\S]*?<\/section>/i;

const NEXT_ROLE_HINTS = Object.freeze({
  calculator_bridge: new Set(['decision_support', 'reference', 'retention']),
  decision_support: new Set(['calculator_bridge', 'decision_support', 'reference']),
  troubleshooting: new Set(['troubleshooting', 'reference']),
  retention: new Set(['retention', 'reference']),
  game_decision: new Set(['game_decision', 'decision_support', 'calculator_bridge']),
  reference: new Set(['reference', 'troubleshooting', 'decision_support', 'calculator_bridge', 'retention']),
  hold: new Set()
});

function normalizeArticleHref(relativePath, href) {
  const cleaned = String(href || '').split('#', 1)[0].split('?', 1)[0];
  if (!cleaned) return null;
  if (/^(?:mailto:|tel:|javascript:|https?:\/\/)/i.test(cleaned)) {
    if (!cleaned.startsWith('https://playpoint-sim.com/')) return null;
    return cleaned.slice('https://playpoint-sim.com/'.length);
  }
  if (cleaned.startsWith('/')) return cleaned.slice(1);
  return path.posix.normalize(path.posix.join(path.posix.dirname(relativePath), cleaned));
}

function extractRelatedTargets(relativePath, html) {
  const section = String(html).match(RELATED_SECTION_PATTERN)?.[0];
  if (!section) return [];
  return [...new Set([...section.matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi)]
    .map(match => normalizeArticleHref(relativePath, match[1]))
    .filter(Boolean)
    .filter(target => /(?:^|\/)articles\/[^/]+\.html$/i.test(target)))];
}

function articleCorpus(root) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'blog', 'articles.json'), 'utf8'));
  const records = [];
  const seen = new Set();

  for (const article of manifest) {
    if (!article || typeof article.file !== 'string' || !/^\.\.\/articles\/[^/]+\.html$/.test(article.file)) continue;
    const relativePath = article.file.replace(/^\.\.\//, '');
    if (seen.has(relativePath)) continue;
    seen.add(relativePath);
    records.push({ relativePath, listed: article.listed !== false, locale: 'ja' });
  }

  for (const locale of INTERNATIONAL_LOCALES) {
    const dir = path.join(root, locale, 'articles');
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir).filter(name => name.endsWith('.html') && name !== 'index.html').sort()) {
      const relativePath = path.posix.join(locale, 'articles', file);
      if (seen.has(relativePath)) continue;
      seen.add(relativePath);
      records.push({ relativePath, listed: true, locale });
    }
  }

  return records;
}

function generatedPromptCount(html) {
  return (String(html).match(GENERATED_JA_PROMPT) || []).length
    + (String(html).match(GENERATED_INTL_PROMPT) || []).length;
}

function generatedPromptIsAllowed(record, html, role) {
  if (record.locale === 'ja') {
    return shouldGenerateGenericCalculatorPrompt(record.relativePath, { listed: record.listed });
  }
  return shouldGenerateIntlArticlePrompt(html, record.locale, record.relativePath);
}

function auditArticleRoleNextActions(rootDir = process.cwd()) {
  const root = path.resolve(rootDir);
  const corpus = articleCorpus(root);
  const roleCounts = Object.fromEntries(Object.keys(ROLE_DEFINITIONS).map(role => [role, 0]));
  const generatedPromptCounts = Object.fromEntries(Object.keys(ROLE_DEFINITIONS).map(role => [role, 0]));
  const failures = [];
  const warnings = [];
  const listedByPath = new Map(corpus.map(record => [record.relativePath, record.listed]));

  for (const record of corpus) {
    const absolutePath = path.join(root, record.relativePath);
    if (!fs.existsSync(absolutePath)) {
      failures.push(`${record.relativePath}: 記事ファイルが存在しません`);
      continue;
    }

    const html = fs.readFileSync(absolutePath, 'utf8');
    const role = classifyArticleRole(record.relativePath, { listed: record.listed });
    if (!role) {
      failures.push(`${record.relativePath}: Article Roleを分類できません`);
      continue;
    }
    roleCounts[role] += 1;

    const promptCount = generatedPromptCount(html);
    generatedPromptCounts[role] += promptCount;
    if (promptCount > 1) {
      failures.push(`${record.relativePath}: generated主CTAが${promptCount}個あります`);
    }

    const generatedAllowed = generatedPromptIsAllowed(record, html, role);
    if (promptCount > 0 && !generatedAllowed) {
      failures.push(`${record.relativePath}: ${role}へ汎用計算CTAを自動生成しています`);
    }
    if (generatedAllowed && role === 'calculator_bridge' && !PRIMARY_CALCULATOR_PROMPT.test(html)) {
      failures.push(`${record.relativePath}: calculator_bridgeなのに計算主導線がありません`);
    }
    if (role === 'hold' && promptCount > 0) {
      failures.push(`${record.relativePath}: HOLD記事へgenerated主CTAを出しています`);
    }

    const relatedTargets = extractRelatedTargets(record.relativePath, html);
    if (record.listed && relatedTargets.length === 0) {
      failures.push(`${record.relativePath}: Next Action候補となる関連記事がありません`);
      continue;
    }

    if (!record.listed || role === 'hold') continue;
    const preferredRoles = NEXT_ROLE_HINTS[role];
    if (!preferredRoles || preferredRoles.size === 0 || relatedTargets.length === 0) continue;

    const targetRoles = relatedTargets
      .map(target => classifyArticleRole(target, { listed: listedByPath.get(target) !== false }))
      .filter(Boolean);
    if (targetRoles.length > 0 && !targetRoles.some(targetRole => preferredRoles.has(targetRole))) {
      warnings.push(`${record.relativePath}: ${role}の関連記事が次Job候補Roleへ接続していません（${[...new Set(targetRoles)].join(', ')}）`);
    }
  }

  return {
    articleCount: corpus.length,
    roleCounts,
    generatedPromptCounts,
    failures,
    warnings
  };
}

function printAudit(result) {
  console.log(`Article Role / Next Action Audit: articles=${result.articleCount}`);
  console.log('roles=' + Object.entries(result.roleCounts).map(([role, count]) => `${role}:${count}`).join(', '));
  console.log('generated-prompts=' + Object.entries(result.generatedPromptCounts).map(([role, count]) => `${role}:${count}`).join(', '));
  console.log(`errors=${result.failures.length}, warnings=${result.warnings.length}`);
  result.failures.forEach(problem => console.error('- ERROR: ' + problem));
  result.warnings.forEach(problem => console.warn('- WARN: ' + problem));
}

if (require.main === module) {
  const result = auditArticleRoleNextActions(process.cwd());
  printAudit(result);
  if (result.failures.length > 0) process.exitCode = 1;
}

module.exports = {
  INTERNATIONAL_LOCALES,
  NEXT_ROLE_HINTS,
  articleCorpus,
  auditArticleRoleNextActions,
  extractRelatedTargets,
  generatedPromptCount,
  printAudit
};
