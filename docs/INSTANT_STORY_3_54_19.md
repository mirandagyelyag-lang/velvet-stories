# Instant Story repair — frontend 3.54.19 / engine 491

## Confirmed production failure

Supabase `character-chat` 490 returned HTTP 503 twice on 7 October 2026, at 15:14:13 and 15:14:39 UTC. The executions lasted about 25.7 and 21.8 seconds. Function logs for the first request show a complete 90-word `gemini-3.5-flash-lite` draft after 6.96 seconds, rejected for `unstaged_user_placement` and `invented_user_action_or_state`. Both requests then logged `The signal has been aborted` for the constrained and emergency rescues.

The confirmed failure is an exhausted generation/repair path, not a database exception about missing threads. In 490 the primary requests were aborted at 8.8 seconds, the repair at 6.5 seconds and the emergency pass at 5.2 seconds. Other provider HTTP failures were discarded by `Promise.any(...).catch(() => null)` or silently ignored by rescue branches, so those failures cannot be reconstructed from the old logs. A provider rejecting optional generation config is tested as a compatibility case; it is not claimed as an observed cause of these two production incidents.

## Before/after Living Threads comparison

The complete Instant Story handler in frontend releases 3.54.17 and 3.54.18 was byte-identical: SHA-256 `506d5508105f4c61d3d2cddbafd6b6924d8052bb114abe48c50602c7badefe07`. Living Threads changed ordinary reply handling, not the `instant_story` dispatch. Its structured reply schema is not required for an opening.

The actual client order is `CharacterDetail.handleInstantStory` → `CharactersContext.generateInstantStory` → authenticated `character-chat` with `action: instant_story` → generated opening → create the new conversation and first character message. The failed generation therefore occurred before a conversation was inserted.

| Boundary | Result of inspection/test |
| --- | --- |
| New conversation / new ID | Opening generation precedes insertion; the instant action also tolerates an extra fresh ID without loading it. Actual RLS accepts the new row and first message. |
| Zero messages / memories | Not queried by opening generation; a real database fixture starts empty and passes. |
| Zero Living Threads / narrative state | Not loaded or initialized by this action; no V1 schema or reducer is required. |
| `generation_requests` | Not created or queried by `instant_story`; the ordinary reply action owns that lifecycle. |
| Prompt | Built from the character, creator opening DNA, scene variation and recent opening history. No conversation state is injected. |
| Gemini | Confirmed quality rejection followed by short-budget cancellations; the repair changes these request budgets and reduces prompt repetition. |
| Parsing | Plain prose and optional JSON `opening`/`reply` are handled, while hidden thread metadata cannot become visible opening text. |
| Frontend errors | The old client discarded `rejectionReasons` and all other backend fields. The new client logs a bounded diagnostic allowlist and keeps a friendly user message. |

## Repair

The primary prompt is shorter and retains character, opening DNA, explicit speaker/addressee, user agency, named-cast, natural dialogue and meaningful movement instructions. All existing hard quality/canon/agency checks remain active.

Primary requests receive up to 14 seconds and the repair up to 11 seconds. All provider bodies and retries share a 28-second handler budget; timers cover body decoding as well as the initial response. HTTP 400 retries once without optional config, using the same prose prompt. Rescue, emergency and salvage paths use the same request helper, so a later stage cannot silently outlive the remaining request budget.

Each failed attempt records phase, model, status, code and bounded error detail. The response includes a request ID and engine version. The existing variation UUID correlates client and server diagnostics. API keys are redacted; character drafts, prompts, auth headers and transcript are not copied into the client diagnostic object. Successful fallback openings meet the client's 55-word minimum.

## Verification and practical limit

`npm run verify:instant-story` executes the real Edge handler and all real imported narrative gates with controlled provider responses. Seven cases cover fresh zero-state creation, existing opening history/threads, a 9.6-second provider response, config compatibility, structured output, backend/frontend diagnostics and repairing a rejected user-action draft in eight seconds. Against the exact published 3.54.18 source, the fresh delayed-response test fails with 503 while the existing-story control passes; both pass after the fix. `npm run verify:living-threads`, Edge boot checks, syntax checks, lint of changed files and production build pass.

`tests/instant-story-zero-state.sql` was executed against the real database under the authenticated role, inside a transaction that rolls back every fixture. It confirms empty conversations, messages, memories, threads, narrative state and persistence of the first opening. No schema changes or new accounts are part of the repair.

A complete authenticated browser → live Gemini → saved-story run remains unverified. The browser had no signed-in Velvet session; the secure sign-in request did not complete. Automatic approval review rejected creation of a temporary production test account because that access was not authorized. The real production logs, actual handler regression tests and rolled-back RLS test must not be represented as a completed live-model user-session test.

The legacy verifier failures described in `LIVING_THREADS_V1.md` remain outside this bug fix. Character Intent and other new features are not included in this release.
