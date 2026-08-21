#!/usr/bin/env bash
set -euo pipefail

REMOTE_HOST="hajikkoroom@hajikkoroom.xsrv.jp"
REMOTE_ROOT="/home/hajikkoroom/playpoint-sim.com/public_html"
SSH_KEY="$HOME/.ssh/id_ed25519"
SSH_OPTIONS=(
  -p 10022
  -i "$SSH_KEY"
  -o BatchMode=yes
  -o IdentitiesOnly=yes
  -o StrictHostKeyChecking=yes
  -o "UserKnownHostsFile=$HOME/.ssh/known_hosts"
  -o LogLevel=ERROR
  -o ConnectTimeout=15
)
RSYNC_RSH="ssh -p 10022 -i $SSH_KEY -o BatchMode=yes -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile=$HOME/.ssh/known_hosts -o LogLevel=ERROR -o ConnectTimeout=15"

MAX_ATTEMPTS=5

is_transient_network_exit_code() {
  case "$1" in
    # rsync socket/protocol/timeout failures, plus the SSH transport status
    # observed when Xserver port 10022 is temporarily unreachable.
    10|12|30|35|255)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

retry_delay_seconds() {
  local retry_number="$1"
  local max_delay=$((10 * (1 << (retry_number - 1))))
  if [ "$max_delay" -gt 60 ]; then
    max_delay=60
  fi

  # Add bounded jitter while keeping a useful minimum pause. This avoids a
  # fixed retry cadence without turning a transient outage into a long stall.
  local min_delay=$((max_delay / 2))
  if [ "$min_delay" -lt 1 ]; then
    min_delay=1
  fi
  echo $((min_delay + RANDOM % (max_delay - min_delay + 1)))
}

run_with_transient_retry() {
  local label="$1"
  shift
  local attempt=1

  while true; do
    echo "$label (Attempt $attempt/$MAX_ATTEMPTS)..."
    if "$@"; then
      return 0
    else
      local exit_code=$?
    fi

    if ! is_transient_network_exit_code "$exit_code"; then
      echo "$label failed with non-transient exit code $exit_code; failing fast." >&2
      return "$exit_code"
    fi

    if [ "$attempt" -ge "$MAX_ATTEMPTS" ]; then
      echo "$label failed after $MAX_ATTEMPTS attempts (last exit code: $exit_code)." >&2
      return "$exit_code"
    fi

    local delay
    delay="$(retry_delay_seconds "$attempt")"
    echo "$label hit a transient SSH/network failure (exit code $exit_code). Retrying in ${delay}s..."
    sleep "$delay"
    attempt=$((attempt + 1))
  done
}

deploy_once() {
  rsync -avz --delete-after --delete-excluded --delay-updates \
    -e "$RSYNC_RSH" \
    ./ "$REMOTE_HOST:$REMOTE_ROOT/" \
    --exclude '/.git/***' \
    --exclude '/.github/***' \
    --exclude '/.gitignore' \
    --exclude '/.gitattributes' \
    --exclude '/README.md' \
    --exclude '/AGENTS.md' \
    --exclude '/tests/***' \
    --exclude '/docs/***' \
    --exclude '/scripts/***' \
    --exclude '/みんな用URL.txt' \
    --exclude '/CNAME'
}

verify_remote_cleanup_once() {
  # 除外対象や他サイトへ移設済みの旧コンテンツが、Xserver上に残っていないことを直接確認する。
  # URLの301転送だけでは物理ファイルの残存を検知できないため、SSHで実体を検査する。
  ssh "${SSH_OPTIONS[@]}" "$REMOTE_HOST" bash -s -- "$REMOTE_ROOT" <<'REMOTE'
set -euo pipefail
root="$1"

case "$root" in
  /home/hajikkoroom/playpoint-sim.com/public_html)
    ;;
  *)
    echo "Refusing to inspect unexpected deployment root: $root" >&2
    exit 1
    ;;
esac

stale_paths=(
  ".git"
  ".github"
  ".gitignore"
  ".gitattributes"
  "README.md"
  "AGENTS.md"
  "tests"
  "docs"
  "scripts"
  "みんな用URL.txt"
  "CNAME"
  "tools"
  "kindle-tracker"
  "kids-smile-land"
  "doujin-shi-calculator"
  "calculator.html"
  "articles/2026-06-29-savings-game-fire.html"
  "articles/2025-12-25-playpoints-not-reflected.html"
  "articles/ogp/playpoints-not-reflected.png"
  "articles/styles/2025-12-25-movies-books.css"
  "articles/styles/2025-12-25-play-games.css"
  "articles/styles/2025-12-25-subscription.css"
  "articles/styles/2025-12-25-weekly-reward.css"
  "en/articles/google-play-points-reflection-timing.html"
)

remaining=0
for relative_path in "${stale_paths[@]}"; do
  target="$root/$relative_path"
  if [ -e "$target" ] || [ -L "$target" ]; then
    echo "Legacy or non-public server artifact remains: $relative_path" >&2
    remaining=1
  fi
done

if [ "$remaining" -ne 0 ]; then
  exit 1
fi

echo "Legacy and non-public server artifacts are absent."
REMOTE
}

run_with_transient_retry "Deploying via rsync" deploy_once
echo "Deployment succeeded!"
run_with_transient_retry "Verifying remote cleanup" verify_remote_cleanup_once
