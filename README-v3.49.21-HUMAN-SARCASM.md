# Velvet Stories v3.49.21 · Human Sarcasm Response Lock

Fixes the failure where obvious sarcastic contradiction was recognized but then turned into an over-written semantic riff.

- Payload/topic echo remains forbidden.
- Semantic-field riffs are rejected (e.g. canonized/divine/miracles after a Jesus payload).
- One short sarcastic cue cannot trigger a multi-line comedy monologue.
- `pragmatic_sarcasm_miss` is now a hard repair issue.
- If the bounded model repair still misses the speech act, Velvet uses a compact character-shaped fallback that answers the challenged claim without inventing user actions.
- v3.49.20 and v3.49.19 verifiers are regression-safe for descendant releases.
