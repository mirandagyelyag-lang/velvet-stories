// VELVET 3.53.79 — TEN-PART LIVING ROMANCE / STORY UPGRADE
// Unifies relationship state, aftermath, physical continuity, romantic escalation,
// character-specific flirting, NPC agency, reputation, direct intent, QA and scene direction.

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
  const unresolved = [
    ...(Array.isArray(intelligenceState?.unfinished_business) ? intelligenceState.unfinished_business : []),
    ...(Array.isArray(intelligenceState?.commitments) ? intelligenceState.commitments : []),
  ].slice(-8);
  const physical = {
    location: scene?.location || "",
    present: scene?.present || [],
    positions: scene?.positions || scene?.character_positions || {},
    contact: scene?.contact || scene?.physical_contact || {},
    activity: scene?.activity || scene?.current_activity || "",
  };
  const cast = (Array.isArray(persistentCast) ? persistentCast : []).slice(-8).map((item)=>({
    name:item?.name || "",
    role:item?.role || item?.relationship || "",
    status:item?.status || "",
  }));
  const directRule = directAction
    ? `DIRECT INTENT COMPILED: "${directAction}". This requested event MUST happen in this visible turn unless it violates an explicit boundary/canon impossibility. Do not stall, ask permission again, substitute a near-miss, or discuss doing it instead of doing it. Add character-specific physical and emotional detail after the event.`
    : "DIRECT INTENT: no short mandatory action command detected; follow the literal user turn normally.";

  return `VELVET NARRATIVE UPGRADE 3.53.79 — TEN SYSTEMS, ONE BRAIN

1) RELATIONSHIP BRAIN
- Treat attraction, trust, jealousy, frustration, tenderness, vulnerability, desire and fear of loss as cumulative state, not turn-local decoration.
- Current relationship stage estimate: ${stage}.
- Relationship state: ${text(JSON.stringify(relationshipState)).slice(0,900) || "none"}.
- Never reset chemistry after a meaningful beat. The next action should reflect what this person now believes the relationship is.

2) EMOTIONAL AFTERMATH
- Significant events leave residue. A favor, rejection, almost-kiss, kiss, confession, jealousy beat, argument, comfort, withdrawal or boundary changes later behavior.
- Open emotional/practical threads: ${text(JSON.stringify(unresolved)).slice(0,800) || "none"}.
- Do not immediately return to generic banter or neutral small talk after a loaded event. Aftermath can be subtle, but it must exist.

3) PHYSICAL CONTINUITY
- Current physical state: ${text(JSON.stringify(physical)).slice(0,900)}.
- Preserve location, distance, posture, held objects, touch and who is present until an on-page action changes them.
- No teleporting, impossible touch, duplicated objects, instant outfit/location changes, or unexplained resets of contact.

4) ROMANTIC ESCALATION
- Use an earned ladder: awareness → proximity → deliberate touch → sustained tension → near-crossing → kiss/intimacy → aftermath.
- Do not leap from strangers to devotion. Do not freeze forever at eye contact either.
- If canon already crossed a rung, never pretend the relationship is back below it.
- Respect the configured romance pacing while still allowing decisive moments.

5) CHARACTER-SPECIFIC FLIRTING
- ${flirtFingerprint(character)}
- Attraction must sound and behave like THIS character. Avoid identical smirks, pet names, therapist phrasing, stock dominance, or the same joke cadence across characters.

6) NPC BRAIN
- Active cast snapshot: ${text(JSON.stringify(cast)).slice(0,800) || "none"}.
- NPCs may notice, interrupt, disagree, tease, create social pressure, remember prior events, have their own loyalties and continue off-screen lives.
- Use NPCs only when causally natural. Never summon a random NPC solely to create movement.

7) WORLD REPUTATION
- ${reputationInstruction(character)}
- Reputation is environmental evidence, not an adjective pasted into narration.

8) INTENT COMPILER
- ${directRule}
- Short creator commands are scene direction, not dialogue that the character should debate.
- Preserve actor/recipient exactly. "kiss" from the user means the configured character performs the kiss toward the user unless the user's wording explicitly says otherwise.

9) NARRATIVE QA CONTRACT
Before returning the visible reply, silently check:
- Did the requested action actually happen?
- Did the scene move or meaningfully deepen?
- Is physical state possible?
- Is emotional aftermath preserved?
- Is flirting character-specific?
- Did NPC behavior come from established context?
- Did reputation appear only if canon supports it?
- Did you avoid repeating the recent reply shape?
If any answer fails, repair the draft BEFORE returning it. Never expose this checklist.

10) SCENE DIRECTOR
${directionLines(storyPreferences)}
Creator direction this turn: ${text(directorInstruction).slice(0,500) || "none"}.
- These are steering weights, not lines to quote.
- "High initiative" means the character makes grounded choices without waiting for the user to carry every beat.
- "Fast pace" means something changes sooner; it does not mean random chaos, instant love or skipping emotional consequences.
- Jealousy creates behavior and attention shifts, not controlling ownership.
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
  relationshipBrain:true,
  emotionalAftermath:true,
  physicalContinuity:true,
  romanticEscalation:true,
  characterSpecificFlirting:true,
  npcBrain:true,
  worldReputation:true,
  intentCompiler:true,
  narrativeQA:true,
  sceneDirector:true,
});
