#!/usr/bin/env bash
set -euo pipefail

case "${1:-}" in
  ""|--performance) ;;
  *) echo "Unknown browser runtime option" >&2; exit 2 ;;
esac
if [ "$#" -gt 1 ]; then exit 2; fi

if [ -z "${GITHUB_ENV:-}" ]; then
  echo "GITHUB_ENV is required; this helper is intended for GitHub Actions browser verification." >&2
  exit 2
fi

# 復旧用の別checkoutではなく、制御側と同じ固定runtimeを一度だけ準備する。
runtime_root="${GITHUB_WORKSPACE:-$(pwd -P)}"
runtime_dir="$runtime_root/.github/ci-runtime"
test -f "$runtime_dir/package-lock.json"
expected_node="$(cat "$runtime_dir/node-version")"
if [ "$(node -p 'process.versions.node')" != "$expected_node" ]; then
  echo "CI Node version differs from .github/ci-runtime/node-version" >&2
  exit 2
fi

# ミラー停止でフォント取得だけが10分以上続いた実例への上限。
# 検査時間・フォント・固定Chromiumは維持し、準備不能は非ゼロで止める。
apt_options=(-o Acquire::Retries=2 -o Acquire::http::Timeout=30 -o Acquire::https::Timeout=30)
timeout --kill-after=10s 120s sudo apt-get "${apt_options[@]}" update -qq
timeout --kill-after=10s 180s sudo apt-get "${apt_options[@]}" install -y --no-install-recommends fonts-noto-cjk
fc-match sans-serif:lang=ja

npm ci --prefix "$runtime_dir" --ignore-scripts --no-audit --no-fund
# Lighthouseの依存は性能jobにだけ導入し、配信・復旧では取得しない。
if [ "${1:-}" = "--performance" ]; then
  npm ci --prefix "$runtime_dir/lighthouse" --ignore-scripts --no-audit --no-fund
fi
node_path="$runtime_dir/node_modules"
# Playwrightのlockに対応するChromiumを使い、runnerのChromeへfallbackしない。
export PLAYWRIGHT_BROWSERS_PATH="${RUNNER_TEMP:?RUNNER_TEMP is required}/playpoint-browsers"
node "$node_path/playwright-core/cli.js" install --with-deps --no-shell chromium
chrome_path="$(NODE_PATH="$node_path" node -p "require('playwright-core').chromium.executablePath()")"
test -x "$chrome_path"
"$chrome_path" --version

printf 'CHROME_PATH=%s\n' "$chrome_path" >> "$GITHUB_ENV"
printf 'NODE_PATH=%s\n' "$node_path" >> "$GITHUB_ENV"
printf 'PLAYWRIGHT_BROWSERS_PATH=%s\n' "$PLAYWRIGHT_BROWSERS_PATH" >> "$GITHUB_ENV"
CHROME_PATH="$chrome_path" NODE_PATH="$node_path" node "$runtime_root/.github/scripts/ci-evidence.cjs" browser
