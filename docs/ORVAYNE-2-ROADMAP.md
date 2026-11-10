# ORVAYNE 2.0 — migration and implementation plan

Status: planning branch; no production changes.

## Current baseline (verified)
- React 19 + Vite 8, PWA and Capacitor Android.
- Supabase backend; `character-chat` Edge Function.
- Existing character, narrative continuity, NPC and regression systems.
- Current package version: 3.54.32.

## Product principles
- Keep ORVAYNE brand, ocean-blue design, and existing character identities.
- Inspiration from Tipsy Chat's category of experience, not copied proprietary code, art or branding.
- Do not generate in-app character images with AI.
- Preserve existing user chats and data; reversible, additive database migrations.
- Character leads scenes while user retains agency.

## Delivery slices
1. **Audit and instrumentation**: trace request -> edge -> model -> validator -> client; measure p50/p95 first-token and complete-response latency; inventory existing UI, database and tests. Do not claim a speed improvement without measurement.
2. **Streaming-first narrative engine**: first usable response stream, strict timeout budgets, bounded retry/fallback, nonblocking style checks, safe cancellation, provider error telemetry, no invented reply on provider failure.
3. **Story memory**: chat-scoped events, relationship state, scene location/time and speaker positions; retrieval by salience; editable summaries and privacy controls.
4. **Chat UX**: regenerate, edit, branch, multiple conversations per character, conversation list and draft persistence; protect original branches.
5. **Discovery and creation**: searchable character catalog, tags, favorites, author-controlled characters, opening scenarios, moderation/report controls.
6. **Visual refresh**: ocean-blue responsive shell, readable chat, restrained motion, accessible keyboard/screen-reader navigation; PWA cache migration.
7. **Release**: integration tests, mobile QA, staging preview, migration dry run, gradual rollout, rollback and backups.

## First engineering tasks
- Inspect `supabase/functions/character-chat/index.ts` and related validators for sequential model calls and unbounded rescue loops.
- Identify current React chat entrypoint and request transport; verify streaming support end-to-end.
- Add trace IDs and timing spans without logging private story text or credentials.
- Add a regression test asserting no more than one blocking model-generation pass per normal turn.
- Record baseline performance before modifying the request path.

## Acceptance criteria
- Existing characters, conversations and account access remain functional.
- User sees incremental text when supported, rather than waiting for full completion.
- Explicit timeout and recoverable error UX; no endless spinner.
- Story memory remains isolated per user and chat (RLS enforced).
- Regeneration/editing does not silently overwrite prior messages.
- Lint, build, existing regression suite and Android/PWA smoke checks pass.

## Deployment policy
Changes must be implemented and tested in a feature branch first. Do not deploy to production until verification and approval.
