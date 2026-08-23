# Velvet Stories v2.10.21 — Background Reply Delivery

- Character replies are now enqueued as durable server-side work before generation begins.
- `EdgeRuntime.waitUntil` consumes the internal roleplay stream server-to-server, so Android may suspend or close the PWA without cancelling the reply.
- While Velvet is visible, the chat polls the canonical messages table and shows the finished reply as soon as it is persisted.
- If Velvet sleeps, the reply is recovered from Supabase immediately when the app wakes or the chat is reopened.
- Explicit STOP still cancels the server-side generation through `generation_requests`.
- The previous foreground SSE flow remains as a compatibility fallback if enqueueing is unavailable.
