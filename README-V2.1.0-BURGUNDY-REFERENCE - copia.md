# Velvet Stories v2.1.0 · Burgundy Reference UI

This release rebuilds the Stories mobile page from the supplied visual reference instead of applying another theme over the old layout.

## Stories
- Deep burgundy/black velvet background built with CSS layers.
- `PRIVATE LIBRARY` crown label and editorial `your STORIES` title.
- Glowing New Story action.
- Large search field plus functional filter menu.
- Functional Favorites, Archived and Trash collection cards with real conversation counts.
- Collection imagery is sourced from the user's own character/story art when available.
- Recent Stories use compact horizontal cards with cover art, title, preview, time and working actions.
- Favorites reuse the existing `is_pinned` field so no database migration is required.

## Navigation
The phone nav now follows the five-destination reference:
1. Stories
2. Discover
3. Chats
4. Memories
5. Profile

A dedicated Chats screen was added for active conversation threads so Stories and Chats are no longer duplicate navigation labels.

## Safety
- No Supabase schema changes.
- No Edge Function changes.
- Existing chat engine, Memories, Relationship Engine and AI behavior are untouched.
- Startup recovery and PWA cache recovery remain intact.
