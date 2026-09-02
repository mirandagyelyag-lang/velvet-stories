Velvet Stories v3.14.7 — One-Take Fluid Splash Build Fix

This keeps the v3.14.6 one-take dark cinematic splash, but fixes the CSS serialization bug that wrote literal \n tokens into welcome-splash.css and made LightningCSS/Vite abort before deployment or Android installation.

Added:
- real CSS line breaks
- regression verification against literal escaped-newline tokens
- version/install labels updated to 3.14.7

The visual design and continuous one-image timeline are otherwise unchanged.
