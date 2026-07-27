const fs = require('node:fs');
const path = require('node:path');

const EXCLUDED_DIRECTORIES = new Set([
  '.git',
  '.github',
  'docs',
  'node_modules',
  'public-build',
  'scripts',
  'tests',
]);

function decodeQueryPart(value) {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value;
  }
}

function stripInternalTrackingFromHref(href) {
  const hashIndex = href.indexOf('#');
  const hash = hashIndex >= 0 ? href.slice(hashIndex) : '';
  const withoutHash = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
  const queryIndex = withoutHash.indexOf('?');

  if (queryIndex < 0) {
    return href;
  }

  const target = withoutHash.slice(0, queryIndex);
  const query = withoutHash.slice(queryIndex + 1);
  const separator = query.includes('&amp;') ? '&amp;' : '&';
  const parts = query.split(/&amp;|&/);
  const values = new Map();

  for (const part of parts) {
    const equalsIndex = part.indexOf('=');
    const key = decodeQueryPart(equalsIndex >= 0 ? part.slice(0, equalsIndex) : part);
    const value = decodeQueryPart(equalsIndex >= 0 ? part.slice(equalsIndex + 1) : '');
    values.set(key, value);
  }

  if (values.get('utm_medium') !== 'internal') {
    return href;
  }

  const filtered = parts.filter((part) => {
    const equalsIndex = part.indexOf('=');
    const key = decodeQueryPart(equalsIndex >= 0 ? part.slice(0, equalsIndex) : part);
    return !['utm_source', 'utm_medium', 'utm_campaign'].includes(key);
  });

  return `${target}${filtered.length ? `?${filtered.join(separator)}` : ''}${hash}`;
}

function stripInternalTrackingFromHtml(html) {
  return html.replace(/href=(["'])(.*?)\1/gi, (match, quote, href) => {
    const cleaned = stripInternalTrackingFromHref(href);
    return cleaned === href ? match : `href=${quote}${cleaned}${quote}`;
  });
}

function walkHtmlFiles(rootDirectory) {
  const files = [];

  for (const entry of fs.readdirSync(rootDirectory, { withFileTypes: true })) {
    if (entry.isDirectory() && EXCLUDED_DIRECTORIES.has(entry.name)) {
      continue;
    }

    const absolutePath = path.join(rootDirectory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkHtmlFiles(absolutePath));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      files.push(absolutePath);
    }
  }

  return files;
}

function sanitizeInternalLinks(rootDirectory) {
  let updatedFiles = 0;

  for (const filePath of walkHtmlFiles(rootDirectory)) {
    const before = fs.readFileSync(filePath, 'utf8');
    const after = stripInternalTrackingFromHtml(before);

    if (after !== before) {
      fs.writeFileSync(filePath, after);
      updatedFiles += 1;
    }
  }

  return updatedFiles;
}

if (require.main === module) {
  const rootDirectory = path.resolve(__dirname, '..');
  const updatedFiles = sanitizeInternalLinks(rootDirectory);
  console.log(`[internal-link-attribution] sanitized ${updatedFiles} HTML file(s)`);
}

module.exports = {
  sanitizeInternalLinks,
  stripInternalTrackingFromHref,
  stripInternalTrackingFromHtml,
};
