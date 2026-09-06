VELVET STORIES v3.40.0 · Calendar + Life Simulation

This release gives story time a persistent, conservative world model:
- story clock and temporal anchors
- explicit plan/commitment continuity
- character routines and availability without invented precision
- schedule conflicts and missed-obligation consequences
- travel ordering and no two-places-at-once behavior
- off-screen routine progression without unseen major milestones
- temporal-language truth lock
- Timeline + Life Simulation Lab in Diagnostics

It reuses the existing story_calendar_events, story_plans, scene/intelligence JSON state, and existing persistence infrastructure.
No new database migration is required.
