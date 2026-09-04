#!/usr/bin/env bash
set -euo pipefail

EXPECTED_VERSION="3.21.0"
EXPECTED_RELEASE="Human Behavior"
STABLE_ALIAS="velvet-stories-ten.vercel.app"
LOG="$HOME/Desktop/VELVET-V3210-DEPLOY.txt"

printf '\n=== Velvet %s · %s ===\n' "$EXPECTED_VERSION" "$EXPECTED_RELEASE"

node scripts/verify-v3210-release.mjs
npm install
rm -rf dist
npm run build

printf '\n=== BUILD METADATA ===\n'
cat dist/velvet-version.json
printf '\n'

node - <<'NODE'
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('dist/velvet-version.json','utf8'));
if (data.version !== '3.21.0' || data.release !== 'Human Behavior') {
  console.error('BUILD METADATA MISMATCH:', data);
  process.exit(1);
}
console.log('PASS · dist is 3.21.0 Human Behavior');
NODE

rm -f "$LOG"
printf '\n=== FORCING FRESH PRODUCTION DEPLOY ===\n'
set +e
npx vercel deploy --force --prod --yes 2>&1 | tee "$LOG"
VERCEL_STATUS=${PIPESTATUS[0]}
set -e
if [ "$VERCEL_STATUS" -ne 0 ]; then
  echo "ERROR · Vercel deploy failed. Full log: $LOG"
  exit "$VERCEL_STATUS"
fi

mapfile -t URLS < <(grep -Eo 'https://[A-Za-z0-9._-]+\.vercel\.app' "$LOG" | awk '!seen[$0]++')
if [ "${#URLS[@]}" -eq 0 ]; then
  echo "ERROR · No vercel.app URL found in deploy output. Full log: $LOG"
  exit 1
fi

printf '\n=== FINDING THE DEPLOYMENT THAT REALLY SERVES 3.21.0 ===\n'
DEPLOY_URL=""
for url in "${URLS[@]}"; do
  echo "Checking $url"
  body="$(curl -fsSL --max-time 20 "$url/velvet-version.json?nocache=$(date +%s)" 2>/dev/null || true)"
  if BODY="$body" node - <<'NODE'
try {
  const d = JSON.parse(process.env.BODY || '{}');
  process.exit(d.version === '3.21.0' && d.release === 'Human Behavior' ? 0 : 1);
} catch { process.exit(1); }
NODE
  then
    DEPLOY_URL="$url"
    echo "FOUND · $DEPLOY_URL"
    echo "$body"
    break
  else
    [ -n "$body" ] && echo "Got: $body"
  fi
done

if [ -z "$DEPLOY_URL" ]; then
  echo "ERROR · Vercel created URLs, but none serves 3.21.0 Human Behavior."
  echo "Inspect $LOG"
  exit 1
fi

printf '\n=== MOVING STABLE ALIAS ===\n'
npx vercel alias set "$DEPLOY_URL" "$STABLE_ALIAS"

printf '\n=== VERIFYING STABLE PWA ===\n'
FINAL="$(curl -fsSL --max-time 20 "https://$STABLE_ALIAS/velvet-version.json?nocache=$(date +%s)")"
echo "$FINAL"
BODY="$FINAL" node - <<'NODE'
const d = JSON.parse(process.env.BODY || '{}');
if (d.version !== '3.21.0' || d.release !== 'Human Behavior') {
  console.error('ERROR · Stable alias is still not 3.21.0 Human Behavior');
  process.exit(1);
}
console.log('SUCCESS · velvet-stories-ten is serving 3.21.0 Human Behavior');
NODE
