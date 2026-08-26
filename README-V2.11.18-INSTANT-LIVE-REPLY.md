# Velvet Stories v2.11.18 — Instant Live Reply

- Foreground roleplay always paints reply text optimistically as Gemini streams it.
- Validation and the single bounded repair no longer quarantine the first words.
- The visible draft remains on screen while repair runs; a finished repair swaps in only when ready.
- If Gemini times out after producing readable roleplay prose, Velvet salvages that prose instead of showing a Retry card.
- Models that produce no reply quickly fail over after a short first-token budget.
- Repair gets a short bounded deadline and fails soft to the readable live draft.
- Existing pursuit, spatial, social-role, memory, banter, reaction and body-state guards remain enabled.
