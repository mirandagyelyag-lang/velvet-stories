// Velvet Stories v3.53.44 · Behavior Becomes Character
// Repeated consequences become habits; habits shape long-term relationship behavior
// without erasing core identity, user agency, or the character's independent life.

const clean=(v="",n=12000)=>String(v??"").replace(/\s+/g," ").trim().slice(0,n);
const norm=(v="")=>clean(v).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[’‘]/g,"'");
const arr=(v)=>Array.isArray(v)?v:[];
const words=(v="")=>norm(v).split(/\s+/).filter(Boolean);

function userEventKind(v=""){
  const t=norm(v);
  if(/\b(?:kiss|hug|hold(?:ing)? your hand|held your hand|link(?:ed)? arms?|cross(?:ed)? my arm with yours|lean(?:ed)? (?:on|against|into) you|touch(?:ed)? your (?:arm|hand|face|cheek))\b/.test(t)) return "closeness";
  if(/\b(?:let go|pull(?:ed)? away|unlink(?:ed)?|step(?:ped)? back|move(?:d)? away|leave me alone|back off|not now)\b/.test(t)) return "distance";
  if(/\b(?:sorry|apolog|forgive me|i was wrong)\b/.test(t)) return "repair";
  if(/\b(?:i trust you|you choose|you decide|up to you|surprise me)\b/.test(t)) return "trust_or_delegation";
  if(/\b(?:i love you|i like you|i want you|i miss you|i need you)\b/.test(t)) return "explicit_feeling";
  if(/\b(?:no|stop|don't|dont|can't|cant|won't|wont|go away|not happening)\b/.test(t)) return "boundary";
  return "ordinary";
}

function characterEventKind(v=""){
  const t=norm(v);
  if(/\b(?:kiss(?:ed|es|ing)?|hug(?:ged|s|ging)?|held your hand|took your hand|linked arms?)\b/.test(t)) return "closeness";
  if(/\b(?:apolog|owned the mistake|took responsibility|made amends|repair)\b/.test(t)) return "repair";
  if(/\b(?:defend|protected|stood up for|chose your side|backed you up)\b/.test(t)) return "public_support";
  if(/\b(?:refus|set a boundary|said no|turned .* down|gave you space|stepped back)\b/.test(t)) return "boundary_or_space";
  if(/\b(?:admit|confess|told you the truth|revealed|opened up)\b/.test(t)) return "disclosure";
  if(/\b(?:invite|asked you to|made a plan|changed the plan|stayed|left|waited)\b/.test(t)) return "choice";
  return "ordinary";
}

function localBehaviorPattern(recentUserMessages=[],recentCharacterReplies=[]){
  const user=arr(recentUserMessages).slice(-14).map(userEventKind);
  const chr=arr(recentCharacterReplies).slice(-14).map(characterEventKind);
  const uc=(k)=>user.filter(x=>x===k).length;
  const cc=(k)=>chr.filter(x=>x===k).length;
  if(uc("closeness")>=2 && uc("distance")>=2) return "closeness has repeatedly changed access rather than staying static";
  if(uc("closeness")>=3 && cc("closeness")>=2) return "mutual visible closeness is becoming familiar, not brand-new";
  if(uc("boundary")>=2) return "explicit boundaries have repeated and should shape character expectations";
  if(cc("repair")>=2) return "the character has repeatedly used repair behavior after conflict";
  if(cc("public_support")>=2) return "the character has repeatedly chosen visible support";
  if(cc("choice")>=3) return "the character increasingly carries initiative through concrete choices";
  return "no repeated behavior has earned habit status yet";
}

function milestoneCandidates(latestUserMessage="",recentUserMessages=[],recentCharacterReplies=[]){
  const all=[...arr(recentUserMessages).slice(-12),latestUserMessage,...arr(recentCharacterReplies).slice(-12)];
  const t=norm(all.join(" | "));
  const candidates=[];
  const once=(label,re)=>{if(re.test(t)) candidates.push(label);};
  once("first_or_rare_handholding",/\b(?:hold(?:ing)? (?:your|his|her) hand|held (?:your|his|her) hand|took (?:your|his|her) hand)\b/);
  once("first_or_rare_linked_arms",/\b(?:link(?:ed)? arms?|cross(?:ed)? my arm with yours|hook(?:ed)? .* arm)\b/);
  once("kiss",/\bkiss(?:ed|es|ing)?\b/);
  once("public_defense",/\b(?:defend|stood up for|backed you up|chose your side)\b/);
  once("partial_confession",/\b(?:i like you|i miss you|i want you|feelings for you|admit(?:ted)? .* feel)\b/);
  once("serious_conflict",/\b(?:we're done|were done|leave me alone|go away|betray|lied to me|fight|argument|don't touch me|dont touch me)\b/);
  once("repair",/\b(?:forgive me|i was wrong|i'm sorry|im sorry|made amends|took responsibility)\b/);
  return [...new Set(candidates)].slice(0,6);
}

function timeSkipSignal(scene={},latestUserMessage=""){
  const t=norm([scene?.time_label,scene?.time,scene?.activity,latestUserMessage].filter(Boolean).join(" | "));
  if(/\b(?:weeks? later|months? later|a month later|a week later|several days later|days later|the next week|next month)\b/.test(t)) return "long";
  if(/\b(?:days? later|the next day|next morning|following morning|tomorrow|later that week)\b/.test(t)) return "medium";
  if(/\b(?:hours? later|later that night|later that evening|later that afternoon|a little later)\b/.test(t)) return "short";
  return "none";
}

function identityAnchor(character={}){
  return clean([
    character?.personality,
    character?.description,
    character?.relationship,
    character?.speech_style,
    character?.conflict_style,
    character?.affection_style,
    character?.boundaries,
  ].filter(Boolean).join(" | "),1500);
}

function attachmentWithoutOrbit(reply=""){
  const t=norm(reply);
  const obsession=/\b(?:nothing else mattered|forgot all about work|ditched everything|cancelled everything for you|canceled everything for you|you were all he cared about|you were all she cared about|his entire world was you|her entire world was you|could think of nothing else|only thing that mattered was you)\b/.test(t);
  return obsession;
}

function personalityReplacement(reply="",character={}){
  const t=norm(reply);
  const anchor=norm(identityAnchor(character));
  if(!anchor) return false;
  const therapy=/\b(?:your feelings are valid|i hear you|thank you for sharing|i respect whatever you decide|you deserve better|safe space)\b/.test(t);
  const pacifist=/\b(?:i never want conflict|i would never argue|i dont get angry|i don't get angry|i never get jealous)\b/.test(t);
  const coreConflict=/\b(?:sarcast|provoc|pride|guarded|intense|rival|blunt|competitive|stubborn|teas|impulsive)\b/.test(anchor);
  return coreConflict && (therapy||pacifist);
}

function trustRepairShortcut(reply="",behavior={}){
  const prior=norm([behavior?.conflict_scar,behavior?.trust_repair_evidence,behavior?.repair_debt,behavior?.forgiveness_gate].join(" | "));
  if(!prior) return false;
  const instant=/\b(?:everything was fine|all forgiven|trust was fully restored|back to normal|nothing between them had changed|that fixed everything|problem solved)\b/.test(norm(reply));
  return instant;
}

function regenerationAmnesia(reply="",isRegeneration=false,behavior={}){
  if(!isRegeneration) return false;
  const prior=clean([
    behavior?.relationship_history_compression,
    behavior?.earned_behavior_habits,
    behavior?.conflict_scar,
    behavior?.relationship_expectations,
    behavior?.trust_repair_evidence,
    behavior?.milestone_summary,
  ].filter(Boolean).join(" | "),1800);
  if(!prior) return false;
  const reset=/\b(?:as if they had just met|like strangers again|nothing had changed between them|back to square one|starting over|felt completely new|no history between them)\b/.test(norm(reply));
  return reset;
}

function timeSkipReset(reply="",timeSkip="none",behavior={}){
  if(timeSkip==="none") return false;
  const hasResidue=Boolean(clean([
    behavior?.conflict_scar,
    behavior?.relationship_history_compression,
    behavior?.earned_behavior_habits,
    behavior?.relationship_expectations,
    behavior?.milestone_summary,
  ].filter(Boolean).join(" | "),1200));
  if(!hasResidue) return false;
  return /\b(?:everything was normal again|all tension was gone|nothing from before mattered|they were back to exactly how they used to be|the weeks erased everything|time had fixed everything)\b/.test(norm(reply));
}

function habitDirective(pattern){
  if(pattern.includes("visible support")) return "Repeated support may become an earned habit: faster public backing, less hesitation, or a predictable protective choice. Keep the habit proportional and character-specific.";
  if(pattern.includes("repair behavior")) return "Repeated repair may become a habit in method, not perfection: the character learns a characteristic way to return, apologize, fix, or give space.";
  if(pattern.includes("initiative")) return "Repeated initiative may become a stable expectation that the character carries their share of plans instead of handing momentum back.";
  if(pattern.includes("mutual visible closeness")) return "Repeated closeness may become familiar access. Reduce surprise while preserving context, consent, and character-specific meaning.";
  if(pattern.includes("boundaries")) return "Repeated boundaries should become learned access rules. The character may anticipate the limit without claiming to know the user's private reason.";
  if(pattern.includes("changed access")) return "Approach/withdraw cycles may teach caution about access, but never become a diagnosis or a claim about the user's personality.";
  return "Do not promote a one-off behavior into a habit. Habit formation requires repeated visible evidence.";
}

function scarDirective(behavior={}){
  const scar=clean(behavior?.conflict_scar,500);
  if(!scar) return "No stored conflict scar. A resolved disagreement may close without inventing permanent damage.";
  return `Stored conflict scar: ${scar}. A scar means the exact argument may be closed while access, sensitivity, wording, trust or expectations remain changed. Do not reopen the same fight mechanically.`;
}

function expectationsDirective(behavior={}){
  const existing=clean(behavior?.relationship_expectations,650);
  return existing
    ? `Existing character-side expectations: ${existing}. Update only from visible repeated evidence; expectations are predictions, not entitlement or certainty.`
    : "Build expectations only from repeated visible behavior: what kinds of access are established, what boundaries exist, what repair methods have worked, and what topics carry risk.";
}

function repairDirective(behavior={}){
  const debt=clean([behavior?.repair_debt,behavior?.forgiveness_gate,behavior?.conflict_scar].filter(Boolean).join(" | "),700);
  return debt
    ? `Repair pressure exists: ${debt}. Trust repair requires accumulated evidence: accountability + changed behavior + time/opportunity. One apology, kiss, gift or perfect speech is not full repair.`
    : "When trust is damaged, do not declare it restored from a single gesture. Record evidence as it accumulates and let access change gradually.";
}

function timeCarryDirective(timeSkip,behavior={}){
  if(timeSkip==="none") return "No explicit time skip detected. Carry current emotional and practical residue normally.";
  const summary=clean([behavior?.relationship_history_compression,behavior?.conflict_scar,behavior?.earned_behavior_habits,behavior?.milestone_summary].filter(Boolean).join(" | "),1000);
  if(timeSkip==="short") return `Short time skip: intensity may cool slightly, but active awkwardness, plans, hurt, attraction and unfinished decisions usually remain live. Carry: ${summary||"current visible consequences"}.`;
  if(timeSkip==="medium") return `Medium time skip: raw emotion may soften, but learned habits, boundaries, trust changes, promises, scars and milestones remain. Re-enter through behavior, not a recap dump. Carry: ${summary||"durable consequences"}.`;
  return `Long time skip: momentary emotion can fade substantially, but durable habits, relationship stage, learned boundaries, trust evidence, scars, milestones and consequences survive unless canon says they changed off-screen. Carry: ${summary||"durable relationship history"}.`;
}

export function buildBehaviorBecomesCharacterV35344({
  character={},relationshipState={},latestUserMessage="",recentUserMessages=[],recentCharacterReplies=[],
  scene={},behavior={},worldConsequences={},storyMilestones=[],isRegeneration=false
}={}){
  const pattern=localBehaviorPattern(recentUserMessages,recentCharacterReplies);
  const candidates=milestoneCandidates(latestUserMessage,recentUserMessages,recentCharacterReplies);
  const skip=timeSkipSignal(scene,latestUserMessage);
  const history=clean(behavior?.relationship_history_compression,900);
  const habits=clean(behavior?.earned_behavior_habits,800);
  const milestones=clean(behavior?.milestone_summary,800);
  const traitDrift=clean(behavior?.trait_drift_summary,600);
  const externalMilestones=clean(JSON.stringify(arr(storyMilestones).slice(-6)),900);
  const consequences=clean(JSON.stringify(arr(worldConsequences?.activeChains).slice(0,6)),1000);

  return [
    "BEHAVIOR BECOMES CHARACTER 3.53.44 · LONG-TERM EVOLUTION ENGINE:",
    "EVENT -> INTERPRETATION -> DECISION -> CONSEQUENCE -> PATTERN -> HABIT -> EVOLUTION.",
    `LOCAL REPEATED PATTERN: ${pattern}. TIME_SKIP=${skip}. REGENERATION=${isRegeneration?"YES":"no"}.`,
    "1) RELATIONSHIP HISTORY COMPRESSION: preserve the smallest useful summary of what repeated events have actually changed. Compress outcomes, not transcripts. Good: 'after two public defenses, he backs her faster in group conflict.' Bad: a chronological list of every glance, joke and meal.",
    "2) BEHAVIORAL HABIT FORMATION: "+habitDirective(pattern),
    "3) CONTROLLED TRAIT DRIFT: relationships may change habits, thresholds, priorities, disclosure, humor, trust and coping. Core identity does not get replaced. Growth bends the character; it does not swap them for a calmer generic person.",
    `CORE IDENTITY ANCHOR: ${identityAnchor(character)||"use configured character identity"}.`,
    "4) CONFLICT MEMORY: "+scarDirective(behavior),
    "5) RELATIONSHIP EXPECTATIONS: "+expectationsDirective(behavior),
    "6) TRUST REPAIR MODEL: "+repairDirective(behavior),
    "7) ATTACHMENT WITHOUT OBSESSION: growing attachment can change priority, effort, jealousy, restraint or willingness to take a cost. The character still has work, friends, goals, obligations, flaws and interests. Do not make the user their whole universe.",
    "8) TIME-SKIP CARRYOVER: "+timeCarryDirective(skip,behavior),
    "9) MILESTONE DETECTION: first/rare closeness, public defense, partial confession, serious conflict, real repair and deliberate choice can become milestones when actually visible. Do not manufacture a 'first' if prior canon already contains it.",
    `POSSIBLE RECENT MILESTONE SIGNALS: ${candidates.join(" | ")||"none"}. STORED MILESTONES: ${milestones||externalMilestones||"none"}.`,
    "10) REGENERATION ANTI-AMNESIA: regenerating replaces only the rejected turn. Everything before the branch point remains canon, including earned habits, scars, relationship stage, expectations, milestones, trust evidence and character evolution. A new wording must not reset history.",
    "11) EXPECTATIONS ARE NOT USER FACTS: a character may learn 'pushing after a no damages access' or 'she has delegated choices several times in this chat.' They may NOT store 'she secretly wants me to chase her' or any hidden personality diagnosis.",
    "12) HABITS CAN RELAPSE: learned behavior is probabilistic, not robotic. Under pressure the character may fall back into an old defense, but the relapse should be recognizable against prior growth and can create new consequence.",
    "13) MILESTONES CHANGE BASELINE, NOT EVERY TURN: after a milestone, future behavior may become more familiar, cautious, open or charged. Do not constantly mention the milestone or replay its emotional peak.",
    "14) MEMORY PRIORITY: identity anchor > explicit canon > visible milestones > durable consequences > repeated patterns > inferred expectations > transient mood. Never let a weak inference overwrite stronger canon.",
    "15) PERSISTENCE OUTPUT: human_behavior_update may update relationship_history_compression, earned_behavior_habits, trait_drift_summary, conflict_scar, relationship_expectations, trust_repair_evidence, milestone_summary, time_skip_carryover and regeneration_continuity_anchor. Keep each compact, character-side, and grounded in visible canon.",
    "16) MILESTONE OUTPUT: when this turn visibly earns a new milestone, presence_update.relationship_milestone or continuity_update.timeline_event may record it once. Do not duplicate an existing milestone under new wording.",
    `PRIOR COMPRESSED HISTORY: ${history||"none"}. PRIOR HABITS: ${habits||"none"}. PRIOR TRAIT DRIFT: ${traitDrift||"none"}.`,
    `ACTIVE CONSEQUENCES: ${consequences||"none"}.`,
    `RELATIONSHIP STATE: ${clean(JSON.stringify(relationshipState||{}),800)||"none"}. CURRENT SCENE: ${clean(JSON.stringify(scene||{}),700)||"none"}.`,
  ].join("\n");
}

export function behaviorBecomesCharacterIssuesV35344({
  reply="",character={},behavior={},scene={},latestUserMessage="",isRegeneration=false
}={}){
  const issues=[];
  const text=clean(reply);
  if(!text) return ["behavior_becomes_character_empty_reply"];
  const skip=timeSkipSignal(scene,latestUserMessage);

  if(personalityReplacement(text,character)) issues.push("growth_replaced_core_personality");
  if(attachmentWithoutOrbit(text)) issues.push("attachment_became_user_obsession");
  if(trustRepairShortcut(text,behavior)) issues.push("trust_repair_declared_without_evidence");
  if(regenerationAmnesia(text,isRegeneration,behavior)) issues.push("regeneration_erased_relationship_history");
  if(timeSkipReset(text,skip,behavior)) issues.push("time_skip_erased_durable_relationship_state");

  return [...new Set(issues)];
}

export const __testV35344={
  userEventKind,characterEventKind,localBehaviorPattern,milestoneCandidates,timeSkipSignal,
  identityAnchor,attachmentWithoutOrbit,personalityReplacement,trustRepairShortcut,
  regenerationAmnesia,timeSkipReset
};
