# Source-grounded fact audit — 29 October 2026

## Implemented

Each turn compiles an authoritative source catalog with stable IDs for profile fields, verbatim user messages and the committed current scene. Assistant messages are deliberately excluded. A model-written claim cannot verify itself by pointing to a previous model-written sentence. User evidence is kept as its original quote, not treated as a free paraphrase supplied by the author.

The factual gate is mandatory for ordinary generation and runs before the style/meaning reviewer. It has two distinct passes:

1. Inventory protected claims about user actions/possessions/opinions/obligations, existing NPC biography/presence, stable lead biography, and remembered/shared events. Each claim must have an exact excerpt in the draft and citations using the catalog's IDs and verbatim text.
2. Independently check whether those citations actually entail the claim, including subject, negation, time and qualifiers. Also inspect the whole draft for omitted protected claims, even when the first inventory is empty.

Code checks source existence, quote membership, permitted source scope, claim identity and complete entailment verdicts. Missing/invalid sources or unsupported/omitted claims block the draft and enter the existing single-repair path. A citation containing only “Adrian” is syntactically valid but cannot establish his six-hour routine. Current scene state cannot establish remembered user possessions or a shared incident.

Genuine new present-world actions and props remain possible. A notebook newly taken from the character's own bag is different from a notebook the user supposedly left yesterday. When the user actually established that event, citing the real message should permit it. This distinction is tested with both supported and unsupported variants.

## Limits

The code can strictly validate IDs, literal quotes and audit completeness. Claim extraction and semantic entailment are still model judgments; this is not a mathematical guarantee that every invention will be detected. An exact quote alone was specifically found insufficient, so it never replaces the entailment/coverage pass. New failures must be preserved rather than scored as successes because a reviewer approved them.

The experiment still has no automatic production user-event extractor or durable authenticated database adapter. These tests use synthetic sessions and manually supplied authoritative events, not private conversation exports.

## Verification

Run `node --test experiment/core.test.mjs experiment/provenance.test.mjs` from the parent directory. The suite has 44 passing tests, including assistant-evidence exclusion, fabricated IDs/quotes, wrong source scope, name-only citation laundering, omitted-claim detection, supported notebook history, new present-world actions, and rejecting a draft before the semantic reviewer or database commit.

The live fixed corpus contains the unsupported Adrian routine, unsupported notebook history, the same history present only in assistant text, supported variants established by actual user messages, and a plain listening reply. The same multi-turn correction/interior/care/refusal/safety conversations are also rerun. Results, including rejection/repair evidence and provider failures, are recorded in `provenance-results.json`.

The temporary evaluator is self-contained: it imports no production handler, database client or chat persistence code. Existing provider credentials remain on the server. Only fixed scenarios are accepted behind a short-lived random capability, and the evaluator is closed after the run. Production replacement is not authorized merely by the unit-test count.

The first untyped live audit failed to parse model JSON. It did not release or save a story reply. The inventory and entailment passes now request strict JSON schemas, forwarded by the native Gemini adapter using the documented REST `generationConfig.responseFormat.text.schema` shape. The repeated six-case corpus completed with all expected decisions (three unsupported variants rejected and three supported/non-factual variants accepted). Documentation reference: https://ai.google.dev/gemini-api/docs/generate-content/structured-output?hl=en .

The first complete-conversation pass overblocked new lead actions and an open offer. Its outputs are retained as failures. The revised second pass classifies the actual subject/scope independently of the extractor, so a mislabeled lead action is not treated as a user fact. Protected assertions inside new dialogue still need proof. The expanded eight-case corpus classified all expected decisions correctly, including the previously overblocked keys action and conditional offer. Further native schemas also cover author/reviewer JSON; this format correction is marked as revision `v4.2` in live results.

## Full conversations and limitations

The scoped run completed correction/Adrian, interior, care and declined plans. None of those accepted replies manufactured the rejected Adrian routine or prior user notebook. Care retained direct listening, and completed interior transitions stayed inside. Responses remain stylistically plain and sometimes evasive; this fact-control change does not establish that Chase’s overall voice is ready.

The first two safety turns used the deterministic support route. The later medical-care/safety confirmation and an extra injected-draft repair request hit HTTP 429 near the end of the run. These are recorded as provider failures, not approvals. A single spaced follow-up is recorded separately. The history is never updated with a rejected injected draft.

Several native output schemas now cover author, factual inventory, entailment and semantic review. Literal source validation, scope checks and independent coverage are still enforced in code after parsing; structured output alone does not verify truth. The author schema normalizes a null unchanged-position marker to an empty scene patch.

## Repair strategy

The first injected-draft repair trial correctly rejected both unsupported drafts and saved neither, but failed to obtain an acceptable repair. One rewrite invented that Chase did not know Adrian; another invented where the notebook had been found. Those failures remain in the result bundle. A missing fact cannot establish its opposite.

For source failures, the author now receives a `RESET_UNSUPPORTED_PREMISE` repair input rather than the rejected draft’s full prose. It receives the failed claims and reasons, and must discard the unsupported setup, avoid replacement offscreen history, leave unknown relationships unknown, and answer from the latest user message plus authoritative state. The same two injected trials are repeated after that change. This changes only source-failure repairs; accepted listening replies and ordinary semantic repairs use the existing path.

Timings include deliberate provider throttling and are not measurements of production chat latency. Structured-output documentation was checked at https://ai.google.dev/gemini-api/docs/generate-content/structured-output?hl=en . The fact inventory and inference passes use fixed JSON schemas; all code checks still run after parsing.

## Scope refinements

An injected repair asked who says Adrian wants company; that open question was incorrectly treated as an asserted NPC preference. The scope taxonomy now includes a non-assertive question, while loaded questions still expose their presupposed incident as a protected fact. A three-case live check accepted the open question and a new present-world prop, and rejected “Why did you leave your notebook ... yesterday?” without a prior source. These changes are marked `v4.3`. A repair that introduces a new lead-owned object is instructed to show it now without inventing where or when it was obtained.

## Final result of this task

- 44 local tests passed.
- The scoped eight-case factual corpus matched all expected accept/reject decisions.
- The three additional scope cases allowed a genuinely open question and a present-world prop, while rejecting the presupposed notebook incident inside a loaded question.
- The five original three-turn scenarios were exercised; the last safety confirmation was completed by the single spaced follow-up after a 429. Care retained listening without blame. Newly accepted correction/interior replies did not reuse the invented Adrian routine or prior user notebook.
- After the final reset/scope refinement, both deliberately injected bad drafts were blocked and replaced with accepted prose without the unsupported routine or user-notebook history. Neither rejected draft appeared in the returned canonical history. These are injected regression tests, not independent natural first-draft successes.
- General voice/naturalness and full application integration are still not established by those results. Production `character-chat` remains unchanged at version 728. The temporary evaluator was closed after testing.
