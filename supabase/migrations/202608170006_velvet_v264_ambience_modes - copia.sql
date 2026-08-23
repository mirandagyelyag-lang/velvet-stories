-- Velvet v2.6.4 · allow the two ambience modes that were added in v2.6.2.
alter table public.conversations
  drop constraint if exists conversations_ambient_mode_check;

alter table public.conversations
  add constraint conversations_ambient_mode_check
  check (ambient_mode in ('none','rain','night_city','cafe','campus','fireplace','home','party'));
