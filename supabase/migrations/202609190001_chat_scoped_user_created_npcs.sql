-- Velvet Stories v3.52.79
-- Named NPC identities are explicitly created by the user and scoped to one conversation.

alter table public.story_cast_members
  add column if not exists is_user_created boolean not null default false;

create unique index if not exists story_cast_members_conversation_lower_name_key
  on public.story_cast_members (conversation_id, lower(name));

create index if not exists story_cast_members_user_created_idx
  on public.story_cast_members (conversation_id, is_user_created, updated_at desc);

comment on column public.story_cast_members.is_user_created is
  'True only for NPC identities explicitly created by the user in this conversation. AI may update these NPCs but must not create named NPC identities.';
