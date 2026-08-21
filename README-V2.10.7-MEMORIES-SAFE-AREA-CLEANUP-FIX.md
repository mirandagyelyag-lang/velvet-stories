# Velvet Stories v2.10.7 · Memories Safe Area + Cleanup Fix

- Memory character detail now reserves enough bottom safe area for the floating five-tab dock, so final memories and Add memory never sit underneath navigation.
- Memory book header receives a quiet sticky treatment while scrolling long books.
- Stories rapid cleanup now removes the exact row from local state immediately and only keeps a snapshot for Undo.
- Undo remains 2.5 seconds and backend commits happen after the brief Undo window.
