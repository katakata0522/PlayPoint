'use strict';

const fs = require('node:fs');
const path = require('node:path');

const workflowPath = path.join(__dirname, '..', '.github', 'workflows', 'mobile-performance.yml');
let workflow = fs.readFileSync(workflowPath, 'utf8');

const marker = 'Prepare production-like local assets';
if (!workflow.includes(marker)) {
  const target = '      - name: Start local static server\n';
  const replacement = [
    '      - name: Prepare production-like local assets',
    "        if: env.AUDIT_TARGET == 'local'",
    '        run: node .github/scripts/minify.cjs',
    '',
    target.trimEnd()
  ].join('\n') + '\n';
  if (!workflow.includes(target)) {
    throw new Error('Local server step was not found in mobile-performance.yml');
  }
  workflow = workflow.replace(target, replacement);
  fs.writeFileSync(workflowPath, workflow, 'utf8');
  console.log('Performance PR audits now measure production-like minified assets.');
} else {
  console.log('Production-like performance audit step is already present.');
}
