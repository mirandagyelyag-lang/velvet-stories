#!/usr/bin/env bash
set -euo pipefail

project_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
backup_root="$(dirname "$project_root")/velvet-stories-removed-$(date +%Y%m%d-%H%M%S)"
moved=0

paths=(
  "velvet-stories"
  "supabase/functions/swift-task"
  "supabase/.temp"
  "character-chat-v5-emotional-follow.ts"
  "character-chat-v6-grounded-dialogue.ts"
  "character-chat-v7-name-validation.ts"
  "ChatsContext-v8-hide-on-regenerate.jsx"
  "VELVET_V7_AUDIT.md"
  "VERIFY_VELVET_V7.sh"
  "README-V71-MOBILE-UI.txt"
  "VERIFY_V71_MOBILE_UI.sh"
  "src/assets/velvet-logo.png"
)

for relative_path in "${paths[@]}"; do
  source_path="$project_root/$relative_path"
  if [[ ! -e "$source_path" ]]; then
    continue
  fi

  destination="$backup_root/$relative_path"
  mkdir -p "$(dirname "$destination")"
  mv "$source_path" "$destination"
  moved=$((moved + 1))
done

if [[ "$moved" -eq 0 ]]; then
  echo "No obsolete audit files were present. The project was already clean."
else
  echo "Moved $moved obsolete item(s) to: $backup_root"
  echo "Run git add -A so Git records the cleanup."
fi
