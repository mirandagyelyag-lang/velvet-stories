-- One transaction: never report success with only the visible reply removed.
create or replace function public.velvet_undo_last_reply(p_conversation_id uuid, p_message_id uuid)
returns jsonb
language plpgsql security invoker set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  target public.messages%rowtype;
  latest_id uuid;
  turn_start timestamptz;
  revision uuid := gen_random_uuid();
  removed_memories integer;
  derived_table text;
begin
  if owner_id is null then raise exception 'Sign in to change this story.'; end if;
  perform 1 from public.conversations
    where id = p_conversation_id and user_id = owner_id for update;
  if not found then raise exception 'Story not found.'; end if;

  select * into target from public.messages
    where id = p_message_id and conversation_id = p_conversation_id and user_id = owner_id;
  if not found or target.sender <> 'character' then
    raise exception 'Character reply not found.';
  end if;
  select id into latest_id from public.messages
    where conversation_id = p_conversation_id and user_id = owner_id
    order by created_at desc, id desc limit 1;
  if latest_id <> p_message_id then
    raise exception 'The story has changed. Reload it and undo the latest reply.';
  end if;

  -- Older engines attach memories to the preceding user turn, not the reply.
  select max(created_at) into turn_start from public.messages
    where conversation_id = p_conversation_id and user_id = owner_id
      and sender = 'user' and created_at <= target.created_at;
  turn_start := coalesce(turn_start, target.created_at);

  update public.generation_requests set cancelled = true, updated_at = now()
    where conversation_id = p_conversation_id and user_id = owner_id and not cancelled;
  delete from public.memories
    where conversation_id = p_conversation_id and user_id = owner_id
      and source = 'automatic' and not coalesce(is_canon, false) and not coalesce(is_pinned, false)
      and (source_message_id = p_message_id or created_at >= turn_start or updated_at >= turn_start);
  get diagnostics removed_memories = row_count;

  -- These ledgers are generated from replies as well as the visible memory book.
  -- Invalidate touched rows; the surviving transcript can rebuild them.
  foreach derived_table in array array['story_arcs', 'story_knowledge_entries',
    'story_consequences', 'story_chemistry_profiles', 'story_plans', 'story_conflicts',
    'story_milestones', 'story_cast_connections']
  loop
    execute format('delete from public.%I where conversation_id = $1 and user_id = $2 and (created_at >= $3 or updated_at >= $3)', derived_table)
      using p_conversation_id, owner_id, target.created_at;
  end loop;
  -- Keep user-created NPC identities, but remove their invalidated runtime state.
  update public.story_cast_members set current_dynamic = '', goals = '', knowledge = '',
    last_interaction = '', presence = 'unknown', turn_count = 0
    where conversation_id = p_conversation_id and user_id = owner_id and updated_at >= target.created_at;

  update public.conversations set story_revision = revision, summary = null,
    scene_state = '{}'::jsonb, story_timeline = '[]'::jsonb, intelligence_state = '{}'::jsonb,
    story_recap = null, relationship_state = '{}'::jsonb, character_development = '{}'::jsonb,
    cast_state = '{}'::jsonb, story_chapters = '[]'::jsonb, active_chapter = '{}'::jsonb,
    unresolved_threads = '[]'::jsonb, scene_state_updated_at = null, updated_at = now()
    where id = p_conversation_id and user_id = owner_id;
  delete from public.messages where id = p_message_id and user_id = owner_id;
  return jsonb_build_object('message_id', p_message_id, 'story_revision', revision,
    'removed_memories', removed_memories);
end;
$$;
revoke all on function public.velvet_undo_last_reply(uuid, uuid) from public, anon;
grant execute on function public.velvet_undo_last_reply(uuid, uuid) to authenticated;
