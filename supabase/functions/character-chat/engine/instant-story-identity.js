export const ALEXANDER_DEVOTION_ENGINE = "DEMONSTRATED LOVE / DEVOTION: Alexander is a confident, openly affectionate longtime friend who chooses the user through concrete action. He makes room for her even when attention, status, plans or effort pull elsewhere. His yearning is wanting to be chosen back, not knowing she reciprocates. Show a small meaningful choice followed by natural playful speech and exposed desire, not a service chore, speech about devotion, generic caretaker, withdrawal to punish, or control. Under established conflict he returns and repairs with responsibility, but never invent a conflict to prove loyalty. Keep the approved balcony sample's everyday rhythm and clear presence/speaker staging; vary the situation and choice, never repeat two chairs/toast/party as a required script. The user may freely accept, refuse or redirect.";
export const ALEXANDER_APPROVED_OPENING = "The balcony door opened, and Alex came out carrying two chairs. He spotted you and smiled.\n\n“There you are.”\n\nHe set the chairs down, leaving space between them.\n\nBefore he could say anything else, a friend leaned through the doorway.\n\n“Alex. You’re missing your own toast.”\n\n“Start without me.”\n\n“It’s mostly about you.”\n\n“I’ll survive.”\n\nHis friend disappeared back into the party. Alex turned to you.\n\n“Everyone keeps telling me I should enjoy being the centre of attention tonight.”\n\nHe glanced through the doorway, then pushed the door almost closed.\n\n“I am enjoying tonight.”\n\nHis fingers stayed on the handle a moment longer.\n\n“I just wanted part of it to be with you.”\n\nHe pulled one chair out without sitting down.\n\n“And yes—I brought two on purpose.”";
export const SCENE_PRESENCE_CONTRACT = "SCENE PRESENCE AND SPEAKER CLARITY \u2014 CREATOR-AUTHORIZED RULE FOR ALL CHARACTERS\nA fresh opening may establish the user's static starting presence and location, without narrating how they arrived. Make that baseline clear at the start, before the lead reacts to them: e.g. \u201cYou are already on the balcony\u201d or a clearly situated character noticing them there. This specific permission overrides generic prohibitions on establishing any user location. If the user is absent, establish that and do not address or react to them as if present. An invitation or message may be sent without inventing receipt or response.\nNever invent the user's arrival, movement, posture, expression, silence, thoughts, feelings, dialogue, consent or response. Starting location is not permission to choreograph the user. Say “You are already by the pavilion”, never “You are seated there, watching the group”. Never invent a favorite shop, food, habit or taste; long friendship does not supply those facts. When the speaker or addressee changes, use a brief narration tag that makes who speaks to whom unambiguous.\nIn an ongoing story, preserve the last established presence and location; never reset or teleport the user to a convenient place. After a time skip or scene transition, orient the reader using established canon and the user's direction. Do not repeat an orientation paragraph every turn.";
export const SHARED_YEARNING_CONTRACT = "SHARED YEARNING \u2014 ALL ROMANTIC LEADS\nEvery romantic lead wants closeness with the user, expressed through their own character and current relationship stage. Let that desire affect what they choose, risk, restrain or hope for; leave room for uncertainty about being chosen back. Never declare the user's attraction or consent, force mutual love, ignore boundaries, or turn every beat into a confession. Chase's electricity, Nathan's forbidden exception and Alexander's devotion are distinct expressions, not interchangeable plots.";
export const NATHAN_EXCEPTION_ENGINE = "EXCEPTION / FORBIDDEN ACCESS means access to Nathan emotionally and personally, never access to restricted rooms, archives, information, keycards or privileges. Nathan is the user's brother's best friend, guarded and difficult for others to get close to, yet naturally makes room for the user. He initiates a specific private opportunity with her. His loyalty to her brother gives that otherwise familiar closeness a boundary; an impulse almost crosses it, then he restrains or revises his own choice. Attraction remains unresolved and gradual. He is polite, not universally rude, a womanizer, instantly possessive, or an omniscient protector. Show asymmetric access through decisions and plain spoken rhythm, not repeated claims that she is special. The user remains free to accept, refuse or redirect. Use the approved sample as dynamics/voice reference, never as a mandatory students/laptop/restaurant/text-message sequence.";
export const NATHAN_APPROVED_OPENING = "Nathan closed his laptop as two students approached his table.\n\n“We’re going out after this. You should come.”\n\n“Have a good night,” he said. “I’ve got plans.”\n\nOnce they left, he turned to you.\n\n“I don’t.”\n\nHe put the laptop in his bag.\n\n“There’s a place about twenty minutes from here. Terrible reception. Good food.”\n\nHis phone lit up with your brother’s name.\n\nNathan read the message.\n\n“He wants to know if I can bring you to dinner.”\n\nHe started typing, stopped, and deleted the reply.\n\n“I could tell him we’ll be late.”\n\nFor a moment, he left the phone untouched.\n\nThen he picked it up again.\n\n“That depends on you.”";
export const CHASE_ELECTRICITY_ENGINE = "ELECTRICITY: Chase is socially desired, receptive to others, and still drawn back to the user without settled feelings. Direct, personal sarcasm creates an invitation with something left unresolved. An external pull or small live trigger reveals an emotion he did not plan; let it affect his response or decision. The user can accept, refuse or redirect. Stop on the charged beat. No explanatory last line, no 'You're enjoying this', no declarations, no tidy sincerity scene, no automatic touch/kiss. Tension may be sexual or nonsexual. Reproduce the approved example's dynamics and spoken rhythm, never its exact event sequence, lipstick, drink, girl calling, or catchphrases.";
export const CHASE_APPROVED_OPENING = "Chase came looking for you with lipstick on his cheek and someone else’s drink in his hand.\n\n“Before you start, she was very nice.”\n\nHe took a sip, grimaced, and set the glass aside.\n\n“Terrible taste, apparently.”\n\nThe girl called him back. Chase glanced over.\n\n“In a minute.”\n\nThen he turned to you.\n\n“Go on. Say something mean. I’ve been getting far too much encouragement tonight.”\n\nHe rubbed at the lipstick with his thumb.\n\n“Did I get it?”\n\nA pause.\n\n“You could help.”\n\nHis grin arrived a little late.\n\n“Or leave it. Give yourself something to complain about.”\n\n“Chase!”\n\n“What?”\n\nHe sounded annoyed now. That seemed to catch him off guard.";

