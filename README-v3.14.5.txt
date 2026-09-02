Velvet Stories v3.14.5 — Fullscreen Splash Fix

Fixes the Android splash artwork rendering as a small card/rectangle on the left.
Cause: the generic `.velvet-splash img` web rule had higher CSS specificity than the native image class and forced the artwork width to min(180px, 42vw).

Now:
- the web-only image rule is scoped away from native Android
- every native reveal layer is forced to 100% x 100% of the splash stage
- the approved dark Velvet artwork remains unchanged
- object-fit: contain preserves the whole logo without cropping
- cinematic slice/sweep/flash animation remains intact
