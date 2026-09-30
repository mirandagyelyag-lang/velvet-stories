// Velvet Stories v3.53.43 · Relationship Interpretation + Decision Engine
// Converts visible events into character-specific meaning, decisions, delayed consequences,
// local interaction patterns, and dynamic scene objectives without inventing the user's interiority.

const clean=(v="",n=12000)=>String(v??"").replace(/\s+/g," ").trim().slice(0,n);
const norm=(v="")=>clean(v).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[’‘]/g,"'");
const arr=(v)=>Array.isArray(v)?v:[];
const words=(v="")=>norm(v).split(/\s+/).filter(Boolean);

function observableUserFunction(value=""){
  const t=norm(value);
  if(!t) return "neutral";
  if(/\b(?:kiss|hug|hold(?:ing)? your hand|held your hand|link(?:ed)? arms?|cross(?:ed)? my arm with yours|lean(?:ed)? (?:on|against|into) you|touch(?:ed)? your (?:arm|hand|face|cheek)|move(?:d)? closer)\b/.test(t)) return "approach";
  if(/\b(?:let go|pull(?:ed)? away|unlink(?:ed)?|move(?:d)? away|step(?:ped)? back|stop(?:ped)? holding|drop(?:ped)? your hand|leave me alone|back off|not now)\b/.test(t)) return "withdraw";
  if(/\b(?:i trust you|you choose|surprise me|up to you|you decide)\b/.test(t)) return "delegation";
  if(/\b(?:tell me the truth|be honest|answer me|why did you|what happened|what do you mean|explain)\b/.test(t)) return "probe";
  if(/\b(?:no|stop|don't|dont|can't|cant|won't|wont|leave|go away|not happening)\b/.test(t)) return "boundary";
  if(/\b(?:sorry|i apologize|forgive me)\b/.test(t)) return "repair_offer";
  if(/\b(?:i like you|i love you|i want you|i miss you|i need you)\b/.test(t)) return "explicit_feeling";
  if(/\b(?:shut up|idiot|stupid|just kidding|kidding|teasing|messing with you|lol|lmao)\b/.test(t)) return "playful";
  return "neutral";
}

function localPattern(recentUserMessages=[]){
  const recent=arr(recentUserMessages).slice(-12).map(observableUserFunction);
  const count=(x)=>recent.filter((v)=>v===x).length;
  const approaches=count("approach"), withdrawals=count("withdraw");
  if(approaches>=2 && withdrawals>=2) return "repeated approach-withdraw pattern in this chat only";
  if(approaches>=3) return "repeated user-authored closeness in this chat only";
  if(withdrawals>=2) return "repeated user-authored distancing in this chat only";
  if(count("delegation")>=2) return "repeated delegation of choices in this chat only";
  if(count("probe")>=2) return "repeated direct probing for answers in this chat only";
  return "no strong local pattern";
}

function characterStressSignature(name=""){
  const n=norm(name);
  if(n==="alexander bennett") return "ALEXANDER under pressure: protective certainty may crack into a pause, a more careful tone, or a concrete act of repair. He can mask impact with confidence or warmth, but he should not become emotionally frictionless.";
  if(n==="chase beaumont") return "CHASE under pressure: deflects first through provocation, humor, risk or a sharp move; understanding can arrive a beat later. He should not become instantly eloquent or therapeutic.";
  if(n==="theo calloway") return "THEO under pressure: kindness remains, but selective attention becomes harder to hide. He may under-label what he feels and only later recognize that his behavior has changed.";
  if(n==="nathan foster") return "NATHAN under pressure: restraint, loyalty and access matter more than speeches. He may become more formal, protective, selective or distant before he explains anything.";
  if(n==="rowan hayes") return "ROWAN under pressure: practical familiarity comes first. He notices changed behavior, adjusts what he does, and may say the uncomfortable truth only after trying the practical route.";
  if(n==="roman knox") return "ROMAN under pressure: pride, rivalry and control of his own exposure shape the reaction. He may harden, redirect or make a costly choice before admitting what the event meant.";
  if(n==="damon blackwood") return "DAMON under pressure: intensity compresses rather than expands. Fewer words, more selective action, altered access and silence with consequence.";
  if(n==="mateo silva") return "MATEO under pressure: reduces pressure and stays present. He does not turn every difficult beat into therapy language or a perfect emotional speech.";
  return "Under pressure, preserve this character's established coping style, flaws, pride, timing and social habits instead of defaulting to polished emotional correctness.";
}

function likelyRelationalMeaning(fn, characterName=""){
  const n=norm(characterName);
  if(fn==="approach"){
    if(n==="theo calloway") return "selective access may become harder for him to explain as ordinary friendliness";
    if(n==="nathan foster") return "the familiar boundary may feel less stable, increasing restraint and awareness";
    if(n==="chase beaumont") return "the game changes because the user voluntarily entered his space; he may test or protect that opening";
    if(n==="roman knox") return "indifference becomes harder to maintain, creating friction between pride and changed access";
    if(n==="alexander bennett") return "voluntary closeness increases the value of the moment and may make him more deliberate about how he treats the user";
    return "voluntary closeness changes access or expectation on the character side";
  }
  if(fn==="withdraw") return "access just narrowed; the character must update behavior without inventing the user's motive";
  if(fn==="delegation") return "the user explicitly handed over one decision, creating responsibility for the character to choose rather than ask again";
  if(fn==="probe") return "the user is demanding clearer information; evasion now has a social cost";
  if(fn==="boundary") return "permission/access narrowed and outward behavior must respect it immediately";
  if(fn==="repair_offer") return "repair is possible but not automatically complete; response depends on existing damage and character style";
  if(fn==="explicit_feeling") return "new explicit information changes what the character is allowed to know, but not what the user will do next";
  if(fn==="playful") return "the beat may be low-stakes or masking another live pressure; do not invent the user's hidden emotion";
  return "interpret only concrete visible changes in access, information, plan, trust evidence, or social position";
}

function meaningfulChange(reply=""){
  const t=norm(reply);
  return /\b(?:decid|choose|chose|refus|admit|reveal|tell|ask|invite|cancel|change|promise|apolog|stay|leave|wait|stop|give you room|step back|join|defend|protect|call|text|book|plan|trust|boundary|access|not going|won't|wont|will|kept|stayed|turned down)\w*\b/.test(t);
}

function flatRecentScene(recentCharacterReplies=[]){
  const recent=arr(recentCharacterReplies).slice(-4);
  if(recent.length<4) return false;
  const changes=recent.filter(meaningfulChange).length;
  const filler=recent.filter((r)=>/\b(?:smil|grin|laugh|look|glance|walk|nod|shrug|joke|teas|drink|phone|door|seat|table|coffee|food|popcorn)\w*\b/.test(norm(r)) && !meaningfulChange(r)).length;
  return changes===0 || filler>=3;
}

function polishedEmotionDump(reply=""){
  const t=norm(reply);
  const wordsN=words(reply).length;
  const therapeutic=/\b(?:i understand how you feel|your feelings are valid|i respect whatever you decide|i just want you to know that i(?:'ll| will) always be here|you deserve|i hear you|thank you for telling me|i appreciate your honesty)\b/.test(t);
  const perfectBundle=/\b(?:i was wrong|im sorry|i'm sorry)\b/.test(t)
    && /\b(?:i understand|i realize|i respect|i promise|ill do better|i'll do better)\b/.test(t)
    && wordsN>65;
  return therapeutic||perfectBundle;
}

function omniscientInterpretation(reply=""){
  const t=norm(reply);
  return /\b(?:he knew you were jealous|she knew you were jealous|he knew you were hurt|she knew you were hurt|he knew you wanted|she knew you wanted|he knew you loved|she knew you loved|he could tell you were in love|she could tell you were in love|obviously you were jealous|clearly you wanted)\b/.test(t);
}

function immediateOverResolution(reply=""){
  const t=norm(reply);
  return /\b(?:everything was fine now|that fixed everything|all tension disappeared|all was forgiven|nothing between them had changed|back to normal immediately|problem solved|and that was that)\b/.test(t);
}

function delayedConsequenceDirective(fn){
  if(["approach","withdraw","probe","boundary","repair_offer","explicit_feeling"].includes(fn)){
    return "This event may create delayed consequence. Do not force payoff now. Preserve a compact character-side interpretation/decision so a later trigger can change attention, access, invitation, restraint, trust, jealousy, repair, or disclosure.";
  }
  return "Only create delayed consequence when the visible turn genuinely changes access, information, expectation, plan, trust evidence, or relationship pressure.";
}

export function buildRelationshipInterpretationV35343({
  character={},relationshipState={},latestUserMessage="",recentUserMessages=[],
  recentCharacterReplies=[],scene={},behavior={},worldConsequences={}
}={}){
  const fn=observableUserFunction(latestUserMessage);
  const pattern=localPattern(recentUserMessages);
  const flat=flatRecentScene(recentCharacterReplies);
  const meaning=likelyRelationalMeaning(fn,character?.name);
  const priorInterpretation=clean(behavior?.relationship_interpretation,500);
  const priorDecision=clean(behavior?.relationship_next_decision,400);
  const delayed=clean(behavior?.relationship_delayed_consequence,500);

  return [
    "RELATIONSHIP INTERPRETATION 3.53.43 · EVENT -> MEANING -> DECISION -> CONSEQUENCE:",
    `VISIBLE USER FUNCTION=${fn}. LOCAL CHAT PATTERN=${pattern}. FLAT_SCENE=${flat?"YES":"no"}.`,
    `CHARACTER-SIDE MEANING TO CONSIDER: ${meaning}.`,
    "1) INTERPRET BEFORE REACTING: identify what the visible event changes for THIS character: access, expectation, trust evidence, uncertainty, social risk, priority, restraint, information, or plan. Never infer the user's hidden feeling.",
    "2) RELATIONSHIP DELTA IS MULTI-AXIS: one event may alter only one or two character-side dimensions such as comfort, trust, desire, caution, jealousy, expectation, vulnerability, or distance. Do not move every axis together and do not expose numeric scores in prose.",
    "3) DECISION DERIVATION: after interpreting a meaningful event, the character should make or begin one character-owned decision: approach, hold back, stay, leave, protect, ask, reveal, redirect, give space, change a plan, watch for evidence, repair, refuse, or take a social risk. A reaction with no decision is allowed only when shock/uncertainty itself is the meaningful state change.",
    "4) CHARACTER STRESS SIGNATURE: "+characterStressSignature(character?.name),
    "5) ANTI-PERFECT RESPONSE: humans are not optimized counselors. Allow pauses, defensive humor, partial honesty, delayed understanding, pride, awkward wording, wrong first reads, or imperfect choices when consistent with the character. Do not deliberately make them cruel or incompetent just to seem human.",
    "6) DYNAMIC SCENE OBJECTIVE: a high-impact event may replace the old scene objective immediately. If the relationship meaning now outranks popcorn, destination, errands, the original joke, or group logistics, follow the new live objective instead of finishing the old script.",
    "7) CONSEQUENCE CAN ARRIVE LATER: "+delayedConsequenceDirective(fn),
    "8) UNCERTAINTY IS REAL: separate KNOWN, OBSERVED, SUSPECTED and UNKNOWN. The character may act on a suspicion but must not narrate it as fact. Other people's motives and the user's inner state remain unknown unless explicitly authored.",
    "9) LOCAL PATTERN MEMORY ONLY: patterns inferred from recent user-authored turns belong to THIS conversation and are hypotheses about interaction structure, not personality facts about the user. Never write 'you always...' from a short pattern.",
    "10) DO NOT RESOLVE TOO FAST: attraction, jealousy, misunderstanding, hurt, awkwardness, repair and uncertainty may remain partially open. A good turn can clarify one thing while leaving another live.",
    flat
      ? "11) FLAT-SCENE INTERVENTION IS DUE NOW: the next useful beat must change relationship, information, plan, access, problem or expectation through a grounded character/world decision. No random catastrophe, new mystery box or decorative NPC interruption."
      : "11) FLAT-SCENE WATCH: if 3-4 consecutive turns fail to change relationship, information, plan, access, problem or expectation, transform the next beat through a grounded decision or consequence.",
    "12) STORY MEMORY OUTPUT: when warranted, human_behavior_update may store relationship_interpretation, relationship_next_decision, relationship_delayed_consequence and local_interaction_pattern. These are character-side working state, not facts about the user's feelings.",
    "13) SCENE DIRECTION OUTPUT: if this event changes what the current scene is about, scene_update should carry a new scene_objective/story_direction. Do not keep executing a stale scene objective.",
    `PRIOR INTERPRETATION: ${priorInterpretation||"none"}. PRIOR NEXT DECISION: ${priorDecision||"none"}. DELAYED CONSEQUENCE: ${delayed||"none"}.`,
    `RELATIONSHIP STATE: ${clean(JSON.stringify(relationshipState||{}),850)||"none"}. CURRENT SCENE: ${clean(JSON.stringify(scene||{}),700)||"none"}.`,
    `ACTIVE CONSEQUENCES: ${clean(JSON.stringify(arr(worldConsequences?.activeChains).slice(0,5)),900)||"none"}.`,
  ].join("\n");
}

export function relationshipInterpretationIssuesV35343({
  reply="",latestUserMessage="",recentUserMessages=[],recentCharacterReplies=[],character={}
}={}){
  const issues=[];
  const text=clean(reply);
  if(!text) return ["relationship_interpretation_empty_reply"];
  const fn=observableUserFunction(latestUserMessage);
  const flat=flatRecentScene(recentCharacterReplies);

  if(polishedEmotionDump(text)) issues.push("character_became_emotionally_perfect");
  if(omniscientInterpretation(text)) issues.push("relationship_interpretation_mindread_user");
  if(immediateOverResolution(text)) issues.push("relationship_pressure_resolved_too_fast");

  if(flat && !meaningfulChange(text)){
    issues.push("flat_scene_not_interrupted");
  }

  if(fn==="delegation" && /\b(?:what do you want|which do you prefer|up to you|your choice|you decide)\b/.test(norm(text))){
    issues.push("delegated_decision_returned_to_user");
  }

  if(fn==="boundary" && /\b(?:kept pushing|wouldn't take no|would not take no|ignored your no|blocked your way|wouldn't let you leave|would not let you leave)\b/.test(norm(text))){
    issues.push("boundary_ignored_for_relationship_progress");
  }

  return [...new Set(issues)];
}

export const __testV35343={
  observableUserFunction,localPattern,characterStressSignature,likelyRelationalMeaning,
  meaningfulChange,flatRecentScene,polishedEmotionDump,omniscientInterpretation,immediateOverResolution
};
