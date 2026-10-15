-- Server-only quota state, shared across Edge workers and requests.
create table if not exists public.ai_provider_cooldowns (
  provider text not null check (provider in ('gemini','groq')),
  model text not null,
  retry_at timestamptz not null,
  primary key (provider,model)
);
alter table public.ai_provider_cooldowns enable row level security;
revoke all on public.ai_provider_cooldowns from public, anon, authenticated;
grant select, insert, update, delete on public.ai_provider_cooldowns to service_role;
