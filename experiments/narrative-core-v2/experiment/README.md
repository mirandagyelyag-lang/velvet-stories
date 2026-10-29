# Isolated narrative core experiment

This is a branch-only prototype, not a replacement for `character-chat`.

The core has one ordered path: safety → authoritative user events → bounded turn contract → author → reviewer → at most one repair → atomic commit adapter → delivery. Rejected drafts cannot be revived. No deterministic fiction or post-review substitutions exist. Profile identity and user evidence remain separate from assistant dialogue. The scene reducer retains completed transitions across turns.

Run the deterministic, multi-turn acceptance suite with `node --test experiment/core.test.mjs` from this directory's parent. These tests use scripted authors/reviewers: they verify orchestration, isolation, and scene/evidence handling, **not model quality**.

`model-adapter.mjs` accepts an explicit OpenAI-compatible HTTPS endpoint, model and server-side key. It performs actual author and reviewer requests; errors and malformed verdicts do not become accepted prose. Do not send a key from the browser. No live generation was run in the current workspace because provider credentials were unavailable. Same-model review is fallible and is not independent validation.

Before production integration: connect authenticated profile/history loading; implement atomic revision comparison and idempotency in persistence; validate automatic user-event extraction semantically (an exact excerpt alone does not prove an event's meaning); compare actual baseline and experiment generations on the same scenarios with human review; measure latency/error/cost and naturalness. Keep this branch separate until those checks pass. Existing safety detection is retained as defense in depth, not described as comprehensive.

The benchmark uses small synthetic scenarios inspired by reported failure categories. Private conversation exports are not included.
