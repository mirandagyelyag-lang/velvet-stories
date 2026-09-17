#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-$HOME/Desktop/velvet-stories}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PATCHER="$SCRIPT_DIR/PATCH-VELVET-3.52.47/apply-instant-story-v35247.mjs"

printf '\n🌹 Velvet Stories 3.52.47 · Instant Story Conflict First\n'
printf 'Proyecto: %s\n\n' "$ROOT"

if [ ! -d "$ROOT" ]; then
  echo "❌ No encuentro el proyecto en: $ROOT"
  echo "Git Bash seguirá abierto."
  exit 1
fi

cd "$ROOT"

if [ ! -f package.json ] || [ ! -f supabase/functions/character-chat/index.ts ]; then
  echo "❌ Esta carpeta no parece ser Velvet Stories."
  echo "Git Bash seguirá abierto."
  exit 1
fi

if [ ! -f "$PATCHER" ]; then
  echo "❌ Falta el instalador interno: $PATCHER"
  echo "Git Bash seguirá abierto."
  exit 1
fi

echo "Versión antes del parche: $(node -p "require('./package.json').version")"
echo ""

node "$PATCHER"

echo ""
echo "🧪 Verificando Instant Stories..."
node --experimental-strip-types scripts/verify-v35247-instant-story-conflict-first.mjs

echo ""
echo "🏗️  Verificando build..."
npm run build

echo ""
echo "✅ PARCHE APLICADO Y BUILD CORRECTO"
echo "Versión actual: $(node -p "require('./package.json').version")"
echo ""
echo "Ahora ejecuta:"
echo "  bash \"$SCRIPT_DIR/DEPLOY-VELVET-3.52.47.sh\""
