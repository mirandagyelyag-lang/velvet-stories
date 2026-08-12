# Velvet Stories

Private AI roleplay/story PWA built with React, Vite, Supabase and Gemini.
Current consolidated release: **v1.3.0**.

## Local setup

1. Copy `.env.example` to `.env.local` and fill in the Supabase values.
2. Install dependencies with `npm ci`.
3. Run `npm run dev`.

## Production update

Apply database migrations before deploying the Edge Function. Version 1.3 adds
private account sync for story preferences, reply feedback and complete AI
character drafting.

```bash
npx supabase db push
npx supabase functions deploy character-chat
npm run build
```

Then commit and push to `main` for the Vercel deployment.

## Core behavior

- The user owns their POV. The model may not invent the user's actions, dialogue, thoughts, feelings, reactions or decisions.
- Reader-facing narration defaults to second person (`you/your`).
- Communication medium is sticky and explicit: in-person, direct message, group chat or phone call.
- Markdown `>` is reserved for written digital messages only.
- Rewind/delete/edit invalidate derived story state and automatic memories so deleted timelines cannot leak back into future generations.
- Character response variants are navigable and regeneration rejects near-paraphrases of earlier variants.
- Every existing and future character can develop gradually from visible events. Development is independent per conversation, bounded in size and cannot rewrite the base personality after one ordinary exchange.
- Regeneration stores abstract reading preferences (for example, avoiding empty acknowledgements) without retaining rejected prose as story canon.
- Regeneration accepts eight explicit failure reasons, applies them immediately and learns a global preference after the same reason is chosen twice.
- Global Story DNA controls prose, dialogue balance, visible emotional interior and romance momentum for every character without overriding identity or earned relationship state.
- Optional voice fingerprints distinguish vocabulary, humor, conflict, affection and verbal tells; recent signature lines are rejected before display.
- Every character reply has explicit like/dislike learning. Likes preserve voice, emotional depth, dialogue or pacing; dislikes use the eight repair reasons. A matching preference becomes global after two choices, can be undone or forgotten, and syncs privately across signed-in devices.
- `Create with AI` can turn one short idea—or no idea at all—into a complete editable character draft, including the name, bond, world, development, voice fingerprint and opening scene. Nothing saves until the creator reviews and confirms it.
- `Organize profile` redistributes a legacy wall of personality text into the structured fields without intentionally inventing or deleting facts. `AI Polish` remains the creative refinement tool.
- Regeneration hides the rejected take immediately and restores it if the request fails or is stopped.
- Empty messages and dot-only messages are silent continuations; two consecutive silent turns return focus to the main character.
- Post-exit reactions follow the main character's side without granting impossible hearing or inventing logistics.
- Rewind is the primary destructive timeline tool; old response variants should be rewound to before changing canon.

## Important files

- `src/context/ChatsContext.jsx`: conversation state, generation, Stop, Rewind, variants, memory operations.
- `src/pages/Chat.jsx`: chat UI, response-version navigation, swipe interactions and message actions.
- `supabase/functions/character-chat/index.ts`: single-path story engine, turn intent, grounded prompt, one validation pass and optional repair.
- `supabase/migrations/202608100001_story_revision_guard.sql`: timeline revision guard.
- `supabase/migrations/202608100002_generation_requests_private.sql`: keeps cancellation lifecycle rows server-only.
- `supabase/migrations/202608110001_character_development_v1.sql`: adds optional character-development anchors and an independent state for every conversation.
- `supabase/migrations/202608120001_story_dna_v12.sql`: adds the optional voice fingerprint and moves conversations to story engine v9.
- `supabase/migrations/202608120002_story_feedback_v13.sql`: privately syncs Story DNA and learned feedback, with user-owned RLS, and moves new conversations to story engine v10.
- `QA-STORY-ENGINE.md`: short manual test for silence, POV return, post-exit emotion and regeneration.
- `APPLY-AUDIT-CLEANUP.sh`: recoverably moves obsolete nested projects, old engines and loose patch files out of an existing checkout.

## Verification

Run:

```bash
npm run verify:story
npm run lint
npm run build
```

`verify:story` checks the consolidated story-routing, regeneration and mobile UI
safeguards.
