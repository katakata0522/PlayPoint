#!/usr/bin/env bash
set -euo pipefail

REMOTE_HOST="hajikkoroom@hajikkoroom.xsrv.jp"
REMOTE_ROOT="/home/hajikkoroom/playpoint-sim.com/public_html"
REMOTE_SNAPSHOT_ROOT="/home/hajikkoroom/playpoint-sim.com/.deploy-snapshots"
HISTORY_LIMIT=5
SSH_KEY="$HOME/.ssh/id_ed25519"
PROTECTED_HISTORY_REVISION="${PROTECTED_HISTORY_REVISION:-}"
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

mode="${1:-}"
target_revision="${2:-}"

case "$mode" in
  --archive-live|--list)
    ;;
  --verify|--activate)
    if ! [[ "$target_revision" =~ ^[0-9a-f]{40}$ ]]; then
      echo "$mode requires an exact lowercase 40-character verified revision." >&2
      exit 2
    fi
    ;;
  *)
    echo "Usage: $0 --archive-live | --list | --verify <sha> | --activate <sha>" >&2
    exit 2
    ;;
esac

if [ -n "$PROTECTED_HISTORY_REVISION" ] && ! [[ "$PROTECTED_HISTORY_REVISION" =~ ^[0-9a-f]{40}$ ]]; then
  echo "PROTECTED_HISTORY_REVISION must be an exact lowercase 40-character SHA." >&2
  exit 2
fi

ssh "${SSH_OPTIONS[@]}" "$REMOTE_HOST" bash -s -- \
  "$REMOTE_ROOT" "$REMOTE_SNAPSHOT_ROOT" "$HISTORY_LIMIT" "$mode" "$target_revision" "$PROTECTED_HISTORY_REVISION" <<'REMOTE'
set -euo pipefail
umask 077

root="$1"
snapshot_root="$2"
history_limit="$3"
mode="$4"
target_revision="$5"
protected_revision="$6"
history_root="$snapshot_root/verified-history"
previous_snapshot="$snapshot_root/previous-verified"

