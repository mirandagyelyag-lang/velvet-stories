-- Velvet Stories v3.4 — chemistry, plans, conflicts and milestones
create table if not exists public.story_chemistry_profiles (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 conversation_id uuid not null references public.conversations(id) on delete cascade,
 character_name text not null, signature text not null default '', banter_style text not null default '',
 affection_style text not null default '', friction_triggers text not null default '', reconciliation_style text not null default '',
 inside_jokes text[] not null default '{}', meaningful_places text[] not null default '{}',
 chemistry_score integer not null default 25 check (chemistry_score between 0 and 100),
 trust_score integer not null default 20 check (trust_score between 0 and 100),
 tension_score integer not null default 10 check (tension_score between 0 and 100),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(conversation_id,character_name)
);
create table if not exists public.story_plans (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 conversation_id uuid not null references public.conversations(id) on delete cascade,
 title text not null, initiator text not null default '', details text not null default '', story_time text not null default '',
 participants text[] not null default '{}', status text not null default 'proposed' check(status in ('proposed','accepted','active','completed','cancelled','failed')),
 complication text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(conversation_id,title)
);
create table if not exists public.story_conflicts (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 conversation_id uuid not null references public.conversations(id) on delete cascade,
 title text not null, cause text not null, positions text not null default '', intensity integer not null default 2 check(intensity between 1 and 5),
 status text not null default 'active' check(status in ('brewing','active','cooling','repairing','resolved')),
 resolution_need text not null default '', repair_attempts integer not null default 0,
 participants text[] not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(conversation_id,title)
);
create table if not exists public.story_milestones (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 conversation_id uuid not null references public.conversations(id) on delete cascade,
 milestone_type text not null, title text not null, details text not null default '', participants text[] not null default '{}',
 story_time text not null default '', source_message_id uuid references public.messages(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(conversation_id,milestone_type)
);
create index if not exists story_plans_status_idx on public.story_plans(conversation_id,status,updated_at desc);
create index if not exists story_conflicts_status_idx on public.story_conflicts(conversation_id,status,updated_at desc);
create index if not exists story_milestones_idx on public.story_milestones(conversation_id,created_at);
alter table public.story_chemistry_profiles enable row level security;
alter table public.story_plans enable row level security;
alter table public.story_conflicts enable row level security;
alter table public.story_milestones enable row level security;
do $$ declare table_name text; begin
 foreach table_name in array array['story_chemistry_profiles','story_plans','story_conflicts','story_milestones'] loop
  execute format('drop policy if exists %I on public.%I',table_name||'_owner_all',table_name);
  execute format('create policy %I on public.%I for all using (auth.uid()=user_id) with check (auth.uid()=user_id)',table_name||'_owner_all',table_name);
 end loop;
end $$;
update public.conversations set story_engine_version=greatest(coalesce(story_engine_version,0),34);
