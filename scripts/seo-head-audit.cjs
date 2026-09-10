'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ORIGIN = 'https://playpoint-sim.com';
const EXCLUDED_DIRECTORIES = new Set(['.git', '.github', 'docs', 'node_modules', 'scripts', 'tests']);
const LOCALE_PREFIXES = new Set(['en', 'ko', 'tw', 'hk', 'in']);
const HTML_TEXT_ENTITIES = Object.freeze({
  '&amp;': '&',
  '&quot;': '"',
  '&#39;': "'",
  '&#x27;': "'",
  '&lt;': '<',
  '&gt;': '>'
});
const HTML_SPACE_CHARS = new Set([' ', '\t', '\n', '\r', '\f']);

function read(relativePath, rootDir) {
  return fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
}

function parseAttributes(tag) {
  const attributes = {};
  const pattern = /([^\s=<>\/]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  for (const match of tag.matchAll(pattern)) {
    attributes[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
  }
  return attributes;
}

function normalizeText(value) {
  return String(value || '')
    .replace(/&(amp|quot|#39|#x27|lt|gt);/gi, entity => HTML_TEXT_ENTITIES[entity.toLowerCase()] || entity)
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTagAttributes(source, tagName) {
  const pattern = new RegExp(`<${tagName}\\b[^>]*>`, 'gi');
  return [...source.matchAll(pattern)].map(match => parseAttributes(match[0]));
}

function extractTitle(head) {
  return [...head.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)]
    .map(match => normalizeText(match[1].replace(/<[^>]+>/g, ' ')));
}

function extractH1(html) {
  return [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)]
    .map(match => normalizeText(match[1].replace(/<[^>]+>/g, ' ')));
}

function findScriptEndTag(source, fromIndex) {
  const lowerSource = source.toLowerCase();
  let cursor = fromIndex;

  while (cursor < source.length) {
    const start = lowerSource.indexOf('</script', cursor);
    if (start === -1) return null;

    const boundary = source[start + 8];
    const validBoundary = boundary === '>' || boundary === '/' || HTML_SPACE_CHARS.has(boundary);
    if (!validBoundary) {
      cursor = start + 8;
      continue;
    }

    const close = source.indexOf('>', start + 8);
    if (close === -1) return null;
    return { start, end: close + 1 };
  }

  return null;
}

function extractJsonLd(head) {
  const results = [];
  const openPattern = /<script\b([^>]*)>/gi;
  let match;

  while ((match = openPattern.exec(head)) !== null) {
    const attributes = parseAttributes(`<script ${match[1]}>`);
    const isJsonLd = (attributes.type || '').toLowerCase() === 'application/ld+json';
    const endTag = findScriptEndTag(head, openPattern.lastIndex);

    if (!endTag) {
      if (isJsonLd) {
        results.push({ raw: '', value: null, error: new Error('script end tag not found') });
      }
      break;
    }

    if (isJsonLd) {
      const raw = head.slice(openPattern.lastIndex, endTag.start).trim();
      try {
        results.push({ raw, value: JSON.parse(raw), error: null });
      } catch (error) {
        results.push({ raw, value: null, error });
      }
    }

    openPattern.lastIndex = endTag.end;
  }

  return results;
}

function collectSchemaTypes(value, output = new Set()) {
  if (Array.isArray(value)) {
    value.forEach(item => collectSchemaTypes(item, output));
    return output;
  }
  if (!value || typeof value !== 'object') return output;
  const type = value['@type'];
  if (Array.isArray(type)) type.forEach(item => output.add(String(item)));
  else if (type) output.add(String(type));
  Object.values(value).forEach(item => collectSchemaTypes(item, output));
  return output;
}

function sitemapFilesFromRobots(rootDir) {
  const robots = read('robots.txt', rootDir);
  return [...robots.matchAll(/^Sitemap:\s+(https:\/\/playpoint-sim\.com\/[^\s]+)$/gmi)]
    .map(match => new URL(match[1]).pathname.replace(/^\//, ''));
}

function sitemapUrls(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map(match => normalizeText(match[1]));
}

function urlToLocalHtml(url) {
  const parsed = new URL(url);
  let pathname = decodeURIComponent(parsed.pathname);
  if (pathname === '/') return 'index.html';
  pathname = pathname.replace(/^\//, '');
  if (pathname.endsWith('/')) return `${pathname}index.html`;
  return pathname;
}

function localeForUrl(url) {
  const segments = new URL(url).pathname.split('/').filter(Boolean);
  return segments.length > 0 && LOCALE_PREFIXES.has(segments[0]) ? segments[0] : 'ja';
}

function relTokens(value) {
  return String(value || '').toLowerCase().split(/\s+/).filter(Boolean);
}

function metaContent(metaTags, attributeName, attributeValue) {
  return metaTags
    .filter(attributes => (attributes[attributeName] || '').toLowerCase() === attributeValue.toLowerCase())
    .map(attributes => normalizeText(attributes.content));
}

function linkHref(linkTags, rel) {
  return linkTags
    .filter(attributes => relTokens(attributes.rel).includes(rel))
    .map(attributes => normalizeText(attributes.href));
}

function createIssue(code, { url = null, file = null, detail = '' } = {}) {
  return { code, url, file, detail };
}

function discoverPublicHtmlFiles(rootDir, currentDir = rootDir) {
  return fs.readdirSync(currentDir, { withFileTypes: true }).flatMap(entry => {
    if (entry.isDirectory() && EXCLUDED_DIRECTORIES.has(entry.name)) return [];
    const absolutePath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) return discoverPublicHtmlFiles(rootDir, absolutePath);
    if (!entry.isFile() || !entry.name.endsWith('.html')) return [];
    return [path.relative(rootDir, absolutePath).replaceAll('\\', '/')];
  });
}

function inspectPage(url, file, html) {
  const errors = [];
  const warnings = [];
  const headMatch = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i);
  if (!headMatch) {
    errors.push(createIssue('head-missing', { url, file }));
    return { url, file, locale: localeForUrl(url), errors, warnings };
  }

  const head = headMatch[1];
  const titles = extractTitle(head).filter(Boolean);
  const metaTags = extractTagAttributes(head, 'meta');
  const linkTags = extractTagAttributes(head, 'link');
  const descriptions = metaContent(metaTags, 'name', 'description').filter(Boolean);
  const canonicals = linkHref(linkTags, 'canonical').filter(Boolean);
  const robotsValues = metaContent(metaTags, 'name', 'robots');
  const h1Values = extractH1(html).filter(Boolean);
  const jsonLd = extractJsonLd(head);
  const schemaTypes = [...jsonLd.reduce((set, entry) => {
    if (entry.value) collectSchemaTypes(entry.value, set);
    return set;
  }, new Set())].sort();
  const htmlTag = html.match(/<html\b[^>]*>/i)?.[0] || '';
  const htmlLang = parseAttributes(htmlTag).lang || '';

  if (titles.length !== 1) {
    errors.push(createIssue('title-count', { url, file, detail: `count=${titles.length}` }));
  }
  if (descriptions.length !== 1) {
    errors.push(createIssue('description-count', { url, file, detail: `count=${descriptions.length}` }));
  }
  if (canonicals.length !== 1) {
    errors.push(createIssue('canonical-count', { url, file, detail: `count=${canonicals.length}` }));
  } else if (canonicals[0] !== url) {
    errors.push(createIssue('canonical-mismatch', { url, file, detail: `canonical=${canonicals[0]}` }));
  }
  if (robotsValues.some(value => /(?:^|,)\s*noindex\b/i.test(value))) {
    errors.push(createIssue('sitemap-page-noindex', { url, file, detail: robotsValues.join(' | ') }));
  }
  if (h1Values.length !== 1) {
    errors.push(createIssue('h1-count', { url, file, detail: `count=${h1Values.length}` }));
  }

  jsonLd.filter(entry => entry.error).forEach(entry => {
    errors.push(createIssue('jsonld-invalid', { url, file, detail: entry.error.message }));
  });
  if (jsonLd.length === 0) {
    warnings.push(createIssue('jsonld-missing', { url, file }));
  }

  const ogTitle = metaContent(metaTags, 'property', 'og:title').filter(Boolean);
  const ogDescription = metaContent(metaTags, 'property', 'og:description').filter(Boolean);
  const ogImage = metaContent(metaTags, 'property', 'og:image').filter(Boolean);
  const ogUrl = metaContent(metaTags, 'property', 'og:url').filter(Boolean);
  const missingOgp = [
    ['og:title', ogTitle],
    ['og:description', ogDescription],
    ['og:image', ogImage],
    ['og:url', ogUrl]
  ].filter(([, values]) => values.length !== 1).map(([name]) => name);
  if (missingOgp.length > 0) {
    warnings.push(createIssue('ogp-incomplete', { url, file, detail: missingOgp.join(', ') }));
  } else if (ogUrl[0] !== url) {
    warnings.push(createIssue('og-url-mismatch', { url, file, detail: `og:url=${ogUrl[0]}` }));
  }

  const alternates = linkTags
    .filter(attributes => relTokens(attributes.rel).includes('alternate') && attributes.hreflang && attributes.href)
    .map(attributes => ({ hreflang: attributes.hreflang, href: normalizeText(attributes.href) }));
  const hreflangCounts = new Map();
  for (const alternate of alternates) {
    hreflangCounts.set(alternate.hreflang, (hreflangCounts.get(alternate.hreflang) || 0) + 1);
  }
  for (const [hreflang, count] of hreflangCounts) {
    if (count > 1) {
      errors.push(createIssue('hreflang-duplicate', { url, file, detail: hreflang + ': count=' + count }));
    }
  }
  if (alternates.length > 0 && !alternates.some(item => item.href === url)) {
    errors.push(createIssue('hreflang-self-missing', { url, file }));
  }
  for (const alternate of alternates) {
    try {
      const parsed = new URL(alternate.href);
      if (parsed.origin !== ORIGIN) {
        warnings.push(createIssue('hreflang-external', { url, file, detail: `${alternate.hreflang}=${alternate.href}` }));
      }
    } catch {
      errors.push(createIssue('hreflang-invalid-url', { url, file, detail: `${alternate.hreflang}=${alternate.href}` }));
    }
  }

  return {
    url,
    file,
    locale: localeForUrl(url),
    htmlLang,
    title: titles[0] || '',
    description: descriptions[0] || '',
    canonical: canonicals[0] || '',
    h1: h1Values[0] || '',
    robots: robotsValues,
    alternates,
    schemaTypes,
    errors,
    warnings
  };
}

function auditSeoHeads(rootDir = path.resolve(__dirname, '..')) {
  const errors = [];
  const warnings = [];
  const sitemapFiles = sitemapFilesFromRobots(rootDir);
  const urlSources = new Map();

  if (sitemapFiles.length === 0) {
    errors.push(createIssue('submitted-sitemap-missing'));
  }

  for (const sitemapFile of sitemapFiles) {
    const absolutePath = path.join(rootDir, sitemapFile);
    if (!fs.existsSync(absolutePath)) {
      errors.push(createIssue('sitemap-file-missing', { file: sitemapFile }));
      continue;
    }
    const urls = sitemapUrls(read(sitemapFile, rootDir));
    if (urls.length === 0) {
      errors.push(createIssue('submitted-sitemap-empty', { file: sitemapFile }));
      continue;
    }
    for (const url of urls) {
      const sources = urlSources.get(url) || [];
      sources.push(sitemapFile);
      urlSources.set(url, sources);
    }
  }

  for (const [url, sources] of urlSources) {
    if (sources.length > 1) {
      errors.push(createIssue('sitemap-duplicate-url', { url, detail: sources.join(', ') }));
    }
  }

  const pages = [];
  for (const url of urlSources.keys()) {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      errors.push(createIssue('sitemap-invalid-url', { url }));
      continue;
    }
    if (parsed.origin !== ORIGIN) {
      errors.push(createIssue('sitemap-external-url', { url }));
      continue;
    }

    const file = urlToLocalHtml(url);
    const absolutePath = path.join(rootDir, file);
    if (!fs.existsSync(absolutePath)) {
      errors.push(createIssue('sitemap-local-file-missing', { url, file }));
      continue;
    }
    const page = inspectPage(url, file, fs.readFileSync(absolutePath, 'utf8'));
    pages.push(page);
    errors.push(...page.errors);
    warnings.push(...page.warnings);
  }

  const pageByUrl = new Map(pages.map(page => [page.url, page]));
  for (const page of pages) {
    for (const alternate of page.alternates) {
      const target = pageByUrl.get(alternate.href);
      if (!target) continue;
      if (!target.alternates.some(item => item.href === page.url)) {
        errors.push(createIssue('hreflang-not-reciprocal', {
          url: page.url,
          file: page.file,
          detail: `${alternate.hreflang} -> ${alternate.href}`
        }));
      }
    }
  }

  for (const field of ['title', 'description']) {
    const groups = new Map();
    for (const page of pages) {
      const value = normalizeText(page[field]);
      if (!value) continue;
      const key = `${page.locale}\n${value}`;
      const urls = groups.get(key) || [];
      urls.push(page.url);
      groups.set(key, urls);
    }
    for (const urls of groups.values()) {
      if (urls.length < 2) continue;
      warnings.push(createIssue(`duplicate-${field}`, { detail: urls.join(' | ') }));
    }
  }

  const sitemapUrlSet = new Set(urlSources.keys());
  for (const file of discoverPublicHtmlFiles(rootDir)) {
    if (pages.some(page => page.file === file)) continue;
    const html = read(file, rootDir);
    const headMatch = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i);
    if (!headMatch) continue;
    const metaTags = extractTagAttributes(headMatch[1], 'meta');
    const linkTags = extractTagAttributes(headMatch[1], 'link');
    const robotsValues = metaContent(metaTags, 'name', 'robots');
    if (robotsValues.some(value => /(?:^|,)\s*noindex\b/i.test(value))) continue;
    const canonicals = linkHref(linkTags, 'canonical').filter(Boolean);
    if (canonicals.length !== 1) continue;
    if (!canonicals[0].startsWith(`${ORIGIN}/`) && canonicals[0] !== `${ORIGIN}/`) continue;
    if (!sitemapUrlSet.has(canonicals[0])) {
      warnings.push(createIssue('indexable-canonical-not-in-submitted-sitemaps', {
        url: canonicals[0],
        file
      }));
    }
  }

  return {
    sitemapFiles,
    submittedUrlCount: urlSources.size,
    auditedPageCount: pages.length,
    pages,
    errors,
    warnings
  };
}

function formatIssue(issue) {
  const location = [issue.file, issue.url].filter(Boolean).join(' | ');
  const suffix = issue.detail ? ` | ${issue.detail}` : '';
  return `[${issue.code}]${location ? ` ${location}` : ''}${suffix}`;
}

function printReport(report) {
  console.log(`SEO Head Audit: sitemap=${report.sitemapFiles.length}, urls=${report.submittedUrlCount}, pages=${report.auditedPageCount}`);
  console.log(`errors=${report.errors.length}, warnings=${report.warnings.length}`);
  if (report.errors.length > 0) {
    console.log('\n[errors]');
    report.errors.forEach(issue => console.log(`- ${formatIssue(issue)}`));
  }
  if (report.warnings.length > 0) {
    console.log('\n[warnings]');
    report.warnings.forEach(issue => console.log(`- ${formatIssue(issue)}`));
  }
}

if (require.main === module) {
  const report = auditSeoHeads();
  printReport(report);
  if (report.errors.length > 0) process.exitCode = 1;
}

module.exports = {
  ORIGIN,
  auditSeoHeads,
  formatIssue,
  inspectPage,
  sitemapFilesFromRobots,
  sitemapUrls,
  urlToLocalHtml
};
