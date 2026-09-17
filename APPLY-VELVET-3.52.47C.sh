#!/usr/bin/env bash
set -u

cd "$HOME/Desktop/velvet-stories" || { echo "❌ No encuentro ~/Desktop/velvet-stories"; exit 1; }

echo "🌹 Velvet Stories 3.52.47 · Instant Story Conflict First · installer C"
echo "Proyecto: $(pwd)"
echo
printf 'Versión antes del parche: '
node -p "require('./package.json').version" || exit 1
echo

node ./PATCH-VELVET-3.52.47C/apply-instant-story-v35247C.mjs
STATUS=$?
if [ "$STATUS" -ne 0 ]; then
  echo
  echo "❌ APPLY detenido. No se desplegó nada."
  exit "$STATUS"
fi

echo
node --experimental-strip-types scripts/verify-v35247-instant-story-conflict-first.mjs || exit 1

echo
echo "🔨 Build..."
npm run build || exit 1

echo
echo "✅ PARCHE APLICADO Y BUILD CORRECTO"
printf 'Versión actual: '
node -p "require('./package.json').version"
