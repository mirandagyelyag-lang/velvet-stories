# Velvet Stories v2.7.4 · In-Chat Actions Guard

Mobile action sheets now behave as true in-chat overlays.

- Next Beat closes Scene Director and stays in the current chat.
- Rewrite Last Reply closes Scene Director and regenerates in place without leaving the chat.
- Rewind To Here closes message actions, shows confirmation, and remains in the current chat.
- The floating mobile exit button is not mounted while any chat overlay is open.
- A short post-close exit guard blocks residual/ghost taps from reaching chat navigation.
- Back while a chat overlay is open closes overlays first instead of leaving the conversation.
