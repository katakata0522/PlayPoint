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

MAX_RETRIES=3
RETRY_COUNT=0
SUCCESS=false

until [ "$SUCCESS" = true ] || [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; do
  echo "Deploying via rsync (Attempt $((RETRY_COUNT + 1))/$MAX_RETRIES)..."
  if rsync -avz --delete-after --delete-excluded --delay-updates \
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
    --exclude '/CNAME'; then
    SUCCESS=true
    echo "Deployment succeeded!"
  else
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ "$RETRY_COUNT" -lt "$MAX_RETRIES" ]; then
      echo "Deployment failed due to SSH or network error. Waiting 10 seconds before retrying..."
      sleep 10
    else
      echo "Deployment failed after $MAX_RETRIES attempts."
      exit 1
    fi
  fi
done

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
