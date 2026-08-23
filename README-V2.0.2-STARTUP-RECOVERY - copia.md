# Velvet Stories v2.0.2 — Startup Recovery

This release keeps the v2.0.1 dialogue-oriented chat UI and adds a hardening layer for Android/PWA startup.

## Changes
- React error boundary around the entire provider tree.
- One-tap `Repair & reopen Velvet` recovery that unregisters service workers and clears CacheStorage without deleting localStorage drafts/settings.
- Boot watchdog in `index.html` that can recover even when the React application bundle never mounts.
- One automatic recovery attempt when the installed PWA is online but the root stays empty.
- Service worker registration errors no longer disappear silently.
- Storage access in the earliest providers/splash is guarded.
- Vercel revalidation headers for `/`, `/index.html`, and `/sw.js`.
- v2.0.1 dialogue UI is preserved.

No database or Supabase Edge Function changes.
