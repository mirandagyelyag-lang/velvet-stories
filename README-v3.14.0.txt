VELVET STORIES v3.14.0 · NATIVE POLISH PASS I

Android-only polish without changing the story engine:
- Native Android splash is now the only splash in the installed app (no second web splash).
- System status/navigation icon contrast follows Velvet Light, Dark and Comfort themes.
- Android safe-area insets are bridged into CSS for the bottom dock and chat composer.
- Android back gesture/button navigates Velvet history, closes creator, or exits from root.
- Keyboard uses adjustResize and native viewport tracking so the composer stays above it.
- Tasteful native haptics on primary navigation, send/stop and destructive controls.
- Existing gold VS Android launcher icon remains the definitive app icon.
- Installer now includes the Java 21 + Android SDK + Gradle fixes learned during v3.13.17 setup.

Web/PWA behavior remains separate. The Android build still contains no service worker.
