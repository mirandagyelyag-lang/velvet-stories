# Velvet Stories v2.11.10 — Turn Freshness Lock

- Exact or near-full repeats of a recent assistant reply are now a protected narrative failure.
- The first 52 characters of ordinary live streams are quarantined long enough to catch accidental replay before it becomes visible.
- User movement such as `I went to my room` is recognized as an authoritative scene relocation and validated before display.
- A final pre-save guard refuses to persist a duplicated previous reply even if an upstream repair somehow misses it.
- Repair instructions explicitly continue after the latest user action rather than replaying the prior beat.
