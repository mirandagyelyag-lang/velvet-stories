# Velvet Stories v2.6.3 · Voice Playback Stability

- Centralized browser speech playback in `src/utils/speech.js`.
- Keeps a strong reference to the active `SpeechSynthesisUtterance` so Android/Chrome cannot garbage-collect it mid-playback.
- Separates `cancel()` and the next `speak()` by a short delay to avoid Android Chrome immediately interrupting a newly selected voice.
- Resolves the exact `voiceURI` first, then the legacy voice name.
- Voice tests and chat Listen/Stop use the same playback controller.
- Closing the chat or Story Hub still stops speech immediately.
- No Supabase schema or Edge Function changes.
