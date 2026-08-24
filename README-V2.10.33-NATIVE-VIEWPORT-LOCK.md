# Velvet Stories v2.10.33 — Native Viewport Lock

- Locks installed PWA rendering to device scale.
- Disables pinch-to-zoom and browser page scaling on Android/iOS.
- Preserves one-finger native vertical scrolling and horizontal rails/swipes while blocking page scaling.
- Preserves `interactive-widget=resizes-content` and the existing VisualViewport keyboard handling.
- Adds a final CSS authority so older `pinch-zoom` declarations cannot re-enable page zoom.
- Adds a runtime multi-touch/gesture guard as a second safety layer.
