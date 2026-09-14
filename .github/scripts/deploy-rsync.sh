#!/usr/bin/env bash
set -euo pipefail

REMOTE_HOST="hajikkoroom@hajikkoroom.xsrv.jp"
REMOTE_ROOT="/home/hajikkoroom/playpoint-sim.com/public_html"
REMOTE_SNAPSHOT_ROOT="/home/hajikkoroom/playpoint-sim.com/.deploy-snapshots"
SNAPSHOT_NAME="previous-verified"
SSH_KEY="$HOME/.ssh/id_ed25519"
DEPLOY_SOURCE_ROOT="${DEPLOY_SOURCE_ROOT:-}"
SSH_OPTIONS=(
  -p 10022
  -i "$SSH_KEY"
  -o BatchMode=yes
  -o IdentitiesOnly=yes
  -o PubkeyAuthentication=yes
  -o PreferredAuthentications=publickey
  -o PasswordAuthentication=no
  -o KbdInteractiveAuthentication=no
  -o ForwardAgent=no
  -o ClearAllForwardings=yes
  -o RequestTTY=no
  -o StrictHostKeyChecking=yes
  -o "UserKnownHostsFile=$HOME/.ssh/known_hosts"
  -o LogLevel=ERROR
  -o ConnectTimeout=15
  -o ServerAliveInterval=15
  -o ServerAliveCountMax=2
)
RSYNC_RSH="ssh -p 10022 -i $SSH_KEY -o BatchMode=yes -o IdentitiesOnly=yes -o PubkeyAuthentication=yes -o PreferredAuthentications=publickey -o PasswordAuthentication=no -o KbdInteractiveAuthentication=no -o ForwardAgent=no -o ClearAllForwardings=yes -o RequestTTY=no -o StrictHostKeyChecking=yes -o UserKnownHostsFile=$HOME/.ssh/known_hosts -o LogLevel=ERROR -o ConnectTimeout=15 -o ServerAliveInterval=15 -o ServerAliveCountMax=2"

DEFAULT_MAX_ATTEMPTS=5
# The full mirror is the only phase that benefits from a longer outage window.
# Snapshot/cleanup/status publication stay at the smaller default so a recovered
# deploy cannot spend the rest of the job retrying secondary operations.
DEPLOY_MAX_ATTEMPTS=7
RSYNC_IO_TIMEOUT_SECONDS=60

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
  local max_attempts="$2"
  shift 2
  local attempt=1

  while true; do
    echo "$label (Attempt $attempt/$max_attempts)..."
    if "$@"; then
      return 0
    else
      local exit_code=$?
    fi

    if ! is_transient_network_exit_code "$exit_code"; then
      echo "$label failed with non-transient exit code $exit_code; failing fast." >&2
      return "$exit_code"
    fi

    if [ "$attempt" -ge "$max_attempts" ]; then
      echo "$label failed after $max_attempts attempts (last exit code: $exit_code)." >&2
      return "$exit_code"
    fi

    local delay
    delay="$(retry_delay_seconds "$attempt")"
    echo "$label hit a transient SSH/network failure (exit code $exit_code). Retrying in ${delay}s..."
    sleep "$delay"
    attempt=$((attempt + 1))
  done
}

resolve_deploy_source_root() {
  if [ -z "$DEPLOY_SOURCE_ROOT" ]; then
    echo "DEPLOY_SOURCE_ROOT is required. Refusing to mirror the repository root directly." >&2
    return 2
  fi
  if [ ! -d "$DEPLOY_SOURCE_ROOT" ]; then
    echo "DEPLOY_SOURCE_ROOT does not exist or is not a directory: $DEPLOY_SOURCE_ROOT" >&2
    return 2
  fi

  local source_root repository_root
  source_root="$(cd "$DEPLOY_SOURCE_ROOT" && pwd -P)"
  repository_root="$(pwd -P)"
  if [ "$source_root" = "/" ] || [ "$source_root" = "$repository_root" ]; then
    echo "Refusing unsafe deployment source root: $source_root" >&2
    return 2
  fi
  printf '%s\n' "$source_root"
}

