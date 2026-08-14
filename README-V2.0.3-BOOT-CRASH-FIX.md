# Velvet Stories v2.0.3 — Boot Crash Fix

- Fixes the invalid Unicode regular expression that crashed JavaScript before React mounted.
- Removes the login-background preload because the image is not guaranteed to be used during initial load.
- Adds automatic recovery when a stale hashed stylesheet returns 404.
- Keeps the v2.0 mobile rebuild and v2.0.1 dialogue-first UI unchanged.
