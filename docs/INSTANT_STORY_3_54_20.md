# Instant Story live follow-up — Velvet 3.54.20 / character-chat 494

## Failure reproduced with the authorized temporary account

The authenticated production test against engine 491 reproduced HTTP 503 at request `9706510f-83cd-448e-8c00-daea8733bd9b`, execution `ed05eef3-5e37-40ce-9de9-5880b6a96c31`. It started with zero conversations, messages, memories and generation requests. It failed before any conversation or first message was inserted.

The response and Supabase logs agreed: `gemini-3.5-flash-lite` and `gemini-3.1-flash-lite` timed out at 14 seconds; the repair on `gemini-3.5-flash-lite` timed out at 11 seconds; the emergency model returned `503 UNAVAILABLE` with a high-demand message. The handler returned in 25.642 seconds. This was a real provider failure, not a missing-thread database or parsing exception.

Production diagnostics showed primary `gemini-3.5-flash-lite`, fallback/emergency `gemini-3.1-flash-lite`, and recovery `gemini-3.5-flash`. Deduplication therefore left only two primary models. The recovery model was used only when there was a rejected draft to salvage; a provider outage producing no draft never reached it.

The earlier 490 incidents also included a completed draft rejected for invented user placement/action, followed by short repair cancellations. The handler was byte-identical before and after Living Threads V1; see [the original investigation](INSTANT_STORY_3_54_19.md). Living Threads is retained, and no schema or narrative feature changes are included.

An intermediate live run on 492 returned `ai_last_resort` with 103 words, but the actual frontend rejected its closing format. A run on 493 correctly rejected unsafe/unstaged drafts and also exposed `gemini-3.5-flash` overload. These failed runs are not counted as successful verification.

## Additional repair

Engine 494 includes the already-configured recovery model among the staggered primary attempts. A new opening can reach it even if the Lite models return no text. Instant Story also includes its separate `gemini-3.6-flash` recovery option; a real existing diagnostic probe confirmed that endpoint responds with the project’s provider key. This routing applies only to openings, with at most four distinct staggered models. One transient REST retry with a short randomized delay handles `408`, `429` and selected `5xx` errors; it shares the same abort controller, per-attempt timeout and 28-second total deadline. Authentication and quota failures are not retried. Unsupported optional config still has its one bare-request compatibility path.

Opening requests use minimal thinking, supported by these model families, to avoid imposing extra reasoning on the fast opening path. The first-speech recipient detector now accepts explicitly staged race-world roles such as “turned to the two drivers”, while still rejecting floating dialogue and invented user actions. The prompt requires an explicit speech tag and recipient. All other hard user-agency, canon, speaker and quality checks remain. No deterministic story is substituted for a failed model generation.

Frontend and backend now share a pure prose normalizer/completeness validator. Balanced Markdown emphasis is removed without adding or rewriting story text. Every success lane must deliver at least 55 words and a complete closing sentence; a truncated last-resort draft cannot escape as HTTP 200. A client rejecting a malformed HTTP 200 retains request ID, engine, model/source, word count and completion result.

Successful responses expose the winning model and log `instant_story_completed` with request ID, engine, source, word count and duration. Failure details remain bounded and traceable in the frontend without dumping prompts, credentials or character drafts.

References: [Google transient error retry guidance](https://ai.google.dev/gemini-api/docs/troubleshooting), [thinking configuration](https://ai.google.dev/gemini-api/docs/thinking).

## Verification

Thirteen actual-handler regression cases pass, including the exact fresh-zero-thread test, an existing-story control, slow generation, unsafe-draft repair, provider config compatibility, hidden structured metadata, backend/frontend diagnostics, a Lite-model outage with recovery available, a transient Gemini 503, Markdown prose, a truncated last-resort draft, malformed HTTP 200 diagnostics, and explicitly staged racing dialogue. The Living Threads reducer and actual transport checks, six Edge boot checks, changed-file lint and production build pass. Lint retains existing warnings; the previously documented legacy aggregate suite failures are not claimed fixed.

## Authorized live result and cleanup

Both real-model requests completed with `source: ai`, passed the actual frontend acceptance checks and saved one first character message under authenticated RLS. The first started with zero conversations/messages/memories/generation requests. Each newly created conversation had zero messages, memories and threads and no V1 state before its first message. Both saved openings were reloaded byte-for-byte. The second request sent one recent opening and preserved the first conversation and message exactly.

| Case | Request ID | HTTP | Model | Words | Client HTTP time |
| --- | --- | --- | --- | --- | --- |
| Fresh zero-state | `00193afd-22cc-4a0f-9c5c-4709e143592b` | 200 | `gemini-3.6-flash` | 107 | 16.755s |
| Existing opening history | `d8bb28af-72dc-42af-b7ef-c088e3dba11c` | 200 | `gemini-3.5-flash-lite` | 77 | 1.876s |

Client HTTP duration includes network/Edge overhead. Supabase completion logs independently confirm engine 494 and the matching request IDs. The account was signed out globally and deleted after both openings were saved; cleanup verified zero account/session/profile rows and zero rows owned by the fixture across all auth/public tables with `user_id`. The copied character and both conversations/messages were removed. Existing user accounts and stories were not modified.

[Machine-readable evidence](instant-story-live-35420.json) records the two cases and cleanup. `tests/instant-story-live.mjs` is the reproducible runner. It requires an explicitly provisioned, marked, disposable account via `VELVET_INSTANT_TEST_ACCOUNT_JSON`; it never creates users or changes auth configuration.

The verification used the actual frontend generation and persistence functions via an authenticated API client, not a browser button click. The existing-story control checks saved-opening continuity and another opening generated with prior opening history; it is not an ordinary-chat-turn test. These checks establish functional creation and persistence, not narrative quality or 50 real-model turns. The generated prose should still undergo the requested narrative validation; existing heuristics do not catch every semantic issue.

