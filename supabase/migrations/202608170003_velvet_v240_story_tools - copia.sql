-- Velvet v2.4.0 · Story Tools
-- Group stories keep a primary character_id for backwards compatibility while
-- storing the complete cast separately.
alter table public.conversations
  add column if not exists group_mode boolean not null default false,
  add column if not exists group_character_ids uuid[] not null default '{}',
  add column if not exists group_title text;

create index if not exists conversations_group_character_ids_gin
  on public.conversations using gin (group_character_ids);

alter table public.conversations alter column story_engine_version set default 12;
