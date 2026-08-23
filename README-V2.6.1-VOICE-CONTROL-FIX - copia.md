# Velvet Stories v2.6.1 — Voice Control Fix

- Voice selection stores the exact device `voiceURI` when available.
- Playback resolves `voiceURI` first and legacy voice name second.
- Chat message Listen toggles to **Stop voice** while speaking.
- Story Hub voice Test toggles to **Stop**.
- Leaving Chat or Story Hub cancels speech synthesis.
- Browser/device TTS still depends on voices actually installed by the operating system.
