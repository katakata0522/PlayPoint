'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { listPublicHtmlFiles } = require('./article-asset-versioning.cjs');

const CORE_SCRIPT = '<script src="/js/analytics-core.js"></script>';
const RUNTIME_SCRIPT_PATTERN = /(^[ \t]*)?(<script\b[^>]*\bsrc=["'][^"']*(?:js\/intent-tracking|blog\/article|blog\/script)\.js(?:\?[^"']*)?["'][^>]*><\/script>)/im;
const CORE_SCRIPT_PATTERN = /<script\b[^>]*\bsrc=["'][^"']*js\/analytics-core\.js(?:\?[^"']*)?["'][^>]*><\/script>/i;
const CORE_RUNTIME_PAIR_PATTERN = /(^[ \t]*)(<script\b[^>]*\bsrc=["'][^"']*js\/analytics-core\.js(?:\?[^"']*)?["'][^>]*><\/script>)\n[ \t]*(<script\b[^>]*\bsrc=["'][^"']*(?:js\/intent-tracking|blog\/article|blog\/script)\.js(?:\?[^"']*)?["'][^>]*><\/script>)/gim;
const MODULE_OWNED_CORE_PATTERN = /<script\b[^>]*\bsrc=["'][^"']*js\/analytics-core\.js(?:\?[^"']*)?["'][^>]*><\/script>\s*(?=<script\b[^>]*\bsrc=["'][^"']*(?:js\/main|js\/points-cost)\.js)/gi;

function ensureAnalyticsCoreScript(html) {
  const withoutRedundantModuleCore = html.replace(MODULE_OWNED_CORE_PATTERN, '');
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
  for (const htmlFile of listPublicHtmlFiles(rootDir)) {
    const original = fs.readFileSync(htmlFile, 'utf8');
    const updated = ensureAnalyticsCoreScript(original);
    if (updated === original) continue;
    fs.writeFileSync(htmlFile, updated, 'utf8');
    updatedFiles += 1;
  }
  console.log(`[analytics-runtime] synchronized core loader: ${updatedFiles} files`);
  return updatedFiles;
}

module.exports = {
  CORE_SCRIPT,
  ensureAnalyticsCoreScript,
  syncAnalyticsRuntimeScripts
};
