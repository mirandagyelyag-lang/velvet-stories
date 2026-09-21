-- Velvet Stories v3.53.8b · NPC runtime consistency
-- Keep relational/runtime references aligned when an NPC is renamed or removed.

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
  v_old_name text;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.characters c where c.id=p_character_id and c.user_id=v_uid) then
    raise exception 'Character not found';
  end if;
  if nullif(btrim(coalesce(p_name,'')), '') is null then raise exception 'NPC name is required'; end if;

  if p_npc_id is null then
    insert into public.character_npcs(user_id,character_id,name,role,relationship,personality_note)
    values(
      v_uid,p_character_id,left(btrim(p_name),100),
      left(btrim(coalesce(p_role,'')),180),
      left(btrim(coalesce(p_relationship,'')),320),
      left(btrim(coalesce(p_personality_note,'')),320)
    ) returning * into v_row;
  else
    select name into v_old_name
    from public.character_npcs
    where id=p_npc_id and character_id=p_character_id and user_id=v_uid;

    if v_old_name is null then raise exception 'NPC not found'; end if;

    update public.character_npcs
    set name=left(btrim(p_name),100),
        role=left(btrim(coalesce(p_role,'')),180),
        relationship=left(btrim(coalesce(p_relationship,'')),320),
        personality_note=left(btrim(coalesce(p_personality_note,'')),320),
        updated_at=now()
    where id=p_npc_id and character_id=p_character_id and user_id=v_uid
    returning * into v_row;

    if lower(v_old_name) <> lower(v_row.name) then
      update public.story_cast_connections s
      set from_name = case when lower(s.from_name)=lower(v_old_name) then v_row.name else s.from_name end,
          to_name = case when lower(s.to_name)=lower(v_old_name) then v_row.name else s.to_name end,
          updated_at = now()
      where s.user_id=v_uid
        and s.conversation_id in (
          select id from public.conversations
          where user_id=v_uid and character_id=p_character_id
        )
        and (lower(s.from_name)=lower(v_old_name) or lower(s.to_name)=lower(v_old_name));

      update public.story_knowledge_entries k
      set character_name=v_row.name, updated_at=now()
      where k.user_id=v_uid
        and k.conversation_id in (
          select id from public.conversations
          where user_id=v_uid and character_id=p_character_id
        )
        and lower(k.character_name)=lower(v_old_name);

      update public.story_chemistry_profiles p
      set character_name=v_row.name, updated_at=now()
      where p.user_id=v_uid
        and p.conversation_id in (
          select id from public.conversations
          where user_id=v_uid and character_id=p_character_id
        )
        and lower(p.character_name)=lower(v_old_name);
    end if;
  end if;

  update public.conversations c
  set cast_state = case
        when v_old_name is not null and lower(v_old_name) <> lower(v_row.name)
          then coalesce(c.cast_state,'{}'::jsonb) - v_old_name
        else c.cast_state
      end,
      scene_state = case
        when v_old_name is not null and lower(v_old_name) <> lower(v_row.name)
             and jsonb_typeof(c.scene_state->'present')='array'
          then jsonb_set(
            coalesce(c.scene_state,'{}'::jsonb),
            '{present}',
            coalesce((
              select jsonb_agg(x)
              from jsonb_array_elements_text(c.scene_state->'present') x
              where lower(x)<>lower(v_old_name)
            ), '[]'::jsonb),
            true
          )
        else c.scene_state
      end,
      story_revision=gen_random_uuid(),
      updated_at=now()
  where c.user_id=v_uid and c.character_id=p_character_id;

  return to_jsonb(v_row);
