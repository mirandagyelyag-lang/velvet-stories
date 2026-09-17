VELVET STORIES 3.52.49 · GROUP STORY HARD SCROLL FIX

Why 3.52.48 was not enough:
The modal still depended on intrinsic flex sizing. This patch gives the
dialog a definite viewport-based height and changes its layout to:

  header
  minmax(0, 1fr)  <-- only scroll owner
  footer

The middle .group-story-sheet__scroll is forced to overflow-y: scroll.

No Supabase changes. Frontend only.
Uses Node, not Python.
