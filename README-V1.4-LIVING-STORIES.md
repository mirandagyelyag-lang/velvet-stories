# Velvet Stories v1.4 · Living Stories

Built on top of v1.3.1 CREATE AI FIX.

## The six changes
1. Living Story Memory: the normal roleplay Gemini response can include up to two durable memory_updates, saved without a second Gemini memory-extraction request.
2. Simpler Story Hub: Story / Saved / Timelines.
3. Test their voice: throwaway voice sample before saving a character.
4. Instant Story: generate a fresh opening scene and start a new timeline.
5. Recoverable drafts: Character Studio autosaves locally and restores unfinished drafts.
6. Trash / recycle bin: characters and stories are soft-deleted first and can be restored.

## Required Supabase update
Apply:
supabase/migrations/202608120003_living_stories_v14.sql

Then deploy:
supabase functions deploy character-chat

## Local verification
npm ci
npm run build
npm run verify:story
npm run verify:ui

If an old node_modules folder causes permissions/install problems, delete node_modules before npm ci.
