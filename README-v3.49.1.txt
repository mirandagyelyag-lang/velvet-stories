VELVET STORIES v3.49.1 · INSTANT STORY RELIABILITY + LATENCY HOTFIX

Fixes the first production bug after Narrative Core Completion.

- Instant Story has a real client abort deadline instead of an ignored timeout option.
- Edge generation uses compact character context and a strict 10.5s global AI deadline.
- Each Gemini attempt is capped at 4.2s and production model is tried before fallbacks.
- Provider failure returns a grounded local opening instead of leaving the button dead.
- Instant Story now surfaces actionable errors on the character profile.
- Cached default persona is passed into story creation to avoid a redundant lookup.
- Fresh conversations skip the guaranteed-empty messages SELECT, removing one serial database round trip.
- No database migration required.
