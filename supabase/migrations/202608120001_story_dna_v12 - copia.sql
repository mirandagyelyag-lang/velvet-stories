-- Velvet Stories v1.2 · distinct voices and creator story DNA
-- These optional anchors apply to every existing and future character.

alter table public.characters
  add column if not exists voice_vocabulary text,
  add column if not exists humor_style text,
  add column if not exists conflict_style text,
  add column if not exists affection_style text,
  add column if not exists verbal_tells text,
  add column if not exists voice_avoidances text;

alter table public.conversations alter column story_engine_version set default 9;
update public.conversations set story_engine_version = 9 where story_engine_version < 9;

comment on column public.characters.voice_vocabulary is
  'Characteristic vocabulary, sentence rhythm and level of formality.';
comment on column public.characters.voice_avoidances is
  'Phrases, tones and generic archetype fallbacks this character should avoid.';
