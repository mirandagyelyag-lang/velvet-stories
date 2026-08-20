# Velvet Stories v2.6.13 · Reference Ambience Library

This release rebuilds the chat ambience library around the sound references chosen for Velvet while keeping every bundled track original to the app.

- Rain: gentle, continuous night rain with individual droplets and no white-noise wall.
- Night: calm urban night bed with occasional distant traffic.
- Street Racing: separate from Night again, with faster engine passes and revs kept at reading-friendly distance.
- Café: warm low conversation, sparse ceramic clinks and subtle steam events.
- Campus: distant student chatter, footsteps and a quiet outdoor university bed.
- Fireplace: fire and crackles in front, almost-silent room behind it.
- Party: muffled next-room party with distant crowd and bass, not a full-volume club.
- Home · TV: quiet room with distant, unintelligible television voices and no wind/static bed.

Implementation notes:

- All eight modes are bundled MP3 assets and are available to the PWA cache.
- Ambience playback no longer synthesizes continuous white, pink or brown noise in the browser.
- Night and Street Racing are independent modes again; the existing database constraint already supports both.
- Only one ambience is allowed to play at a time. The old track fades out before the next begins.
- The tracks are Velvet-original audio generated for the app from high-level acoustic characteristics. No YouTube recording is copied or redistributed.
- `verify:ambience` permanently checks the eight-track mapping, assets, separation, and absence of browser noise generators.
