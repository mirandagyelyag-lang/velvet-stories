# Velvet Stories v2.8.2 — Fast Natural Roleplay

Latency pass for the v2.8.1 naturalism engine.

- Keeps REACT, DON'T INVENT and the Naturalism Doctor.
- Style-only warnings no longer trigger a second Gemini generation.
- Continuity metadata is protected deterministically and never causes a repair call.
- Severe user-facing naturalism violations can still spend the single bounded repair.
- Gemini failover shares one 24-second interaction budget; one model cannot stall for 26 seconds per fallback.
- Context fetch/prompt windows are trimmed while recent transcript, recap, memories and lore remain available.
- Removes a redundant cancellation read-back before generation.
- Adds first-draft and repair latency telemetry.
