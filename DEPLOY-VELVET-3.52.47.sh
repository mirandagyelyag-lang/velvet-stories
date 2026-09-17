#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-$HOME/Desktop/velvet-stories}"
PROJECT_REF="vwyudrmxatuukcbncats"

printf '\n🚀 Velvet Stories 3.52.47 · Deploy\n'
printf 'Proyecto: %s\n\n' "$ROOT"

if [ ! -d "$ROOT" ]; then
  echo "❌ No encuentro el proyecto en: $ROOT"
  echo "Git Bash seguirá abierto."
  exit 1
fi

cd "$ROOT"

VERSION="$(node -p "require('./package.json').version")"
if [ "$VERSION" != "3.52.47" ]; then
  echo "❌ Esperaba Velvet Stories 3.52.47, pero encontré $VERSION."
  echo "Primero ejecuta APPLY-VELVET-3.52.47.sh."
  echo "Git Bash seguirá abierto."
  exit 1
fi

echo "🧪 Última verificación..."
node --experimental-strip-types scripts/verify-v35247-instant-story-conflict-first.mjs
npm run build

echo ""
echo "☁️  Desplegando character-chat en Supabase..."
npx supabase link --project-ref "$PROJECT_REF"
npx supabase functions deploy character-chat \
  --project-ref "$PROJECT_REF" \
  --no-verify-jwt

echo ""
echo "▲ Desplegando frontend a Vercel production..."
npx vercel --prod --yes

echo ""
echo "✅ Velvet Stories 3.52.47 quedó desplegada."
echo "✅ Instant Story Conflict First quedó desplegado en character-chat."
