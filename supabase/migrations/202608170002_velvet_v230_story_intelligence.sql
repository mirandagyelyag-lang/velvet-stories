-- Velvet Stories v2.3.0 · Story Intelligence Suite
-- Persistent continuity state + recap without additional background model calls.

alter table public.conversations
  add column if not exists intelligence_state jsonb not null default '{"objects":[],"knowledge":[],"commitments":[],"stakes":""}'::jsonb,
  add column if not exists story_recap text;

create index if not exists conversations_story_intelligence_idx
  on public.conversations(user_id, character_id, updated_at desc);

alter table public.conversations alter column story_engine_version set default 11;
update public.conversations set story_engine_version = greatest(coalesce(story_engine_version, 0), 11);

grant select, update on table public.conversations to authenticated;
