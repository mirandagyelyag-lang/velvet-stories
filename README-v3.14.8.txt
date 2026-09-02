Velvet Stories v3.14.8 — Fluid Splash + PWA Asset Fix

Fixes the v3.14.7 production build stop caused by the approved cinematic PNG exceeding Workbox's default 2 MiB precache limit.

- Same approved dark artwork, converted losslessly from PNG to WebP.
- Artwork drops from ~2.35 MB to ~1.06 MB without changing the composition.
- Workbox receives 4 MiB precache headroom for future launch artwork.
- One-take fluid splash animation is unchanged.
- New verifier blocks the old oversized PNG and checks the PWA limit.
