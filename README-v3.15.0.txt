VELVET STORIES v3.15.0 · ANDROID LAUNCH RESET

The Android start path has been rebuilt instead of adding another splash patch.

What changed:
- Android now has one native system splash only. The old 3.06 second React cinematic overlay is never mounted in the installed app.
- Heavy cinematic launch artwork is no longer imported by the startup component, reducing Android startup decoding/work.
- The short React auth-restoration gap uses a tiny dark VS bridge that matches the native launch background instead of showing “Opening Velvet…”.
- Android splash, window background and WebView boot background are the same deep ink tone to remove white/cream flashes.
- WebView overscroll glow and browser scrollbars are disabled; zoom is disabled at the WebView level.
- visualViewport updates are requestAnimationFrame-throttled and no longer cross the native Capacitor bridge on every scroll/keyboard frame.
- Legacy service-worker/cache cleanup runs once per native version instead of on every app launch.
- Android version metadata is synchronized to 3.15.0.

Web/PWA keeps its lightweight one-time welcome splash. Story data, Supabase tables and the AI/story engine are not changed by this release.
