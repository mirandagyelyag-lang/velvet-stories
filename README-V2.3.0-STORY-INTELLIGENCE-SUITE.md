# Velvet Stories v2.3.0 · Story Intelligence Suite

This release focuses on six coordinated upgrades without adding background AI calls.

1. **Chat Intelligence 2.0** keeps a persistent continuity ledger for established objects, who knows what, unresolved commitments, scene state and immediate stakes. Visible transcript remains authoritative.
2. **Smart regeneration** adds one-tap fixes for wrong continuity, out-of-character voice, overly cold/romantic tone, dialogue balance and repetition. Feedback reaches the same regeneration request immediately.
3. **Memory capture 3.0** records only durable, user-grounded memories and prioritizes promises, boundaries, conflicts, meaningful preferences and relationship milestones. Ordinary banter is filtered out.
4. **Story Timeline** records only meaningful beats, gives them a type/importance, links them back to the source message, and builds a short deterministic recap without another model call.
5. **Phone-first Character Studio wizard** becomes Essence → Relationship → Depth → Voice → World → Opening, one section at a time on phones with Back/Continue and autosave intact.
6. **Native-performance pass** lazy-loads all major routes, opportunistically preloads likely next screens, lazy-loads character art and periodically checks the installed PWA for updates when the app becomes visible.

Backend changes require the `202608170002_velvet_v230_story_intelligence.sql` migration and a redeploy of `character-chat`.
