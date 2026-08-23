# Velvet Stories v2.0.0 — Mobile Rebuild

This release rebuilds the phone experience around one canonical mobile stylesheet instead of stacking version-specific hotfix layers.

## What changed

- One mobile foundation: `src/styles/velvet-mobile-foundation.css` is the only phone-specific override layer loaded by `main.jsx`.
- Removed obsolete mobile hotfix styles from v7.1 through v1.9.3 so they cannot fight over `overflow`, `position`, `height`, touch gestures, composer grids or headers.
- Native one-finger document scrolling in chat. No nested chat scroller.
- Permanent phone Back control portaled to `document.body`, independent of Reading Mode/header visibility.
- Phone chat header has stable slots for avatar/title, Relationship and Story Options.
- Short chats place the composer immediately after the story; long chats use the bottom composer.
- Composer has explicit Director / textarea / send slots, 16px text, safe-area and keyboard offset handling.
- Guarded horizontal swipe remains available while vertical movement keeps priority.
- Message actions, Story Options and Scene Director are phone bottom sheets rendered above chat chrome.
- Message tap / long-press access remains available, including opening AI messages.
- Memories 2.5 has phone-first one-column layout and explicit Back navigation.
- Relationship Engine and AI Status are reachable from chat Story Options. AI Status also returns through browser history correctly.
- Character Studio is full-screen on phones and retains local autosave/recovery.
- Stories, Discover, Profile, Settings, Memories, Personas, Lorebooks, Diagnostics and Character Detail have canonical phone layouts.
- Major drawers/modals become bottom sheets or full-screen phone surfaces with safe-area padding.
- Existing real Gemini streaming, Story Engine, Memories, Relationship Engine, Scene Director, PWA update flow and diagnostics are preserved.

## Verification

- `npm run verify:story`: 114 checks
- `npm run verify:ui`: 41 checks
- All project JSX/JS/TS syntax parsed successfully with the TypeScript parser during packaging.
- Canonical mobile CSS parsed successfully with PostCSS during packaging.

The packaging environment could not complete `npm ci` because the container package client failed, so run the production Vite build locally before pushing.

## Deploy

No database migration or Edge Function change is introduced by v2.0.0 itself. If v1.9.x backend changes are already deployed, this release is frontend-only.

```bash
npm ci
npm run verify:story
npm run verify:ui
npm run build

git add .
git commit -m "Velvet v2 mobile rebuild"
git push origin main
```
