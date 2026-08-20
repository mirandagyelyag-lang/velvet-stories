# Velvet Stories v2.7.3 · Fast Stream & Stop Fix

This hotfix targets the chat generation path on mobile.

- STOP is now exactly one action. The old delayed five-call burst was removed so an old stop cannot kill a new send or regeneration.
- The STOP control uses a normal click path rather than pointer-down handling.
- User messages appear optimistically while the database save/revision safety completes.
- Streaming text is painted in small batches instead of forcing a full React chat render for nearly every tiny Gemini delta.
- Server-side cancellation polling is throttled, so Gemini streaming is no longer gated by a Supabase query on every chunk.
- Rewind/confirmation fixes from v2.7.2 remain intact.

Supabase `character-chat` changed in this release and must be redeployed.
