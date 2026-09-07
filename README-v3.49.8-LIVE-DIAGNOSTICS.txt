Velvet Stories v3.49.8 · Invisible Reliability + Live Diagnostics

What changed
- Local-only generation traces for reply/regenerate/version/refine/director rewrite.
- Records technical model trail, provider attempt phases, Edge HTTP status, first-text time, total time, fallback/recovery path, context counts and failure category.
- Never records prompts, replies, memory text, lore text, tokens, API keys or full account/conversation identifiers in generation traces.
- Gemini failover now emits silent diagnostic events for launch, provider HTTP failures, transient retry, compatibility fallback, winner, salvage and overall deadline.
- Velvet Doctor adds Live generation diagnostics with recent traces, summary and one-tap Copy debug report.
- Chat menu adds Copy debug report. It excludes chat text by default.
- Existing Report a problem automatically includes the last technical generation traces; private chat excerpt remains opt-in only.

Use
Open a story → ⋯ → Copy debug report.
Paste that report into ChatGPT when a generation bug happens.

Tests
- v3.49.8 Live Diagnostics Lab: 31/31
- v3.49.7 regression: 30/30
- Retry Pipeline: 21/21
- UI: 244/244
- Mobile QA: 63/63
- Story Engine: 26/26
- Relationship Dynamics: 10/10
- Full Stability Lab: PASS
- character-chat TypeScript syntax: PASS

Build note
The clean package intentionally contains no node_modules. The installer runs npm install and npm run build before deploying.
