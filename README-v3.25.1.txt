VELVET STORIES v3.25.1 · UPDATE FIX

This release keeps all v3.25.0 Velvet Experience features and fixes the update path that could leave the phone on an older shell.

Update fixes:
- generic pending-update key instead of a stale release-specific key
- checks every registered service worker for updates
- Repair updater clears Velvet shell/media caches and unregisters stale workers
- Repair updater reloads with an explicit target-version marker
- deploy validates an immutable Vercel URL before moving the phone alias
- deploy always ends with an explicit PASS or FAIL message
- alias is never moved to a deployment that cannot prove velvet-version.json = 3.25.1

Protected:
- character-chat backend unchanged
- ChatsContext / SSE / Envelope Guard unchanged
- no database migration
- no Supabase deploy required
