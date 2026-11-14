# ORVAYNE — Security and Reliability Verification

**Status: live backend source and RLS policies inspected; not a penetration test or certification.** No production configuration should be changed until the deployed handler is inspected and tested.

## Authentication and authorization

- [ ] Inspect the deployed `character-chat` function source and deployment configuration.
- [ ] Confirm whether requests without a valid signed-in user token are rejected **inside the handler**.
- [ ] Verify user identity using a trusted authentication mechanism, not a client-supplied `userId`.
- [ ] Confirm every conversation and message lookup enforces ownership server-side, including when service credentials are used.
- [ ] Test missing token, expired token, another user's conversation ID, and malformed payload.
- [ ] Verify rate limits, input limits, cost controls, and safe error responses.
- [ ] Inspect database RLS policies and function privileges separately from client-side filters.

### Current evidence

`supabase/config.toml` contains `verify_jwt = false` for `character-chat`. This disables the platform JWT check, **not necessarily all authentication**. The client retrieves a session and sends a bearer token in `src/context/ChatsContext.jsx`. Client behavior alone cannot establish server-side enforcement.

**Do not flip `verify_jwt` without confirming the deployed function's authentication design and all callers.** Supabase documents the platform check and handler-level authentication as separate layers: https://supabase.com/docs/guides/functions/auth-headers

## Reliability and test reduction plan

1. Record current results for `npm run lint`, `npm run build`, `npm run verify:edge-boot`, and `npm run verify:instant-story`.
2. Identify which scripts require network access, secrets, or a live backend.
3. Group checks into fast PR smoke tests, story regression tests, mobile/PWA tests, and release-only integration tests.
4. Remove duplicate tests **only after** comparing coverage and preserving known bug regressions.
5. For versioned CSS, inventory selectors and their cascade dependencies; consolidate only with screenshot comparisons across mobile and desktop.
6. Track p50/p95 latency and failure rates for generation and first-message creation, with no sensitive story content in telemetry.

## Verification record

| Check | Result |
| --- | --- |
| Read frontend auth flow | Partial: AuthContext and ChatsContext reviewed |
| Read deployed function handler | Not verified: remote function retrieval unavailable |
| Confirm server-side JWT validation | Not verified |
| Confirm database RLS | Not verified |
| Run build and test suite | Not run |
| Deploy production changes | Not performed |

This document intentionally avoids claiming that the application is secure or that tests pass without evidence.

## Verified live findings (2026-11-14)

- Supabase project `Velvet Stories` is active; deployed `character-chat` function version **789** has `verify_jwt = false`.
- Its deployed handler rejects missing Authorization headers with HTTP 401, constructs a Supabase client using the supplied bearer token, calls `supabase.auth.getUser()`, and rejects invalid sessions with HTTP 401. The effective `userId` comes from the verified user, not the request body.
- All inspected public tables have row-level security enabled. The inspected `characters`, `conversations`, `messages`, and `generation_requests` policies scope access to `auth.uid() = user_id`; relevant INSERT and UPDATE policies include ownership checks.
- Supabase Security Advisor reports **leaked password protection disabled** (warning): https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- Advisor also reports `public.ai_provider_cooldowns` has RLS enabled but no policy (informational; can be intentional for server-only access): https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
- Further work: inspect all privileged queries and special actions for ownership, run authenticated/unauthenticated integration tests, and verify secrets and quotas. No live settings changed.

**Correction to earlier checklist:** handler source was retrieved successfully; the prior “remote function retrieval unavailable” entry is superseded by the findings above.

## Source synchronization progress (2026-11-14)

- Restored deployed `character-chat/index.ts` (v789, 1,083,162 characters) and the missing `character-chat/chat-timing.ts` to the audit branch. The large entrypoint is retrievable using GitHub's blob API; the contents API fetch can show an empty content field for large blobs despite a valid nonempty blob SHA.
- Compared 20 of the other 122 deployed files against the audit branch: 18 identical, two differ, and one initially missing dependency was restored (the 20 include the restored dependency). **The remaining dependencies are not yet verified.**
- `experimental/transport.mjs` differs in a provider-request pause: deployed 5,500 ms vs GitHub 250 ms. This is a significant performance/behavior difference and must not be overwritten blindly.
- `engine/crisis-response.js` differs in safety-related Spanish crisis response wording; preserve and review separately rather than overwriting.
- The branch is **not yet ready for merge/deployment**. Static checks and GitHub Actions run completion are not confirmed; integration tests with separate users remain outstanding.
