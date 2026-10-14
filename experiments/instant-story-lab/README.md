# Instant Story lab

Separate experiment for Chase. No production imports, chat writes or migrations.

- Same prompt/config/fixture per model; three fixed case IDs.
- Provider errors are recorded as availability failures, not quality scores.
- No retries after quota/saturation. No automatic promotion to production.
- Heuristic screen is only a hint; human review of voice, tension, variety and agency is mandatory.

## Run

Use the existing Supabase project's server-side GEMINI_API_KEY. Deploy runner.ts and core.mjs under a separate QA function with deno.json. Authentication requires VELVET_LAB_TOKEN and VELVET_LAB_EXPIRES_AT (Unix milliseconds). Missing or expired credentials deny access. Never commit tokens. The embedded fixture contains only fictional character canon, no account IDs or chat history.

Place the short-lived test token in a local access.json, run compare.py from this directory and inspect results.json. Disable the QA endpoint after running. The token is for the isolated QA function only; it cannot access the app's authenticated chat endpoints.

## Review cases

party, campus_event, group_outing. Accept only if: user agency preserved, Chase voice recognizable, tension arises causally without explanation, scene gives a live next turn, premise differs across cases. An individual good answer does not establish reliability.

## First run, 14 Oct 2026

Models 3.5-flash and 3.5-flash-lite returned HTTP 503 on the first case; remaining cases skipped. Model 3.1-flash-lite returned three completed scenes, all rejected on manual review for invented user state, staged emotional shifts and repetitive structure. No production change. Detailed outputs retained separately for the creator.
