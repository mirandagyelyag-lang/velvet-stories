-- Velvet Stories v3.53.8 · Stability Shield
-- Security cleanup, NPC transaction boundaries, and performance guardrails.

-- 1) Explicit API grants for creator-owned character NPC canon.
grant select, insert, update, delete on table public.character_npcs to authenticated;
create index if not exists character_npcs_user_id_idx on public.character_npcs(user_id);

-- Optimize the character NPC RLS policy so auth.uid() is initialized once.
drop policy if exists "Users manage their own character NPCs" on public.character_npcs;
create policy "Users manage their own character NPCs"
  on public.character_npcs
  for all
  to authenticated
  using (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.characters c
      where c.id = character_id
        and c.user_id = (select auth.uid())
    )
  )
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.characters c
      where c.id = character_id
        and c.user_id = (select auth.uid())
    )
  );

-- 2) Generation requests are creator-owned. This removes the "RLS enabled, no policy" hole.
grant select, insert, update, delete on table public.generation_requests to authenticated;
drop policy if exists "Users manage their own generation requests" on public.generation_requests;
create policy "Users manage their own generation requests"
  on public.generation_requests
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create index if not exists generation_requests_conversation_id_idx
  on public.generation_requests(conversation_id);

-- 3) Trigger/event-trigger helpers are not public RPC endpoints.
revoke execute on function public.create_profile_for_new_user() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- 4) Remove older duplicate permissive policies while keeping the optimized owner policies.
drop policy if exists "Users can delete their own characters" on public.characters;
drop policy if exists "Users can update their own characters" on public.characters;
drop policy if exists "Users can delete their own conversations" on public.conversations;
drop policy if exists "Users can update their own conversations" on public.conversations;
drop policy if exists "Users can delete their own messages" on public.messages;
drop policy if exists "Users can update their own messages" on public.messages;
drop policy if exists "Users can delete their own memories" on public.memories;
drop policy if exists "Users can save their own memories" on public.memories;
drop policy if exists "Users can update their own memories" on public.memories;

-- 5) Remove one of the two identical conversation indexes.
drop index if exists public.conversations_story_intelligence_idx;

-- 6) Atomic character NPC write: row mutation + revision invalidation are one transaction.
create or replace function public.save_character_npc(
  p_character_id uuid,
  p_npc_id uuid,
  p_name text,
  p_role text default '',
  p_relationship text default '',
  p_personality_note text default ''
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_row public.character_npcs;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1 from public.characters c
    where c.id = p_character_id and c.user_id = v_uid
  ) then
    raise exception 'Character not found';
  end if;

  if nullif(btrim(coalesce(p_name,'')), '') is null then
    raise exception 'NPC name is required';
  end if;

  if p_npc_id is null then
    insert into public.character_npcs(
      user_id, character_id, name, role, relationship, personality_note
    ) values (
      v_uid,
      p_character_id,
      left(btrim(p_name),100),
      left(btrim(coalesce(p_role,'')),180),
      left(btrim(coalesce(p_relationship,'')),320),
      left(btrim(coalesce(p_personality_note,'')),320)
    )
    returning * into v_row;
  else
    update public.character_npcs
    set
      name = left(btrim(p_name),100),
      role = left(btrim(coalesce(p_role,'')),180),
      relationship = left(btrim(coalesce(p_relationship,'')),320),
      personality_note = left(btrim(coalesce(p_personality_note,'')),320),
      updated_at = now()
    where id = p_npc_id
      and character_id = p_character_id
      and user_id = v_uid
    returning * into v_row;

    if v_row.id is null then
      raise exception 'NPC not found';
    end if;
  end if;

  update public.conversations
  set story_revision = gen_random_uuid(), updated_at = now()
  where user_id = v_uid and character_id = p_character_id;

  return to_jsonb(v_row);
end;
$$;

