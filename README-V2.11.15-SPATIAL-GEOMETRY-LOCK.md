# Velvet Stories v2.11.15 — Spatial Geometry Lock

This release preserves the successful pursuit/banter behavior from v2.11.14 while tightening physical geometry.

- Tracks the immediately previous character proximity together with the user's latest orientation.
- Rejects unstaged jumps from conversational/arm's-length range to ear, neck, cheek, face, or whispering distance.
- A wrist/forearm catch does not itself move the character's whole body into intimate range.
- A bare “leaned in” is insufficient after the user turns away.
- Allows intimate proximity when the reply visibly stages the missing step, coming alongside, or closing the remaining gap.
- Explicitly preserves pursuit and initiative so spatial correction does not regress into passive watching.
