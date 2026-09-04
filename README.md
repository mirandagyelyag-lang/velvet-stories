# Velvet Stories v3.21.0 — Human Behavior

This release layers a persistent Human Behavior engine on top of v3.20 Emotional Intelligence.

## Human Behavior systems
1. Conversational Rhythm Engine
2. Nonverbal Intelligence
3. Personal Humor Engine
4. Argument Memory
5. Romantic Specificity
6. Physical Boundary Memory
7. Decision Consistency
8. Persistent Locations
9. Inventory & Possessions Lite
10. Social Reputation
11. Gossip & Information Flow
12. Relationship Asymmetry
13. Autonomous Plans
14. Between-Scene Simulation
15. Long-Story Memory Compression 2.0
16. Character Initiative Profiles
17. Naturalness Scorer
18. Character DNA
19. Cinematic Transitions
20. Adaptive Detail

## Architecture
- Persistent `human_behavior_state` is stored inside the existing conversation intelligence JSON state. No migration is required.
- Deterministic server-side naturalness checks supplement the model's own hidden quality check.
- User agency remains authoritative. Relationship asymmetry may store the character's subjective view, but never invents the user's feelings or interpretation.
- PWA auto-update, no-store version polling, `skipWaiting`, `clientsClaim`, and Vercel anti-cache headers are preserved.

## Verification
- `npm run verify:v3210`
- `npm run verify:story`
- `npm run verify:v34`

Deploy the frontend/PWA to Vercel and deploy `supabase/functions/character-chat` separately so one failure cannot block the other.
