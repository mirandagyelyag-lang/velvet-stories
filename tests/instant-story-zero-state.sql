-- Real RLS/first-message boundary. Every test fixture rolls back.
begin;
do $$
declare
  fixture_id uuid := gen_random_uuid();
  owner_id uuid;
  character_id uuid;
begin
  select c.user_id,c.id into owner_id,character_id
    from public.characters c where c.name ilike '%Roman%' and c.trashed_at is null limit 1;
  assert owner_id is not null;
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  set local role authenticated;
  insert into public.conversations(id,user_id,character_id,title)
    values(fixture_id,owner_id,character_id,'Instant Story zero-state regression fixture');
  assert not exists(select 1 from public.messages where conversation_id=fixture_id), 'Zero prior messages';
  assert not exists(select 1 from public.memories where conversation_id=fixture_id), 'Zero memories';
  assert (select coalesce(unresolved_threads,'[]'::jsonb)='[]'::jsonb from public.conversations where id=fixture_id), 'Zero threads';
  assert (select not (coalesce(intelligence_state,'{}'::jsonb) ? 'living_threads_v1') from public.conversations where id=fixture_id), 'No previous V1 state';
  insert into public.messages(user_id,conversation_id,sender,content)
    values(owner_id,fixture_id,'character','Roman told the group he had changed the race lineup.');
  assert (select count(*)=1 from public.messages where conversation_id=fixture_id), 'Fresh conversation can save its opening';
end $$;
rollback;
select 'PASS: actual authenticated RLS accepts zero prior state and first opening; all fixtures rolled back' as result;
