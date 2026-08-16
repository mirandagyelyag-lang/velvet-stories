# Velvet Stories v1.8.1 · Guarded Swipe

Restores swipe navigation/regeneration on character replies without taking ownership of vertical scrolling.

## Gesture rules
- Vertical movement wins immediately and remains native browser/Android scrolling.
- The swipe observer never calls `preventDefault()`.
- Only a one-finger, clearly horizontal swipe counts.
- Threshold: 72 px horizontally.
- Horizontal movement must be at least 1.8× the vertical movement.
- Vertical drift must stay under 48 px.
- Touches that begin on buttons, links, inputs, or text areas are ignored.
- The outer 28 px of each screen edge are ignored so OS/browser back gestures still work.
- Swipe left: next response, or generate another response if already on the newest version.
- Swipe right: previous response.
- Arrow navigation remains available.

No Supabase migration or Edge Function deployment is required.