snapshot_verified_once() {
  ssh "${SSH_OPTIONS[@]}" "$REMOTE_HOST" bash -s -- "$REMOTE_ROOT" "$REMOTE_SNAPSHOT_ROOT" "$SNAPSHOT_NAME" <<'REMOTE'
set -euo pipefail
umask 077
root="$1"
snapshot_root="$2"
snapshot_name="$3"

case "$root" in
  /home/hajikkoroom/playpoint-sim.com/public_html)
    ;;
  *)
    echo "Refusing to snapshot unexpected deployment root: $root" >&2
    exit 2
    ;;
esac
case "$snapshot_root" in
  /home/hajikkoroom/playpoint-sim.com/.deploy-snapshots)
    ;;
  *)
    echo "Refusing unexpected snapshot root: $snapshot_root" >&2
    exit 2
    ;;
esac
if [ "$snapshot_name" != "previous-verified" ]; then
  echo "Refusing unexpected snapshot name: $snapshot_name" >&2
  exit 2
fi

status_file="$root/status/deploy-status.json"
revision_file="$root/status/deploy-revision.txt"
if [ ! -f "$status_file" ] || [ ! -f "$revision_file" ]; then
  echo "Production verification metadata is incomplete; preserving any existing rollback snapshot."
  exit 0
fi

