#!/usr/bin/env bash

# Velvet Stories · verified PWA deploy
# Never points the phone alias at a deployment until that immutable URL proves
# it is serving the exact local Velvet version.

set +e

ALIAS="velvet-stories-ten.vercel.app"
EXPECTED="$(node -p "require('./package.json').version" 2>/dev/null)"
LOG="$HOME/Desktop/VELVET-DEPLOY-v${EXPECTED}.log"
CLEAN_LOG="$HOME/Desktop/VELVET-DEPLOY-v${EXPECTED}-clean.log"
LAST_GOOD_FILE="$HOME/Desktop/VELVET-LAST-GOOD-DEPLOYMENT.txt"
PREVIOUS_URL=""

[ -f "$LAST_GOOD_FILE" ] && PREVIOUS_URL="$(tr -d '\r\n' < "$LAST_GOOD_FILE")"

finish_ok() {
  echo ""
  echo "============================================================"
  echo "✅ FINAL: TU CELU YA ESTÁ RECIBIENDO VELVET v${EXPECTED}"
  echo "Alias: https://${ALIAS}"
  echo "============================================================"
  exit 0
}

finish_fail() {
  echo ""
  echo "============================================================"
  echo "❌ FINAL: NO QUEDÓ PUBLICADA v${EXPECTED}"
  echo "CAUSA: $1"
  echo "Log: $LOG"
  echo "============================================================"
  exit 1
}

read_version() {
  local base="$1"
  local body
  body="$(curl -L -sS --max-time 25 \
    -H 'Cache-Control: no-cache, no-store, must-revalidate' \
    -H 'Pragma: no-cache' \
    "${base}/velvet-version.json?velvet=${RANDOM}-$(date +%s%N)" 2>/dev/null)"
  printf '%s' "$body" | node -e "
let s='';
process.stdin.on('data',d=>s+=d);
process.stdin.on('end',()=>{
  try { console.log(JSON.parse(s).version || '') }
  catch { console.log('') }
});"
}

rollback_alias() {
  if [[ "$PREVIOUS_URL" =~ ^https://[A-Za-z0-9._-]+\.vercel\.app$ ]]; then
    echo "Restaurando deployment anterior conocido: $PREVIOUS_URL"
    npx vercel alias set "$PREVIOUS_URL" "$ALIAS" >/dev/null 2>&1
  fi
}

echo "VELVET STORIES · DEPLOY VERIFICADO v${EXPECTED}"
echo ""

if [ -z "$EXPECTED" ]; then
  finish_fail "No pude leer la versión local desde package.json."
fi

echo "=== PASO 1/7 · VERIFICADORES ==="
npm run stability:lab
STATUS=$?
[ "$STATUS" -eq 0 ] || finish_fail "Stability Lab falló con código $STATUS."

echo ""
echo "=== PASO 2/7 · BUILD LOCAL ==="
rm -rf dist
npm run build
STATUS=$?
[ "$STATUS" -eq 0 ] || finish_fail "npm run build falló con código $STATUS."

BUILD_VERSION="$(node -e "try{console.log(require('./dist/velvet-version.json').version||'')}catch{console.log('')}" 2>/dev/null)"
echo "Build generado: v${BUILD_VERSION:-no detectable}"
[ "$BUILD_VERSION" = "$EXPECTED" ] || finish_fail "El build dice v${BUILD_VERSION:-?}, esperaba v${EXPECTED}."

echo ""
echo "=== PASO 3/7 · ESTADO PÚBLICO ACTUAL ==="
CURRENT="$(read_version "https://${ALIAS}")"
echo "Alias actual: v${CURRENT:-no detectable}"

if [ "$CURRENT" = "$EXPECTED" ]; then
  echo "El alias ya sirve exactamente esta versión."
  finish_ok
fi

echo ""
echo "=== PASO 4/7 · DEPLOY VERCEL ==="
rm -f "$LOG" "$CLEAN_LOG"
npx vercel deploy --force --prod --yes 2>&1 | tee "$LOG"
DEPLOY_STATUS=${PIPESTATUS[0]}
[ "$DEPLOY_STATUS" -eq 0 ] || finish_fail "Vercel CLI falló con código $DEPLOY_STATUS."

sed -E $'s/\x1B\\[[0-9;?]*[ -/]*[@-~]//g' "$LOG" > "$CLEAN_LOG" 2>/dev/null
[ -s "$CLEAN_LOG" ] || cp "$LOG" "$CLEAN_LOG"

echo ""
echo "=== PASO 5/7 · Buscando deployment que realmente sirve v${EXPECTED} ==="
DEPLOY_URL=""
while IFS= read -r URL; do
  [ -z "$URL" ] && continue
  echo "Probando: $URL"
  FOUND="$(read_version "$URL")"
  echo "  -> versión: ${FOUND:-no detectable}"
  if [ "$FOUND" = "$EXPECTED" ]; then
    DEPLOY_URL="$URL"
    break
  fi
done < <(
  grep -Eo 'https://[A-Za-z0-9._-]+\.vercel\.app' "$CLEAN_LOG" \
    | sed 's/[),.;]*$//' \
    | awk '!seen[$0]++'
)

[ -n "$DEPLOY_URL" ] || finish_fail "Vercel terminó, pero ninguna URL inmutable devolvió velvet-version.json = ${EXPECTED}."

echo "Deployment correcto: $DEPLOY_URL"

HTTP_CODE="$(curl -L -sS -o /dev/null -w '%{http_code}' --max-time 25 "$DEPLOY_URL/" 2>/dev/null)"
[ "$HTTP_CODE" = "200" ] || finish_fail "El deployment candidato respondió HTTP ${HTTP_CODE:-?}."

echo ""
echo "=== PASO 6/7 · MOVIENDO ALIAS DEL CELU ==="
echo "$DEPLOY_URL -> $ALIAS"
npx vercel alias set "$DEPLOY_URL" "$ALIAS"
ALIAS_STATUS=$?
[ "$ALIAS_STATUS" -eq 0 ] || finish_fail "vercel alias set falló con código $ALIAS_STATUS."

echo ""
echo "=== PASO 7/7 · VERIFICACIÓN PÚBLICA ==="
FINAL=""
for ATTEMPT in 1 2 3 4 5 6 7 8; do
  sleep 2
  FINAL="$(read_version "https://${ALIAS}")"
  echo "Intento ${ATTEMPT}/8: v${FINAL:-no detectable}"
  if [ "$FINAL" = "$EXPECTED" ]; then
    printf '%s\n' "$DEPLOY_URL" > "$LAST_GOOD_FILE"
    finish_ok
  fi
done

rollback_alias
finish_fail "Después de mover el alias, ${ALIAS} sigue devolviendo v${FINAL:-?}."
