alter table public.memories
  add column if not exists source_message_id uuid references public.messages(id) on delete set null,
  add column if not exists source_excerpt text;

create index if not exists memories_v18_source_message_idx
  on public.memories (source_message_id)
  where source_message_id is not null;

comment on column public.memories.source_excerpt is 'Short visible user-message excerpt explaining where an automatic memory came from.';
