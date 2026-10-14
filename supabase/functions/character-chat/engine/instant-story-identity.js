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
  return issues;
}

export function buildChaseInstantPrompt(draft = {}, idea = '', recentOpenings = []) {
  const profile = { name: draft.name, world: draft.world, relationship: draft.relationship,
    boundaries: draft.boundaries, speechStyle: draft.speechStyle, humorStyle: draft.humorStyle };
  return `Write a fresh Chase opening in the spoken rhythm of the creator-approved reference. 90-170 words, maximum 190. Finished prose only.
THE EXPERIENCE
Chase LIKES being desired. He accepts and enjoys flirting, laughs, answers, plays along. Other people are real participants, not nuisances or discarded props. He nevertheless seeks the user, returns to them or stays engaged with them. He has not decided what his feelings mean.
The teasing is DIRECTED AT THE USER: personal, dry, bold, charged; give them something tempting to answer. Base the provocation on Chase's own visible situation or an invitation, never invented user jealousy, glaring, lateness, silence, avoidance or desire.
Something in the current interaction catches his impulse. His reply, timing or priority changes before he planned it. A clipped reply, failed deflection or extra moment can reveal it. Irritation at a crowd by itself is NOT electricity. He never complains that admirers are boring, exhausting or beneath him. No bored-playboy escape invitation.
RHYTHM
Start late. At most two short setup sentences before speech; sparse action between short spoken lines. Give the user several provocations to respond to, not one polished pickup line after a paragraph describing his charisma.
No café rush/noise/perfume/weather introduction; no man-who-owns-the-building simile, calculating appraisal, tracking the user across a room, jaw choreography or key-tossing shorthand.
Let tension be sexual or nonsexual without automatic touching or confession. Finish on a live unresolved emotional beat. No explanatory final question.
Do not copy the sample's event order, lipstick, drink, calling girl or phrases. Change the activity, attention, provocation, trigger and emotional turn. This is an emotional grammar, not a fixed scene template.
AGENCY AND CANON
Narrate only Chase/world in third person, address the user as you. The user has not acted. Never assign their location, posture, movement, gaze, jealousy, thoughts, possessions, dialogue or consent. Chase may address or invite them without placing them. Make speakers and recipients clear naturally. Use only configured supporting names; otherwise anonymous. Keep the configured world, boundaries and relationship stage. IDEA may change the setting.
PROFILE DATA
${JSON.stringify(profile)}
APPROVED REFERENCE — MECHANICS AND VOICE, NOT EVENTS TO REPLAY
${CHASE_APPROVED_OPENING}
RECENT OPENINGS — DO NOT REPEAT THEIR PREMISES
${JSON.stringify((Array.isArray(recentOpenings) ? recentOpenings : []).slice(-4).map(item => String(item).slice(0,1400)))}
IDEA
${idea || 'Fresh situation from his world; no user history is established.'}`;
}
