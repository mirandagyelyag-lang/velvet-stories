VELVET STORIES v3.49.4 — GENERATION RECOVERY

- Adds a fourth production recovery lane (gemini-3.5-flash by default, configurable with GEMINI_RECOVERY_MODEL).
- Uses LOW thinking for roleplay stream attempts to reduce latency and token pressure.
- A complete visible reply is no longer discarded if SSE/metadata ends badly afterwards.
- The overall deadline salvages a complete reply before showing the final Retry surface.
- Existing v3.49.3 silent failover remains intact.
