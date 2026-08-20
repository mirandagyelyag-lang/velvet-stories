# Velvet Stories v2.6.16 · Audio Center 2.0

This release upgrades Velvet's local ambience system without changing Supabase or the narrative Edge Function.

## What changed

- Seamless Loop: every ambience runs through two local HTMLAudio decks with a short constant-sum crossfade before the end, masking MP3 encoder gaps without making the overlap louder.
- True room crossfade: changing Rain → Café (or any other room) fades the old room down while the next one fades in.
- Audio Center 2.0: pause/resume ambience, persistent now-playing/paused state, Stop all, and separate voice controls.
- Per-room volume memory: Rain, Night, Street Racing, Café, Campus, Fireplace, Home TV and Party each remember their own level on the device.
- Scene suggestion: Velvet looks only at the recent visible scene text and offers an ambience suggestion. It never activates automatically and does not spend an AI request.
- Mobile resilience: hiding the PWA pauses ambience and returning resumes the same room instead of restarting or stacking another copy.
- Ambience Quality Check in Diagnostics: local-only analysis for quiet edges, possible clipping and obvious loop-edge mismatch.

## Safety

- No WebAudio noise generators were reintroduced.
- No new database migration.
- No Edge Function deployment required.
- Existing ambience MP3 files are preserved.
