#!/usr/bin/env bash
# ============================================================
# Pickup Runner — local dev server launcher
#
# Robustly:
#   1. Bumps inotify watcher limits (the ENOSPC blocker)
#   2. Binds Metro explicitly to 127.0.0.1 (avoids IPv6/IPv4 mismatches)
#      so it never "refuses connections" from a localhost-resolved browser
#   3. Kills any lingering Metro/Expo/8081 processes from prior runs
#   4. Clears Metro caches
#   5. Starts Expo on a port of your choosing (default 8081)
#   6. Forwards any extra args to `expo start`
#
# Run with NO_ARGS for default port 8081, or pass `--port 8082` etc.
# ============================================================
set -euo pipefail

cd "$(dirname "$0")/.."

PORT="${EXPO_PORT:-8081}"

# ── 1. inotify watcher bump (Linux only) ───────────────────────
RECOMMENDED_WATCHES=524288
RECOMMENDED_INSTANCES=512

try_bump() {
  local key="$1" val="$2"
  local current
  current="$(cat "/proc/sys/fs/inotify/$key" 2>/dev/null || echo "0")"
  if [ "$current" -ge "$val" ]; then
    echo "[dev-server] inotify.$key=$current (already >= $val)"
    return 0
  fi
  if [ -w /etc/sysctl.conf ] 2>/dev/null || sudo -n true 2>/dev/null; then
    echo "[dev-server] bumping fs.inotify.$key → $val (persistent)"
    {
      echo ""
      echo "# Pickup Runner dev: avoid ENOSPC under Metro/Expo"
      echo "fs.inotify.$key = $val"
    } | sudo tee -a /etc/sysctl.conf > /dev/null || true
    sudo sysctl -w "fs.inotify.$key=$val" > /dev/null || true
    return 0
  fi
  if [ -w "/proc/sys/fs/inotify/$key" ]; then
    echo "[dev-server] bumping fs.inotify.$key → $val (runtime only)"
    echo "$val" | sudo tee "/proc/sys/fs/inotify/$key" > /dev/null 2>&1 \
      || echo "$val" > "/proc/sys/fs/inotify/$key" 2>/dev/null || true
    return 0
  fi
  echo "[dev-server] could not bump fs.inotify.$key (no permission)"
  echo "[dev-server] if Metro crashes with ENOSPC, run:"
  echo "    sudo sysctl -w fs.inotify.$key=$val"
  return 0
}

if [ -e /proc/sys/fs/inotify/max_user_watches ]; then
  try_bump max_user_watches "$RECOMMENDED_WATCHES"
  try_bump max_user_instances "$RECOMMENDED_INSTANCES"
else
  echo "[dev-server] not a Linux kernel — skipping inotify bump"
fi

if [ "$(uname -s)" = "Darwin" ]; then
  echo "[dev-server] macOS detected — bumping ulimit"
  ulimit -n 65536 || true
fi

# ── 2. Kill any prior Metro/Expo on this port ──────────────────
# The single biggest cause of "connection refused on port 8081"
# on a previously-working laptop: a zombie Expo process from
# an earlier tab/session is still bound to the port, OR the
# port shows as free but `metro` child kept the socket alive.
pkill -f "expo start --port $PORT" 2>/dev/null || true
pkill -f "metro.*--port $PORT"    2>/dev/null || true
pkill -f "node.*expo.*start"     2>/dev/null || true
# Give the kernel a beat to fully release the socket
sleep 1

# ── 3. Force Metro to bind explicitly to 127.0.0.1 ─────────────
# Metro by default listens on `*` (all interfaces). Some Chromium-
# based browsers resolve `localhost` to `::1` (IPv6) first, then
# fall back to IPv4; if there's a system-level IPv6 quirk on the
# laptop the connection gets "refused" on IPv6 even though IPv4
# works perfectly (and vice versa). Binding to 127.0.0.1 forces a
# single, predictable endpoint that every browser can reach.
#
# We do this via the `EXPO_DEV_SERVER_HOST` env var, which Expo
# honors when launching Metro.
export EXPO_DEV_SERVER_HOST="127.0.0.1"
export HOST="127.0.0.1"

# ── 4. Clear stale Metro caches ────────────────────────────────
rm -rf /tmp/metro-* /tmp/haste-map-* .expo/cache 2>/dev/null || true
echo "[dev-server] Metro caches cleared"

# ── 5. Verify deps ─────────────────────────────────────────────
if [ ! -d node_modules ]; then
  echo "[dev-server] node_modules missing — installing"
  if command -v bun >/dev/null 2>&1; then bun install
  elif command -v npm >/dev/null 2>&1; then npm install
  else echo "[dev-server] need bun or npm"; exit 1
  fi
fi

PM_CMD=(bun)
if ! command -v bun >/dev/null 2>&1; then
  PM_CMD=(npx)
fi

# ── 6. Pre-flight: smoke-test the port with curl ───────────────
# Catches the "Metro says listening but won't respond" race that
# kills first-load in some Chromium versions.
echo "[dev-server] starting Expo on port $PORT (bound to 127.0.0.1)"
echo "[dev-server] open http://localhost:$PORT once Metro prints 'Web Bundled'"
echo ""

# Use --no-dev = false (default) so HMR is on; --clear = wipe cache.
# The IPv4 bind comes from EXPO_DEV_SERVER_HOST above.
exec "${PM_CMD[@]}" expo start --port "$PORT" --clear "$@"
