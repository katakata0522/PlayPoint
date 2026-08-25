'use strict';

const { spawnSync } = require('node:child_process');

function runGit(args, { allowFailure = false, inherit = false, trim = true } = {}) {
  const result = spawnSync('git', args, {
    encoding: 'utf8',
    stdio: inherit ? 'inherit' : ['ignore', 'pipe', 'pipe'],
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0 && !allowFailure) {
    const stderr = (result.stderr || '').trim();
    throw new Error(`git ${args.join(' ')} failed${stderr ? `: ${stderr}` : ''}`);
  }

  return {
    status: result.status,
    stdout: trim ? (result.stdout || '').trim() : (result.stdout || '').replace(/\r?\n$/, ''),
    stderr: (result.stderr || '').trim(),
  };
}

function remoteRefExists(ref) {
  return runGit(['show-ref', '--verify', '--quiet', ref], { allowFailure: true }).status === 0;
}

function detectDefaultBranch() {
  const symbolic = runGit(
    ['symbolic-ref', '--quiet', '--short', 'refs/remotes/origin/HEAD'],
    { allowFailure: true },
  ).stdout;

  if (symbolic.startsWith('origin/')) {
    return symbolic.slice('origin/'.length);
  }

  for (const candidate of ['main', 'master']) {
    if (remoteRefExists(`refs/remotes/origin/${candidate}`)) {
      return candidate;
    }
  }

  throw new Error('origin の既定ブランチを判定できませんでした。origin/HEAD または origin/main / origin/master を確認してください。');
}

function countStatusKinds(porcelain) {
  const counts = { staged: 0, unstaged: 0, untracked: 0 };
  if (!porcelain) return counts;

  for (const line of porcelain.split(/\r?\n/)) {
    if (line.startsWith('??')) {
      counts.untracked += 1;
      continue;
    }
    if (line[0] && line[0] !== ' ') counts.staged += 1;
    if (line[1] && line[1] !== ' ') counts.unstaged += 1;
  }

  return counts;
}

function main() {
  const inside = runGit(['rev-parse', '--is-inside-work-tree'], { allowFailure: true });
  if (inside.status !== 0 || inside.stdout !== 'true') {
    console.error('[ai-sync-preflight] Git working tree の中で実行してください。');
    process.exitCode = 2;
    return;
  }

  const originUrl = runGit(['remote', 'get-url', 'origin'], { allowFailure: true });
  if (originUrl.status !== 0) {
    console.error('[ai-sync-preflight] origin remote が見つかりません。');
    process.exitCode = 2;
    return;
  }

  console.log('[ai-sync-preflight] origin の最新状態を取得します（working tree は変更しません）。');
  const fetchResult = runGit(['fetch', '--prune', 'origin'], { allowFailure: true, inherit: true });
  if (fetchResult.status !== 0) {
    console.error('[ai-sync-preflight] git fetch origin --prune に失敗したため、remote の鮮度を保証できません。編集を始める前に接続/認証を解決してください。');
    process.exitCode = 2;
    return;
  }

  const defaultBranch = detectDefaultBranch();
  const remoteDefault = `origin/${defaultBranch}`;
  const currentBranchResult = runGit(['symbolic-ref', '--quiet', '--short', 'HEAD'], { allowFailure: true });
  const currentBranch = currentBranchResult.status === 0 ? currentBranchResult.stdout : '(detached HEAD)';
  const porcelain = runGit(['status', '--porcelain=v1', '--untracked-files=all'], { trim: false }).stdout;
  const statusCounts = countStatusKinds(porcelain);
  const workingTree = porcelain ? 'dirty' : 'clean';

  const relation = runGit(['rev-list', '--left-right', '--count', `HEAD...${remoteDefault}`]);
  const [aheadText, behindText] = relation.stdout.split(/\s+/);
  const ahead = Number(aheadText || 0);
  const behind = Number(behindText || 0);

  let state;
  let recommendation;

  if (workingTree === 'dirty') {
    state = 'LOCAL_WORK_PRESENT';
    recommendation = '未commitの作業を保護してください。reset --hard / clean / checkoutによる上書きはせず、内容を確認して安全なbranch/commit等へ退避してからremoteと統合してください。';
  } else if (currentBranch === defaultBranch && ahead === 0 && behind === 0) {
    state = 'READY';
    recommendation = 'GitHubの既定ブランチと一致しています。そのまま作業branchを作って開始できます。';
  } else if (currentBranch === defaultBranch && ahead === 0 && behind > 0) {
    state = 'FAST_FORWARD_AVAILABLE';
    recommendation = `working treeはcleanです。git merge --ff-only ${remoteDefault} で安全に最新版へ進めてから作業を開始できます。`;
  } else if (currentBranch === defaultBranch && ahead > 0 && behind === 0) {
    state = 'LOCAL_COMMITS_PRESENT';
    recommendation = 'GitHubにまだ無いlocal commitがあります。消さずに作業branchとして保護し、PRで共有してから既定ブランチを同期してください。';
  } else if (currentBranch === defaultBranch && ahead > 0 && behind > 0) {
    state = 'DIVERGED';
    recommendation = 'localとGitHubの双方に固有commitがあります。どちらも消さず、差分を確認して統合してください。reset --hardやforce pushは行わないでください。';
  } else if (currentBranch === '(detached HEAD)') {
    state = 'DETACHED_HEAD';
    recommendation = 'detached HEADです。作業内容を失わないよう、編集前に意図したbranchへ安全に戻るか新しいbranchで保護してください。';
  } else {
    state = 'FEATURE_BRANCH';
    recommendation = `作業branch上です。未commit変更はありません。${remoteDefault}との差は ahead=${ahead}, behind=${behind} です。現在のタスクを継続するか、別タスクなら最新の既定ブランチから新しいbranchを作ってください。`;
  }

  console.log('');
  console.log('AI_SYNC_PREFLIGHT_V1');
  console.log(`origin=${originUrl.stdout}`);
  console.log(`remote_default=${remoteDefault}`);
  console.log(`current_branch=${currentBranch}`);
  console.log(`working_tree=${workingTree}`);
  console.log(`staged=${statusCounts.staged}`);
  console.log(`unstaged=${statusCounts.unstaged}`);
  console.log(`untracked=${statusCounts.untracked}`);
  console.log(`ahead=${ahead}`);
  console.log(`behind=${behind}`);
  console.log(`state=${state}`);
  console.log(`recommendation=${recommendation}`);
}

try {
  main();
} catch (error) {
  console.error(`[ai-sync-preflight] ${error.message}`);
  process.exitCode = 2;
}
