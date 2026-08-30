-- Velvet Stories v3: side characters are durable story participants, not prompt-only extras.
create table if not exists public.story_cast_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  name text not null,
  role text not null default '',
  personality_note text not null default '',
  relationship text not null default '',
  current_dynamic text not null default '',
  goals text not null default '',
  knowledge text not null default '',
  last_interaction text not null default '',
  presence text not null default 'off_scene' check (presence in ('present', 'off_scene', 'unknown')),
  status text not null default 'active' check (status in ('active', 'inactive', 'departed')),
  turn_count integer not null default 1 check (turn_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (conversation_id, name)
);

create index if not exists story_cast_members_conversation_updated_idx
  on public.story_cast_members (conversation_id, updated_at desc);

alter table public.story_cast_members enable row level security;

drop policy if exists "Users manage their own story cast" on public.story_cast_members;
create policy "Users manage their own story cast"
  on public.story_cast_members for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

update public.conversations
set story_engine_version = greatest(coalesce(story_engine_version, 0), 30);

