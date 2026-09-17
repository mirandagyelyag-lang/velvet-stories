#!/usr/bin/env bash

# Velvet Stories · verified PWA deploy
# Publishes only after the immutable Vercel deployment proves that it serves
# the exact version declared in package.json.

set -uo pipefail

DEFAULT_ALIAS="velvet-stories-ten.vercel.app"
ALIAS="${VELVET_VERCEL_ALIAS:-$DEFAULT_ALIAS}"

# Find the Velvet Stories project root safely.
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd -P)"
PROJECT_ROOT=""

if [ -n "${VELVET_PROJECT_ROOT:-}" ]; then
  PROJECT_ROOT="$VELVET_PROJECT_ROOT"
elif [ -f "$PWD/package.json" ]; then
  PROJECT_ROOT="$PWD"
elif [ -f "$SCRIPT_DIR/package.json" ]; then
  PROJECT_ROOT="$SCRIPT_DIR"
elif [ -f "$HOME/Desktop/velvet-stories/package.json" ]; then
  PROJECT_ROOT="$HOME/Desktop/velvet-stories"
fi

if [ -z "$PROJECT_ROOT" ]; then
  echo "❌ No encontré package.json."
  echo "Ejecuta este script desde la raíz de Velvet Stories o define VELVET_PROJECT_ROOT."
  exit 1
fi

if [ ! -f "$PROJECT_ROOT/package.json" ]; then
  echo "❌ VELVET_PROJECT_ROOT no apunta a un proyecto válido: $PROJECT_ROOT"
  exit 1
fi

cd "$PROJECT_ROOT" || exit 1

for command_name in node npm npx curl; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "❌ Falta el comando requerido: $command_name"
    exit 1
  fi
done

EXPECTED="$(node -p "require('./package.json').version || ''" 2>/dev/null)"
LOG_DIR="${VELVET_DEPLOY_LOG_DIR:-$HOME/Desktop}"
LOG="$LOG_DIR/VELVET-DEPLOY-v${EXPECTED}.log"
CLEAN_LOG="$LOG_DIR/VELVET-DEPLOY-v${EXPECTED}-clean.log"
LAST_GOOD_FILE="$LOG_DIR/VELVET-LAST-GOOD-DEPLOYMENT.txt"
PREVIOUS_URL=""

mkdir -p "$LOG_DIR"

if [ -f "$LAST_GOOD_FILE" ]; then
  PREVIOUS_URL="$(tr -d '\r\n' < "$LAST_GOOD_FILE")"
fi

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
  echo "❌ FINAL: NO QUEDÓ PUBLICADA v${EXPECTED:-desconocida}"
  echo "CAUSA: $1"
  echo "Log: $LOG"
  echo "============================================================"
  exit 1
}

read_version() {
  local base="$1"
  local body

  body="$(
    curl -L -sS --max-time 25 \
      -H 'Cache-Control: no-cache, no-store, must-revalidate' \
      -H 'Pragma: no-cache' \
      "${base}/velvet-version.json?velvet=${RANDOM}-$(date +%s)" \
      2>/dev/null
  )"

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

rollback_alias() {
  if [[ "$PREVIOUS_URL" =~ ^https://[A-Za-z0-9._-]+\.vercel\.app$ ]]; then
    echo "Restaurando deployment anterior conocido: $PREVIOUS_URL"
    npx vercel alias set "$PREVIOUS_URL" "$ALIAS" >/dev/null 2>&1
  else
    echo "No hay un deployment anterior válido guardado para rollback."
  fi
}

if [ -z "$EXPECTED" ]; then
  finish_fail "No pude leer la versión local desde package.json."
fi

echo "VELVET STORIES · DEPLOY VERIFICADO v${EXPECTED}"
echo "Proyecto: $PROJECT_ROOT"
echo "Alias: https://${ALIAS}"
echo ""

echo "=== PASO 1/7 · VERIFICADORES ==="
if ! npm run verify:release; then
  finish_fail "La verificación de estabilidad falló."
fi

echo ""
echo "=== PASO 2/7 · BUILD LOCAL ==="
rm -rf dist

if ! npm run build; then
  finish_fail "npm run build falló."
fi

BUILD_VERSION="$(
  node -e "
try {
  console.log(require('./dist/velvet-version.json').version || '');
} catch {
  console.log('');
}
" 2>/dev/null
)"

echo "Build generado: v${BUILD_VERSION:-no detectable}"

if [ "$BUILD_VERSION" != "$EXPECTED" ]; then
  finish_fail "El build dice v${BUILD_VERSION:-?}, esperaba v${EXPECTED}."
fi

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

if [ "$DEPLOY_STATUS" -ne 0 ]; then
  finish_fail "Vercel CLI falló con código $DEPLOY_STATUS."
fi

sed -E $'s/\x1B\\[[0-9;?]*[ -/]*[@-~]//g' "$LOG" > "$CLEAN_LOG" 2>/dev/null

if [ ! -s "$CLEAN_LOG" ]; then
  cp "$LOG" "$CLEAN_LOG"
fi

echo ""
echo "=== PASO 5/7 · BUSCANDO DEPLOYMENT CORRECTO ==="
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

if [ -z "$DEPLOY_URL" ]; then
  finish_fail "Vercel terminó, pero ninguna URL inmutable devolvió velvet-version.json = ${EXPECTED}."
fi

echo "Deployment correcto: $DEPLOY_URL"

HTTP_CODE="$(
  curl -L -sS -o /dev/null -w '%{http_code}' --max-time 25 "$DEPLOY_URL/" 2>/dev/null
)"

if [ "$HTTP_CODE" != "200" ]; then
  finish_fail "El deployment candidato respondió HTTP ${HTTP_CODE:-?}."
fi

echo ""
echo "=== PASO 6/7 · MOVIENDO ALIAS DEL CELU ==="
echo "$DEPLOY_URL -> $ALIAS"

if ! npx vercel alias set "$DEPLOY_URL" "$ALIAS"; then
  finish_fail "vercel alias set falló."
fi

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
