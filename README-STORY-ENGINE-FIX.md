# Velvet Stories — Story Engine Fix

This build fixes the narrative engine without changing the app design.

## What changed

- Regeneration notes are now the highest-priority instruction for that alternate take.
- A regeneration note no longer forces `scene_shift` unless it actually requests a time or scene change.
- The same direction is repeated at the top of both the system instruction and turn prompt so it cannot be buried by memories, controls, or story metadata.
- Diversity retries must preserve the outcome requested by the user instead of choosing a conflicting direction.
- The engine may advance the present story through character decisions and consequences while still protecting established canon and user agency.
- Creativity now controls Gemini's generation temperature; alternate takes receive a small variation boost.
- Regeneration directions may contain up to 1,500 characters.

## Publish the update

From Git Bash inside the project folder:

```bash
npm install
npx supabase functions deploy character-chat
git add .
git commit -m "Fix Velvet story engine and regeneration"
git push origin main
```

The narrative changes live in the Supabase Edge Function, so deploying only to Vercel is not enough. The Git push publishes the web project through the existing Vercel connection; the Supabase command publishes the new roleplay engine.

