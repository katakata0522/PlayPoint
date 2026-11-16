'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { listPublicHtmlFiles, createRevision } = require('./article-asset-versioning.cjs');

const CORE_SCRIPT = '<script src="/js/analytics-core.js"></script>';
const AD_PRIVACY_SCRIPT = '<script src="/js/ad-url-privacy.js"></script>';
const RUNTIME_SCRIPT_PATTERN = /(^[ \t]*)?(<script\b[^>]*\bsrc=["'][^"']*(?:js\/intent-tracking|blog\/article|blog\/script)\.js(?:\?[^"']*)?["'][^>]*><\/script>)/im;
const CORE_SCRIPT_PATTERN = /<script\b[^>]*\bsrc=["'][^"']*js\/analytics-core\.js(?:\?[^"']*)?["'][^>]*><\/script>/i;
const CORE_RUNTIME_PAIR_PATTERN = /(^[ \t]*)(<script\b[^>]*\bsrc=["'][^"']*js\/analytics-core\.js(?:\?[^"']*)?["'][^>]*><\/script>)\n[ \t]*(<script\b[^>]*\bsrc=["'][^"']*(?:js\/intent-tracking|blog\/article|blog\/script)\.js(?:\?[^"']*)?["'][^>]*><\/script>)/gim;
const MODULE_OWNED_CORE_PATTERN = /<script\b[^>]*\bsrc=["'][^"']*js\/analytics-core\.js(?:\?[^"']*)?["'][^>]*><\/script>\s*(?=<script\b[^>]*\bsrc=["'][^"']*(?:js\/main|js\/points-cost)\.js)/gi;

function ensureAnalyticsCoreScript(html) {
  // タグ除去で前後のHTMLトークンを連結しない。
  const withoutRedundantModuleCore = html.replace(MODULE_OWNED_CORE_PATTERN, '\n');
  const normalized = withoutRedundantModuleCore.replace(
    CORE_RUNTIME_PAIR_PATTERN,
    (match, indentation, coreScript, runtimeScript) => (
      `${indentation}${coreScript}\n${indentation}${runtimeScript}`
    )
  );
  if (CORE_SCRIPT_PATTERN.test(normalized) || !RUNTIME_SCRIPT_PATTERN.test(normalized)) return normalized;
  return normalized.replace(RUNTIME_SCRIPT_PATTERN, (match, indentation = '', script) => (
    `${indentation}${CORE_SCRIPT}\n${indentation}${script}`
  ));
}

function syncAnalyticsRuntimeScripts(rootDir) {
  let updatedFiles = 0;
  const privacyVersion = createRevision(path.join(rootDir, 'js/ad-url-privacy.js'));
  for (const htmlFile of listPublicHtmlFiles(rootDir)) {
    const original = fs.readFileSync(htmlFile, 'utf8');
    const updated = ensureAdPrivacyScript(ensureAnalyticsCoreScript(original), privacyVersion);
    if (updated === original) continue;
    fs.writeFileSync(htmlFile, updated, 'utf8');
    updatedFiles += 1;
  }
  console.log(`[analytics-runtime] synchronized core loader: ${updatedFiles} files`);
  return updatedFiles;
}

function ensureAdPrivacyScript(html, privacyVersion = '') {
  // raw text/RCDATAとコメント内の偽タグを変更しない。
  const tokens = /<!--[\s\S]*?(?:-->|$)|<plaintext\b[^>]*>[\s\S]*|<(script|style|textarea|title|noscript|xmp|iframe|noembed)\b((?:"[^"]*"|'[^']*'|[^'">])*)>[\s\S]*?(?:<\/\1(?=[\s/>])[^>]*>|$)|<([a-z][\w:-]*)\b(?:"[^"]*"|'[^']*'|[^'">])*>/gi;
  const nodes = [...html.matchAll(tokens)];
  const scriptSrc = node => /\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(node[2] || '')?.slice(1).find(value => value !== undefined) || '';
  if (!nodes.some(node => node[1]?.toLowerCase() === 'script'
    && /(?:^|\/)(?:js\/third-party|blog\/(?:components|article)|components)\.js(?:[?#]|$)/i.test(scriptSrc(node)))) return html;
  let without = html;
  for (const node of nodes.slice().reverse()) {
    if (node[1]?.toLowerCase() !== 'script' || !/(?:^|\/)js\/ad-url-privacy\.js(?:[?#]|$)/i.test(scriptSrc(node))) continue;
    const end = node.index + node[0].length;
    const lineStart = without.lastIndexOf('\n', node.index - 1) + 1;
    const wholeLine = /^[ \t]*$/.test(without.slice(lineStart, node.index))
      && /^[ \t]*(?:\r?\n|$)/.test(without.slice(end));
    const trailing = wholeLine ? /^[ \t]*(?:\r?\n|$)/.exec(without.slice(end))[0] : '';
    without = without.slice(0, wholeLine ? lineStart : node.index) + without.slice(end + trailing.length);
  }
  const headNodes = [...without.matchAll(tokens)];
  const insertion = headNodes.find(node => node[3]?.toLowerCase() === 'meta' && /\bcharset\s*=/i.test(node[0]))
    || headNodes.find(node => node[3]?.toLowerCase() === 'head');
  if (!insertion) throw new Error('広告URL保護を挿入するheadがありません。');
  const at = insertion.index + insertion[0].length;
  const existingNewline = /^\r?\n/.exec(without.slice(at))?.[0] || '';
  const newline = existingNewline || /\r?\n/.exec(without)?.[0] || '\n';
  // inline queueを含む全広告入口より先に実行する。async/deferは付けない。
  const script = privacyVersion ? AD_PRIVACY_SCRIPT.replace('.js"', `.js?v=${privacyVersion}"`) : AD_PRIVACY_SCRIPT;
  return without.slice(0, at) + newline + script + newline + without.slice(at + existingNewline.length);
}

module.exports = {
  CORE_SCRIPT,
  AD_PRIVACY_SCRIPT,
  ensureAnalyticsCoreScript,
  ensureAdPrivacyScript,
  syncAnalyticsRuntimeScripts
};