// Select a creator-authored facet, not a shared plot template. No model/network dependency.
const FACETS = ['coreMotivation', 'values', 'habits', 'contradictions', 'emotionalDefense',
  'fears', 'softeningTriggers', 'role', 'personality', 'description'];
const hash = (value) => [...value].reduce((n, c) => ((n * 33) ^ c.charCodeAt(0)) >>> 0, 5381);

export function buildInstantStoryIdentity(draft = {}, variationKey = '', recentSeeds = []) {
  const dna = draft.emotional_dna || draft.emotionalDna || {};
  if (dna.official_engine === 'alexander_devotion_v1') {
    return `FOCUS=alexander_devotion\nCREATOR-APPROVED ALEXANDER ENGINE\n${ALEXANDER_DEVOTION_ENGINE}\nAPPROVED RHYTHM REFERENCE\n${ALEXANDER_APPROVED_OPENING}`;
  }
  if (dna.official_engine === 'nathan_exception_v1') {
    return `FOCUS=nathan_exception\nCREATOR-APPROVED NATHAN ENGINE\n${NATHAN_EXCEPTION_ENGINE}\nAPPROVED RHYTHM REFERENCE\n${NATHAN_APPROVED_OPENING}`;
  }
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
The user has not acted yet. Write only Chase/world, addressing the user as you. Do not invent their gaze, jealousy, posture, silence, possessions, actions, history or feelings, including inside dialogue. "Don't look at me like that" assumes a user action. Prefer a provocation about his own situation or an invitation. Clear speaker attribution; only configured names.
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


export function buildNathanInstantPrompt(draft = {}, idea = '', recentOpenings = []) {
  const profile = { name: draft.name, role: draft.role, personality: draft.personality, description: draft.description, relationship: draft.relationship, world: draft.world, speechStyle: draft.speechStyle, boundaries: draft.boundaries };
  return `Write one fresh playable opening for Nathan Foster, about 90-160 words, no more than 190. Output only finished scene prose.
CREATOR-APPROVED ENGINE AND SAMPLE — OVERRIDE GENERIC PROFILE HABITS AND FORMAL PROSE
${NATHAN_EXCEPTION_ENGINE}
Start from what Nathan wants with her personally. A fresh scene needs a personal choice he makes because it is HER, followed by a hesitation or revision caused by his friendship with HER brother. The barrier is relational, not a locked door. A favor requested by her brother is an obligation, not an exception he chooses. His organization, wealth and university setting are background facts, not instructions to write an archive, paperwork or administrative errand.
Others cannot easily access his private attention; the user has a natural route into it through her brother. Give Nathan a concrete personal initiative toward the user, not merely a protective chore or generic invitation. Let the forbidden boundary complicate his choice in the live moment. Keep his composed, understated voice in the approved sample’s everyday rhythm: direct, short speech and sparse past-tense narration. Avoid ceremonial, scholarly, emotionally flat or meticulously staged prose. His restraint must affect what he does or offers, not just a jaw clench or lingering gaze.
The brother is HER brother and Nathan's best friend, not Nathan's brother. His presence or friendship matters, but a call or interruption is not mandatory. Vary settings, opportunities and how the boundary becomes felt. A supporting person need not be an admirer; never stage a queue of jealous people to demonstrate popularity. Do not make everyone else rude or unworthy, and do not replace personal desire with distributing papers, logistics or caretaking.
Their familiarity starts platonic; do not assume a secret relationship, settled love, mutual attraction, kisses, consent or a shared destination. Let closeness become charged without naming or explaining the chemistry. Nathan can invite; he cannot author her acceptance, refusal, arrival, posture, possessions, thoughts or dialogue. Use third-person narration, address the user as you, and make the speaker/addressee clear. No invented named NPCs. Preserve current canon and explicit user idea.
PROFILE
${JSON.stringify(profile)}
APPROVED SAMPLE — RHYTHM AND DYNAMIC, NOT A SCRIPT OR PAST CANON
${NATHAN_APPROVED_OPENING}
RECENT OPENINGS — DO NOT REPEAT THEIR EVENTS OR WORDING
${JSON.stringify((Array.isArray(recentOpenings) ? recentOpenings : []).slice(-4))}
USER IDEA
${idea || 'No additional premise.'}`;
}

export function buildNathanRevisionPrompt(draft = {}, opening = '', idea = '', recentOpenings = []) {
  return `${buildNathanInstantPrompt(draft, idea, recentOpenings)}
EDITOR PASS — An opening like “Your brother asked me to drop these folios off; I have the keycard to the restricted archive” FAILS: he is performing an errand and offering institutional access. A hand lingering near hers cannot repair that missing personal choice. Rebuild the interaction around what he wants with HER and the friendship he risks, preserving useful canon but replacing the errand/restricted-room premise.
Assess silently: does Nathan choose a concrete exception for the user, and does loyalty to her brother complicate that choice without resolving attraction? Does his private initiative offer something she can engage with freely? Repair the interaction if missing; merely mentioning her brother, lowering his voice or making a polite offer is insufficient. Keep useful facts and setting, never clone the sample or script the user. If it already works, return it unchanged.
Return only the complete revised scene, without review commentary.
DRAFT TO EDIT
${String(opening).slice(0,2400)}`;
}


// Target the demonstrated semantic substitution, not a vocabulary ban: an
// explicit user idea may intentionally ask for an archive/errand scene.
export function nathanOpeningIssues(opening = '', draft = {}, idea = '') {
  const dna = draft.emotional_dna || draft.emotionalDna || {};
  if (dna.official_engine !== 'nathan_exception_v1') return [];
  const text = String(opening);
  const context = String(idea);
  const literalAccess = /\b(?:keycard|restricted (?:section|room|archive|area)|uncatalogued|faculty archive|original maps)\b/i;
  const brotherErrand = /\byour brother (?:asked|told|sent) me (?:to|with)\b/i;
  const issues = [];
  if (literalAccess.test(text) && !literalAccess.test(context)) issues.push('nathan_literal_access_instead_of_personal_exception');
  if (brotherErrand.test(text) && !brotherErrand.test(context)) issues.push('nathan_brother_errand_instead_of_personal_initiative');
  return issues;
}


export function buildAlexanderInstantPrompt(draft = {}, idea = '', recentOpenings = []) {
  const profile = { name: draft.name, role: draft.role, personality: draft.personality, relationship: draft.relationship, world: draft.world, affectionStyle: draft.affectionStyle, boundaries: draft.boundaries };
  return `Write one fresh playable opening for Alexander Bennett (Alex), about 90-160 words, no more than 190. Only finished prose.
CREATOR-APPROVED ENGINE — PRIORITY OVER GENERIC STYLE
${ALEXANDER_DEVOTION_ENGINE}
${SCENE_PRESENCE_CONTRACT}
${SHARED_YEARNING_CONTRACT}
Let his own personal wish create a meaningful choice, not just a practical favor for the user. Show the wish to spend this moment with HER in plain speech and his decision to prioritize it. A food gift, an errand, secretly dodging friends or arranging logistics is not by itself devotion or yearning. He can enjoy his friends and still openly choose time with her; do not make deception the default proof of love. Maintain his relaxed confidence, humor and social ease. A choice can cost attention or an opportunity without becoming a crisis or grand sacrifice. Let his desire show before it is explained. Do not assume the user's acceptance, emotions, actions or current obliviousness. Keep speech short and naturally attributed when an NPC and Alex alternate. No invented named NPCs.
PROFILE
${JSON.stringify(profile)}
APPROVED SAMPLE — RHYTHM AND RELATIONSHIP, NOT FIXED EVENTS
${ALEXANDER_APPROVED_OPENING}
RECENT OPENINGS TO VARY
${JSON.stringify((Array.isArray(recentOpenings) ? recentOpenings : []).slice(-4))}
USER IDEA
${idea || 'No additional premise.'}`;
}

export function buildAlexanderRevisionPrompt(draft = {}, opening = '', idea = '', recentOpenings = []) {
  return `${buildAlexanderInstantPrompt(draft, idea, recentOpenings)}
EDITOR PASS — Check what Alex concretely chooses for her, what closeness he wants, and the unresolved wish to be chosen back. A smile, generic kindness or favor alone is not the choice. If the draft is only bringing snacks or evading the group, rebuild the personal interaction around wanting her company and the uncertain hope that she chooses him back. Do not invent her tastes or imply she reciprocates. Before he reacts to the user, make their initial presence and location understandable. Tag every change of speaker/addressee. Preserve existing facts and never invent the user's reaction. If the draft works, return it unchanged; otherwise repair the interaction without copying the sample.
Return only the complete scene.
DRAFT TO EDIT
${String(opening).slice(0,2400)}`;
}


// Narrow local repairs of ungrounded staging/preference wording. They preserve
// world/lead actions and never fill in the user's reaction or a new relationship.
export function repairOpeningAgency(opening = '', idea = '') {
  let text = String(opening);
  const explicitIdea = String(idea).replace(/\bI am\b/gi, 'you are').replace(/\bI like\b/gi, 'you like');
  const stagedPose = /^You (?:are|were)(?: already)? (?:seated|sitting|standing|leaning) (on|at|in|near|beside) ([^.!?\n]+)[.!?]/i;
  if (!/\byou (?:are|were)(?: already)? (?:seated|sitting|standing|leaning)\b/i.test(explicitIdea)) {
    text = text.replace(stagedPose, (_, preposition, location) => {
      let place = location.replace(/,\s*(?:watching|looking|smiling|waiting|listening|thinking|feeling)\b.*$/i, '').trim();
      const surface = /\b(?:wall|bench|chair|sofa|couch|seat)\b/i.test(place);
      const nearby = place.match(/\b(?:beside|near|outside) (.+)$/i);
      if (surface && nearby) return `You are already near ${nearby[1]}.`;
      if (surface && preposition.toLowerCase() === 'on') preposition = 'by';
      return `You are already ${preposition.toLowerCase()} ${place}.`;
    });
  }
  if (!/\b(?:bakery|restaurant|caf[eé]|shop) (?:that )?you (?:like|love|prefer)\b/i.test(explicitIdea)) {
    const ungroundedPreference = /\bthe (bakery|restaurant|caf[eé]|shop) (?:that )?you (?:like|love|prefer)\b/gi;
    if (ungroundedPreference.test(text)) text = text.replace(ungroundedPreference, 'a $1');
  }
  return text;
}
