-- Run in Supabase SQL editor; all fixture data is rolled back.
begin;
do $$
declare
  owner_id uuid;
  character_id_fixture uuid;
  story_id uuid := gen_random_uuid();
  other_story uuid := gen_random_uuid();
  user_message uuid := gen_random_uuid();
  reply_id uuid := gen_random_uuid();
  later_id uuid := gen_random_uuid();
  result jsonb;
  start_at timestamptz := now() - interval '1 hour';
  rejected boolean;
begin
  select c.user_id, c.id into owner_id, character_id_fixture from public.characters c limit 1;
  assert owner_id is not null, 'A character is required for fixture ownership';
  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  set local role authenticated;
  insert into public.conversations(id,user_id,character_id,title,summary)
    values(story_id,owner_id,character_id_fixture,'Undo regression fixture','Invalid scene'),
          (other_story,owner_id,character_id_fixture,'Isolation fixture','Keep this');
  insert into public.messages(id,user_id,conversation_id,sender,content,created_at)
    values(user_message,owner_id,story_id,'user','Fixture user turn',start_at),
          (reply_id,owner_id,story_id,'character','Fixture response',start_at+interval '1 minute');
  insert into public.memories(user_id,conversation_id,character_id,content,source,created_at,updated_at,is_pinned,is_canon)
    values(owner_id,story_id,character_id_fixture,'Old memory','automatic',start_at-interval '1 day',start_at-interval '1 day',false,false),
          (owner_id,story_id,character_id_fixture,'Turn memory','automatic',start_at+interval '2 minutes',start_at+interval '2 minutes',false,false),
          (owner_id,story_id,character_id_fixture,'Pinned','automatic',now(),now(),true,false),
          (owner_id,story_id,character_id_fixture,'Canon','automatic',now(),now(),false,true),
          (owner_id,story_id,character_id_fixture,'Manual','manual',now(),now(),false,false),
          (owner_id,other_story,character_id_fixture,'Other story','automatic',now(),now(),false,false);
  insert into public.story_cast_members(user_id,conversation_id,name,is_user_created,current_dynamic,updated_at)
    values(owner_id,story_id,'Fixture NPC',true,'Invalid scene',now());
  insert into public.story_milestones(user_id,conversation_id,milestone_type,title,source_message_id)
    values(owner_id,story_id,'first_invitation','Invalid invitation',reply_id);

  -- Ownership and stale/latest checks must fail without deleting anything.
  perform set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
  rejected := false;
  begin perform public.velvet_undo_last_reply(story_id,reply_id);
  exception when others then rejected := true; end;
  assert rejected, 'Cross-user undo must fail';
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  insert into public.messages(id,user_id,conversation_id,sender,content,created_at)
    values(later_id,owner_id,story_id,'user','Newer turn',now());
  rejected := false;
  begin perform public.velvet_undo_last_reply(story_id,reply_id);
  exception when others then rejected := true; end;
  assert rejected, 'Stale undo must fail';
  assert exists(select 1 from public.messages where id=reply_id), 'Failed undo must keep reply';
  delete from public.messages where id=later_id;

  result := public.velvet_undo_last_reply(story_id,reply_id);
  assert (result->>'removed_memories')::integer=1, 'Only turn memory removed';
  assert not exists(select 1 from public.messages where id=reply_id), 'Reply removed';
  assert exists(select 1 from public.messages where id=user_message), 'User turn kept';
  assert (select count(*) from public.memories where conversation_id=story_id)=4, 'Older/manual/protected memories kept';
  assert (select count(*) from public.memories where conversation_id=other_story)=1, 'Other story untouched';
  assert (select summary is null from public.conversations where id=story_id), 'Summary cleared';
  assert not exists(select 1 from public.story_milestones where conversation_id=story_id), 'Milestone removed';
  assert exists(select 1 from public.story_cast_members where conversation_id=story_id and name='Fixture NPC' and current_dynamic=''), 'NPC identity kept; runtime cleared';
  rejected := false;
  begin perform public.velvet_undo_last_reply(story_id,reply_id);
  exception when others then rejected := true; end;
  assert rejected, 'Duplicate undo must fail safely';
end $$;
rollback;
select 'PASS: ownership, stale request, memories, NPCs, derived state, isolation and duplicate undo' as result;
