-- Velvet Stories v1.1 · persistent character development
-- Every conversation owns an independent arc. Existing and future characters
-- start from their profile and receive an empty evidence-bound state.

alter table public.characters
  add column if not exists core_motivation text,
  add column if not exists emotional_defense text,
  add column if not exists softening_triggers text,
  add column if not exists growth_direction text;

alter table public.conversations
  add column if not exists character_development jsonb not null default '{}'::jsonb;

alter table public.conversations alter column story_engine_version set default 8;
update public.conversations set story_engine_version = 8 where story_engine_version < 8;

create index if not exists conversations_character_development_idx
  on public.conversations(user_id, character_id, updated_at desc);

grant select, insert, update, delete on table public.characters, public.conversations to authenticated;

comment on column public.conversations.character_development is
  'Evidence-bound per-conversation emotional, relational and behavioral development state.';
