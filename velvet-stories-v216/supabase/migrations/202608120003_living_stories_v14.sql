alter table public.characters add column if not exists trashed_at timestamptz;
alter table public.conversations add column if not exists trashed_at timestamptz;
create index if not exists characters_user_trash_idx on public.characters(user_id, trashed_at, updated_at desc);
create index if not exists conversations_user_trash_idx on public.conversations(user_id, trashed_at, updated_at desc);