-- 7) Atomic story NPC write.
create or replace function public.save_story_npc(
  p_conversation_id uuid,
  p_npc_id uuid,
  p_name text,
  p_role text default '',
  p_relationship text default '',
  p_personality_note text default ''
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_row public.story_cast_members;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1 from public.conversations c
    where c.id = p_conversation_id and c.user_id = v_uid
  ) then
    raise exception 'Conversation not found';
  end if;

  if nullif(btrim(coalesce(p_name,'')), '') is null then
    raise exception 'NPC name is required';
  end if;

  if p_npc_id is null then
    insert into public.story_cast_members(
      user_id, conversation_id, name, role, relationship, personality_note,
      current_dynamic, goals, knowledge, last_interaction, presence, status,
      turn_count, is_user_created
    ) values (
      v_uid, p_conversation_id,
      left(btrim(p_name),100),
      left(btrim(coalesce(p_role,'')),180),
      left(btrim(coalesce(p_relationship,'')),320),
      left(btrim(coalesce(p_personality_note,'')),320),
      '', '', '', '', 'off_scene', 'active', 0, true
    )
    returning * into v_row;
  else
    update public.story_cast_members
    set
      name = left(btrim(p_name),100),
      role = left(btrim(coalesce(p_role,'')),180),
      relationship = left(btrim(coalesce(p_relationship,'')),320),
      personality_note = left(btrim(coalesce(p_personality_note,'')),320),
      updated_at = now(),
      is_user_created = true
    where id = p_npc_id
      and conversation_id = p_conversation_id
      and user_id = v_uid
      and is_user_created = true
    returning * into v_row;

    if v_row.id is null then
      raise exception 'NPC not found';
    end if;
  end if;

  update public.conversations
  set story_revision = gen_random_uuid(), updated_at = now()
  where id = p_conversation_id and user_id = v_uid;

  return to_jsonb(v_row);
end;
$$;

-- Atomic story NPC delete including story-local relational residue.
create or replace function public.delete_story_npc(
  p_conversation_id uuid,
  p_npc_id uuid
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_name text;
begin
  select name into v_name
  from public.story_cast_members
  where id = p_npc_id
    and conversation_id = p_conversation_id
    and user_id = v_uid
    and is_user_created = true;

  if v_name is null then return false; end if;

  delete from public.story_cast_connections
    where conversation_id = p_conversation_id
      and user_id = v_uid
      and (lower(from_name)=lower(v_name) or lower(to_name)=lower(v_name));

  delete from public.story_knowledge_entries
    where conversation_id = p_conversation_id
      and user_id = v_uid
      and lower(character_name)=lower(v_name);

  delete from public.story_chemistry_profiles
    where conversation_id = p_conversation_id
      and user_id = v_uid
      and lower(character_name)=lower(v_name);

  delete from public.story_cast_members
    where id = p_npc_id and conversation_id = p_conversation_id and user_id = v_uid;

  update public.conversations
  set story_revision = gen_random_uuid(), updated_at = now()
  where id = p_conversation_id and user_id = v_uid;

  return true;
end;
$$;

create or replace function public.delete_character_npc(
  p_character_id uuid,
  p_npc_id uuid
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_deleted uuid;
begin
  delete from public.character_npcs
  where id = p_npc_id
    and character_id = p_character_id
    and user_id = v_uid
  returning id into v_deleted;

  if v_deleted is null then return false; end if;

  update public.conversations
  set story_revision = gen_random_uuid(), updated_at = now()
  where character_id = p_character_id and user_id = v_uid;

  return true;
end;
$$;

revoke all on function public.save_character_npc(uuid,uuid,text,text,text,text) from public, anon;
revoke all on function public.save_story_npc(uuid,uuid,text,text,text,text) from public, anon;
revoke all on function public.delete_story_npc(uuid,uuid) from public, anon;
revoke all on function public.delete_character_npc(uuid,uuid) from public, anon;

grant execute on function public.save_character_npc(uuid,uuid,text,text,text,text) to authenticated;
grant execute on function public.save_story_npc(uuid,uuid,text,text,text,text) to authenticated;
grant execute on function public.delete_story_npc(uuid,uuid) to authenticated;
grant execute on function public.delete_character_npc(uuid,uuid) to authenticated;
