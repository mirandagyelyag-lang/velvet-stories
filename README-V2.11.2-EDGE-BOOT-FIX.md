# Velvet Stories v2.11.2 — Edge Boot Fix

Hotfix for the `character-chat` Edge Function startup failure introduced during the v2.11 transport restoration.

- Removes two truncated, unused legacy function declarations that made `index.ts` syntactically invalid.
- Keeps the v2.11.0 narrative core changes intact.
- Keeps the v2.10.39 foreground/background transport path intact.
- No prompt or character-behavior changes in this hotfix.
