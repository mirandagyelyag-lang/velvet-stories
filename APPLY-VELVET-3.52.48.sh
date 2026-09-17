#!/usr/bin/env bash
set -u

cd "$(dirname "$0")"

echo "🌹 Velvet Stories 3.52.48 · Group Story Scroll Fix"
echo "Proyecto: $(pwd)"
echo ""

MAIN="src/main.jsx"
STYLE_SRC="PATCH-VELVET-3.52.48/velvet-v35248-group-story-scroll.css"
STYLE_DST="src/styles/velvet-v35248-group-story-scroll.css"

if [ ! -f "$MAIN" ]; then
  echo "❌ No encontré $MAIN"
  exit 1
fi

if [ ! -f "$STYLE_SRC" ]; then
  echo "❌ No encontré $STYLE_SRC"
  exit 1
fi

mkdir -p .velvet-backups
STAMP="$(date +%Y-%m-%dT%H-%M-%S)"
BACKUP=".velvet-backups/v3.52.48-group-story-scroll-$STAMP"
mkdir -p "$BACKUP"
cp "$MAIN" "$BACKUP/main.jsx"
[ -f "$STYLE_DST" ] && cp "$STYLE_DST" "$BACKUP/velvet-v35248-group-story-scroll.css"

echo "🛟 Backup: $BACKUP"

mkdir -p src/styles
cp "$STYLE_SRC" "$STYLE_DST"

IMPORT='import "./styles/velvet-v35248-group-story-scroll.css";'

if ! grep -Fq "$IMPORT" "$MAIN"; then
  python - <<'PY'
from pathlib import Path
p = Path("src/main.jsx")
s = p.read_text(encoding="utf-8")
line = 'import "./styles/velvet-v35248-group-story-scroll.css";'
lines = s.splitlines()
last_css = -1
for i, current in enumerate(lines):
    if current.startswith('import "./styles/') and current.endswith('.css";'):
        last_css = i
if last_css < 0:
    raise SystemExit("No encontré imports CSS en src/main.jsx.")
lines.insert(last_css + 1, line)
p.write_text("\n".join(lines) + ("\n" if s.endswith("\n") else ""), encoding="utf-8")
PY
fi

node - <<'NODE'
const fs = require("fs");
for (const file of ["package.json", "public/velvet-version.json"]) {
  if (!fs.existsSync(file)) continue;
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  data.version = "3.52.48";
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
}
NODE

echo ""
echo "🔎 Verificando..."
grep -F "$IMPORT" "$MAIN" >/dev/null || { echo "❌ Falta el import"; exit 1; }
grep -F "max-height: calc(100dvh - 32px)" "$STYLE_DST" >/dev/null || { echo "❌ Falta viewport cap"; exit 1; }
grep -F "overflow-y: auto !important" "$STYLE_DST" >/dev/null || { echo "❌ Falta scroll interno"; exit 1; }

echo "✅ Fix instalado."

echo ""
echo "🏗️ Build..."
npm run build || {
  echo ""
  echo "❌ El build falló. No despliegues todavía."
  exit 1
}

echo ""
echo "✅ GROUP STORY SCROLL FIX APLICADO"
echo "Versión actual: $(node -p "require('./package.json').version")"
echo ""
echo "Frontend listo para Vercel."
