# Velvet Stories v2.9.2 · Mobile Library Polish

## What changed

- Removed the automatic **Possible next beat** card from Chat. Scene Director and manual Next Beat remain available.
- Added native-style **right-to-left swipe to Trash** in Stories and Chats. Deletion still respects confirmation settings and the existing Undo flow.
- Made **Characters** denser and more phone-friendly with a compact two-column cast, thumb-safe menus, and horizontal filter chips.
- Rebuilt **Memories** as a character-first library:
  - main view mirrors Characters with profile-photo cards;
  - each card is labeled `CHARACTER · NAME`;
  - tapping a character opens that character's memory book;
  - importance filtering lives only inside the selected character;
  - Pin, Canon, Edit, Delete and Add Memory remain available.

## Safety / architecture

- No Supabase migration.
- No changes to `supabase/functions/character-chat/index.ts`.
- Existing story deletion uses Trash + Undo instead of destructive permanent deletion.
