VELVET STORIES v3.49.12
Mobile Experience + Character Polish Completion

This cumulative release includes four internal upgrades:

v3.49.9 · Chat Mobile 2.0
- Persistent per-conversation scroll anchors that survive layout changes and app restarts.
- Reader-safe incoming messages: if you are reading older content, Velvet does not drag you to the bottom.
- Unread counter on the jump-to-latest control.
- Keyboard-aware composer sizing and Android safe-area handling.
- Long-press-first message interactions on touch devices.

v3.49.10 · Message Actions Rebuild
- Native-style bottom sheet on mobile.
- Quick actions: Copy, Edit/Regenerate, Memory, More.
- Permanent ellipsis clutter hidden on touch while long-press keeps actions available.
- Compact version controls only when multiple versions exist.
- Quality tools remain available under More.

v3.49.11 · Character Voice Audit 2.0
- Blind-test voice fingerprint for cadence, directness, humor, register, question habits, conflict, affection and verbal tells.
- Detects generic clone cadence, question drift, emotional-fluency drift, opening-shape repetition, length drift and register drift.
- Voice drift participates in deterministic naturalness scoring and repair.
- Supporting-cast collision watch helps prevent different characters from sharing one generic Velvet voice.

v3.49.12 · Startup / PWA / Android Reliability
- Native Android pause/resume bridge.
- Route and reading-position recovery after backgrounding.
- PWA update checks on resume/connectivity restoration with storm protection.
- Boot-ready splash dismissal plus watchdog fallback.
- Chat refreshes after resume while preserving the reading anchor.

Privacy
- Resume state stores only technical navigation/lifecycle state.
- Existing v3.49.8 debug reports remain local and exclude roleplay text by default.

Installer safety
- .env*, .git, .vercel, node_modules and local data are preserved on the user's existing project.
- Tests and build run before Supabase/GitHub/Vercel deployment.
