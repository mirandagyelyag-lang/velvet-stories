VELVET STORIES v3.49.0 · NARRATIVE CORE COMPLETION

This cumulative release completes the current narrative-core roadmap in one update.

v3.45 · Prose Intelligence + Adaptive Narrative Style
- Beat-aware word/structure targets, dialogue density, gesture/interiority budgets.
- Detects cinematic AI stock, narration swallowing dialogue, repeated reply architecture and explained subtext.

v3.46 · Generation Orchestrator + Context Budget
- Activates only context capable of changing the current turn.
- Bounded recent history, memory, lore and cast retrieval by turn mode.
- Hidden engine/budget language is forbidden in visible prose.

v3.47 · State Persistence + Recovery Integrity
- Deterministic recovery checkpoint per user turn.
- Normal retry of the same user turn is idempotent when a canonical reply is already persisted.
- Explicit regeneration remains a separate replacement path.
- Rewind/background/network recovery preserve branch truth.

v3.48 · Production Performance + Mobile Hardening
- Dynamic failover hedge/deadline plan and response ceiling by turn mode.
- Dynamic cancellation polling while preserving guarded validation.
- Mobile/background recovery never weakens canon/privacy/physics/persistence.

v3.49 · Velvet Stability 2.0
- Cross-system stress tests for Prose, Orchestrator, Recovery, Performance and the complete historical Stability Lab.
- Existing UI/mobile/story/relationship protections remain active.

No new Supabase migration is required by this release.
