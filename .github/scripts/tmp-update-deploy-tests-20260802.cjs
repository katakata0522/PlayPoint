const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');

function replaceExact(file, before, after) {
  const filePath = path.join(root, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const occurrences = content.split(before).length - 1;
  if (occurrences !== 1) {
    throw new Error(`${file}: expected exactly one replacement target, found ${occurrences}`);
  }
  fs.writeFileSync(filePath, content.replace(before, after), 'utf8');
  console.log(`updated ${file}`);
}

replaceExact(
  'tests/playpoint-regression.test.cjs',
`test('デプロイ同期は削除済みファイルを本番からも消す', () => {
  const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'deploy.yml'), 'utf8');

  assert.ok(workflow.includes('rsync -avz --delete'));
});

test('テストファイルは本番へ同期しない', () => {
  const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'deploy.yml'), 'utf8');

  assert.ok(workflow.includes("--exclude 'tests*'"));
});`,
`test('デプロイ同期は削除済み・除外済みファイルを本番からも消す', () => {
  const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'deploy.yml'), 'utf8');
  const deployScript = fs.readFileSync(path.join(root, '.github', 'scripts', 'deploy-rsync.sh'), 'utf8');

  assert.ok(workflow.includes('bash .github/scripts/deploy-rsync.sh'));
  assert.ok(deployScript.includes('--delete-after --delete-excluded --delay-updates'));
});

test('テストファイルはルート限定の除外で本番へ同期しない', () => {
  const deployScript = fs.readFileSync(path.join(root, '.github', 'scripts', 'deploy-rsync.sh'), 'utf8');

  assert.ok(deployScript.includes("--exclude '/tests/***'"));
  assert.ok(!deployScript.includes("--exclude 'tests*'"));
});`
);

replaceExact(
  'tests/playpoint-nine-fixes.test.cjs',
`test('デプロイ同期は公開不要な運用ファイルを除外する', () => {
  const workflow = read('.github/workflows/deploy.yml');

  for (const pattern of [
    "--exclude 'docs*'",
    "--exclude 'scripts*'",
    "--exclude 'みんな用URL.txt'",
    "--exclude 'CNAME'"
  ]) {
    assert.ok(workflow.includes(pattern), \`rsync除外が不足しています: \${pattern}\`);
  }
});`,
`test('デプロイ同期は公開不要な運用ファイルをルート限定で除外する', () => {
  const workflow = read('.github/workflows/deploy.yml');
  const deployScript = read('.github/scripts/deploy-rsync.sh');

  assert.ok(workflow.includes('bash .github/scripts/deploy-rsync.sh'), '専用デプロイスクリプトを実行していません');
  for (const pattern of [
    "--exclude '/docs/***'",
    "--exclude '/scripts/***'",
    "--exclude '/みんな用URL.txt'",
    "--exclude '/CNAME'"
  ]) {
    assert.ok(deployScript.includes(pattern), \`rsync除外が不足しています: \${pattern}\`);
  }
  for (const unsafePattern of [
    "--exclude 'docs*'",
    "--exclude 'scripts*'"
  ]) {
    assert.ok(!deployScript.includes(unsafePattern), \`全階層へ広がる除外が残っています: \${unsafePattern}\`);
  }
});`
);

replaceExact(
  'tests/playpoint-nine-fixes.test.cjs',
`test('CIデプロイはコミット済み成果物だけを公開する', () => {
  const workflow = read('.github/workflows/deploy.yml');
  const preflight = read('.github/scripts/preflight.cjs');
  const verifier = read('.github/scripts/verify-build-output.cjs');
  const deployIndex = workflow.indexOf('Deploy via rsync');
  assert.ok(deployIndex >= 0, 'rsyncデプロイ処理がありません');
  const beforeDeploy = workflow.slice(0, deployIndex);

  assert.ok(!beforeDeploy.includes('node scripts/build-html.js'), 'CI上で未コミット生成物を作ってから本番公開しています');
  assert.ok(beforeDeploy.includes('node .github/scripts/preflight.cjs --prepare-deploy'), '一括検証を通さずにデプロイしています');
  assert.ok(preflight.includes("runPhase('生成物の再現性検証'"), '一括検証に生成物の整合性検証がありません');
  assert.ok(verifier.includes("'git', ['diff', '--exit-code', '--', ...generatedFiles]"), '生成物の未コミット差分を対象ファイル単位で検出していません');
});`,
`test('CIデプロイはコミット済み成果物だけを公開する', () => {
  const workflow = read('.github/workflows/deploy.yml');
  const deployScript = read('.github/scripts/deploy-rsync.sh');
  const preflight = read('.github/scripts/preflight.cjs');
  const verifier = read('.github/scripts/verify-build-output.cjs');
  const deployIndex = workflow.indexOf('Deploy strict public mirror via rsync');
  assert.ok(deployIndex >= 0, 'rsyncデプロイ処理がありません');
  const beforeDeploy = workflow.slice(0, deployIndex);

  assert.ok(!beforeDeploy.includes('node scripts/build-html.js'), 'CI上で未コミット生成物を作ってから本番公開しています');
  assert.ok(beforeDeploy.includes('node .github/scripts/preflight.cjs --prepare-deploy'), '一括検証を通さずにデプロイしています');
  assert.ok(deployScript.includes('rsync -avz --delete-after --delete-excluded'), '厳密ミラーのrsync処理がありません');
  assert.ok(preflight.includes("runPhase('生成物の再現性検証'"), '一括検証に生成物の整合性検証がありません');
  assert.ok(verifier.includes("'git', ['diff', '--exit-code', '--', ...generatedFiles]"), '生成物の未コミット差分を対象ファイル単位で検出していません');
});`
);
