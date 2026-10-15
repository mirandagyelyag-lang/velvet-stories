alter table public.ai_provider_cooldowns drop constraint ai_provider_cooldowns_provider_check;
alter table public.ai_provider_cooldowns add constraint ai_provider_cooldowns_provider_check check (provider in ('gemini','groq','openai'));
