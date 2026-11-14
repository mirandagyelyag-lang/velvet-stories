# ORVAYNE — Security and Reliability Verification

**Status: investigation required; not a certification.** No production configuration should be changed until the deployed handler is inspected and tested.

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
