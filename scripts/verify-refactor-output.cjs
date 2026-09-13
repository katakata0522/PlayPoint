'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { isDirectPublicMirrorPath } = require('../.github/scripts/detect-deploy-impact.cjs');

// 同じ正本から期待値を作らず、変更前後の実際の公開ファイルを比較する。
function publicManifest(root) {
  const entries = {};
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      const relative = path.relative(root, absolute).split(path.sep).join('/');
      if (!isDirectPublicMirrorPath(relative)) continue;
      if (entry.isSymbolicLink()) throw new Error(`公開領域のsymlinkは比較できません: ${relative}`);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile()) {
        entries[relative] = crypto.createHash('sha256').update(fs.readFileSync(absolute)).digest('hex');
      }
    }
  }
  visit(root);
  return Object.fromEntries(Object.entries(entries).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
}

function compareManifests(before, after) {
  return [...new Set([...Object.keys(before), ...Object.keys(after)])].sort()
    .filter(file => before[file] !== after[file])
    .map(file => ({ file, kind: !(file in before) ? 'added' : !(file in after) ? 'removed' : 'changed' }));
}

function fixedBuildEnvironment(root) {
  const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  const date = index.match(/<meta name="last-modified" content="(\d{4}-\d{2}-\d{2})">/)?.[1];
  const version = sw.match(/playpoint-calc-v([0-9_]+)-[a-f0-9]+/)?.[1];
  if (!date || !version) throw new Error('比較基準のコンテンツ日付・アセット版を取得できません。');
  return { PLAYPOINT_MODIFIED_DATE: date, PLAYPOINT_ASSET_VERSION: version };
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, timeout: 120000, ...options });
  if (result.error || result.status !== 0) {
    throw new Error(`${command}の実行に失敗しました: ${result.error?.message || result.stderr || result.stdout || result.signal || result.status}`);
  }
  return result.stdout;
}

function verify({ root, base, evidenceDir }) {
  if (!/^[a-f0-9]{40}$/.test(base || '')) throw new Error('--baseには確認済みの40桁commit SHAが必要です。');
  const candidate = run('git', ['rev-parse', '--verify', 'HEAD'], { cwd: root }).trim();
  if (!/^[a-f0-9]{40}$/.test(candidate)) throw new Error('HEADのSHAが不正です。');
  run('git', ['cat-file', '-e', `${base}^{commit}`], { cwd: root });
  if (evidenceDir) {
    evidenceDir = path.resolve(evidenceDir);
    const relative = path.relative(root, evidenceDir);
    if (!relative || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))) {
      throw new Error('検証証跡はリポジトリ外へ保存してください。');
    }
    fs.mkdirSync(evidenceDir, { recursive: true });
  }
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'playpoint-refactor-'));
  const report = { base, candidate, node: process.version, platform: process.platform, status: 'failed' };
  try {
    for (const [label, sha] of [['base', base], ['candidate', candidate]]) {
      const archive = path.join(temporary, `${label}-source.tar`);
      run('git', ['archive', '--format=tar', `--output=${archive}`, sha], { cwd: root });
      // Git管理下の入力だけを保存する。.git・CIの認証情報・未共有作業は取り込まない。
      if (evidenceDir) fs.copyFileSync(archive, path.join(evidenceDir, `${label}-source.tar`));
      const destination = path.join(temporary, label);
      fs.mkdirSync(destination);
      run('tar', ['-xf', archive, '-C', destination]);
    }
    const baselineRoot = path.join(temporary, 'base');
    const candidateRoot = path.join(temporary, 'candidate');
    report.environment = fixedBuildEnvironment(baselineRoot);
    const env = { ...process.env, ...report.environment };
    function build(label, directory) {
      const started = performance.now();
      const result = spawnSync(process.execPath, ['scripts/build-html.js'], {
        cwd: directory, env, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, timeout: 120000
      });
      if (evidenceDir) fs.writeFileSync(path.join(evidenceDir, `${label}.log`), `${result.stdout || ''}${result.stderr || ''}`);
      if (result.error || result.status !== 0) throw new Error(`${label}のbuild失敗: ${result.error?.message || result.stderr || result.signal || result.status}`);
      report[`${label}Milliseconds`] = Math.round(performance.now() - started);
      return publicManifest(directory);
    }
    const baseline = build('baseline', baselineRoot);
    const first = build('candidate', candidateRoot);
    report.publicFiles = Object.keys(first).length;
    report.differences = compareManifests(baseline, first);
    const second = build('repeat', candidateRoot);
    report.repeatDifferences = compareManifests(first, second);
    if (evidenceDir) {
      fs.writeFileSync(path.join(evidenceDir, 'baseline-manifest.json'), JSON.stringify(baseline, null, 2) + '\n');
      fs.writeFileSync(path.join(evidenceDir, 'candidate-manifest.json'), JSON.stringify(first, null, 2) + '\n');
    }
    if (report.differences.length || report.repeatDifferences.length) {
      throw new Error(`公開出力差分: ${JSON.stringify(report.differences)}\n再build差分: ${JSON.stringify(report.repeatDifferences)}`);
    }
    report.status = 'passed';
    console.log(`新旧buildの公開出力${report.publicFiles}件はバイト一致。再buildの差分も0件です。`);
    return report;
  } catch (error) {
    report.error = error.message;
    throw error;
  } finally {
    if (evidenceDir) fs.writeFileSync(path.join(evidenceDir, 'report.json'), JSON.stringify(report, null, 2) + '\n');
    // 自分で作った一時ディレクトリだけを削除する。作業ツリーは変更しない。
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}

function main() {
  const options = { root: path.resolve(__dirname, '..') };
  for (let index = 2; index < process.argv.length; index += 2) {
    const key = process.argv[index];
    const value = process.argv[index + 1];
    if (!value || !['--base', '--evidence-dir'].includes(key)) throw new Error('使用法: node scripts/verify-refactor-output.cjs --base <SHA> [--evidence-dir <リポジトリ外の保存先>]');
    options[key === '--base' ? 'base' : 'evidenceDir'] = value;
  }
  verify(options);
}

if (require.main === module) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { publicManifest, compareManifests, fixedBuildEnvironment, verify };
