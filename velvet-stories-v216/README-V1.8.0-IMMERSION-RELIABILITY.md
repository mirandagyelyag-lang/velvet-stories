# Velvet Stories v1.8.0 — Immersion & Reliability

This release keeps the calm/editorial visual direction and focuses on story depth, mobile reliability, continuity, memory and recovery.

## Chat & timelines
- Response versions remain persistent and navigable with arrows. No touch-swipe gesture is attached to message surfaces.
- Edit/rewind/branch actions remain available from the message action sheet.
- Story Hub keeps original and alternate timelines separate.
- Current stories can be exported as Markdown, plain text or JSON.
- Scene Director adds one-shot quick directions: more dialogue, more tension, move the scene, bring someone in, follow the main character, or surprise me.

## Scene intelligence
The normal roleplay generation now returns a `scene_update` in the same Gemini response. No background model call is added.
Velvet tracks:
- visible location and time label
- who is physically present
- who visibly exited
- who could actually hear/receive the latest turn
- real scene/time changes and optional separators

The prompt explicitly forbids teleporting, impossible overhearing and silently changing scene facts.

## Voice engine
The existing character voice fingerprint is enforced more strongly:
- character-specific sentence length and rhythm
- vocabulary, humor, conflict and affection style
- avoidance of generic romantic-lead cadence
- recent opening/signature repetition checks
- short or awkward responses remain allowed when they are more faithful to the character

## Memories 2.5
Memory views now include Active, Canon, Relationship, Events, Preferences, Conflicts and Replaced history.
Automatic memories can store the exact visible user-message source via:
- `source_message_id`
- `source_excerpt`

Manual memories can replace an older non-canon memory without silently deleting its history.

## Relationship pulse
A private optional drawer summarizes evidence already earned by the story:
- current dynamic
- relationship phase
- recent shift
- unresolved contradictions
- emotional residue
- turning points

There is intentionally no love-percentage meter.

## Reading mode
Reading Mode now supports:
- narrow / comfortable / wide reading width
- clean / book-serif reading font
- tap the reading surface to reveal/hide secondary chrome
- native one-finger page scrolling remains authoritative on touch devices

## Character Studio autosave
New and edited character drafts are autosaved locally while you work and recovered after an accidental close/reload.
Nothing becomes a saved Velvet character until the explicit Save action succeeds.

## Velvet Doctor
Settings → Velvet Doctor provides:
- installed app version and build time
- PWA/browser mode
- touch-point and viewport diagnostics
- Supabase session health
- Edge Function health
- optional tiny Gemini probe
- configured model chain
- local per-session AI request/failure/repair counters
- copyable diagnostics
- Clear app cache & reload for stale PWA builds

The normal diagnostic check does not spend a Gemini generation.

## AI quota handling
A 429 is described as rate limiting rather than automatically claiming the daily free tier is exhausted.
Normal roleplay uses one generation. A second repair call is reserved only for structurally unsafe output.

## Database migration
Apply:
`supabase/migrations/202608140001_velvet_v18_memory_sources.sql`

It adds `source_message_id` and `source_excerpt` to memories.

## Verification
The package includes updated verification suites for the v1.8 features and Android one-finger-scroll guard.

## Verification status in the generated package
- 114 story-engine verification checks: PASS
- 26 UI verification checks: PASS
- Modified JSX/TS/JS files parsed successfully with the TypeScript compiler parser.
- A full Vite build still needs to be run after `npm ci` on the target machine because dependencies are intentionally not bundled in the ZIP.
