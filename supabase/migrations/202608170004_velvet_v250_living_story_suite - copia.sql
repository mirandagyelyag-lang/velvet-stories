-- Velvet Stories v2.5.0 · Living Story Suite
-- No destructive schema changes: existing JSON story state is expanded with
-- epistemic status and automatic chapter metadata.
alter table public.conversations alter column story_engine_version set default 13;
update public.conversations set story_engine_version = greatest(coalesce(story_engine_version, 0), 13);

comment on column public.conversations.intelligence_state is
  'Continuity and epistemic ledger: objects, commitments, stakes, and per-character known/suspected/rumor/forgotten knowledge.';
comment on column public.conversations.story_chapters is
  'Closed story chapters generated only from grounded large time/phase transitions.';
comment on column public.conversations.active_chapter is
  'Current story chapter and its grounded start message.';
