VELVET STORIES v3.49.6 · RETRY PIPELINE FIX

- Retry now remembers what actually failed: normal reply, regenerate, next-version, refine, or director rewrite.
- A failed 3rd response attempt retries that response version instead of firing a duplicate normal turn.
- Normal-reply Retry is anchored to the exact saved user message id.
- Retry reconciles with Supabase first and recovers a reply that already finished while the phone was offline.
- Immediate in-flight lock prevents multi-tap duplicate retries.
- Retry button visibly changes to “Retrying…” while the attempt is active.
- Generation failures auto-clear once the exact failed turn is confirmed to have a saved character reply.
- v3.49.5 chat UI cleanup and all Narrative Core protections remain intact.
