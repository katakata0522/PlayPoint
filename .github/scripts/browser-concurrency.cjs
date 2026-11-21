'use strict';

// 本番URL検証では公開サーバーへの過剰な同時接続を避けて2並列に抑え、ローカル検証では3並列で高速化する。
function resolveBrowserConcurrency(isRemote = false, env = process.env) {
  const defaultLimit = isRemote ? 2 : 3;
  const raw = Number(env.PLAYPOINT_BROWSER_CONCURRENCY);
  if (!Number.isFinite(raw) || raw < 1) return defaultLimit;
  return Math.min(6, Math.floor(raw));
}

// 進行中のブラウザコンテキストの終了・クリーンアップを待ってから最初の失敗を返す。
async function runWithConcurrency(items, concurrency, taskFn) {
  const list = Array.from(items);
  if (list.length === 0) return;
  const limit = Math.min(Math.max(1, Math.floor(concurrency) || 1), list.length);
  let nextIndex = 0;
  let firstError = null;

  async function worker() {
    while (nextIndex < list.length) {
      if (firstError) return;
      const current = nextIndex;
      nextIndex += 1;
      try {
        await taskFn(list[current], current);
      } catch (error) {
        if (!firstError) firstError = error;
      }
    }
  }

  await Promise.all(Array.from({ length: limit }, () => worker()));
  if (firstError) throw firstError;
}

module.exports = {
  resolveBrowserConcurrency,
  runWithConcurrency,
};
