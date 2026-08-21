# Velvet Stories v2.8.0 · Chat Experience Polish

A stability-first chat polish release built on v2.7.4.

## What changed
- Immediate, quiet feedback for Next Beat, Rewrite, Regenerate, Rewind, Memories and saved moments.
- Compact AI phases: Sending, Thinking, Writing, Finishing, Retrying and Stopped.
- Rewind now creates a temporary safety snapshot and offers a 10-second Undo without leaving the chat.
- Rewrite, refine and regenerate keep their prior reply and expose Undo.
- Response versions stay visible as `1 / N`, refresh immediately after regeneration, and remain selectable.
- Streaming paints are adaptively batched for smoother mobile scrolling.
- A failed pre-save send restores the typed draft and reply target instead of eating the message.
- v2.7.4 in-chat navigation guard remains intact.

No Edge Function behavior change is required for this release.
