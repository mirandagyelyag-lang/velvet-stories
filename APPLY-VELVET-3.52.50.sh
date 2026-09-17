#!/usr/bin/env bash
set -u

cd "$(dirname "$0")"

echo "🌹 Velvet Stories 3.52.50 · Group Story Top Panel"
echo "Proyecto: $(pwd)"
echo ""

MAIN="src/main.jsx"
STYLE_SRC="PATCH-VELVET-3.52.50/velvet-v35250-group-story-top-panel.css"
STYLE_DST="src/styles/velvet-v35250-group-story-top-panel.css"

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

mkdir -p .velvet-backups
STAMP="$(date +%Y-%m-%dT%H-%M-%S)"
BACKUP=".velvet-backups/v3.52.50-group-story-top-$STAMP"
mkdir -p "$BACKUP"

cp "$MAIN" "$BACKUP/main.jsx"
cp src/components/GroupStoryModal.jsx "$BACKUP/GroupStoryModal.jsx"
[ -f "$STYLE_DST" ] && cp "$STYLE_DST" "$BACKUP/velvet-v35250-group-story-top-panel.css"

echo "🛟 Backup: $BACKUP"

mkdir -p src/styles
cp "$STYLE_SRC" "$STYLE_DST"

node <<'NODE'
const fs = require("fs");

const mainFile = "src/main.jsx";
const importLine = 'import "./styles/velvet-v35250-group-story-top-panel.css";';

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
  fs.writeFileSync(mainFile, lines.join("\n") + "\n", "utf8");
}

for (const file of ["package.json", "public/velvet-version.json"]) {
  if (!fs.existsSync(file)) continue;
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  data.version = "3.52.50";
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
}

console.log("✅ Group Story Top Panel cargado al final.");
NODE

STATUS=$?
if [ "$STATUS" -ne 0 ]; then
  echo "❌ No pude instalar el import."
  exit "$STATUS"
fi

echo ""
echo "🔎 Verificando..."
grep -Fq 'velvet-v35250-group-story-top-panel.css' "$MAIN" || { echo "❌ Import ausente"; exit 1; }
grep -Fq 'align-items: flex-start !important' "$STYLE_DST" || { echo "❌ Falta alineación superior"; exit 1; }
grep -Fq 'padding: 72px 18px 18px !important' "$STYLE_DST" || { echo "❌ Falta inicio desde barra superior"; exit 1; }

echo "✅ Layout superior correcto."

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
echo "✅ GROUP STORY TOP PANEL APLICADO"
echo "Versión actual: $(node -p "require('./package.json').version")"
echo ""
echo "Frontend listo para Vercel."
