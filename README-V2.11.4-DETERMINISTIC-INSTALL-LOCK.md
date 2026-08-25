# Velvet Stories v2.11.4 — Deterministic Install Lock

This hotfix prevents Vercel/npm from re-resolving `baseline-browser-mapping` to an unpublished version.

- Forces Vercel to use `npm ci`.
- Adds a root npm override pinning `baseline-browser-mapping` to `2.11.12`.
- Keeps the lockfile tarball pinned to the published `2.11.12` artifact.
- Adds `verify:install-lock` so a future `2.11.22`-style dependency drift blocks verification.
- Does not change the narrative engine or Supabase Edge Function behavior from v2.11.3.
