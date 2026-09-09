# v3.50.9 Reply Assist Edge Isolation

Help me reply now uses its own lightweight `reply-assist` Edge Function instead of routing through the very large `character-chat` function. This isolates transport/startup failures from the story generation runtime. Generate more and clear-on-selection behavior from v3.50.8 remain intact.
