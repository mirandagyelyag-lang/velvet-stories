# Velvet Stories v2.7.0 · Living Scenes

A story-experience release focused on scene continuity, emotional aftermath, and quieter guidance.

## What changed

- **Dynamic Scene Header** shows only established location, time/daypart, ambience, presence, and Continuity Guard state. It never invents a clock time.
- **Continuity Guard 2.0** blocks silent location/time changes, silently dropped present characters, off-screen hearing, unsupported re-entry, and invented plot objects. A single repair path still handles unsafe drafts.
- **Emotional Residue 2.0** gives major emotional beats graded intensity and slower decay so characters do not snap back to neutral after confessions, fights, rejection, kisses, boundaries, or major reveals.
- **Presence Engine 2.0** carries the current roster forward until an explicit exit or genuine scene transition, and marks characters outside the scene after transitions.
- **Editorial Scene Breaks** derive a small separator such as “The next morning” or “Later that night” when a real scene/time transition occurs and the model did not provide one.
- **Smart Story Suggestions** are local and deterministic. They use already-known emotional residue, commitments, presence, absence, and location. They never make a model call and never auto-generate a reply.

## Deployment

No database migration is required. The `character-chat` Edge Function changed and must be redeployed, then the frontend can be deployed to Vercel.
