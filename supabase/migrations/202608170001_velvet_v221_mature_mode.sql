-- Velvet v2.2.1: per-story mature content tone.
-- This controls adult themes and non-graphic intimacy; it does not bypass provider safety.
alter table public.conversations
  add column if not exists mature_mode boolean not null default false;

comment on column public.conversations.mature_mode is
  'Adult-fiction tone control for stronger chemistry, mature language and non-graphic intimacy.';
