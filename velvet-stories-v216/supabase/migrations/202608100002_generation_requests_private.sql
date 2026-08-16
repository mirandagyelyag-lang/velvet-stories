-- Cancellation is mediated by character-chat with the service role. Browser
-- clients must not read or mutate internal generation lifecycle rows directly.
alter table public.generation_requests enable row level security;

revoke all on table public.generation_requests from anon, authenticated;
drop policy if exists "generation_requests_own_rows" on public.generation_requests;

grant select, insert, update, delete on table public.generation_requests to service_role;
