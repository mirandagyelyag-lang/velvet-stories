VELVET STORIES v3.26.0 — CHARACTER DNA 2.0 + REACTION ENGINE

GOAL
Characters must not only SOUND different. They must interpret the same situation differently,
protect different things, make different mistakes, show care differently, and choose different
social tactics under pressure.

WHAT CHANGED
1. Character DNA 2.0
   - Stable profile-derived decision logic per character.
   - Core drive, emotional defense, pressure response, care behavior, vulnerability pattern,
     repair style, affection signal, decision bias, likely mistake, and stress leak.
   - If a profile is underspecified, Velvet uses a stable per-character fallback fingerprint
     rather than one global default personality.

2. Reaction Engine
   - Classifies the current cue: ordinary question, vulnerability, affection, conflict,
     invitation, boundary, silence/action, etc.
   - Silently runs: literal cue -> interpretation -> first impulse -> defense/values -> visible tactic.
   - The same user line can therefore produce different choices from different characters.

3. Human Error as Identity
   - Characters may joke at the wrong time, withdraw too far, protect pride, solve the wrong
     problem, hesitate, answer incompletely, or need another beat.
   - Respecting boundaries remains absolute, but boundaries do not transform everyone into a therapist.

4. Subtext instead of self-analysis
   - Hidden feelings should often appear through omissions, awkward lines, changed behavior,
     practical choices, retreat, or tone.
   - Velvet flags emotional explanation dumps on ordinary turns.

5. Anti-clone reaction validator
   - Detects repeated generic reaction shapes across recent replies such as tease->question,
     therapist reassurance, cinematic banter, question loops, and long explanations.
   - A bounded repair changes the underlying tactic, not just wording.

VALIDATION
- 14/14 Character DNA 2.0 + Reaction Engine checks
- 11/11 Voice Identity checks
- 11/11 PWA hotfix checks
- 20/20 Velvet Experience checks
- 20/20 Stability Sweep checks
- 244/244 UI checks
- 63/63 mobile QA checks
- 26/26 Story Engine checks
- 10/10 Relationship Dynamics checks
- character-chat TypeScript syntax valid

NOTE
The model container could not complete npm install, so the Vite production build is intentionally
re-run by APPLY-VELVET-v3.26.0-CHARACTER-DNA.sh on the user's machine before anything is deployed.
