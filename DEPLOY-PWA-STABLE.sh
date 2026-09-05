#!/usr/bin/env bash
set -euo pipefail

ALIAS="velvet-stories-ten.vercel.app"
EXPECTED_VERSION="$(node -p "require('./package.json').version")"
LOG="${HOME}/Desktop/VELVET-DEPLOY-${EXPECTED_VERSION}.log"

rm -rf dist
npm run build

echo ""
echo "=== BUILD LOCAL ==="
cat dist/velvet-version.json
echo ""

rm -f "$LOG"
npx vercel deploy --force --prod --yes 2>&1 | tee "$LOG"

DEPLOY_URL=""
while IFS= read -r URL; do
  BODY="$(curl -fsSL --max-time 20 "${URL}/velvet-version.json?nocache=$(date +%s)" 2>/dev/null || true)"
  FOUND_VERSION="$(printf '%s' "$BODY" | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{try{console.log(JSON.parse(s).version||'')}catch{console.log('')}})")"
  if [ "$FOUND_VERSION" = "$EXPECTED_VERSION" ]; then
    DEPLOY_URL="$URL"
    break
  fi
done < <(grep -Eo 'https://[A-Za-z0-9._-]+\.vercel\.app' "$LOG" | awk '!seen[$0]++')

if [ -z "$DEPLOY_URL" ]; then
  echo "ERROR: no encontré un deployment que sirva v${EXPECTED_VERSION}."
  exit 1
fi

echo "=== DEPLOYMENT CORRECTO ==="
echo "$DEPLOY_URL"
npx vercel alias set "$DEPLOY_URL" "$ALIAS"

echo ""
echo "=== LO QUE VERÁ TU CELU ==="
FINAL_BODY="$(curl -fsSL "https://${ALIAS}/velvet-version.json?nocache=$(date +%s)")"
printf '%s\n' "$FINAL_BODY"
FINAL_VERSION="$(printf '%s' "$FINAL_BODY" | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{try{console.log(JSON.parse(s).version||'')}catch{console.log('')}})")"

if [ "$FINAL_VERSION" != "$EXPECTED_VERSION" ]; then
  echo "ERROR: el alias todavía no sirve v${EXPECTED_VERSION}."
  exit 1
fi

echo "OK: ${ALIAS} ya sirve Velvet v${EXPECTED_VERSION}."
