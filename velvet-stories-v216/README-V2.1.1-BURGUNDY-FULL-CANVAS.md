# Velvet Stories v2.1.1 · Burgundy Full Canvas

Fixes the desktop scroll leak where the Burgundy Stories surface ended before the browser document and exposed Velvet's light global background.

- Adds a temporary `velvet-burgundy-route` class to `html` and `body` while Stories is mounted.
- Forces the app/content canvas to remain Burgundy for the entire document and viewport.
- Removes the class cleanly when navigating away so other Velvet pages keep their own theme.
- Keeps the existing sidebar, cards, collections, recent stories, mobile navigation, chat engine and Supabase behavior unchanged.
