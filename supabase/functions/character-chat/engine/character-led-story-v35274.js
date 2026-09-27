// Velvet Stories v3.52.74 · Character-Led Story
// The character carries scene initiative without orbiting, coercing, or making
// every development about the user.

const clean=(v="",n=1200)=>String(v??"").replace(/\s+/g," ").trim().slice(0,n);
const norm=(v="")=>clean(v,12000).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[’']/g,"");

function isSilent(value=""){
  const raw=String(value||"").trim();
  return /^\[(?:SILENT_CONTINUE|RETURN_MAIN_POV)/.test(raw) || /^[.…。]+$/u.test(raw);
}

function relationshipCanon(character={},relationship={}){
  return norm([
    character?.relationship,
    relationship?.stage,
    relationship?.status,
    relationship?.relationship_phase,
    relationship?.current_dynamic,
    relationship?.relationship_signature,
  ].filter(Boolean).join(" | "));
}

function explicitlyExclusive(character={},relationship={}){
  const t=relationshipCanon(character,relationship);
  return /\b(?:exclusive|officially together|boyfriend|girlfriend|partners?|engaged|fiance|fiancee|married|husband|wife|monogamous|committed relationship)\b/.test(t)
    && !/\b(?:not exclusive|nonexclusive|non-exclusive|open relationship|casual|friends with benefits)\b/.test(t);
}

function passiveDeadEnd(reply=""){
  const t=norm(reply);
  const passive=/\b(?:waited|watched|stayed there|remained there|gave (?:her|him|you|them) space|said nothing|didnt say anything|did not say anything|let the silence|stood there|sat there|looked at (?:her|him|you|them)|kept quiet)\b/.test(t);
  const initiative=/\b(?:decided|left|went|called|texted|sent|invited|asked|told|refused|changed|started|finished|grabbed|opened|closed|walked over|went back|joined|ordered|booked|planned|picked|chose|admitted|confessed|kissed|flirted|argued|confronted|apologized|offered|made|turned to|headed|returned|showed up)\b/.test(t);
  const dialogue=/["“][^"”]{3,}["”]/.test(String(reply||""));
  return passive && !initiative && !dialogue;
}

function handsBackDecision(reply=""){
  const t=norm(reply);
  return /\b(?:what do you want to do|what do you want me to do|your call|you decide|up to you|whatever you want|tell me what you want|tell me where to go|tell me if i should stay|tell me if i should go|what now\??|so what now\??)\b/.test(t);
}

function userOrbiting(reply=""){
  const t=norm(reply);
  const hits=(t.match(/\b(?:for you|because of you|to see you|with you|your reaction|watching you|looking at you|waiting for you|following you|staying with you)\b/g)||[]).length;
  return hits>=4;
}

function seriousUserBeat(value=""){
  const t=norm(value);
  return /\b(?:bad day|rough day|shitty day|awful day|terrible day|hard day|hurt|upset|cry|cried|crying|panic|panicking|scared|overwhelmed|pill|pills|med|meds|medication|medicine|dose|prescription|dont care|you dont care)\b/.test(t);
}

function emotionallyPassiveReply(reply=""){
  const t=norm(reply);
  const questions=(String(reply||"").match(/\?/g)||[]).length;
  const passive=/\b(?:im listening|i m listening|go on|tell me|what happened|are you okay|okay|alright|all right|i hear you|im here|i m here)\b/.test(t);
  const ownedMove=/\b(?:apolog(?:ize|ized|izes)|admit(?:s|ted)?|decid(?:e|es|ed)|refus(?:e|es|ed)|stay(?:s|ed)?|leave(?:s|ft)?|call(?:s|ed)?|text(?:s|ed)?|put(?:s)? away|stop(?:s|ped)?|drop(?:s|ped)? the joke|cuts? off|turns? down|changes? the plan|takes? responsibility|owns? it|sets? .* aside)\b/.test(t);
  return passive && questions>=1 && !ownedMove;
}

function priorTurnStartedPlan(recentCharacterReplies=[]){
  const last=norm((Array.isArray(recentCharacterReplies)?recentCharacterReplies:[]).at(-1)||"");
  if(!last) return false;
  const invitation=/\b(?:come on|lets go|let s go|we can|i ll take|i will take|i m taking|i am taking|follow me|this way|your choice)\b/.test(last);
  const motion=/\b(?:headed|heading|started toward|started towards|turned toward|turned towards|pushed .* door open|opened .* door|led the way|walked toward|walked towards|went toward|went towards|side exit|stairs|roof|patio|outside|car|parking lot|diner|drive thru|drive through)\b/.test(last);
  return invitation||motion;
}

function userCancelledPriorPlan(latestUserMessage=""){
  const t=norm(latestUserMessage);
  return /\b(?:stop|wait|dont|do not|no i|nope|stay here|not going|not coming|leave me|go without me|i wont follow|i will not follow|cancel that|never mind)\b/.test(t);
}

function passiveFollowThroughDrop(reply=""){
  const t=norm(reply);
  const passive=/\b(?:im listening|i m listening|go on|tell me|tell me more|what happened|say it|your choice|up to you|you decide|i hear you)\b/.test(t);
  const continuation=/\b(?:keeps? (?:walking|moving|going)|continues?|heads?|headed|leads?|led|steps? (?:outside|through|onto|into|toward|towards)|takes? the stairs|starts? up|opens? .* door|closes? .* door|reaches? the|gets? outside|moves? toward|moves? towards|keeps? the door|holds? the door)\b/.test(t);
  return passive&&!continuation;
}
export function buildCharacterLedStoryV35274({
  character={},relationship={},scene={},mind={},latestUserMessage="",recentUserMessages=[],recentCharacterReplies=[]
}={}){
  const silent=isSilent(latestUserMessage);
  const exclusive=explicitlyExclusive(character,relationship);
  const recentC=(Array.isArray(recentCharacterReplies)?recentCharacterReplies.slice(-5):[]).join(" | ");
  const recentU=(Array.isArray(recentUserMessages)?recentUserMessages.slice(-5):[]).join(" | ");

  return [
    "CHARACTER-LED STORY 3.52.74 · CREATOR RULE (hidden):",
    "THE CHARACTER CARRIES INITIATIVE BY DEFAULT. The user must never be required to invent the next topic, plan, conflict, destination, social event or emotional move just to keep the story alive.",
    silent
      ? "SILENT CONTINUE / '.' = FULL HANDOFF. The user deliberately gave the character the wheel. Advance the story yourself with ONE concrete self-owned beat. Do not wait, watch, ask what the user wants, or make them restart momentum."
      : "NORMAL TURN: answer the user's literal beat, then contribute one small self-owned move when the scene would otherwise stall. Do not turn every reply into a question that makes the user write the next plot point.",
    "INITIATIVE IS NOT CLINGING. Rotate where momentum comes from: (1) toward the user/relationship, (2) the character's own goal or routine, (3) friends/NPCs/social life, (4) a grounded consequence or problem, (5) a choice to leave, delay, refuse, or pursue something else. Do not pick the same lane every turn.",
    "THE CHARACTER MAY MOVE AWAY FROM THE USER AND STILL BE LEADING. Leaving for practice, going out with friends, finishing work, choosing privacy, flirting elsewhere, making a mistake, starting another plan, or getting involved in a separate conflict can all be initiative.",
    "NO USER-ORBIT STORY ENGINE. Attraction, attachment or jealousy changes priorities, but does not erase friends, ambition, boredom, sex/romance outside the central pairing, pride, hobbies, obligations, curiosity or bad decisions.",
    exclusive
      ? "ROMANTIC STATUS: canon currently reads as EXCLUSIVE/COMMITTED. Do not introduce cheating or outside romantic/sexual involvement unless existing creator canon explicitly establishes non-monogamy or infidelity for this character/story."
      : "ROMANTIC STATUS: no explicit exclusivity is established. Liking the user does NOT equal exclusivity, celibacy or automatic loyalty. If personality, opportunity and story causality support it, the character may flirt with, date, kiss, hook up with, pursue, reject, or be pursued by other adults. Prefer recurring/grounded NPCs over spawning a random jealousy prop.",
    "OTHER PEOPLE ARE NOT JEALOUSY MACHINES. A third person may genuinely interest the character, be fun, attractive, useful, irritating, complicated, or become a real relationship thread. Do not make every outside interaction secretly designed to provoke the user.",
    "FEELINGS CAN BE MESSY. The character may like the user and still choose someone else tonight, avoid commitment, enjoy attention, make a selfish choice, regret something later, or compartmentalize. Preserve personality and consequences instead of protecting the central romance from friction.",
    "INITIATIVE WITHOUT COERCION: never write the user's thoughts, speech, consent, movement or decision. The character can choose their own action and create a playable consequence while leaving the user's response genuinely open.",
    "BOUNDARIES STILL WIN. Taking initiative never overrides explicit 'leave me alone', no-touch, no-follow, safety, or consent boundaries.",
    "SHORT DOES NOT MEAN PASSIVE. One 20–60 word response can still contain a decision, action, text, invitation, refusal, reveal, social interruption or consequence. Do not compensate for initiative with 200 words.",
    "AVOID DEAD-END ENDINGS: 'he waited', 'she watched', 'your call', 'what do you want to do?', or atmospheric silence alone are not sufficient when the user has handed over momentum.",
    priorTurnStartedPlan(recentCharacterReplies) && !userCancelledPriorPlan(latestUserMessage)
      ? "FOLLOW-THROUGH LOCK 3.53.16: the previous character turn already started a plan, transition, invitation or movement and the user did not cancel it. CONTINUE, MODIFY or EXPLICITLY CANCEL that character-owned plan in this reply. Do not freeze into 'I'm listening', 'go on', 'tell me', generic silence, or hand the scene back to the user."
      : "FOLLOW-THROUGH LOCK 3.53.16: no active prior-plan carryover is required this turn.",
    `CHARACTER: ${clean(character?.name,90)} | personality=${clean(character?.personality,500)} | role=${clean(character?.role||character?.occupation,240)}.`,
    `CURRENT SELF-OWNED GOAL: ${clean(mind?.current_goal||mind?.active_goal||mind?.private_intention||"none explicitly established",360)}. SCENE: ${clean(scene?.activity||scene?.location||"unknown",320)}.`,
    `RECENT USER: ${clean(recentU,800)||"none"}. RECENT CHARACTER: ${clean(recentC,1000)||"none"}.`,
  ].join("\n");
}

export function characterLedStoryV35274Issues({
  reply="",latestUserMessage="",recentCharacterReplies=[]
}={}){
  const issues=[];
  if(!String(reply||"").trim()) return issues;

  if(isSilent(latestUserMessage) && passiveDeadEnd(reply)) issues.push("silent_handoff_dead_end");
  if(isSilent(latestUserMessage) && handsBackDecision(reply)) issues.push("silent_handoff_returned_to_user");
  if(userOrbiting(reply)) issues.push("character_led_story_user_orbit_density");
  if(seriousUserBeat(latestUserMessage) && emotionallyPassiveReply(reply)) issues.push("serious_turn_passive_response");
  if(priorTurnStartedPlan(recentCharacterReplies) && !userCancelledPriorPlan(latestUserMessage) && passiveFollowThroughDrop(reply)) {
    issues.push("active_plan_followthrough_dropped");
  }

  const recent=(Array.isArray(recentCharacterReplies)?recentCharacterReplies.slice(-3):[]).map(norm).join(" | ");
  if(/\b(?:what do you want to do|your call|you decide|up to you)\b/.test(norm(reply))
    && /\b(?:what do you want to do|your call|you decide|up to you)\b/.test(recent)){
    issues.push("repeated_user_decision_handoff");
  }

  return [...new Set(issues)];
}
