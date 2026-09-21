-- Velvet Stories v3.53.7
-- Two-level NPC canon:
-- 1) character_npcs persist across every conversation for one character.
-- 2) story_cast_members with is_user_created=true remain conversation-local.

create table if not exists public.character_npcs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  name text not null,
  role text not null default '',
  relationship text not null default '',
  personality_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists character_npcs_character_lower_name_key
  on public.character_npcs (character_id, lower(name));

create index if not exists character_npcs_character_updated_idx
  on public.character_npcs (character_id, updated_at desc);

alter table public.character_npcs enable row level security;

drop policy if exists "Users manage their own character NPCs" on public.character_npcs;
create policy "Users manage their own character NPCs"
  on public.character_npcs for all
  using (
    auth.uid() = user_id
    and exists (
      select 1 from public.characters c
      where c.id = character_id and c.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.characters c
      where c.id = character_id and c.user_id = auth.uid()
    )
  );

comment on table public.character_npcs is
  'Creator-defined NPC canon attached to a character. These NPCs are available in every conversation for that character.';

comment on column public.character_npcs.character_id is
  'The lead character whose persistent NPC world this person belongs to.';
