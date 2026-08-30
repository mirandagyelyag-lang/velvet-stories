-- Velvet Stories v3.3 — persistent narrative dynamics
create table if not exists public.story_arcs (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  title text not null, summary text not null default '', kind text not null default 'relationship',
  status text not null default 'active' check (status in ('planned','active','paused','resolved')),
  progress integer not null default 0 check (progress between 0 and 100), stakes text not null default '',
  next_pressure text not null default '', participants text[] not null default '{}',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (conversation_id, title)
);
create table if not exists public.story_knowledge_entries (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  character_name text not null, subject text not null, knowledge text not null,
  status text not null default 'known' check (status in ('known','suspected','rumor','unknown')),
  source text not null default '', secret boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (conversation_id, character_name, subject)
);
create table if not exists public.story_consequences (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  title text not null, cause text not null, effect text not null,
  status text not null default 'pending' check (status in ('pending','active','resolved')),
  weight integer not null default 2 check (weight between 1 and 5), participants text[] not null default '{}',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (conversation_id, title, cause)
);

create index if not exists story_arcs_conversation_idx on public.story_arcs(conversation_id, status, updated_at desc);
create index if not exists story_knowledge_conversation_idx on public.story_knowledge_entries(conversation_id, character_name, updated_at desc);
create index if not exists story_consequences_conversation_idx on public.story_consequences(conversation_id, status, updated_at desc);

alter table public.story_arcs enable row level security;
alter table public.story_knowledge_entries enable row level security;
alter table public.story_consequences enable row level security;

do $$ declare table_name text; begin
  foreach table_name in array array['story_arcs','story_knowledge_entries','story_consequences'] loop
    execute format('drop policy if exists %I on public.%I', table_name || '_owner_all', table_name);
    execute format('create policy %I on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', table_name || '_owner_all', table_name);
  end loop;
end $$;

update public.conversations set story_engine_version = greatest(coalesce(story_engine_version, 0), 33);