status="$(sed -n 's/^[[:space:]]*"status":[[:space:]]*"\([^"]*\)".*/\1/p' "$status_file" | head -n 1)"
commit="$(sed -n 's/^[[:space:]]*"commit":[[:space:]]*"\([0-9A-Fa-f]*\)".*/\1/p' "$status_file" | head -n 1 | tr '[:upper:]' '[:lower:]')"
revision="$(tr -d '\r\n' < "$revision_file" | tr '[:upper:]' '[:lower:]')"

if [ "$status" != "verified" ]; then
  echo "Current production status is '$status', not verified; preserving any existing rollback snapshot."
  exit 0
fi
if ! [[ "$commit" =~ ^[0-9a-f]{40}$ ]] || ! [[ "$revision" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Verified production metadata contains an invalid revision; refusing to replace rollback snapshot." >&2
  exit 2
fi
if [ "$commit" != "$revision" ]; then
  echo "Verified production metadata disagrees on revision; refusing to replace rollback snapshot." >&2
  exit 2
fi

mkdir -p "$snapshot_root"
chmod 700 "$snapshot_root"
final="$snapshot_root/$snapshot_name"
tmp="$snapshot_root/.${snapshot_name}.tmp.$$"
old="$snapshot_root/.${snapshot_name}.old.$$"
rm -rf "$tmp"
mkdir -p "$tmp/site"
trap 'rm -rf "$tmp"' EXIT

# manner / kanji-slicer are separate projects protected by the production mirror;
# they are intentionally outside PlayPoint rollback ownership as well.
rsync -a --delete \
  --exclude '/manner/***' \
  --exclude '/kanji-slicer/***' \
  "$root/" "$tmp/site/"

if find "$tmp/site" -type l -print -quit | grep -q .; then
  echo "Rollback snapshot contains a symlink; refusing to publish it." >&2
  exit 2
fi
snapshot_revision="$(tr -d '\r\n' < "$tmp/site/status/deploy-revision.txt" | tr '[:upper:]' '[:lower:]')"
snapshot_status="$(sed -n 's/^[[:space:]]*"status":[[:space:]]*"\([^"]*\)".*/\1/p' "$tmp/site/status/deploy-status.json" | head -n 1)"
if [ "$snapshot_revision" != "$commit" ] || [ "$snapshot_status" != "verified" ]; then
  echo "Rollback snapshot failed its verification metadata check." >&2
  exit 2
fi
printf '%s\n' "$commit" > "$tmp/revision.txt"
printf '%s\n' "verified" > "$tmp/status.txt"

had_previous=0
if [ -e "$final" ] || [ -L "$final" ]; then
  mv "$final" "$old"
  had_previous=1
fi
if ! mv "$tmp" "$final"; then
  if [ "$had_previous" -eq 1 ] && { [ -e "$old" ] || [ -L "$old" ]; }; then
    mv "$old" "$final"
  fi
  echo "Failed to publish rollback snapshot; previous snapshot restored when available." >&2
  exit 2
fi
trap - EXIT
if [ "$had_previous" -eq 1 ]; then
  rm -rf "$old"
fi

file_count="$(find "$final/site" -type f | wc -l | tr -d '[:space:]')"
echo "Stored rollback snapshot for verified production $commit ($file_count files)."
REMOTE
}

deploy_once() {
  local source_root
  source_root="$(resolve_deploy_source_root)"

  # The source is already an explicit allowlisted public tree. The excludes are
  # intentionally retained during migration as defense in depth, not as the
  # ownership boundary that decides what is public.
  rsync -avz --delete-after --delete-excluded --delay-updates --timeout="$RSYNC_IO_TIMEOUT_SECONDS" \
    -e "$RSYNC_RSH" \
    --filter='protect /manner/***' \
    --filter='protect /kanji-slicer/***' \
    "$source_root/" "$REMOTE_HOST:$REMOTE_ROOT/" \
    --exclude '/.git/***' \
    --exclude '/.github/***' \
    --exclude '/.gitignore' \
    --exclude '/.gitattributes' \
    --exclude '/.env' \
    --exclude '/.env.*' \
    --exclude '/*.pem' \
    --exclude '/*.key' \
    --exclude '/*.log' \
    --exclude '/*.sql' \
    --exclude '/*.bak' \
    --exclude '/package.json' \
    --exclude '/package-lock.json' \
    --exclude '/pnpm-lock.yaml' \
    --exclude '/yarn.lock' \
    --exclude '/README.md' \
    --exclude '/AGENTS.md' \
    --exclude '/tests/***' \
    --exclude '/docs/***' \
    --exclude '/scripts/***' \
    --exclude '/tools/***' \
    --exclude '/みんな用URL.txt' \
    --exclude '/CNAME'
}

publish_verified_status_once() {
  rsync -avz --timeout="$RSYNC_IO_TIMEOUT_SECONDS" --delay-updates \
    -e "$RSYNC_RSH" \
    status/deploy-revision.txt status/deploy-status.json \
    "$REMOTE_HOST:$REMOTE_ROOT/status/"
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
  "package.json"
  "package-lock.json"
  "pnpm-lock.yaml"
  "yarn.lock"
  "みんな用URL.txt"
  "CNAME"
  "toc_scan_report.txt"
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

# 将来誤って追跡された場合でも、秘密情報に使われやすいルートファイルを公開しない。
sensitive_matches="$(find "$root" -maxdepth 1 -type f \( \
  -name '.env' -o -name '.env.*' -o -name '*.pem' -o -name '*.key' -o \
  -name '*.log' -o -name '*.sql' -o -name '*.bak' \
\) -print 2>/dev/null || true)"
if [ -n "$sensitive_matches" ]; then
  echo "Sensitive root files remain on the public server:" >&2
  printf '%s\n' "$sensitive_matches" >&2
  remaining=1
fi

if [ "$remaining" -ne 0 ]; then
  exit 1
fi

echo "Sensitive or non-public server artifacts are absent."
REMOTE
}

case "${1:-deploy}" in
  deploy)
    run_with_transient_retry "Deploying via rsync" "$DEPLOY_MAX_ATTEMPTS" deploy_once
    echo "Deployment succeeded!"
    run_with_transient_retry "Verifying remote cleanup" "$DEFAULT_MAX_ATTEMPTS" verify_remote_cleanup_once
    ;;
  --snapshot-verified)
    run_with_transient_retry "Snapshotting verified production" "$DEFAULT_MAX_ATTEMPTS" snapshot_verified_once
    ;;
  --publish-status)
    run_with_transient_retry "Publishing verified deployment status" "$DEFAULT_MAX_ATTEMPTS" publish_verified_status_once
    ;;
  *)
    echo "Unknown deploy-rsync mode: $1" >&2
    exit 2
    ;;
esac