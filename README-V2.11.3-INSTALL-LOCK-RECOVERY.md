# Velvet Stories v2.11.3 — Install Lock Recovery

Hotfix-only release. Narrative behavior and the v2.11.2 Edge Function boot fix are unchanged.

## Fix
- Restores `package-lock.json` from the user's known-good v2.10.39 project tree.
- Changes only the root project version metadata to 2.11.3.
- Removes the corrupted `baseline-browser-mapping` lock entry introduced during an interrupted install attempt.
- Keeps the dependency graph identical to the previously installable project.

## Why
The broken lock recorded `baseline-browser-mapping` 2.11.22/resolved URL while retaining the integrity hash from 2.11.12, which can make `npm install` fail before Vite starts.
