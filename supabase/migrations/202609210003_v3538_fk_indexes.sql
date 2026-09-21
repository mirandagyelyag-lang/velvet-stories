-- Velvet Stories v3.53.8c · Foreign-key index sweep
-- Covers FK lookup paths used by deletes, cascades, snapshots and story maintenance.

create index if not exists conversations_branch_from_message_id_idx on public.conversations(branch_from_message_id);
create index if not exists conversations_branch_parent_id_idx on public.conversations(branch_parent_id);
create index if not exists conversations_lorebook_id_idx on public.conversations(lorebook_id);
create index if not exists conversations_persona_id_idx on public.conversations(persona_id);

create index if not exists lore_entries_user_id_idx on public.lore_entries(user_id);
create index if not exists memories_character_id_idx on public.memories(character_id);
create index if not exists memories_superseded_by_idx on public.memories(superseded_by);
create index if not exists message_alternatives_conversation_id_idx on public.message_alternatives(conversation_id);
create index if not exists messages_reply_to_message_id_idx on public.messages(reply_to_message_id);

create index if not exists story_arcs_user_id_idx on public.story_arcs(user_id);
create index if not exists story_bible_entries_user_id_idx on public.story_bible_entries(user_id);
create index if not exists story_calendar_events_user_id_idx on public.story_calendar_events(user_id);
create index if not exists story_canon_corrections_source_message_id_idx on public.story_canon_corrections(source_message_id);
create index if not exists story_canon_corrections_user_id_idx on public.story_canon_corrections(user_id);
create index if not exists story_cast_connections_user_id_idx on public.story_cast_connections(user_id);
create index if not exists story_cast_members_user_id_idx on public.story_cast_members(user_id);
create index if not exists story_chemistry_profiles_user_id_idx on public.story_chemistry_profiles(user_id);
create index if not exists story_conflicts_user_id_idx on public.story_conflicts(user_id);
create index if not exists story_consequences_user_id_idx on public.story_consequences(user_id);
create index if not exists story_knowledge_entries_user_id_idx on public.story_knowledge_entries(user_id);
create index if not exists story_milestones_source_message_id_idx on public.story_milestones(source_message_id);
create index if not exists story_milestones_user_id_idx on public.story_milestones(user_id);
create index if not exists story_plans_user_id_idx on public.story_plans(user_id);
create index if not exists story_snapshots_user_id_idx on public.story_snapshots(user_id);
