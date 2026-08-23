# Velvet Stories v1.9.2 · Message Sheet Portal Hotfix

Fixes the Android/PWA bug where tapping a message blurred the chat but the action sheet rendered outside the visible viewport.

- Message action sheet now renders through a React portal directly under `document.body`.
- Mobile sheet uses viewport-fixed positioning independent of chat stacking contexts.
- Mobile entrance animation is disabled for this sheet to avoid transform/viewport glitches.
- Sheet keeps native vertical scrolling and safe-area padding.
- No Supabase or database change is required.
