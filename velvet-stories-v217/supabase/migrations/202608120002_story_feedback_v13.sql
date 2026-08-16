create table if not exists public.user_story_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  story_prose text not null default 'contemporary' check (story_prose in ('contemporary', 'literary', 'minimal')),
  story_dialogue text not null default 'dialogue_forward' check (story_dialogue in ('dialogue_forward', 'balanced', 'narration_forward')),
  story_emotion text not null default 'interior_visible' check (story_emotion in ('interior_visible', 'subtle', 'restrained')),
  story_pacing text not null default 'medium_fast' check (story_pacing in ('medium_fast', 'medium', 'slow')),
  custom_instructions text not null default '',
  positive_feedback jsonb not null default '{}'::jsonb,
  negative_feedback jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_story_preferences enable row level security;

drop policy if exists "Users read their story preferences" on public.user_story_preferences;
create policy "Users read their story preferences" on public.user_story_preferences for select using (auth.uid() = user_id);

drop policy if exists "Users create their story preferences" on public.user_story_preferences;
create policy "Users create their story preferences" on public.user_story_preferences for insert with check (auth.uid() = user_id);

drop policy if exists "Users update their story preferences" on public.user_story_preferences;
create policy "Users update their story preferences" on public.user_story_preferences for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users delete their story preferences" on public.user_story_preferences;
create policy "Users delete their story preferences" on public.user_story_preferences for delete using (auth.uid() = user_id);

grant select, insert, update, delete on public.user_story_preferences to authenticated;

alter table public.conversations alter column story_engine_version set default 10;
update public.conversations set story_engine_version = 10 where story_engine_version < 10;
