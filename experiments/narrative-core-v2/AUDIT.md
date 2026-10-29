# Narrative engine audit — 29 October 2026

Baseline inspected: Supabase `character-chat`, deployed version 728, 109 files. This report describes observed source behavior, not Character.AI internals. No production changes were made by this experiment.

## Findings

| Finding | Source in the inspected function | Consequence |
| --- | --- | --- |
| A failed rescue may fall back to the original model response or streamed draft | `character-chat/index.ts:11714` | A rejected draft can return instead of passing a single final acceptance decision. |
| More deterministic repairs run after the absolute-final validation block | `index.ts:11825–11947` | Several components can replace prose; their priority and relation to the proposed memory/state are difficult to follow. |
| A document-reading rule substitutes a fixed romantic confession | `index.ts:11980–11986` | It authors user movement and emotional history independently of the actual note and relationship. This is visible-fiction generation inside a validator. |
| Final prose is streamed before the canonical database save | `index.ts:11989–11996` | A failed save can leave a user-visible response ahead of the durable conversation. This is a risk established by operation order, not a measured failure rate. |
| Scene/development updates remain on the original response envelope when prose is replaced | `index.ts:11988–12010` | There is a risk that state describes a different reply; the prototype submits prose and the proposed state together for review. |
| Separate normal and compact-recovery prompt builders assemble overlapping instruction modules | `index.ts:3766`, `index.ts:5839` | Behavior depends on the recovery path. A complete prompt-size and priority evaluation still requires live requests. |

The recently fixed canned `Fine` branch is absent in deployed version 728. That particular defect should not be reported as still present. Existing safety routing runs before ordinary fictional generation and is retained in the prototype. Its phrase-based detector is limited and is not a claim of comprehensive crisis understanding.

## Prepared alternative

The `experiment/` directory is isolated from production entrypoints. One immutable turn contract contains profile, user-sourced facts, scene, recent conversation, and the full latest message. Author dialogue never becomes confirmed user biography. Explicit user events advance scene state. One reviewer sees both prose and its proposed state; there is at most one repair, and a second rejection returns no fictional reply. No canned-fiction fallback or post-review text substitution exists. A persistence adapter must atomically compare the session revision before delivery.

This is an executable orchestration prototype, not a completed migration. The automatic event extractor, database adapter, actual provider comparison, and a human naturalness/identity assessment remain integration work. Excerpt provenance is necessary but not sufficient to establish an extracted fact; a semantic check is required before wiring automatic extraction.

## Verification and comparison status

- `node --test experiment/core.test.mjs`: 20 tests passed, including four multi-turn sequences and five reported failure categories.
- Tests use scripted authors and reviewers. They establish pipeline behavior, not the accuracy of a language-model reviewer or Chase's generated voice.
- Initial audit: provider credentials were unavailable in this workspace. A later controlled Supabase evaluation used credentials inside the server; see `experiment/LIVE-EVALUATION.md`. The full production engine has still not been compared end to end.
- `experiment/run-live.mjs` is ready to produce model transcripts with explicit endpoint/model/server-side key, per-turn latency, repair verdicts and human-review criteria. It has no production database client.
- Before replacement, replay the same synthetic scenarios through the current production route and this experiment, compare the resulting transcripts with human review, then assess naturalness, identity, continuity, agency, safety, latency and cost. Do not substitute a scripted pass count for that comparison.

## Reproduction

```sh
node --test experiment/core.test.mjs
node experiment/run-live.mjs > /tmp/narrative-experiment-results.json
```

The live command requires `NARRATIVE_EVAL_ENDPOINT`, `NARRATIVE_EVAL_MODEL`, and `NARRATIVE_EVAL_KEY` in the server-side environment. It exits with code 2 if they are missing. Keep generated private evaluation transcripts out of public repositories. The committed tests contain synthetic examples, not uploaded conversation exports.
