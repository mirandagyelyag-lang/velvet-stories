-- Velvet Stories v3.53.8d · Migration safety vault
-- Private, non-API snapshots for structural changes to critical story/NPC state.

create schema if not exists private;

create table if not exists private.stability_backups (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  created_at timestamptz not null default now(),
  payload jsonb not null
);

create or replace function private.capture_stability_backup(p_label text)
returns uuid
language plpgsql
security invoker
set search_path = public, private
as $$
declare
  v_id uuid;
begin
  insert into private.stability_backups(label, payload)
  values (
    left(coalesce(nullif(btrim(p_label),''),'stability backup'),120),
    jsonb_build_object(
      'character_npcs', coalesce((select jsonb_agg(to_jsonb(n)) from public.character_npcs n),'[]'::jsonb),
      'story_npcs', coalesce((select jsonb_agg(to_jsonb(s)) from public.story_cast_members s where s.is_user_created=true),'[]'::jsonb),
      'conversation_state', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id',c.id,
          'user_id',c.user_id,
          'character_id',c.character_id,
          'cast_state',c.cast_state,
          'scene_state',c.scene_state,
          'relationship_state',c.relationship_state,
          'intelligence_state',c.intelligence_state,
          'story_recap',c.story_recap,
          'story_revision',c.story_revision,
          'updated_at',c.updated_at
        ))
        from public.conversations c
      ),'[]'::jsonb)
    )
  )
  returning id into v_id;
  return v_id;
end;
$$;

-- Capture the post-migration v3.53.8 baseline. Future structural migrations can
-- call private.capture_stability_backup('before <migration name>') first.
select private.capture_stability_backup('v3.53.8 stable baseline');
