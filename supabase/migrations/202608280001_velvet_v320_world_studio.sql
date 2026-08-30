-- Velvet Stories v3.2: editable story authority and world planning.
create table if not exists public.story_bible_entries (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  category text not null default 'world', title text not null, content text not null,
  authority text not null default 'canon' check (authority in ('canon','private','tentative')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.story_cast_connections (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  from_name text not null, to_name text not null, relationship text not null,
  visibility text not null default 'known' check (visibility in ('known','private','secret')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(conversation_id, from_name, to_name)
);
create table if not exists public.story_calendar_events (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  title text not null, story_time text not null, details text not null default '', participants text[] not null default '{}',
  status text not null default 'upcoming' check (status in ('upcoming','active','completed','cancelled')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.story_canon_corrections (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  source_message_id uuid references public.messages(id) on delete set null,
  correction text not null, created_at timestamptz not null default now()
);

create index if not exists story_bible_conversation_idx on public.story_bible_entries(conversation_id, updated_at desc);
create index if not exists story_connections_conversation_idx on public.story_cast_connections(conversation_id, updated_at desc);
create index if not exists story_calendar_conversation_idx on public.story_calendar_events(conversation_id, updated_at desc);
create index if not exists story_corrections_conversation_idx on public.story_canon_corrections(conversation_id, created_at desc);

alter table public.story_bible_entries enable row level security;
alter table public.story_cast_connections enable row level security;
alter table public.story_calendar_events enable row level security;
alter table public.story_canon_corrections enable row level security;

do $$
declare table_name text;
begin
  foreach table_name in array array['story_bible_entries','story_cast_connections','story_calendar_events','story_canon_corrections'] loop
    execute format('drop policy if exists "Users manage their own %s" on public.%I', table_name, table_name);
    execute format('create policy "Users manage their own %s" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id and exists (select 1 from public.conversations c where c.id = conversation_id and c.user_id = auth.uid()))', table_name, table_name);
  end loop;
end $$;

update public.conversations set story_engine_version = greatest(coalesce(story_engine_version,0),32);
