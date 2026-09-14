#!/usr/bin/env bash
set -euo pipefail

PLAYWRIGHT_CORE_VERSION="1.55.0"

if [ -z "${GITHUB_ENV:-}" ]; then
  echo "GITHUB_ENV is required; this helper is intended for GitHub Actions browser verification." >&2
  exit 2
fi

runtime_root="${GITHUB_WORKSPACE:-$(pwd -P)}"
if [ ! -d "$runtime_root" ]; then
  echo "Browser runtime root does not exist: $runtime_root" >&2
  exit 2
fi

sudo apt-get update -qq
sudo apt-get install -y --no-install-recommends fonts-noto-cjk
fc-match sans-serif:lang=ja

(
  cd "$runtime_root"
  npm install --no-save --no-package-lock --ignore-scripts "playwright-core@$PLAYWRIGHT_CORE_VERSION"
)

chrome_path="$(command -v google-chrome || command -v google-chrome-stable || command -v chromium || command -v chromium-browser || true)"
if [ -z "$chrome_path" ] || [ ! -x "$chrome_path" ]; then
  echo "No executable Chrome/Chromium binary is available on the runner." >&2
  exit 2
fi

node_path="$runtime_root/node_modules"
if [ ! -d "$node_path/playwright-core" ]; then
  echo "playwright-core@$PLAYWRIGHT_CORE_VERSION was not installed under $node_path." >&2
  exit 2
fi

printf 'CHROME_PATH=%s\n' "$chrome_path" >> "$GITHUB_ENV"
printf 'NODE_PATH=%s\n' "$node_path" >> "$GITHUB_ENV"

echo "Browser runtime ready: playwright-core@$PLAYWRIGHT_CORE_VERSION, chrome=$chrome_path"
