# Response meaning and care revision — 29 October 2026

## Change under test

The author now selects a short conversational-move label and writes the actual response from the latest complete message. It is explicitly allowed to answer, clarify, express an immediate personal intention or simply listen; it is not required to turn every beat into a sarcastic quip or an outing. The label is not visible dialogue and is not accepted as proof that the prose performed the move.

The reviewer returns separate evidence-backed checks for responsiveness, care, identity, agency, continuity, factual canon and presentation. Code derives acceptance from those checks. A claimed `accepted: true` cannot override a failed or missing dimension. Rejected replies remain isolated from the history; the bounded repair path is unchanged.

## Defect discovered during this revision

The initial five-dimension revision correctly classified six prefixed good/bad candidates, but still accepted an invented six-hour library routine for Adrian and first-person narration in a complete conversation. Those are real failures, retained in the results. They motivated separate canon and presentation checks and the seven-dimension revision (`experiment-v3.1`). Passing the original six examples alone was insufficient.

The revised reviewer corpus therefore adds the actual unsupported NPC routine and a first-person narrative candidate. It classified all eight expected accept/reject decisions correctly, but added one unjustified reason about missing narration to an already-bad candidate. This is regression testing of known failures, not an independent unseen benchmark. Live author continuations supply additional newly generated outputs; repeatability and broader independent evaluation are still needed before release.

## Observed conversation outcomes with the configured lightweight model

The complete five-scenario sequence was run twice with the changing contract (30 turns total; four of the safety turns bypass generation). In the later run, the care sequence responded with “You're not bothering me” and “I'm right here,” without repeated relocation pressure or reproaches. The aftercare reply acknowledged medical care and safety without guilt. These are concrete improvements over the earlier recorded examples, not a guarantee about future conversations.

Canon still failed in newly generated dialogue: the reviewer accepted an invented prior notebook left in a common room, a claim about Chase and Adrian's social circles, and an unestablished location for Adrian. Some replies also remained formulaic or evasive. These failures are retained, not counted as successes merely because the model reviewer approved them.

Because `gemini-3.5-flash-lite` still missed those claims, other listed models were probed separately. `gemini-3.8-flash` produced a timeout and 503s. A single minimal `gemini-2.5-flash` probe returned 404 despite the model appearing in discovery. `gemini-3.5-flash` answered a minimal canary, but its first reviewer request returned 503. Provider errors are not narrative-quality scores. Any later successful run is recorded separately with its actual model; changing the model confounds attribution to prompt changes alone.

One bounded retry of the full Flash reviewer probe, with a single transient-503 retry inside the transport, ended in HTTP 429. The runner stopped instead of repeatedly charging ahead through more cases. No complete comparison with an alternate model was obtained.

## Release decision

**Keep this experimental.** The care/response contract and mandatory review dimensions have been implemented and tested, and the repeated care/aftercare outputs improved in this small sample. The system still approves newly invented history. That failure, plus the blocked alternate-model comparison and missing durable app integration, prevents a production replacement. Source and raw failures are preserved for the next revision. The production `character-chat` route remains version 728; both temporary evaluators are closed after the run.

## Verification

- 23 deterministic tests pass, including deriving rejection despite an accepted label and refusing an incomplete semantic verdict.
- Fixed reviewer cases and the same five three-turn scenarios are executed through the temporary isolated Supabase harness using server-only credentials and the primary discovered model.
- Results are stored in `semantic-review-results.json`; summaries below distinguish model approval from qualitative inspection of the actual prose.
- Earlier comparison transcripts remain in `live-results.json`. No claims about the complete production engine's latency or model-quality superiority follow from these small, non-blind samples.

## Scope

This revision remains on the experimental branch. It does not migrate database state or change the application route. Production replacement requires actual conversation quality and a durable authenticated persistence adapter, not only green unit tests or reviewer labels. The evaluator is closed after each controlled run.
