// VELVET 3.53.84 — LIVING STORY BRAIN · TEN SYSTEMS, ONE STATE
// Scene state, open threads, attraction continuity, inner-to-outer behavior,
// consequences, NPC social memory, escalation, character-specific reactions,
// world initiative and narrative butterfly effects. Keeps direct creator intent.

const text = (value="") => String(value || "").trim();
const norm = (value="") => text(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function joinedProfile(character={}) {
  return [
    character.name, character.role, character.personality, character.relationship,
    character.description, character.world, character.scenario,
    character.speech_style, character.values, character.fears, character.habits,
    character.contradictions, character.core_motivation, character.emotional_defense,
  ].map(text).filter(Boolean).join(" ");
}

function directActionIntent(value="") {
  const raw = norm(value).replace(/[.!?…]+$/g, "").trim();
  if (!raw || raw.length > 90) return "";
  const rules = [
    ["kiss", /^(?:beso|besame|bésame|kiss|kiss me|un beso|dale un beso|que me bese|que la bese)$/],
    ["hug", /^(?:abrazo|abrazame|abrázame|hug|hug me)$/],
    ["hold_hand", /^(?:tomame la mano|tómame la mano|toma mi mano|hold my hand)$/],
    ["confess", /^(?:confiesa|dilo|admitelo|admítelo|confess|say it|admit it)$/],
    ["flirt", /^(?:coquetea|flirtea|flirt|flirt with me)$/],
    ["approach", /^(?:acercate|acércate|come closer|get closer)$/],
  ];
  return rules.find(([,pattern])=>pattern.test(raw))?.[0] || "";
}

function actionFulfilled(action="", reply="") {
  const r = norm(reply);
  if (!action) return true;
  const patterns = {
    kiss: /\b(?:kiss(?:es|ed|ing)?|bes[ao](?:s|ndo)?|beso|mouth (?:meets|finds|presses)|lips? (?:meet|press|brush|find))\b/,
    hug: /\b(?:hug(?:s|ged|ging)?|abraz(?:a|o|ó|ando)|arms? (?:around|close around|wrap))\b/,
    hold_hand: /\b(?:takes? your hand|holds? your hand|fingers? (?:lace|intertwine)|toma tu mano|entrelaza)\b/,
    confess: /\b(?:admits?|confesses?|i (?:like|want|love|miss) you|me gustas|te quiero|te amo|te deseo|te extraño)\b/,
    flirt: /\b(?:teas(?:e|es|ing)|flirt|grin|smirk|like you|me gustas|pretty|beautiful|gorgeous|handsome|want you)\b/,
    approach: /\b(?:steps? closer|moves? closer|closes? the distance|leans? closer|se acerca|acorta la distancia)\b/,
  };
  return patterns[action]?.test(r) ?? true;
}

function romanceStage({relationshipState={}, intelligenceState={}, recentCharacterReplies=[]}={}) {
  const state = norm(JSON.stringify({relationshipState,intelligenceState}));
  const recent = norm(recentCharacterReplies.slice(-5).join(" "));
  const combined = state+" "+recent;
  if (/\b(?:kiss|kissed|kissing|beso|besaron|make out|slept together|sex|lover|dating|girlfriend|boyfriend|couple)\b/.test(combined)) return "contact";
  if (/\b(?:yearn|want her|want you|attraction|jealous|crush|tension|almost kiss|almost kissed|flirt)\b/.test(combined)) return "tension";
  if (/\b(?:friend|trust|close|bond|care)\b/.test(combined)) return "connection";
  return "early";
}

function flirtFingerprint(character={}) {
  const p = norm(joinedProfile(character));
  if (/\b(?:chase|playful|cocky|confident|popular|charismatic|teas|reckless|unpredictable)\b/.test(p)) {
    return "Playful confidence: tease cleanly, notice reactions, take grounded initiative, and let sincerity slip through only when earned.";
  }
  if (/\b(?:roman|rival|danger|intense|controlled|cold|guarded|dominant)\b/.test(p)) {
    return "Controlled intensity: fewer words, deliberate proximity, pointed observations, restrained want. Never turn him into generic banter.";
  }
  if (/\b(?:theo|prince|famous|desired|charming|campus prince)\b/.test(p)) {
    return "Public ease, private precision: socially effortless with others, noticeably more attentive and specific with the user.";
  }
  if (/\b(?:nathan|brother|older|forbidden|inaccessible|reserved|loyal)\b/.test(p)) {
    return "Contained attraction: restraint and bad-idea awareness create pressure, but restraint must not erase initiative forever.";
  }
  if (/\b(?:alexander|gentle|real love|steady|soft|supportive)\b/.test(p)) {
    return "Warm specificity: quiet attention, remembered details, sincere humor, and emotionally legible action without syrupy speeches.";
  }
  return "Derive flirting from this exact character's personality, defenses, confidence, humor and relationship history. Never use a universal Velvet flirt voice.";
}

function reputationInstruction(character={}) {
  const p = norm(joinedProfile(character));
  if (/\b(?:famous|popular|known|celebrity|influencer|campus prince|everyone knows|desired|rich|millionaire)\b/.test(p)) {
    return "SOCIAL REPUTATION IS VISIBLE: let the world occasionally demonstrate established status through recognition, greetings, attention, access, expectations, rumors or social friction. Do not merely narrate that they are popular/famous/rich.";
  }
  return "SOCIAL REPUTATION: only surface reputation that is already supported by character/world canon. Do not manufacture fame.";
}

function directionLines(storyPreferences={}) {
  const tension = text(storyPreferences.romantic_tension || storyPreferences.romanticTension || "adaptive");
  const jealousy = text(storyPreferences.jealousy_level || storyPreferences.jealousyLevel || "subtle");
  const initiative = text(storyPreferences.character_initiative || storyPreferences.characterInitiative || "high");
  const pace = text(storyPreferences.scene_pace || storyPreferences.scenePace || "fast");
  return [
    `Romantic tension: ${tension}`,
    `Jealousy: ${jealousy}`,
    `Character initiative: ${initiative}`,
    `Scene pace: ${pace}`,
  ].join("\n");
}

export function buildVelvetNarrativeUpgradeV35379({
  character={},
  latestUserMessage="",
  recentUserMessages=[],
  recentCharacterReplies=[],
  relationshipState={},
  intelligenceState={},
  scene={},
  persistentCast=[],
  storyPreferences={},
  directorInstruction="",
}={}) {
  const directAction = directActionIntent(latestUserMessage);
  const stage = romanceStage({relationshipState,intelligenceState,recentCharacterReplies});
  const behavior = intelligenceState?.human_behavior_state || {};
  const unresolved = [
    ...(Array.isArray(intelligenceState?.unfinished_business) ? intelligenceState.unfinished_business : []),
    ...(Array.isArray(intelligenceState?.commitments) ? intelligenceState.commitments : []),
    ...(Array.isArray(behavior?.unfinished_business) ? behavior.unfinished_business : []),
  ].slice(-10);
  const physical = {
    location: scene?.location || behavior?.scene_memory?.location || "",
    present: scene?.present || behavior?.scene_memory?.present || [],
    positions: scene?.positions || scene?.character_positions || {},
    contact: scene?.contact || scene?.physical_contact || behavior?.last_physical_state || {},
    activity: scene?.activity || scene?.current_activity || behavior?.scene_memory?.activity || "",
    objects: scene?.objects || behavior?.scene_memory?.objects || [],
  };
  const cast = (Array.isArray(persistentCast) ? persistentCast : []).slice(-10).map((item)=>({
    name:item?.name || "",
    role:item?.role || item?.relationship || "",
    status:item?.status || "",
  }));
  const directRule = directAction
    ? `DIRECT INTENT COMPILED: "${directAction}". This requested event MUST happen in this visible turn unless it violates an explicit boundary/canon impossibility. Do not stall, ask permission again, substitute a near-miss, or discuss doing it instead of doing it. Add character-specific physical and emotional detail after the event.`
    : "DIRECT INTENT: no short mandatory action command detected; follow the literal user turn normally.";

  return `VELVET LIVING STORY BRAIN 3.53.84 — TEN SYSTEMS, ONE STATE

CORE RULE
These ten systems are not ten competing writers. They describe ONE current story state. Visible recent turns outrank hidden state. Never invent a user feeling, action, consent, relationship fact, NPC knowledge or past event to satisfy a system.

1) SCENE STATE · WHERE REALITY IS NOW
- Current physical state: ${text(JSON.stringify(physical)).slice(0,1100)}.
- Track location, time direction, who is present, distance/position, current activity, held/important objects, physical contact, and the last unfinished action.
- Preserve them until an on-page event changes them. No teleporting, impossible touch, duplicated props, reset posture/contact, or NPCs silently appearing/disappearing.
- A reply begins from the literal final frame of the previous visible turn, not from a generic version of the setting.

2) OPEN THREADS · WHAT THE STORY OWES
- Current candidate threads: ${text(JSON.stringify(unresolved)).slice(0,1000) || "none explicitly stored"}.
- Promises, secrets, favors, invitations, plans, warnings, rumors, jealousy triggers, interrupted conversations, unresolved conflicts and "I'll tell you later" beats remain open until visibly resolved, cancelled, made impossible, or deliberately abandoned on-page.
- Do not mention every thread every turn. Bring back the most causally relevant one when the scene gives it a natural opening.
- Never create a fake past thread just to manufacture continuity.

3) ATTRACTION CONTINUITY · FEELINGS DO NOT REBOOT
- Current relationship stage estimate: ${stage}.
- Relationship state: ${text(JSON.stringify(relationshipState)).slice(0,1000) || "none"}.
- Attraction, trust, irritation, jealousy, tenderness, vulnerability, desire, embarrassment and fear of loss accumulate from visible evidence.
- Once a rung is visibly crossed, later behavior remembers it. A kiss is not followed by stranger-small-talk unless the awkward reset itself is a deliberate consequence.
- Slow burn means earned accumulation, not emotional amnesia. Do not jump to devotion without canon either.

4) INNER → OUTER · EMOTION MUST CAUSE BEHAVIOR
- Silently model: WHAT THE CHARACTER FEELS → WHAT THEY WANT → WHAT THEY HIDE → WHAT THEY DO → WHAT LEAKS OUT → WHAT CHANGES.
- Do not dump this chain as exposition. Let interior life alter timing, attention, word choice, proximity, restraint, decisions, mistakes, priorities and what the character notices.
- Prefer "he remembers and acts differently" over "he felt jealous"; prefer a changed choice over an emotion label.
- The character may misunderstand, suppress or contradict their own feelings when that matches their profile.

5) CONSEQUENCE ENGINE · IMPORTANT ACTIONS LEAVE RESIDUE
- Favors, rejection, acceptance, lies, help, humiliation, public attention, boundaries, promises, confessions, kisses, arguments, vulnerability and choosing someone else must alter later access, trust, humor, initiative, distance, expectations, reputation or restraint when relevant.
- Consequences may be tiny and delayed. Do not repeatedly recap the triggering event.
- Never erase a loaded beat by returning immediately to generic banter. Never punish the user merely for making a choice.

6) NPC SOCIAL MEMORY · OTHER PEOPLE HAVE BRAINS
- Active cast snapshot: ${text(JSON.stringify(cast)).slice(0,900) || "none"}.
- NPCs remember only what they plausibly witnessed, were told, or already knew. Track who knows what.
- Established NPCs can form opinions, gossip, tease, misunderstand, protect, compete, interrupt, keep secrets, change loyalties and react later to what they observed.
- Do not summon random NPCs solely to force movement. Do not make every NPC orbit romance.

7) ESCALATION LADDER · EARNED, FORWARD, NEVER STUCK
- Relationship ladder: awareness → curiosity → attraction → tension → attachment → yearning → vulnerability → intimacy → relationship.
- Physical intimacy has its own local ladder and must respect consent/canon.
- Advance only when the visible story earns it, normally by one meaningful layer at a time. Do not freeze indefinitely at glances and smirks once stronger canon exists.
- After escalation, write aftermath. After vulnerability, let knowledge change future behavior.

8) CHARACTER-SPECIFIC REACTION · SAME EVENT, DIFFERENT PERSON
- ${flirtFingerprint(character)}
- Run every important event through this character's exact values, fears, habits, contradictions, core motivation, emotional defense, confidence, social status and history.
- A kiss, jealousy trigger, rejection, compliment, danger, favor or confession must not produce the same choreography/dialogue for every character.
- Avoid universal Velvet tells: identical smirks, jaw-clenches, pet names, dominance beats, therapist language, or canned flirting.
- ${reputationInstruction(character)}

9) WORLD INITIATIVE · THE STORY CAN MOVE WITHOUT THE USER PUSHING IT
- When causally natural, the world may deliver a message, interruption, deadline, class/work event, rumor, arrival, social consequence, changed plan, practical problem, invitation, discovery or NPC action.
- Initiative must grow from existing world/canon, not random chaos. One useful external change is stronger than three decorative interruptions.
- The character also makes decisions and pursues goals independently. Never end every turn by asking the user to invent what happens next.

10) NARRATIVE BUTTERFLY EFFECT · SMALL DETAILS CAN PAY OFF LATER
- Reuse grounded, memorable details from visible canon: preferences, jokes, objects, promises, places, habits, tiny kindnesses, embarrassments, shared routines and earlier choices.
- Payoffs should feel discovered, not announced. A remembered drink, returned object, avoided place, repeated private joke or altered plan can prove continuity without explaining it.
- Do not invent a memory because a callback would be cute. A callback must have a real source in visible turns or trusted memory.
- Vary payoff families so continuity does not become a repeated gimmick.

DIRECT CREATOR INTENT
- ${directRule}
- Short creator commands are scene direction, not dialogue the character should debate.
- Preserve actor/recipient exactly. "kiss" from the user means the configured character performs the kiss toward the user unless the wording explicitly says otherwise.

SCENE DIRECTION WEIGHTS
${directionLines(storyPreferences)}
Creator direction this turn: ${text(directorInstruction).slice(0,500) || "none"}.

FINAL SILENT CHECK
Before returning the visible reply verify: scene physics; open thread relevance; emotional continuity; consequence residue; NPC knowledge; earned escalation; character-specific reaction; one source of initiative when needed; grounded callback only; direct creator intent fulfilled. Repair failures before returning. Never expose this checklist.

PERSISTENCE
human_behavior_update may conservatively store scene_memory, unfinished_business, relationship_expectation_shift, last_physical_state, npc_observed_facts, callback_candidates and consequence_foreground_thread ONLY when grounded in visible canon. Never store invented user feelings, consent, actions, preferences or future choices.
`;
}

export function velvetNarrativeUpgradeIssuesV35379({
  reply="",
  latestUserMessage="",
  recentCharacterReplies=[],
  scene={},
}={}) {
  const issues=[];
  const r=text(reply);
  const n=norm(r);
  if (!r) return ["v35379_empty_reply"];

  const directAction=directActionIntent(latestUserMessage);
  if (directAction && !actionFulfilled(directAction,r)) issues.push("v35379_direct_intent_evaded");

  const recent=norm((Array.isArray(recentCharacterReplies)?recentCharacterReplies:[]).slice(-4).join(" "));
  const loadedRecent=/\b(?:kiss|kissed|almost kiss|beso|jealous|confess|admit|want you|want her|rejected|argument|fight|comfort|held her|held you)\b/.test(recent);
  if (loadedRecent && /\b(?:as if nothing happened|back to normal|nothing had changed|business as usual|como si nada|todo volvio a la normalidad)\b/.test(n)) {
    issues.push("v35379_emotional_aftermath_erased");
  }

  if (/\b(?:i don't know yet|i dont know yet|not sure yet|we'll see|we will see)\b/.test(n) && norm(latestUserMessage).split(/\s+/).length <= 10) {
    issues.push("v35379_indecisive_stall");
  }

  const location=norm(scene?.location || "");
  if (location && /\b(?:suddenly|somehow|moments later)\b/.test(n) && /\b(?:arrived at|was now at|found himself at|found herself at)\b/.test(n)) {
    issues.push("v35379_possible_physical_reset");
  }

  return [...new Set(issues)];
}

export const VELVET_NARRATIVE_UPGRADE_V35379 = Object.freeze({
  sceneState:true,
  openThreads:true,
  attractionContinuity:true,
  innerToOuter:true,
  consequenceEngine:true,
  npcSocialMemory:true,
  escalationLadder:true,
  characterSpecificReaction:true,
  worldInitiative:true,
  narrativeButterflyEffect:true,
  directIntentCompiler:true,
});
