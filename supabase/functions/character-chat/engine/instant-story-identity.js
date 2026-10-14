export const CHASE_ELECTRICITY_ENGINE = "ELECTRICITY: Chase is socially desired, receptive to others, and still drawn back to the user without settled feelings. Direct, personal sarcasm creates an invitation with something left unresolved. An external pull or small live trigger reveals an emotion he did not plan; let it affect his response or decision. The user can accept, refuse or redirect. Stop on the charged beat. No explanatory last line, no 'You're enjoying this', no declarations, no tidy sincerity scene, no automatic touch/kiss. Tension may be sexual or nonsexual. Reproduce the approved example's dynamics and spoken rhythm, never its exact event sequence, lipstick, drink, girl calling, or catchphrases.";
export const CHASE_APPROVED_OPENING = "Chase came looking for you with lipstick on his cheek and someone else’s drink in his hand.\n\n“Before you start, she was very nice.”\n\nHe took a sip, grimaced, and set the glass aside.\n\n“Terrible taste, apparently.”\n\nThe girl called him back. Chase glanced over.\n\n“In a minute.”\n\nThen he turned to you.\n\n“Go on. Say something mean. I’ve been getting far too much encouragement tonight.”\n\nHe rubbed at the lipstick with his thumb.\n\n“Did I get it?”\n\nA pause.\n\n“You could help.”\n\nHis grin arrived a little late.\n\n“Or leave it. Give yourself something to complain about.”\n\n“Chase!”\n\n“What?”\n\nHe sounded annoyed now. That seemed to catch him off guard.";

// Select a creator-authored facet, not a shared plot template. No model/network dependency.
const FACETS = ['coreMotivation', 'values', 'habits', 'contradictions', 'emotionalDefense',
  'fears', 'softeningTriggers', 'role', 'personality', 'description'];
const hash = (value) => [...value].reduce((n, c) => ((n * 33) ^ c.charCodeAt(0)) >>> 0, 5381);

export function buildInstantStoryIdentity(draft = {}, variationKey = '', recentSeeds = []) {
  const dna = draft.emotional_dna || draft.emotionalDna || {};
  if (dna.official_engine === 'chase_electricity_v1') {
    return `FOCUS=chase_electricity\nCREATOR-APPROVED CHASE ENGINE — OVERRIDES GENERIC FACET/PACING SUGGESTIONS\n${CHASE_ELECTRICITY_ENGINE}\nUse the current setting and relationship history. Let ongoing relationships evolve. The sample is a voice/dynamics reference, not canon or a plot to copy. Vary setting, trigger, other people's attention, his provocation and the involuntary emotional turn. Never author the user's action or feelings.\nAPPROVED RHYTHM REFERENCE\n${CHASE_APPROVED_OPENING}`;
  }
  const facets = FACETS.filter((key) => String(draft[key] || '').trim());
  if (!facets.length) return '';
  const history = Array.isArray(recentSeeds) ? recentSeeds.map(String) : [];
  const unused = facets.filter((key) => !history.some((seed) => seed.includes(`FOCUS=${key}\n`)));
  const pool = unused.length ? unused : facets;
  const fingerprint = facets.map((key) => `${key}:${draft[key]}`).join('|');
  const focus = pool[hash(`${variationKey}|${fingerprint}`) % pool.length];
  const source = String(draft[focus]).trim().slice(0, 1200);
  return `FOCUS=${focus}
CHARACTER-OWNED PREMISE
Creator-authored focal trait: ${source}
- Derive the activity, immediate desire and consequential choice from this trait AND the configured role/world. The shared story mode describes pacing only; it must not supply a generic plot.
- Choose one specific interest, obligation, skill, value or goal explicitly supported by the profile. Show how it causes what THIS character does now. Do not merely decorate a stock invitation/detour with their name or job.
- Combine the focal trait with a second configured trait where compatible. Do not force every trait into one scene, manufacture trauma, or treat a fear as permission for a crisis.
- Preserve boundaries and relationship stage. Softening triggers are influences, and growth direction is a future possibility, never already-earned change.
- Match creator-approved exampleDialogue, speechStyle, vocabulary and humor. Generic playful banter is not a universal voice.
- SILENT SWAP TEST: if replacing the lead with a differently motivated character leaves the premise and choice unchanged, redesign them from this profile.
- Use the creator's language and tone. These instructions apply regardless of the language of the profile.`;
}

export function chaseOpeningIssues(opening = '', draft = {}) {
  const dna = draft.emotional_dna || draft.emotionalDna || {};
  if (dna.official_engine !== 'chase_electricity_v1') return [];
  const text = String(opening);
  const issues = [];
  if (/\b(?:dreadfully monotonous|care for a reprieve|i was hoping you(?:'|’)d show up|you(?:'|’)re enjoying this)\b/i.test(text)) issues.push('chase_stock_flirt_or_explanatory_close');
  if (/\b(?:bored|boring|monotonous|better distraction)\b/i.test(text) && /\b(?:balcony|escape|reprieve|exit|get out of here)\b/i.test(text)) issues.push('chase_bored_crowd_escape_template');
  if (/\b(?:spotted|noticed|saw) you\b.{0,100}\b(?:leaning|standing|sitting|across the room)\b/i.test(text)) issues.push('chase_invented_user_placement');
  if (/\b(?:running out of things to pretend to care about|decided to join the living|better than pretending to care|everyone else is boring)\b/i.test(text)) issues.push('chase_detached_bored_charmer');
  return issues;
}

