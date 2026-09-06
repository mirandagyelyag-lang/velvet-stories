VELVET STORIES v3.49.2 · INSTANT STORY COMPLETE OUTPUT + FAST HEDGED GENERATION

Bug fixed:
- Instant Story could wait too long and still accept a cut fragment such as:
  “You’ve been staring at that menu for ten minutes. It’

What changed:
- Incomplete responses are rejected deterministically.
- MAX_TOKENS / safety / malformed finish reasons cannot count as success.
- Missing terminal punctuation, dangling contractions, and unbalanced quotations are rejected.
- Gemini attempts are hedged instead of waiting serially.
- Primary starts immediately, fallback after 650 ms, emergency after 1350 ms.
- Global AI wait is bounded to ~6.8 seconds; client bound is 9 seconds.
- Output budget increased to 900 tokens so model thinking cannot starve visible prose.
- The first COMPLETE result wins; unfinished attempts are aborted.
- If no provider returns a complete opening quickly, Velvet uses a complete local fallback.
- Client also refuses incomplete output as a second safety net.

No Narrative Core guards were disabled.
