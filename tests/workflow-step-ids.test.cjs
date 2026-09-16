'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

// A focused structural guard for block-style Actions steps, not a general YAML parser.
// Do not scan shell/heredoc bodies or require particular names, wording, or step order.
function checkStepIds(source) {
  let scope = null;
  let step = null;
  let scalarIndent = null;
  const errors = [];
  const scopes = [];
  const property = /^(?:"([^"]+)"|'([^']+)'|([A-Za-z_][\w-]*))\s*:\s*(.*)$/;
  function readProperty(text, line) {
    const match = text.match(property);
    if (!match) return;
    const key = match[1] || match[2] || match[3];
    const value = match[4];
    if (step.keys.has(key)) errors.push(`line ${line}: duplicate step key ${key}`);
    step.keys.add(key);
    if (key !== 'id') return;
    const id = value.replace(/\s+#.*$/, '').trim().replace(/^(['"])(.*)\1$/, '$2');
    if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(id)) errors.push(`line ${line}: invalid step id ${id}`);
    if (scope.ids.has(id)) errors.push(`line ${line}: duplicate step id ${id}`);
    scope.ids.add(id);
  }
  source.split(/\r?\n/).forEach((line, index) => {
    if (!line.trim() || /^\s*#/.test(line)) return;
    const indent = line.match(/^ */)[0].length;
    if (scalarIndent !== null) {
      if (indent > scalarIndent) return;
      scalarIndent = null;
    }
    const text = line.trimStart();
    if (/^steps:\s*(?:#.*)?$/.test(text)) {
      scope = { indent, itemIndent: null, ids: new Set(), count: 0 };
      scopes.push(scope);
      step = null;
      return;
    }
    if (scope && (indent < scope.indent || (indent === scope.indent && !text.startsWith('- ')))) {
      scope = null;
      step = null;
    }
    if (scope) {
      if (scope.itemIndent === null && text.startsWith('- ')) scope.itemIndent = indent;
      if (indent === scope.itemIndent && text.startsWith('- ')) {
        step = { indent: indent + 2, keys: new Set() };
        scope.count += 1;
        readProperty(text.slice(2), index + 1);
      } else if (step && indent === step.indent) {
        readProperty(text, index + 1);
      }
    }
    // The scalar belongs to the mapping key, including keys on a sequence-item line.
    if (/^(?:-\s+)?(?:[\w-]+|"[^"]+"|'[^']+'):\s*[|>][1-9+-]*\s*(?:#.*)?$/.test(text)) {
      scalarIndent = indent + (text.startsWith('- ') ? 2 : 0);
    }
  });
  return { errors, stepCount: scopes.reduce((sum, scope) => sum + scope.count, 0) };
}

const workflow = body => `name: Fixture\non:\n  workflow_dispatch:\njobs:\n  first:\n    runs-on: ubuntu-24.04\n    steps:\n${body}\n`;

test('duplicate id mapping keys fail even when an if key separates them', () => {
  const result = checkStepIds(workflow('      - name: Snapshot\n        id: generated_name\n        if: inputs.operation == \'restore\'\n        id: snapshot\n        run: echo ok'));
  assert.ok(result.errors.some(error => error.includes('duplicate step key id')));
});

test('duplicate id values in separate steps fail within one job', () => {
  const result = checkStepIds(workflow('      - id: same\n        run: echo first\n      - name: Second\n        id: "same"\n        run: echo second'));
  assert.ok(result.errors.some(error => error.includes('duplicate step id same')));
});

test('the same id is allowed in different jobs', () => {
  const source = workflow('      - id: setup\n        run: echo ok') + '  second:\n    steps:\n      - id: setup\n        run: echo ok\n';
  assert.deepEqual(checkStepIds(source), { errors: [], stepCount: 2 });
});

test('nested action inputs and shell heredocs are not step identifiers', () => {
  const source = workflow('      - id: setup\n        with:\n          id: value\n        run: |\n          cat <<EOF\n          id: setup\n          id: setup\n          steps:\n            - id: setup\n          EOF\n      - name: Next\n        id: next\n        run: echo ok');
  assert.deepEqual(checkStepIds(source), { errors: [], stepCount: 2 });
});

test('indentless step sequences and quoted keys remain supported', () => {
  const source = 'jobs:\n  first:\n    steps:\n    - name: First\n      "id": first\n      run: echo ok\n    - id: second\n      run: echo ok\n';
  assert.deepEqual(checkStepIds(source), { errors: [], stepCount: 2 });
});

test('folded scalar content does not create false steps', () => {
  const source = workflow('      - name: >-\n          steps:\n            - id: fake\n        id: real\n        run: echo ok');
  assert.deepEqual(checkStepIds(source), { errors: [], stepCount: 1 });
});

const directory = path.resolve(__dirname, '../.github/workflows');
// Discover all workflows, including manual rollback and workflow_run recovery lanes.
for (const file of fs.readdirSync(directory).filter(file => /\.ya?ml$/.test(file)).sort()) {
  test(`${file}: step metadata keys and ids are unambiguous`, () => {
    const source = fs.readFileSync(path.join(directory, file), 'utf8');
    const result = checkStepIds(source);
    assert.deepEqual(result.errors, [], `${file}: ${result.errors.join('; ')}`);
    if (/^\s+steps:\s*$/m.test(source)) assert.ok(result.stepCount > 0, `${file}: no block-style steps checked`);
  });
}