end;
$$;

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
  v_old_name text;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.conversations c where c.id=p_conversation_id and c.user_id=v_uid) then
    raise exception 'Conversation not found';
  end if;
  if nullif(btrim(coalesce(p_name,'')), '') is null then raise exception 'NPC name is required'; end if;

  if p_npc_id is null then
    insert into public.story_cast_members(
      user_id,conversation_id,name,role,relationship,personality_note,
      current_dynamic,goals,knowledge,last_interaction,presence,status,turn_count,is_user_created
    ) values(
      v_uid,p_conversation_id,left(btrim(p_name),100),
      left(btrim(coalesce(p_role,'')),180),
      left(btrim(coalesce(p_relationship,'')),320),
      left(btrim(coalesce(p_personality_note,'')),320),
      '','','','','off_scene','active',0,true
    ) returning * into v_row;
  else
    select name into v_old_name
    from public.story_cast_members
    where id=p_npc_id and conversation_id=p_conversation_id and user_id=v_uid and is_user_created=true;

    if v_old_name is null then raise exception 'NPC not found'; end if;

    update public.story_cast_members
    set name=left(btrim(p_name),100),
        role=left(btrim(coalesce(p_role,'')),180),
        relationship=left(btrim(coalesce(p_relationship,'')),320),
        personality_note=left(btrim(coalesce(p_personality_note,'')),320),
        updated_at=now(),
        is_user_created=true
    where id=p_npc_id and conversation_id=p_conversation_id and user_id=v_uid and is_user_created=true
    returning * into v_row;

    if lower(v_old_name) <> lower(v_row.name) then
      update public.story_cast_connections
      set from_name=case when lower(from_name)=lower(v_old_name) then v_row.name else from_name end,
          to_name=case when lower(to_name)=lower(v_old_name) then v_row.name else to_name end,
          updated_at=now()
      where conversation_id=p_conversation_id and user_id=v_uid
        and (lower(from_name)=lower(v_old_name) or lower(to_name)=lower(v_old_name));

      update public.story_knowledge_entries
      set character_name=v_row.name, updated_at=now()
      where conversation_id=p_conversation_id and user_id=v_uid
        and lower(character_name)=lower(v_old_name);

      update public.story_chemistry_profiles
      set character_name=v_row.name, updated_at=now()
      where conversation_id=p_conversation_id and user_id=v_uid
        and lower(character_name)=lower(v_old_name);
    end if;
  end if;

  update public.conversations c
  set cast_state = case
        when v_old_name is not null and lower(v_old_name) <> lower(v_row.name)
          then coalesce(c.cast_state,'{}'::jsonb) - v_old_name
        else c.cast_state
      end,
      scene_state = case
        when v_old_name is not null and lower(v_old_name) <> lower(v_row.name)
             and jsonb_typeof(c.scene_state->'present')='array'
          then jsonb_set(
            coalesce(c.scene_state,'{}'::jsonb),
            '{present}',
            coalesce((
              select jsonb_agg(x)
              from jsonb_array_elements_text(c.scene_state->'present') x
              where lower(x)<>lower(v_old_name)
            ), '[]'::jsonb),
            true
          )
        else c.scene_state
      end,
      story_revision=gen_random_uuid(),
      updated_at=now()
  where c.id=p_conversation_id and c.user_id=v_uid;

  return to_jsonb(v_row);
end;
$$;

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
  where id=p_npc_id and conversation_id=p_conversation_id and user_id=v_uid and is_user_created=true;

  if v_name is null then return false; end if;

  delete from public.story_cast_connections
  where conversation_id=p_conversation_id and user_id=v_uid
    and (lower(from_name)=lower(v_name) or lower(to_name)=lower(v_name));

  delete from public.story_knowledge_entries
  where conversation_id=p_conversation_id and user_id=v_uid and lower(character_name)=lower(v_name);

  delete from public.story_chemistry_profiles
  where conversation_id=p_conversation_id and user_id=v_uid and lower(character_name)=lower(v_name);

  delete from public.story_cast_members
  where id=p_npc_id and conversation_id=p_conversation_id and user_id=v_uid;

  update public.conversations c
  set cast_state=coalesce(c.cast_state,'{}'::jsonb)-v_name,
      scene_state=case
        when jsonb_typeof(c.scene_state->'present')='array'
          then jsonb_set(
            coalesce(c.scene_state,'{}'::jsonb),
            '{present}',
            coalesce((
              select jsonb_agg(x)
              from jsonb_array_elements_text(c.scene_state->'present') x
              where lower(x)<>lower(v_name)
            ), '[]'::jsonb),
            true
          )
        else c.scene_state
      end,
      story_revision=gen_random_uuid(),
      updated_at=now()
  where c.id=p_conversation_id and c.user_id=v_uid;

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
  v_name text;
begin
  select name into v_name
  from public.character_npcs
  where id=p_npc_id and character_id=p_character_id and user_id=v_uid;

  if v_name is null then return false; end if;

  delete from public.story_cast_connections
  where user_id=v_uid
    and conversation_id in (select id from public.conversations where user_id=v_uid and character_id=p_character_id)
    and (lower(from_name)=lower(v_name) or lower(to_name)=lower(v_name));

  delete from public.story_knowledge_entries
  where user_id=v_uid
    and conversation_id in (select id from public.conversations where user_id=v_uid and character_id=p_character_id)
    and lower(character_name)=lower(v_name);

  delete from public.story_chemistry_profiles
  where user_id=v_uid
    and conversation_id in (select id from public.conversations where user_id=v_uid and character_id=p_character_id)
    and lower(character_name)=lower(v_name);

  delete from public.character_npcs
  where id=p_npc_id and character_id=p_character_id and user_id=v_uid;

  update public.conversations c
  set cast_state=coalesce(c.cast_state,'{}'::jsonb)-v_name,
      scene_state=case
        when jsonb_typeof(c.scene_state->'present')='array'
          then jsonb_set(
            coalesce(c.scene_state,'{}'::jsonb),
            '{present}',
            coalesce((
              select jsonb_agg(x)
              from jsonb_array_elements_text(c.scene_state->'present') x
              where lower(x)<>lower(v_name)
            ), '[]'::jsonb),
            true
          )
        else c.scene_state
      end,
      story_revision=gen_random_uuid(),
      updated_at=now()
  where c.character_id=p_character_id and c.user_id=v_uid;

  return true;
end;
$$;
