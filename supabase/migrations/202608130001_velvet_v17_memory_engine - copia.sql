alter table public.memories
  add column if not exists is_canon boolean not null default false,
  add column if not exists why_remembered text,
  add column if not exists superseded_at timestamptz,
  add column if not exists superseded_by uuid references public.memories(id) on delete set null;

alter table public.memories drop constraint if exists memories_category_check;
alter table public.memories add constraint memories_category_check
  check (category in (
    'fact', 'person', 'relationship', 'world', 'event',
    'preference', 'boundary', 'promise', 'conflict'
  ));

create index if not exists memories_v17_priority_idx
  on public.memories (
    user_id,
    character_id,
    is_canon desc,
    is_pinned desc,
    importance desc,
    updated_at desc
  )
  where superseded_at is null;

create index if not exists memories_v17_active_story_idx
  on public.memories (user_id, character_id, conversation_id, category, updated_at desc)
  where superseded_at is null;