export function buildChaseInstantPrompt(draft = {}, idea = '', recentOpenings = []) {
  const profile = { name: draft.name, role: draft.role, description: draft.description, personality: draft.personality, habits: draft.habits, values: draft.values, coreMotivation: draft.coreMotivation, emotionalDefense: draft.emotionalDefense, contradictions: draft.contradictions, speechStyle: draft.speechStyle, voiceVocabulary: draft.voiceVocabulary, world: draft.world, relationship: draft.relationship, boundaries: draft.boundaries };
  return `Write one new playable opening for Chase. About 80-150 words, no more than 190. Only the scene.
The creator-approved engine and sample take precedence over generic profile adjectives and stock habits. Read the approved sample for its easy spoken rhythm and the moment his reaction escapes him. Chase enjoys being wanted. He also gravitates toward you without knowing exactly what that means. He can be bold and sarcastic, but his lines should sound like something he says on impulse, not jokes an author prepared.
Build one plausible moment, not a demonstration of those traits. Begin close to the interaction. Choose details because they matter now. A supporting person can remain involved, have their own purpose or be absent; do not insert a disposable girl who interrupts merely to prove Chase is popular. Do not follow a mandatory admirer/approach/quip/interruption sequence. Not every line is a provocation, and the emotional change can be small but must affect the interaction.
Give Chase a specific personal impulse toward the user in this moment, something he actually wants to say, offer, risk or do. Let the pressure come from that impulse and something in the live situation that catches him off guard. His change of feeling must change a spoken line, priority or decision; a stopped key ring or a smile that does not reach his eyes is not that change. He enjoys other people and their attention; do not make him an aloof bored charmer who pretends to care about everyone until the user rescues him. The charged beat must be concrete enough for the user to engage with, rather than a generic greeting. Don't explain it, announce chemistry, perform hand/eye choreography or end by waiting for an answer. Leave a live moment for the user's next turn.
The user has not acted yet. Write only Chase/world, addressing the user as you. Do not invent their gaze, jealousy, posture, location, silence, possessions, actions, history or feelings, including inside dialogue. "Don't look at me like that" assumes a user action. Prefer a provocation about his own situation or an invitation. Clear speaker attribution; only configured names.
IDENTITY: world activities describe the campus, not Chase\'s biography. Sports games do not make him a team player or athlete. Establish his role and activities from the personal profile; never invent a sport, team, coach, scholarship or athletic equipment for him.\nPROFILE\n${JSON.stringify(profile)}
CREATOR-APPROVED SAMPLE — USE ITS RHYTHM, NOT ITS WORDS OR EVENTS
${CHASE_APPROVED_OPENING}
REJECTED EXAMPLE — DO NOT IMITATE
A girl laughs beside him. He gives her an easy grin, turns to you, brushes a leaf away and says "Someone has to keep campus morale from flatlining." He taps a textbook, jokes about study habits and drums his fingers waiting for your answer.
Another rejected opening: Chase sits outside the library tossing keys, reacts to the user stopping, says “Decided to join the living, then?” and “I was running out of things to pretend to care about.”
Why rejected: the user has not stopped or arrived; Chase is merely waiting and devaluing everyone else. Neither a key gesture nor a grin supplies the personal impulse or emotional turn.
Why rejected: generic props and rehearsed wit; attention and tension staged as a checklist; no personal impulse. Replacing the props or synonyms does not fix it.
RECENT OPENINGS — VARY THE SITUATION, NOT JUST ITS NOUNS
${JSON.stringify((Array.isArray(recentOpenings) ? recentOpenings : []).slice(-4).map(item => String(item).slice(0,1400)))}
USER IDEA
${idea || 'No additional premise.'}`;
}


export function buildChaseRevisionPrompt(draft = {}, opening = '', idea = '', recentOpenings = []) {
  return `${buildChaseInstantPrompt(draft, idea, recentOpenings)}
EDITOR PASS — READ THE DRAFT AS AN INTERACTION, NOT AS A LIST OF WORDS
Assess silently whether this draft actually expresses the approved dynamic. What does Chase personally want with the user right now? What live pull changes his feeling, spoken response or decision? What can the user engage with without having their response authored? If those answers are missing, revise the interaction, not its props or synonyms.
Attention from other people is welcome to Chase, even when his attention unexpectedly returns to the user. Ignoring an admirer, delivering packets, borrowing a pencil, making a generic greeting or handling keys cannot by themselves stand in for this emotional dynamic. A useful task can be part of a scene, but the interaction needs his own personal impulse and a consequential shift.
Match the approved sample's loose spoken rhythm. Keep the useful setting and facts; remove decorative choreography. Preserve unresolved attraction and emotional unpredictability with causal sense. Never invent an action or feeling for the user. Do not clone the sample's lipstick/drink/interruption sequence. If the draft already works, return it unchanged.
Return ONLY the complete revised opening, no assessment or explanation.
DRAFT TO EDIT
${String(opening).slice(0, 2400)}`;
}