[ "$root" = "/home/hajikkoroom/playpoint-sim.com/public_html" ] || {
  echo "Refusing unexpected deployment root: $root" >&2
  exit 2
}
[ "$snapshot_root" = "/home/hajikkoroom/playpoint-sim.com/.deploy-snapshots" ] || {
  echo "Refusing unexpected snapshot root: $snapshot_root" >&2
  exit 2
}
[[ "$history_limit" =~ ^[1-9][0-9]*$ ]] || {
  echo "Snapshot history limit is invalid." >&2
  exit 2
}
if [ -n "$target_revision" ] && ! [[ "$target_revision" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Target history revision is invalid." >&2
  exit 2
fi
if [ -n "$protected_revision" ] && ! [[ "$protected_revision" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Protected history revision is invalid." >&2
  exit 2
fi

validate_snapshot_dir() {
  local snapshot="$1"
  local expected_revision="${2:-}"

  if [ ! -d "$snapshot" ] || [ -L "$snapshot" ] || [ ! -d "$snapshot/site" ] || [ -L "$snapshot/site" ]; then
    echo "Verified history snapshot is missing or has an unsafe directory shape: $snapshot" >&2
    return 2
  fi
  if find "$snapshot" -type l -print -quit | grep -q .; then
    echo "Verified history snapshot contains a symlink: $snapshot" >&2
    return 2
  fi
  for owned_elsewhere in manner kanji-slicer; do
    if [ -e "$snapshot/site/$owned_elsewhere" ] || [ -L "$snapshot/site/$owned_elsewhere" ]; then
      echo "Verified history snapshot contains separately owned path: $owned_elsewhere" >&2
      return 2
    fi
  done

  local revision_file="$snapshot/revision.txt"
  local status_file="$snapshot/status.txt"
  local site_revision_file="$snapshot/site/status/deploy-revision.txt"
  local site_status_file="$snapshot/site/status/deploy-status.json"
  local required
  for required in "$revision_file" "$status_file" "$site_revision_file" "$site_status_file"; do
    if [ ! -f "$required" ] || [ -L "$required" ]; then
      echo "Verified history snapshot metadata is incomplete or unsafe: $required" >&2
      return 2
    fi
  done

  local revision status site_revision site_status site_commit file_count
  revision="$(tr -d '\r\n' < "$revision_file" | tr '[:upper:]' '[:lower:]')"
  status="$(tr -d '\r\n' < "$status_file")"
  site_revision="$(tr -d '\r\n' < "$site_revision_file" | tr '[:upper:]' '[:lower:]')"
  site_status="$(sed -n 's/^[[:space:]]*"status":[[:space:]]*"\([^"]*\)".*/\1/p' "$site_status_file" | head -n 1)"
  site_commit="$(sed -n 's/^[[:space:]]*"commit":[[:space:]]*"\([0-9A-Fa-f]*\)".*/\1/p' "$site_status_file" | head -n 1 | tr '[:upper:]' '[:lower:]')"

  if ! [[ "$revision" =~ ^[0-9a-f]{40}$ ]]; then
    echo "Verified history snapshot revision is invalid: $snapshot" >&2
    return 2
  fi
  if [ -n "$expected_revision" ] && [ "$revision" != "$expected_revision" ]; then
    echo "Verified history snapshot revision mismatch: expected $expected_revision but found $revision." >&2
    return 2
  fi
  if [ "$status" != "verified" ] || [ "$site_status" != "verified" ]; then
    echo "Verified history snapshot is not verified: $revision" >&2
    return 2
  fi
  if [ "$site_revision" != "$revision" ] || [ "$site_commit" != "$revision" ]; then
    echo "Verified history snapshot revision metadata disagrees: $revision" >&2
    return 2
  fi
  file_count="$(find "$snapshot/site" -type f | wc -l | tr -d '[:space:]')"
  if ! [[ "$file_count" =~ ^[0-9]+$ ]] || [ "$file_count" -lt 1 ]; then
    echo "Verified history snapshot has no regular files: $revision" >&2
    return 2
  fi

  printf '%s\n' "$revision"
}

revision_is_kept() {
  local candidate="$1"
  local item
  for item in "${keep_revisions[@]:-}"; do
    [ "$candidate" = "$item" ] && return 0
  done
  return 1
}

archive_live_verified() {
  local status_file="$root/status/deploy-status.json"
  local revision_file="$root/status/deploy-revision.txt"
  if [ ! -f "$status_file" ] || [ ! -f "$revision_file" ]; then
    echo "Production verification metadata is incomplete; refusing history archive." >&2
    return 2
  fi

  local status commit revision
  status="$(sed -n 's/^[[:space:]]*"status":[[:space:]]*"\([^"]*\)".*/\1/p' "$status_file" | head -n 1)"
  commit="$(sed -n 's/^[[:space:]]*"commit":[[:space:]]*"\([0-9A-Fa-f]*\)".*/\1/p' "$status_file" | head -n 1 | tr '[:upper:]' '[:lower:]')"
  revision="$(tr -d '\r\n' < "$revision_file" | tr '[:upper:]' '[:lower:]')"
  if [ "$status" != "verified" ]; then
    echo "Current production is '$status', not verified; refusing history archive." >&2
    return 2
  fi
  if ! [[ "$commit" =~ ^[0-9a-f]{40}$ ]] || [ "$commit" != "$revision" ]; then
    echo "Verified production metadata disagrees on revision; refusing history archive." >&2
    return 2
  fi

  mkdir -p "$snapshot_root"
  chmod 700 "$snapshot_root"
  if [ -L "$snapshot_root" ]; then
    echo "Snapshot root must not be a symlink." >&2
    return 2
  fi
  mkdir -p "$history_root"
  chmod 700 "$history_root"
  if [ -L "$history_root" ]; then
    echo "Verified history root must not be a symlink." >&2
    return 2
  fi
  if find "$history_root" -mindepth 1 -maxdepth 1 -type l -print -quit | grep -q .; then
    echo "Verified history root contains a symlink entry." >&2
    return 2
  fi

  local final="$history_root/$commit"
  if [ -e "$final" ] || [ -L "$final" ]; then
    validate_snapshot_dir "$final" "$commit" >/dev/null
  else
    local tmp="$snapshot_root/.verified-history-$commit.tmp.$$"
    rm -rf "$tmp"
    mkdir -p "$tmp/site"
    trap 'rm -rf "$tmp"' EXIT

    rsync -a --delete \
      --exclude '/manner/***' \
      --exclude '/kanji-slicer/***' \
      "$root/" "$tmp/site/"

    if find "$tmp/site" -type l -print -quit | grep -q .; then
      echo "Verified history candidate contains a symlink; refusing to publish it." >&2
      return 2
    fi
    printf '%s\n' "$commit" > "$tmp/revision.txt"
    printf '%s\n' "verified" > "$tmp/status.txt"
    validate_snapshot_dir "$tmp" "$commit" >/dev/null
    mv "$tmp" "$final"
    trap - EXIT
  fi
  touch "$final"

  if [ -n "$protected_revision" ]; then
    validate_snapshot_dir "$history_root/$protected_revision" "$protected_revision" >/dev/null
  fi

  local entries=()
  while IFS= read -r entry; do
    [ -n "$entry" ] && entries+=("$entry")
  done < <(find "$history_root" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -nr | cut -d' ' -f2-)

  local keep_revisions=("$commit")
  if [ -n "$protected_revision" ] && [ "$protected_revision" != "$commit" ]; then
    keep_revisions+=("$protected_revision")
  fi

  local entry name
  for entry in "${entries[@]}"; do
    name="$(basename "$entry")"
    if ! [[ "$name" =~ ^[0-9a-f]{40}$ ]]; then
      echo "Unexpected entry in verified history: $name" >&2
      return 2
    fi
    if revision_is_kept "$name"; then
      continue
    fi
    if [ "${#keep_revisions[@]}" -lt "$history_limit" ]; then
      keep_revisions+=("$name")
    fi
  done

  for entry in "${entries[@]}"; do
    name="$(basename "$entry")"
    if ! revision_is_kept "$name"; then
      rm -rf -- "$entry"
      echo "Pruned verified history snapshot $name."
    fi
  done

  local file_count
  file_count="$(find "$final/site" -type f | wc -l | tr -d '[:space:]')"
  echo "Archived verified production $commit in history ($file_count files, retention $history_limit)."
  echo "ROLLBACK_HISTORY_REVISION=$commit"
}

list_history() {
  if [ ! -d "$history_root" ] || [ -L "$history_root" ]; then
    echo "No verified snapshot history is available."
    return 0
  fi
  if find "$history_root" -mindepth 1 -maxdepth 1 -type l -print -quit | grep -q .; then
    echo "Verified history root contains a symlink entry." >&2
    return 2
  fi

  local found=0 entry revision
  while IFS= read -r entry; do
    [ -n "$entry" ] || continue
    revision="$(basename "$entry")"
    if ! [[ "$revision" =~ ^[0-9a-f]{40}$ ]]; then
      echo "Unexpected entry in verified history: $revision" >&2
      return 2
    fi
    validate_snapshot_dir "$entry" "$revision" >/dev/null
    echo "ROLLBACK_HISTORY_REVISION=$revision"
    found=1
  done < <(find "$history_root" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -nr | cut -d' ' -f2-)

  [ "$found" -eq 1 ] || echo "No verified snapshot history is available."
}

verify_history_target() {
  local selected="$history_root/$target_revision"
  validate_snapshot_dir "$selected" "$target_revision" >/dev/null
  echo "Verified history snapshot $target_revision."
  echo "ROLLBACK_HISTORY_REVISION=$target_revision"
}

activate_history_target() {
  local selected="$history_root/$target_revision"
  validate_snapshot_dir "$selected" "$target_revision" >/dev/null

  local tmp="$snapshot_root/.previous-verified.activate.$$"
  local old="$snapshot_root/.previous-verified.old.$$"
  rm -rf "$tmp" "$old"
  cp -a "$selected" "$tmp"
  validate_snapshot_dir "$tmp" "$target_revision" >/dev/null

  local had_previous=0
  if [ -e "$previous_snapshot" ] || [ -L "$previous_snapshot" ]; then
    mv "$previous_snapshot" "$old"
    had_previous=1
  fi
  if ! mv "$tmp" "$previous_snapshot"; then
    if [ "$had_previous" -eq 1 ] && { [ -e "$old" ] || [ -L "$old" ]; }; then
      mv "$old" "$previous_snapshot"
    fi
    echo "Failed to activate selected verified history snapshot; previous rollback source restored when available." >&2
    return 2
  fi
  if [ "$had_previous" -eq 1 ]; then
    rm -rf "$old"
  fi

  echo "Activated verified history snapshot $target_revision as the canonical rollback source."
  echo "ROLLBACK_HISTORY_REVISION=$target_revision"
}

case "$mode" in
  --archive-live)
    archive_live_verified
    ;;
  --list)
    list_history
    ;;
  --verify)
    verify_history_target
    ;;
  --activate)
    activate_history_target
    ;;
esac
REMOTE
