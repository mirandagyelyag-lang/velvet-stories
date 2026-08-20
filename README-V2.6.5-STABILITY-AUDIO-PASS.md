# Velvet Stories v2.6.5 · Stability & Audio Pass

This release is a stabilization pass after the v2.6 ambience/voice work.

- Audio Center: one now-playing state, Stop all audio, separate voice/ambience volume, crossfades, single active ambience, pause on app background.
- Device Voice: language/favorites filtering, exact-device preview, local voice volume, and an explicit neural-ready engine boundary without pretending device TTS is neural.
- PWA Update Doctor: production version beacon, manual update check, Update now, shell-cache cleanup, interrupted-update recovery, version/build visibility.
- Bug Reporter: copyable technical report with version, route, device, last runtime/AI error. Private chat excerpt is opt-in only.
- Story Engine Regression Shield: permanent checks for continuity resets, repeated openings, invented props, POV violations, off-screen knowledge, Next Beat/Rewrite targeting, Mature Mode reloads and Group Story identity.
- Mobile QA Shield: 360–430px viewport guardrails, native one-finger scroll, safe-area/keyboard protection, phone sheet width caps, and a dedicated `npm run verify:mobile` gate.
