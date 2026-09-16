#!/usr/bin/env bash

# Velvet Stories · stable PWA rollback
# Moves the public phone alias to a previously verified Vercel deployment,
# then confirms that the public alias serves the same Velvet version.

set -euo pipefail

TARGET_URL="${1:-}"
DEFAULT_ALIAS="velvet-stories-ten.vercel.app"
ALIAS="${VELVET_VERCEL_ALIAS:-$DEFAULT_ALIAS}"

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd -P)"
LOG_DIR="${VELVET_DEPLOY_LOG_DIR:-$HOME/Desktop}"
LAST_GOOD_FILE="$LOG_DIR/VELVET-LAST-GOOD-DEPLOYMENT.txt"

cd "$SCRIPT_DIR"

fail() {
  echo ""
  echo "❌ ROLLBACK FAILED: $1"
  exit 1
}

for command_name in node npx curl; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    fail "Missing required command: $command_name"
  fi
done

if [ -z "$TARGET_URL" ]; then
  echo "Usage:"
  echo "  bash ROLLBACK-PWA-STABLE.sh https://your-known-good-deployment.vercel.app"
  exit 2
fi

# Normalize a trailing slash so URL comparisons and requests remain predictable.
TARGET_URL="${TARGET_URL%/}"

if [[ ! "$TARGET_URL" =~ ^https://[A-Za-z0-9._-]+\.vercel\.app$ ]]; then
  echo "ERROR: target must be a https://*.vercel.app deployment URL"
  exit 2
fi

if [ "$TARGET_URL" = "https://${ALIAS}" ]; then
  echo "ERROR: target cannot be the stable alias itself."
  echo "Use the immutable known-good deployment URL instead."
  exit 2
fi

read_version() {
  local base="$1"
  local body

  body="$(
    curl -L -sS --fail --max-time 25 \
      -H 'Cache-Control: no-cache, no-store, must-revalidate' \
      -H 'Pragma: no-cache' \
      "${base}/velvet-version.json?rollback=${RANDOM}-$(date +%s)" \
      2>/dev/null
  )" || return 1

  printf '%s' "$body" | node -e "
let s = '';
process.stdin.on('data', (d) => { s += d; });
process.stdin.on('end', () => {
  try {
    console.log(JSON.parse(s).version || '');
  } catch {
    console.log('');
  }
});
"
}

echo ""
echo "=== Velvet Stories · Stable PWA Rollback ==="
echo "Target: $TARGET_URL"
echo "Alias:  https://${ALIAS}"
echo ""

echo "1/4 · Validating target deployment..."

VERSION="$(read_version "$TARGET_URL" || true)"

if [ -z "$VERSION" ]; then
  fail "Target does not expose a valid velvet-version.json."
fi

HTTP_CODE="$(
  curl -L -sS -o /dev/null -w '%{http_code}' --max-time 25 "$TARGET_URL/" 2>/dev/null || true
)"

if [ "$HTTP_CODE" != "200" ]; then
  fail "Target deployment root responded with HTTP ${HTTP_CODE:-?}."
fi

echo "✅ Validated Velvet v$VERSION"

echo ""
echo "2/4 · Moving stable alias..."

if ! npx vercel alias set "$TARGET_URL" "$ALIAS"; then
  fail "Vercel could not move the alias."
fi

echo ""
echo "3/4 · Verifying public alias..."

FINAL_VERSION=""

for ATTEMPT in 1 2 3 4 5 6 7 8; do
  sleep 2
  FINAL_VERSION="$(read_version "https://${ALIAS}" || true)"
  echo "Attempt ${ATTEMPT}/8: v${FINAL_VERSION:-not detectable}"

  if [ "$FINAL_VERSION" = "$VERSION" ]; then
    break
  fi
done

if [ "$FINAL_VERSION" != "$VERSION" ]; then
  fail "Alias serves v${FINAL_VERSION:-?}, but rollback target is v$VERSION."
fi

echo ""
echo "4/4 · Recording current known-good deployment..."

mkdir -p "$LOG_DIR"
printf '%s\n' "$TARGET_URL" > "$LAST_GOOD_FILE"

echo ""
echo "============================================================"
echo "✅ ROLLBACK COMPLETE"
echo "Velvet v$VERSION is now live at https://${ALIAS}"
echo "Known-good deployment: $TARGET_URL"
echo "============================================================"
echo ""
