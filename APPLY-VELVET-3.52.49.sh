#!/usr/bin/env bash
set -u

cd "$(dirname "$0")"

echo "🌹 Velvet Stories 3.52.49 · Group Story HARD Scroll Fix"
echo "Proyecto: $(pwd)"
echo ""

MAIN="src/main.jsx"
STYLE_SRC="PATCH-VELVET-3.52.49/velvet-v35249-group-story-hard-scroll.css"
STYLE_DST="src/styles/velvet-v35249-group-story-hard-scroll.css"

if [ ! -f "$MAIN" ]; then
  echo "❌ No encontré src/main.jsx"
  exit 1
fi

if [ ! -f "src/components/GroupStoryModal.jsx" ]; then
  echo "❌ No encontré GroupStoryModal.jsx"
  exit 1
fi

if [ ! -f "$STYLE_SRC" ]; then
  echo "❌ No encontré el CSS del parche."
  exit 1
fi

if ! grep -Fq 'className="group-story-sheet__scroll"' src/components/GroupStoryModal.jsx; then
  echo "❌ Tu GroupStoryModal local no tiene el contenedor de scroll esperado."
  echo "No toqué nada."
  exit 1
fi

mkdir -p .velvet-backups
STAMP="$(date +%Y-%m-%dT%H-%M-%S)"
BACKUP=".velvet-backups/v3.52.49-group-story-scroll-$STAMP"
mkdir -p "$BACKUP"

cp "$MAIN" "$BACKUP/main.jsx"
cp src/components/GroupStoryModal.jsx "$BACKUP/GroupStoryModal.jsx"
[ -f "$STYLE_DST" ] && cp "$STYLE_DST" "$BACKUP/velvet-v35249-group-story-hard-scroll.css"

echo "🛟 Backup: $BACKUP"

mkdir -p src/styles
cp "$STYLE_SRC" "$STYLE_DST"

node <<'NODE'
const fs = require("fs");

const mainFile = "src/main.jsx";
const importLine = 'import "./styles/velvet-v35249-group-story-hard-scroll.css";';

let source = fs.readFileSync(mainFile, "utf8");

if (!source.includes(importLine)) {
  const lines = source.split(/\r?\n/);

  let lastCssImport = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^import\s+["'][^"']+\.css["'];?$/.test(lines[i].trim())) {
      lastCssImport = i;
    }
  }

  if (lastCssImport < 0) {
    console.error("❌ No encontré imports CSS en src/main.jsx");
    process.exit(2);
  }

  lines.splice(lastCssImport + 1, 0, importLine);
  source = lines.join("\n");

  fs.writeFileSync(mainFile, source + "\n", "utf8");
}

for (const file of ["package.json", "public/velvet-version.json"]) {
  if (!fs.existsSync(file)) continue;
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  data.version = "3.52.49";
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
}

console.log("✅ CSS HARD scroll cargado al final.");
NODE

NODE_STATUS=$?
if [ "$NODE_STATUS" -ne 0 ]; then
  echo "❌ No pude instalar el import."
  exit "$NODE_STATUS"
fi

echo ""
echo "🔎 Verificando..."
grep -Fq 'velvet-v35249-group-story-hard-scroll.css' "$MAIN" || { echo "❌ Import ausente"; exit 1; }
grep -Fq 'grid-template-rows: auto minmax(0, 1fr) auto !important' "$STYLE_DST" || { echo "❌ Grid scroll contract ausente"; exit 1; }
grep -Fq 'overflow-y: scroll !important' "$STYLE_DST" || { echo "❌ Scroll vertical ausente"; exit 1; }
grep -Fq 'height: min(86dvh, 760px) !important' "$STYLE_DST" || { echo "❌ Altura definida ausente"; exit 1; }

echo "✅ Contrato de scroll correcto."

echo ""
echo "🏗️ Build..."
npm run build
BUILD_STATUS=$?

if [ "$BUILD_STATUS" -ne 0 ]; then
  echo ""
  echo "❌ BUILD FALLÓ. No despliegues todavía."
  exit "$BUILD_STATUS"
fi

echo ""
echo "✅ GROUP STORY HARD SCROLL FIX APLICADO"
echo "Versión actual: $(node -p "require('./package.json').version")"
echo ""
echo "Ahora sí puedes desplegar SOLO frontend:"
echo "npx vercel --prod --yes --scope miranda15 --project velvet-stories"
