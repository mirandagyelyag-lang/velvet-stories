# Velvet Stories v1.7.1

Hotfix for the v1.7 mobile regression and Gemini quota behavior.

- Restores reliable vertical chat scrolling on touch devices.
- Disables swipe-to-regenerate interception for touch; version arrows remain.
- Restores three-dot message actions on mobile.
- Keeps the header menu available even in Reading Mode.
- Advisory quality issues no longer trigger a second Gemini call.
- Adds Gemini 3.1 Flash-Lite as a third emergency fallback.
- Utility character tools prefer lower-cost Flash-Lite models first.
- A 429 is reported as rate limiting, not falsely as proof the daily free tier is exhausted.
- Roleplay thinking is MINIMAL to reduce token pressure.
