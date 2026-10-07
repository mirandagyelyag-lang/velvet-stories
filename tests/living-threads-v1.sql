-- Actual Postgres/RLS/undo regression. ALL fixtures roll back.
begin;
do $$
declare
  owner_id uuid;
  character_fixture uuid;
  story_id uuid := gen_random_uuid();
  other_story uuid := gen_random_uuid();
  user_message uuid := gen_random_uuid();
  reply_id uuid := gen_random_uuid();
  old_revision uuid := gen_random_uuid();
  prior_threads jsonb := '[{"id":"necklace","summary":"Roman still has your necklace.","title":"Roman still has your necklace.","status":"open","schema":"living_threads_v1"}]'::jsonb;
  current_threads jsonb := '[{"id":"necklace","summary":"Roman still has your necklace.","status":"open"},{"id":"kiss","summary":"He has not explained the kiss.","status":"open"}]'::jsonb;
  result jsonb;
  rejected boolean := false;
  changed integer;
begin
  select user_id, id into owner_id, character_fixture from public.characters limit 1;
  assert owner_id is not null, 'Need fixture ownership';
  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  set local role authenticated;
  insert into public.conversations(id,user_id,character_id,title,unresolved_threads,story_revision,intelligence_state)
  values(story_id,owner_id,character_fixture,'Living Threads V1 fixture',current_threads,old_revision,
    jsonb_build_object('living_threads_v1',jsonb_build_object('schema',1,'turn_index',2,'last_message_id',reply_id::text,
      'undo_snapshot',jsonb_build_object('message_id',reply_id::text,'threads',prior_threads,'state',jsonb_build_object('schema',1,'turn_index',1))))),
    (other_story,owner_id,character_fixture,'Isolation fixture',current_threads,gen_random_uuid(),'{}');
  insert into public.messages(id,user_id,conversation_id,sender,content,created_at)
  values(user_message,owner_id,story_id,'user','Fixture turn',now()-interval '2 minutes'),
    (reply_id,owner_id,story_id,'character','Roman kissed you.',now()-interval '1 minute');

  perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
  begin perform public.velvet_undo_last_reply(story_id,reply_id);
  exception when others then rejected := true; end;
  assert rejected, 'Cross-user undo must fail';
  perform set_config('request.jwt.claim.sub',owner_id::text,true);

  result := public.velvet_undo_last_reply(story_id,reply_id);
  assert result->'unresolved_threads'=prior_threads, 'Undo must restore before-image, retaining older matters';
  assert (result #>> '{intelligence_state,living_threads_v1,turn_index}')::integer=1, 'Restore thread turn counter';
  assert not exists(select 1 from public.messages where id=reply_id), 'Rejected event removed from canon';
  assert exists(select 1 from public.messages where id=user_message), 'User turn preserved';
  assert (select unresolved_threads=prior_threads from public.conversations where id=story_id), 'Durable thread state restored';
  assert (select unresolved_threads=current_threads from public.conversations where id=other_story), 'Other story untouched';

  -- Emulate a late background task from before undo with the exact production guard.
  update public.conversations set unresolved_threads=current_threads
    where id=story_id and user_id=owner_id and story_revision=old_revision;
  get diagnostics changed=row_count;
  assert changed=0, 'A stale story revision cannot resurrect the kiss thread';
  assert (select unresolved_threads=prior_threads from public.conversations where id=story_id), 'Old matters survive stale commit';

  -- The revision can be unchanged for simultaneous generations. The JSON path
  -- compare-and-set allows one state writer and rejects the stale duplicate.
  update public.conversations set intelligence_state=jsonb_build_object('living_threads_v1',jsonb_build_object('last_message_id',reply_id::text))
    where id=story_id and user_id=owner_id and intelligence_state->'living_threads_v1'->>'last_message_id' is null;
  get diagnostics changed=row_count;
  assert changed=1, 'The first generation can commit';
  update public.conversations set unresolved_threads=current_threads
    where id=story_id and user_id=owner_id and intelligence_state->'living_threads_v1'->>'last_message_id' is null;
  get diagnostics changed=row_count;
  assert changed=0, 'A duplicate generation cannot overwrite a newer state';
  assert (select unresolved_threads=prior_threads from public.conversations where id=story_id), 'Canonical threads survive concurrent stale commit';

  -- Invalid before-images cannot carry a rejected event into another undo.
  insert into public.messages(id,user_id,conversation_id,sender,content)
    values(reply_id,owner_id,story_id,'character','Another fixture response');
  update public.conversations set intelligence_state=jsonb_build_object('living_threads_v1',
    jsonb_build_object('undo_snapshot',jsonb_build_object('message_id',gen_random_uuid()::text,'threads',current_threads))) where id=story_id;
  result := public.velvet_undo_last_reply(story_id,reply_id);
  assert result->'unresolved_threads'='[]'::jsonb, 'Mismatched before-image ignored safely';
end $$;
rollback;
select 'PASS: V1 before-image, older matters, user isolation, stale revision and invalid snapshot; all fixtures rolled back' as result;
