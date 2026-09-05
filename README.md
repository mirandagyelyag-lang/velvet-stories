# Velvet Stories v3.24.1 · Stability Sweep

This release hardens the existing v3.24.0 Living World without changing the stable Gemini backend or SSE/Envelope Guard core.

## The 20 stability fixes

1. Definitive PWA deployment gate: Stability Lab → build → immutable deployment verification → stable phone alias → post-alias verification → rollback on failure.
2. Story options menu grouped into Story, World & Continuity, and Tools.
3. Living World health UI cleaned up with a compact Stability Sweep panel.
4. One-finger mobile scroll guards for chat sheets/drawers plus 16px mobile form fields.
5. Long-chat performance keeps the existing 40-message pagination and protected scroll ownership.
6. Living World prompt diet reduced to a compact 2800-character ceiling.
7. Metadata/world-state compaction caps lists, strips empty objects, bounds controls, and trims scene outfit/goal state.
8. Envelope Guard remains untouched and protected by hash checks.
9. Regenerate/refine/response-version generation has a synchronous double-tap lock.
10. STOP remains single-tap and keeps server cancellation + browser AbortController.
11. POV Lock diagnostics detect common user-control patterns.
12. Anti-repetition now feeds specific recent repeated openings/beats/cliches into the next Director hint.
13. Group Story safeguards remain covered by Stability Lab.
14. Canon conflict detection surfaces likely contradictions.
15. Canon locks explicitly outrank rumors, guesses, auto-memory, and private notes.
16. Secrets are only injected for characters explicitly listed in knownBy (or public/everyone).
17. Object/outfit cleanup drops empty continuity objects and bounds outfit text.
18. Boot/runtime recovery is protected from repeated repair loops and keeps local story data intact.
19. Living World Health shows version/update state plus live POV/repetition/canon/secrets checks.
20. UI consistency adds grouped menu labels, stable drawer scroll behavior, reduced-motion safety, and mobile-safe inputs.

## Protected core

- `supabase/functions/character-chat/index.ts`: unchanged from v3.24.0.
- `src/context/ChatsContext.jsx`: unchanged from v3.24.0.
- No Supabase function deploy is required for v3.24.1.

## Verification

`npm run stability:lab` runs:
- 20/20 Stability Sweep checks
- UI QA
- Mobile QA
- Story Engine QA
- Relationship Dynamics QA
- backend TypeScript syntax check

`DEPLOY-PWA-STABLE.sh` runs Stability Lab automatically before it is allowed to move `velvet-stories-ten.vercel.app`.
