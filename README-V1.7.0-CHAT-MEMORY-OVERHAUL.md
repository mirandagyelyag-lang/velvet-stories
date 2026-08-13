# Velvet Stories v1.7.0 · Chat & Memory Overhaul

This version is built on v1.6.1 and keeps the calm editorial visual direction of Stories and Discover.

## What changed

### Chat
- Persistent Reading Mode for a calmer, low-control reading view.
- Mobile composer hardened for Android/iOS keyboards and safe areas.
- STOP unlocks the UI immediately and server cancellation is checked every streamed chunk.
- Existing response alternatives/version navigation are preloaded for the latest character reply.
- Regeneration continues to hide the rejected reply before network work.
- `.` is a hidden silent continuation command.
- `..` is a hidden explicit return-to-main-character POV command.
- Silent/POV control tokens are not shown as normal chat messages.
- Narrative prompt rules reduce generic archetype voice and repetitive stock body language.
- Main-character return rules are explicit after silence/secondary-character detours.
- v1.6.1 quality-gate behavior remains: advisory style problems never cause endless regenerate errors.

### Memories v2
- New categories: fact, person, relationship, world, event, preference, boundary, promise, conflict.
- Canon memories can be marked authoritative.
- Pinned/manual/canon memories have higher prompt authority.
- Automatic memory updates are derived only from the visible USER turn.
- Automatic memories include a reason explaining why Velvet remembers them.
- Similar automatic memories are merged instead of stacked as duplicates.
- Corrected tentative memories can be superseded instead of remaining contradictory forever.
- Memory Book and Memories page show canon state and “Why Velvet remembers this”.

### Character Studio
- Advanced Character DNA / Development / Voice sections are hidden under “More depth”.
- AI Polish can run per section instead of rewriting the whole profile.
- Full Create with AI is still review-first.
- Full AI generation uses a tighter token/deadline budget while keeping model failover.

### Visual polish
- New `src/styles/velvet-v17.css` is imported after the existing calm editorial layer.
- Reading mode, memory canon states, mobile chat containment and Character Studio progressive disclosure share the same visual language.
- Stories and Discover were not structurally redesigned.

## Database migration

New migration:

`supabase/migrations/202608130001_velvet_v17_memory_engine.sql`

It adds:
- `is_canon`
- `why_remembered`
- `superseded_at`
- `superseded_by`
- expanded memory categories
- active/canon memory indexes

## Verify

```bash
npm run verify:story
npm run verify:ui
npm run build
```

Expected static verifier results for this package:
- 105 Story Engine checks passed
- 14 UI checks passed

## Deploy

Run these commands from the Velvet project folder, not the Maderas project.

First verify where you are:

```bash
pwd
grep '"name"' package.json | head -1
ls supabase/functions/character-chat/index.ts
```

The package name must be `velvet-stories`.

Then:

```bash
npm ci
npm run verify:story
npm run verify:ui
npm run build

npx supabase db push
npx supabase functions deploy character-chat

git add .
git commit -m "Velvet v1.7 chat and memory overhaul"
git push origin main
```

The database migration and Edge Function deployment are both required for all v1.7 memory/chat behavior.
