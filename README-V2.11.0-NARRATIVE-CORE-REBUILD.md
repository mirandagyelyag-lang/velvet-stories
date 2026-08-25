# Velvet Stories v2.11.0 — Narrative Core Rebuild

This release was rebuilt from the user's full live project instead of another isolated hotfix.

## Narrative core
- Silent/blank continues must create a concrete beat instead of wall/pillar/gaze/breathing filler.
- User-authored time skips land in a changed active situation instead of resuming doorway surveillance.
- Immediate pose regression is blocked across adjacent character turns.
- Character initiative/flirt/drama/romance signals now also come from the written profile, not sliders alone.
- Physical movement is not automatically a no-touch/no-follow boundary. Explicit contact/pursuit boundaries remain hard.
- Soft social stops suppress forced contact while still requiring an active response or independent social pivot.
- `pass`, `passed`, and the common RP typo `past by` are recognized consistently as narrated movement.
- New chats, silent continues, time skips, charged cues and departures share the same beat policy and validation path.

## Architecture / speed
- Removed unused turn_reading, canon_claims and voice_plan JSON payload fields from the live model response.
- Removed dead duplicate narrative generation functions.
- Foreground streaming remains fast on ordinary turns; protected high-risk beats are quarantined until validation.
- Hard protected-beat failures cannot fall back to the rejected draft.

## Project integrity
- Removed the stale nested `velvet-stories-v216` project copy.
- New/branched conversations now use story engine version 13, matching the latest existing database migration.
- Edge diagnostics version is aligned to 2.11.0.
- Regression coverage includes the real Chase party, silent continuation and time-skip failures.
