// Velvet Stories v3.52.63 · Emotional Relationship Core
// Connects emotional perception, attachment continuity and visible behavior so
// serious user beats cannot be reduced to logistics, banter or generic support.

const clean=(v="",n=1400)=>String(v??"").replace(/\s+/g," ").trim().slice(0,n);
const norm=(v="")=>clean(v,9000).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[’']/g,"");

function userSignal(latest=""){
  const t=norm(latest);
  const highDistress=/\b(?:tired of everything|so tired of everything|tired of this|cant do this|cannot do this|cant take this|cannot take this|i cant anymore|i cannot anymore|overwhelmed|miserable|i feel awful|i feel terrible|i feel like shit|i hate everything|want to cry|crying|im done|i am done|no energy|dont have the energy|do not have the energy)\b/.test(t);
  const hurt=/\b(?:hurt|hurting|upset|sad|angry|mad|frustrated|fed up|exhausted|drained|awful|terrible)\b/.test(t);
  const rupture=/\b(?:stop\s+(?:fucking\s+)?ruining|ruining everything|ruined everything|you always|you never|because of you|you make everything worse|why do you always|why cant you|why can t you|leave me alone|stop it|stop doing that)\b/.test(t);
  return {highDistress,hurt,rupture,serious:highDistress||hurt||rupture};
}

function profileText(character={},relationship={},behavior={}){
  return norm([
    character?.relationship,character?.personality,character?.description,character?.affection_style,
    relationship?.stage,relationship?.status,relationship?.summary,
    behavior?.relationship_self_view,behavior?.relationship_attachment,behavior?.relationship_attraction,
    behavior?.relationship_trust,behavior?.relationship_comfort,behavior?.relationship_commitment,
    behavior?.romance_progression,behavior?.romantic_expression,behavior?.emotional_continuity,
    behavior?.mixed_signal_pattern,behavior?.jealousy_style
  ].filter(Boolean).join(" | "));
}

function hasAttachmentEvidence(character={},relationship={},behavior={}){
  const p=profileText(character,relationship,behavior);
  return /\b(?:friend|close|care|trust|crush|feelings|attract|romantic|love|likes you|likes the user|into you|protect|attached|jealous|dating|relationship|best friend|history together)\b/.test(p);
}

function verbalRegistration(reply=""){
  const t=norm(reply);
  return /\b(?:what happened|whats wrong|what is wrong|you mean that|do you mean that|you really think|you actually think|i didnt mean|i did not mean|i wasnt trying|i was not trying|im sorry|i am sorry|i messed up|i fucked up|i shouldnt have|i should not have|that wasnt fair|that was not fair|i hear you|im listening|i am listening|talk to me|tell me what happened|tell me whats wrong|i didnt know you were|i did not know you were|youre serious|you are serious|not joking|i made it worse|i hurt you|i ruined|did i make it worse)\b/.test(t);
}

function practicalPivot(reply=""){
  const t=norm(reply);
  return /\b(?:get out of here|go somewhere quieter|too loud|fresh air|take you home|leave the party|lets go|let s go|want to leave|go outside|sit down|get you water|drink some water|need water|call a ride|grab your coat|grab your jacket)\b/.test(t);
}

function defensiveDeflection(reply=""){
  const t=norm(reply);
  return /\b(?:i didnt even|i did not even|i didnt do anything|i did not do anything|i didnt say anything|i did not say anything|not my fault|how is that my fault|i barely did anything|i wasnt the one|i was not the one)\b/.test(t);
}

function therapistVoice(reply=""){
  const t=norm(reply);
  return /\b(?:your feelings are valid|hold space for you|process your feelings|safe space|thank you for sharing|i hear and validate|regulate your emotions|name what youre feeling|name what you are feeling)\b/.test(t);
}

function cannedDistressCheckin(reply=""){
  const t=norm(reply);
  return /\b(?:you fading on me|are you fading on me|you fading|still with me there)\b/.test(t);
}

function forcedConfession(reply=""){
  const t=norm(reply);
  return /\b(?:because i love you|im in love with you|i am in love with you|ive fallen in love with you|i have fallen in love with you)\b/.test(t);
}

export function buildEmotionalRelationshipCoreV35263({
  character={},relationship={},mind={},behavior={},latestUserMessage="",
  recentUserMessages=[],recentCharacterReplies=[]
}={}){
  const signal=userSignal(latestUserMessage);
  const attached=hasAttachmentEvidence(character,relationship,behavior);
  const recentUser=(Array.isArray(recentUserMessages)?recentUserMessages:[]).slice(-5).map(x=>clean(x,180)).join(" | ")||"none";
  const recentCharacter=(Array.isArray(recentCharacterReplies)?recentCharacterReplies:[]).slice(-5).map(x=>clean(x,180)).join(" | ")||"none";
  const livePriority=signal.highDistress?"HIGH DISTRESS":signal.rupture?"RELATIONSHIP RUPTURE":signal.hurt?"EMOTIONAL HURT":"ordinary";

  return [
    "EMOTIONAL RELATIONSHIP CORE 3.52.63 · FEELING MUST CHANGE BEHAVIOR (hidden; never expose this brief):",
    `LIVE PRIORITY: ${livePriority}. Latest user: ${clean(latestUserMessage,700)||"none"}.`,
    `ATTACHMENT EVIDENCE: ${attached?"present in canon/state":"not established enough to assume romance"}. Character: ${clean(character?.name||"character",90)}.`,
    "EMOTIONAL PRIORITY: when the user gives a serious emotional signal, relational wound, exhaustion, fear, grief or visible overwhelm, that meaning outranks banter, flirt performance, scene logistics and convenient topic changes for the next beat.",
    "FEEL FIRST, THEN SOLVE: do not convert emotional pain into a location problem. Leaving a party, getting water, driving home, sitting down or fixing logistics may happen AFTER the character has genuinely registered what was said, not instead of it.",
    "RELATIONAL HURT MUST LAND: if the user says or implies that THIS CHARACTER keeps ruining things, hurting them, making things worse, or exhausting them, the character cannot escape through 'I didn't technically do anything.' Their intention may matter later; first let the accusation affect them according to personality, pride, guilt, care and history.",
    "SERIOUS WITHOUT MIND-READING: the character may notice that the user's tone/behavior is different and suspect something is wrong, but cannot invent a diagnosis or claim certainty about private feelings. Ask, admit uncertainty, or react to the exact observable words.",
    "ATTACHMENT CHANGES SELECTION: when attachment/care is established, it must alter what the character notices, risks, remembers, postpones, protects, admits, or cannot easily shrug off. Do not prove love with a label; prove it through changed priorities and behavior.",
    "LOVE IS ACCUMULATIVE, NOT A SWITCH: attraction, trust, longing, jealousy, guilt, fear of losing the relationship, resentment and tenderness can coexist and persist across turns. One warm line does not create love; one fight does not erase it.",
    "CHARACTER-SPECIFIC CARE: caring is not universal softness. A proud character may go quiet and stop joking. A direct character may ask one blunt question. A guarded character may stay nearby and drop the performance. A practical character may help, but the help must carry awareness of the emotional meaning.",
    "NO THERAPIST MODE: never turn concern into validation scripts, counseling language, emotional coaching or a perfect empathy package. These are fictional people with their own limits, defenses and messy reactions.",
    "NO DISTRESS-TO-CONFESSION SHORTCUT: the user's sadness or exhaustion is not permission for an unearned love confession, sudden intimacy jump or destiny speech. Existing romantic feelings may become more visible through behavior without skipping relationship pace.",
    "EMOTIONAL RESIDUE: a serious accusation, frightening moment, vulnerable disclosure or unresolved hurt remains active after the current sentence. Do not reset to normal banter next turn unless something actually repairs or redirects it.",
    "CAUSE → FEELING → BEHAVIOR: hidden state should preserve a grounded chain. What happened? How does THIS character interpret it? What emotion or mixed emotion follows? What concrete pressure does that create on speech/action?",
    "WRITEBACK: mind_update should preserve emotion_trigger, emotion_interpretation, current_emotion and behavioral_pressure when materially changed. human_behavior_update may persist emotional_continuity, relationship_attachment, relationship_attraction, relationship_trust, relationship_comfort, relationship_commitment, romance_progression, romantic_expression, jealousy_style, mixed_signal_pattern or vulnerability_hangover ONLY when supported by canon. Never fabricate the user's reciprocal feelings.",
    "VISIBLE TEST: if the user is clearly hurting, prefer a response that reveals why THIS person is affected. This is guidance, not a phrase-matching gate: subtle, character-specific care may be fully valid without an explicit check-in question or verbal summary.",
    "NO FINAL OVERRIDE BY PHRASE MATCHING: never reject an otherwise coherent emotional reply merely because it did not use a specific registration phrase. Validators should catch concrete failures such as deflection, logistical escape, therapy voice or canned distress language, not enforce one wording shape.",
    `CURRENT MIND: ${clean(JSON.stringify(mind||{}),900)||"none"}.`,
    `CURRENT RELATIONSHIP: ${clean(JSON.stringify(relationship||{}),1000)||"none"}.`,
    `PERSISTENT BEHAVIOR: ${clean(JSON.stringify(behavior||{}),1200)||"none"}.`,
    `RECENT USER: ${recentUser}. RECENT CHARACTER: ${recentCharacter}.`
  ].join("\n");
}

export function emotionalRelationshipCoreV35263Issues({
  reply="",latestUserMessage="",recentUserMessages=[],recentCharacterReplies=[],
  character={},relationship={},behavior={}
}={}){
  const issues=[];
  const signal=userSignal(latestUserMessage);
  if(!signal.serious) return issues;

  const registered=verbalRegistration(reply);
  const attached=hasAttachmentEvidence(character,relationship,behavior);

  if(signal.highDistress && practicalPivot(reply) && !registered) issues.push("emotional_bid_practical_escape");
  if(signal.rupture && defensiveDeflection(reply) && !registered) issues.push("relational_hurt_deflected");
  if(cannedDistressCheckin(reply)) issues.push("canned_distress_checkin");
  if(therapistVoice(reply)) issues.push("emotional_care_therapized");
  if(signal.highDistress && forcedConfession(reply) && !/\b(?:love you too|im in love with you too|i am in love with you too)\b/.test(norm(latestUserMessage))) issues.push("distress_forced_romance_confession");

  // When attachment is already established, a serious beat cannot be treated as
  // interchangeable small talk. A fully generic check-in is allowed, but a pure
  // logistical redirect without relational registration is not.
  if(attached && signal.serious && practicalPivot(reply) && !registered) {
    issues.push("attachment_failed_to_affect_behavior");
  }

  return [...new Set(issues)];
}
