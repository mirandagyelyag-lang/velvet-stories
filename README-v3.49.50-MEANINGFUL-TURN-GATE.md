# Velvet Stories v3.49.50 · Meaningful Turn Gate

Structural no-move guard. Rejects empty time/atmosphere/stillness placeholders such as “A beat passes.” based on lack of a character-owned move, rather than phrase blacklists. Preserves target-aware dialogue, spoken naturalness, and turn-state ownership.

Root cause fix: removes the deterministic `A beat passes.` safety fallback from `sanitizeValidatedHardIntentResult`; rejected repairs are no longer converted into empty filler prose.
