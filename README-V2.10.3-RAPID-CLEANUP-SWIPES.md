# Velvet Stories v2.10.3 · Rapid Cleanup Swipes

- Chats and character Memories delete with an intentional left-to-right swipe.
- No confirmation dialog in the rapid-clean flow.
- Horizontal intent must clearly beat vertical movement and cross an 86px threshold.
- Deleted rows disappear immediately while the real write waits briefly for Undo.
- Consecutive deletes are grouped into one batch Undo (`Undo all`) with a 5.2s window refreshed after each swipe.
- Batch Undo sits near the top of the screen so it does not cover the next row or bottom navigation.
