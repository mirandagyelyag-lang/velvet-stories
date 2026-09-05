#!/usr/bin/env bash
set -euo pipefail
TARGET_URL="${1:-}"
ALIAS="velvet-stories-ten.vercel.app"
if [ -z "$TARGET_URL" ]; then
  echo "Usage: bash ROLLBACK-PWA-STABLE.sh https://your-known-good-deployment.vercel.app"
  exit 2
fi
if [[ ! "$TARGET_URL" =~ ^https://[A-Za-z0-9._-]+\.vercel\.app$ ]]; then
  echo "ERROR: target must be a vercel.app deployment URL"
  exit 2
fi
BODY="$(curl -fsSL --max-time 20 "$TARGET_URL/velvet-version.json?rollback=$(date +%s)")"
VERSION="$(printf '%s' "$BODY" | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{try{console.log(JSON.parse(s).version||'')}catch{console.log('')}})")"
if [ -z "$VERSION" ]; then
  echo "ERROR: target does not expose a valid velvet-version.json"
  exit 1
fi
echo "Validated Velvet v$VERSION at $TARGET_URL"
echo "Moving stable phone alias: $ALIAS"
npx vercel alias set "$TARGET_URL" "$ALIAS"
echo "Verifying stable alias..."
curl -fsSL "https://$ALIAS/velvet-version.json?rollback=$(date +%s)"
echo ""
echo "OK: phone alias rolled back to Velvet v$VERSION"
