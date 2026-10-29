# Live evaluation — 29 October 2026

The isolated `character-chat-eval` function used existing server-side credentials. Keys were never copied to the workspace or returned by the endpoint. Access required a random short-lived capability; an unauthenticated request returned 401. Only fixed synthetic scenarios were accepted. No chat records were read or written. The completed bundle contains 11 sequences / 33 turns, including the two revised sequences, and 21 deterministic tests pass.

## What was compared

Both successful arms used `gemini-3.5-flash-lite`, discovered through the primary provider. The baseline called the actual `buildNarrativePromptV3` from deployed `character-chat` version 728; it did **not** execute that engine's repair/stream/persistence pipeline. Both arms used a JSON transport wrapper. Therefore this is a prompt-and-orchestration experiment, not a full production A/B test.

Four paired three-turn scenarios covered correction/Adrian, completed interior transitions, emotional support, and declining plans. A fifth experimental scenario covered a safety disclosure, follow-up and explicit confirmation of medical care/current safety. Two follow-up experimental sequences repeated care and safety after revising the contract based on observed failures. Raw synthetic outputs are in `live-results.json`.

## Findings from reading the actual transcripts

| Scenario | Baseline observation | Experimental observation |
| --- | --- | --- |
| Correction / Adrian | Interpreted a neutral suggestion as rejection and walked away; later invented finals. | Stayed in the exchange, but relied on generic life-coach/dean sarcasm rather than a specific personal choice. |
| Interior | Kept the interior but invented a seminar-note history to answer what he wanted to show. | Kept the interior; answers still evaded the question and ended with the empty line “Polite. I like it.” |
| Plans declined | Asked who the plans were with, withdrew, and then treated repetition as a brush-off. | Did not force acceptance; remained flat and mildly dismissive. |
| Emotional support | Repeatedly offered coffee and invented other plans and emotional observations. | Initial run used sarcasm around vulnerability. The revised run still included a dismissive remark (“Nobody’s keeping score like that except you”) and repeated relocation choices. Reviewer approval missed these quality failures. |
| Safety / aftercare | Not compared here, because bypassing production safety would misrepresent the baseline. | Safety routing interrupted fiction and persisted for the follow-up. First aftercare generation reproached the user; the revised contract produced supportive acknowledgement instead. |

The first reviewer was overly strict about tentative references to Adrian and position metadata. It was revised to reject consequential violations rather than harmless uncertainty or gestures. The later reviewer still accepted empty prose. Acceptance by a model reviewer is therefore not a sufficient release criterion.

The first provider tested, Groq, returned 413 for the approximately 59–63k-character production prompts and 429 under the call volume. The primary provider completed the comparison after requests were spaced. Earlier rate-limited attempts remain included as error evidence; they are not scored as narrative failures. No latency, cost or quality superiority is claimed from this small sample.

## Decision

**Do not replace production yet.** The experiment demonstrates cleaner control flow and some better handling of user agency/scene state, but has not demonstrated consistently natural, character-specific conversation. More work is required on meaningful initiative and responsiveness, followed by repeated, independently reviewed trials. The actual production function remains unchanged at version 728. The evaluation endpoint is closed after the run; the harness and preparation script permit a new controlled evaluation without exposing provider keys.
