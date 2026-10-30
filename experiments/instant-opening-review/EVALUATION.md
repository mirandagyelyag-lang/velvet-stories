# Instant Story generation experiment — not released

Production remains character-chat version 732. The candidate generator was not promoted.

The first variant removed duplicate legacy prompt material. Three fixed synthetic cases still yielded one error and two unacceptable openings (invented plans, user movement and a named NPC).

A separate structured author/reviewer pipeline was then tested. It has a bounded repair, validates review shape, and mechanically blocks explicit unprovided user movement/pose and some possessions. Six new control tests pass. They verify the orchestration, not narrative quality.

Across 14 synthetic test slots, semantic review still accepted multiple observable violations, including user walking, invented NPC names, generic errands and crowd escape. Gemini 3.5 Flash Lite did not reliably follow the opening rules. Gemini 3.5 Flash returned one canary but then two 503 failures and invalid JSON in its next three-case suite. A compact GPT-OSS-120B Groq canary still introduced an unconfigured named friend and generic crowd-escape framing. No pass-rate claim is made from this small non-blind evaluation.

The three candidate scene directions are deliberately limited test scaffolds, not a final diversity engine. No synthetic result was inserted into the user's stories. Evaluation ran under an expiring temporary capability restricted to fixed synthetic tests; the endpoint was then replaced with HTTP 410 and its local capability was removed.

Next release criterion: a fixed set of independent cases must satisfy user agency, speaker and hearing geography, grounded profile and a specific character-owned motive on manual review, as well as structural checks. Model approval alone is insufficient. Keep failed outputs as regression evidence rather than claiming success from a READY deployment.
