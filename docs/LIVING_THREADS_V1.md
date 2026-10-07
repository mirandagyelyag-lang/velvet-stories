# Living Threads V1 — 3.54.18

## A. Audit of the existing system

The repository at `ae3f41ef3de21d692dab718c7de22dac3671ef1a` was audited against production frontend 3.54.17 and Supabase `character-chat` deployment 489 before editing. Existing systems already include `unresolved_threads`, source-linked memories, `story_revision`, undo, regeneration, scene and relationship state, character intent, narrative momentum, arcs, plans, conflicts and consequences. Production's subscriber generation limits and usage telemetry had not reached the repository; this release preserves that live code.

The database audit found 171 stories, with existing threads on four stories. The old reducer used substring matching and had no durable subject identity, evidence-based evolution or exact thread restoration. The primary fast response was plain prose, so continuity metadata was normally absent even though a larger response schema existed elsewhere.

## B. Scope and reuse

This release implements Living Threads only. It uses the existing conversation JSON columns, model call, SSE transport, undo RPC and thread surfaces. It adds no tables, columns, extraction model call or new screen. Character Intent, Momentum, Canon Engine, Pulse 2.0 and time-away development remain subsequent phases.

## C. Thread state

`engine/living-threads-v1.js` normalizes old strings and objects lazily as a story continues. Existing IDs and source data survive. Each new matter has a stable ID and subject key independent of its type: jealousy may develop into concealed attraction without becoming two matters. Explicit IDs, subject keys and conservative lexical matching reduce duplicates.

States are `open`, `developing`, `resolved` and `abandoned`. Threads retain bounded source message IDs, accepted evidence, turn counters and the previous summary. Closed matters remain available for duplicate prevention but are excluded from active prompt pressure and current thread UI. Reopening requires a grounded, explicitly referenced new event.

## D. Canon, regeneration and undo

The model proposes at most three updates alongside the reply. The reducer accepts an update only when its quoted evidence occurs in the final saved reply, the perceptible user turn, or a known surviving context message during first adoption. Evidence from a discarded draft, invented message IDs or private user thoughts is rejected. A future promise alone cannot resolve a thread.

An exact before-image in `intelligence_state.living_threads_v1.undo_snapshot` restores prior matters during latest-reply regeneration and “This didn't happen.” Migration `20261007144948_living_threads_v1_undo.sql` updates the existing ownership-checked, SECURITY INVOKER RPC and returns restored state to the client. Story revision and last-thread-message compare-and-set guards reject stale or simultaneous background state writers.

Older or legacy regenerations without a trustworthy before-image conservatively invalidate branch-derived V1 state and rediscover it from the surviving transcript. This V1 does not provide full historical replay of every narrative subsystem.

## E. Prompt and latency

The primary generation requests a lean JSON envelope containing `reply` first and `thread_updates`. The existing SSE parser streams only the reply. A provider schema rejection retains the existing plain-prose fallback, which may return no thread metadata. Recovery output cannot carry unsupported metadata from an earlier draft into canon.

Limits: three proposed updates, two new matters, three focus threads, sixteen active matters and eight archived matters. Pre-existing over-limit active data is preserved. The compact registry is capped at 2,200 characters; focus considers relevance, character, importance, age and cooldown. A callback is available context, never a mandatory event. The output allowance increases by 450 tokens for metadata, so V1 has bounded additional token/latency cost rather than zero cost.

## F. Verification

Passed locally: lint of all touched JavaScript, JSX and TypeScript files (existing warnings), production build, install-lock checks, Edge boot checks, TypeScript syntax checks, original chat reliability tests, 12 conversation checks and 10 relationship checks. `npm run verify:living-threads` passes 13 reducer tests and seven checks executing the actual Edge parser and transports in a mocked runtime.

The 50-turn Roman fixture verifies state persistence, evolution, closure and bounded prompts; it is **not a 50-turn live-model narrative benchmark**. Live quality, subjective continuity, latency and cost still need that separate benchmark.

The undo SQL fixtures and the existing undo regression passed on the actual Supabase database under the authenticated role, within transactions that roll back all fixtures. They cover older-thread preservation, rejected-event removal, ownership, isolation, invalid snapshots and stale/concurrent state commits. The migration introduces no new security advisor findings.

Legacy verifier gaps reproduce at the unchanged baseline: the story-engine script passes 23/26 with the same three old expectations; the UI script references removed `GroupStoryModal.jsx`; the mobile script reports the same 32 static expectation failures. Full-repository lint also encounters existing syntax errors in `verify-v35275-autonomous-story-flow.mjs` and `verify-v35380-relationship-living-memory.mjs`. The entire legacy suite is therefore not claimed green.

## G. Practical limits and next evaluation

Evidence grounding checks that a quote is canonical; it cannot prove every semantic interpretation of that quote. Subject-key and lexical deduplication are conservative and cannot guarantee that every differently worded semantic duplicate merges. Repairs and plain-prose fallbacks can temporarily yield no new thread updates; a later turn can adopt accepted surviving history. No production story rows are backfilled by the migration.

The next evaluation is a real 50-turn Roman story with minimal user invention, measuring whether relevant matters return naturally, evolve rather than echo, close only on-page and survive regeneration without forcing the plot. The shipped technical fixture must not be substituted for that evaluation.
