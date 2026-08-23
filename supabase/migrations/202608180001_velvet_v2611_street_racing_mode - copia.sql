-- Velvet v2.6.11 · Night City and Street Racing are separate ambience modes.
alter table public.conversations
  drop constraint if exists conversations_ambient_mode_check;

alter table public.conversations
  add constraint conversations_ambient_mode_check
  check (ambient_mode in ('none','rain','night_city','street_racing','cafe','campus','fireplace','home','party'));
