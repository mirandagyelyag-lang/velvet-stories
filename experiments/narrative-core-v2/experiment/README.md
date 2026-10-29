# Isolated narrative core experiment

This is a branch-only prototype, not a replacement for `character-chat`.

The subsequent response-meaning revision is documented in `SEMANTIC-REVIEW-EVALUATION.md`, with raw results in `semantic-review-results.json`. It adds mandatory semantic dimensions and structured response intent; it remains blocked for release by newly invented history. Its alternate-model harness deliberately requires the explicitly selected model rather than silently falling back to a smaller one.

The core has one ordered path: safety → authoritative user events → bounded turn contract → author → reviewer → at most one repair → atomic commit adapter → delivery. Rejected drafts cannot be revived. No deterministic fiction or post-review substitutions exist. Profile identity and user evidence remain separate from assistant dialogue. The scene reducer retains completed transitions across turns.

Run the deterministic, multi-turn acceptance suite with `node --test experiment/core.test.mjs` from this directory's parent. These tests use scripted authors/reviewers: they verify orchestration, isolation, and scene/evidence handling, **not model quality**.

`model-adapter.mjs` accepts an explicit OpenAI-compatible HTTPS endpoint, model and server-side key. It performs actual author and reviewer requests; errors and malformed verdicts do not become accepted prose. Do not send a key from the browser. A subsequent isolated Supabase evaluation used credentials only inside the server; see `LIVE-EVALUATION.md` and `live-results.json`. Same-model review is fallible and is not independent validation.

Before production integration: connect authenticated profile/history loading; implement atomic revision comparison and idempotency in persistence; validate automatic user-event extraction semantically (an exact excerpt alone does not prove an event's meaning); compare actual baseline and experiment generations on the same scenarios with human review; measure latency/error/cost and naturalness. Keep this branch separate until those checks pass. Existing safety detection is retained as defense in depth, not described as comprehensive.

The benchmark uses small synthetic scenarios inspired by reported failure categories. Private conversation exports are not included.

The later mandatory source audit is documented in `PROVENANCE-EVALUATION.md`; its code is `provenance.mjs`, tests are `provenance.test.mjs`, and actual synthetic transcripts/claim evidence are in `provenance-results.json`. Use `prepare-standalone.py` for a fixed-scenario evaluator without copying the production handler. Run both test files: `node --test experiment/core.test.mjs experiment/provenance.test.mjs`. Ordinary turns now require a provenance adapter; safety support still precedes that requirement.
