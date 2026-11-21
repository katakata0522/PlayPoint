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

timed() {
  local label=$1 started=$SECONDS status=0
  shift
  "$@" || status=$?
  printf '[browser-runtime] %s %ds (exit %d)\n' "$label" "$((SECONDS - started))" "$status"
  return "$status"
}

timed npm npm ci --prefix "$runtime_dir" --ignore-scripts --no-audit --no-fund
# Lighthouseの依存は性能jobにだけ導入し、配信・復旧では取得しない。
if [ "${1:-}" = "--performance" ]; then
  timed lighthouse-npm npm ci --prefix "$runtime_dir/lighthouse" --ignore-scripts --no-audit --no-fund
fi
node_path="$runtime_dir/node_modules"
cli="$node_path/playwright-core/cli.js"

# ubuntu-24.04のブラウザ用に必要な範囲だけ索引を取得する。設定はこのジョブのapt呼び出しに限定する。
sources="$(mktemp --suffix=.list)"
archive_config="$(mktemp)"
trap 'rm -f "$sources" "$archive_config"' EXIT
cat > "$sources" <<'EOF'
deb [arch=amd64 signed-by=/usr/share/keyrings/ubuntu-archive-keyring.gpg] https://archive.ubuntu.com/ubuntu noble main universe
deb [arch=amd64 signed-by=/usr/share/keyrings/ubuntu-archive-keyring.gpg] https://archive.ubuntu.com/ubuntu noble-updates main universe
deb [arch=amd64 signed-by=/usr/share/keyrings/ubuntu-archive-keyring.gpg] https://security.ubuntu.com/ubuntu noble-security main universe
EOF
printf 'Dir::Etc::sourcelist "%s";\nDir::Etc::sourceparts "-";\n' "$sources" > "$archive_config"
chmod 644 "$sources" "$archive_config"
apt_options=(-o Acquire::Retries=1 -o Acquire::http::Timeout=20 -o Acquire::https::Timeout=20
  -o Acquire::Languages=none -o APT::Get::List-Cleanup=false -o APT::Update::Error-Mode=any)

download_packages() {
  local report
  timed "$mirror/index" timeout --kill-after=10s 90s "${apt[@]}" update -qq || return $?
  timed "$mirror/fonts-noto-cjk" timeout --kill-after=10s 120s "${apt[@]}" --download-only install -y --no-install-recommends fonts-noto-cjk || return $?
  browser_packages=()
  # 固定版Playwrightに不足分を問い合わせ、パッケージ名の二重管理とNodeの特権実行を避ける。
  if ! report=$(APT_CONFIG="$config" node "$cli" install-deps --dry-run chromium); then
    printf '%s\n' "$report"
    mapfile -t browser_packages < <(sed -nE 's/^  ([a-z0-9][a-z0-9+.-]*(:[a-z0-9-]+)?)$/\1/p' <<< "$report")
    if [[ ${#browser_packages[@]} == 0 || ${report%%$'\n'*} != "Missing system dependencies (${#browser_packages[@]}):" ]]; then
      echo 'Unexpected Playwright dependency report.' >&2
      return 1
    fi
    timed "$mirror/chromium-os" timeout --kill-after=10s 180s "${apt[@]}" --download-only install -y --no-install-recommends "${browser_packages[@]}" || return $?
  fi
}

for mirror in ubuntu runner; do
  if [[ $mirror == ubuntu ]]; then config=$archive_config; else config=/dev/null; fi
  apt=(sudo "APT_CONFIG=$config" apt-get "${apt_options[@]}")
  if download_packages; then break; else status=$?; fi
  if [[ $mirror == runner ]]; then exit "$status"; fi
  echo 'Ubuntu archive preparation failed; trying the runner sources once.' >&2
done
# 通信の制限時間でdpkgを中断しない。導入後は同じ索引と固定版CLIで全依存をもう一度照合する。
timed "$mirror/install" "${apt[@]}" --no-download install -y --no-install-recommends fonts-noto-cjk "${browser_packages[@]}"
APT_CONFIG="$config" node "$cli" install-deps --dry-run chromium
test "$(dpkg-query -W -f='${Status}' fonts-noto-cjk)" = 'install ok installed'
fc-match sans-serif:lang=ja

# Playwrightのlockに対応するChromiumを使い、runnerのChromeへfallbackしない。
export PLAYWRIGHT_BROWSERS_PATH="${RUNNER_TEMP:?RUNNER_TEMP is required}/playpoint-browsers"
chrome_path="$(NODE_PATH="$node_path" node -p "require('playwright-core').chromium.executablePath()" 2>/dev/null || true)"
if [ -n "$chrome_path" ] && [[ "$chrome_path" == "$PLAYWRIGHT_BROWSERS_PATH/"* ]] && [ -x "$chrome_path" ] && "$chrome_path" --version >/dev/null 2>&1; then
  printf '[browser-runtime] chromium cache hit (%s)\n' "$chrome_path"
else
  timed chromium node "$cli" install --no-shell chromium
  chrome_path="$(NODE_PATH="$node_path" node -p "require('playwright-core').chromium.executablePath()")"
fi
test -x "$chrome_path"
"$chrome_path" --version

printf 'CHROME_PATH=%s\n' "$chrome_path" >> "$GITHUB_ENV"
printf 'NODE_PATH=%s\n' "$node_path" >> "$GITHUB_ENV"
printf 'PLAYWRIGHT_BROWSERS_PATH=%s\n' "$PLAYWRIGHT_BROWSERS_PATH" >> "$GITHUB_ENV"
CHROME_PATH="$chrome_path" NODE_PATH="$node_path" node "$runtime_root/.github/scripts/ci-evidence.cjs" browser
