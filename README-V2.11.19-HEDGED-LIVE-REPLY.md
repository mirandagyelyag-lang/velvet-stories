# Velvet Stories v2.11.19 — Hedged Live Reply

- Removes the user-facing first-token timeout introduced in v2.11.18.
- Starts the primary model immediately, then silently hedges with fallback models only if no visible reply has begun.
- The first model to emit real roleplay prose wins; slower requests are cancelled.
- Visible prose is never reset because another model was slow.
- Keeps all narrative validators and the bounded repair path from v2.11.18.
