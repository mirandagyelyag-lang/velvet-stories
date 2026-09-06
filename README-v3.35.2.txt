VELVET STORIES v3.35.2 · CHARACTER AGENCY + SCENE MOMENTUM

Built on v3.35.1 Grounded Reality Hard Lock.
Chemistry remains intentionally unchanged.

NEW
- Character Agency Decision Frame: active intent, current want, avoidance, changed-this-turn, legitimate actions.
- Intent Persistence: interrupted intentions remain available without being forced back immediately.
- Unresolved Thread Carryover: established unfinished subjects can return naturally.
- Commitment Inertia: stay/leave/wait/refuse choices do not reverse without an on-page cause.
- Micro-Initiative Budget: short user turns allow only a small amount of character initiative.
- Grounded Scene Momentum: continue an existing activity, choose, pause, refuse, leave, wait or close.
- No Hook Compulsion: random phone buzzes, knocks, surprise arrivals and teaser endings are hard-guarded.
- Natural Scene Endings: a beat may simply land or end.
- Exit/absence protections from v3.35.1 remain active.
- Raw model prose remains quarantined until validation.

DETERMINISTIC FAILURES
- agency_commitment_inertia_break
- gratuitous_external_hook
- initiative_budget_overflow
- forced_scene_continuation_hook

REGRESSION
- v3.35.2 Agency + Momentum: 31/31
- v3.35.1 Grounded Reality: 29/29
- Full Stability Lab passes, including UI/mobile/story/relationship suites.

BUILD NOTE
The ChatGPT container could not complete npm dependency installation because one tarball was not present in its offline cache. The installer therefore performs npm install, all verifiers, and npm run build on the user's machine BEFORE deployment. Any failure stops deployment.
