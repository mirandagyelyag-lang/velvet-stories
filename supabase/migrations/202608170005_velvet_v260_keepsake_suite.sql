
-- Velvet v2.6.0 · Keepsake Suite
alter table public.conversations
  add column if not exists cover_url text,
  add column if not exists cover_title text,
  add column if not exists cover_mood text,
  add column if not exists ambient_mode text not null default 'none',
  add column if not exists ambient_volume integer not null default 18,
  add column if not exists last_opened_at timestamptz;

alter table public.characters
  add column if not exists tts_voice_name text,
  add column if not exists tts_rate numeric not null default 1.0,
  add column if not exists tts_pitch numeric not null default 1.0;

create table if not exists public.story_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  label text not null default 'Snapshot',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists story_snapshots_conversation_created_idx
  on public.story_snapshots(conversation_id, created_at desc);

alter table public.story_snapshots enable row level security;

drop policy if exists "Users can read own story snapshots" on public.story_snapshots;
create policy "Users can read own story snapshots"
on public.story_snapshots for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create own story snapshots" on public.story_snapshots;
create policy "Users can create own story snapshots"
on public.story_snapshots for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own story snapshots" on public.story_snapshots;
create policy "Users can delete own story snapshots"
on public.story_snapshots for delete to authenticated
using (auth.uid() = user_id);

alter table public.conversations
  drop constraint if exists conversations_ambient_mode_check;
alter table public.conversations
  add constraint conversations_ambient_mode_check
  check (ambient_mode in ('none','rain','night_city','cafe','campus','fireplace'));

alter table public.conversations
  drop constraint if exists conversations_ambient_volume_check;
alter table public.conversations
  add constraint conversations_ambient_volume_check
  check (ambient_volume between 0 and 100);

alter table public.characters
  drop constraint if exists characters_tts_rate_check;
alter table public.characters
  add constraint characters_tts_rate_check
  check (tts_rate between 0.65 and 1.45);

alter table public.characters
  drop constraint if exists characters_tts_pitch_check;
alter table public.characters
  add constraint characters_tts_pitch_check
  check (tts_pitch between 0.65 and 1.35);
