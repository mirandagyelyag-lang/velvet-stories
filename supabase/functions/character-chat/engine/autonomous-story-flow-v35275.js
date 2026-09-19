// Velvet Stories v3.52.75 · Autonomous Story Flow
// Repeated "." / SILENT_CONTINUE progressively grants the character more narrative
// authority over THEIR side of the story while preserving the user's agency.

const clean=(v="",n=1400)=>String(v??"").replace(/\s+/g," ").trim().slice(0,n);
const norm=(v="")=>clean(v,16000).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[’']/g,"");

function isSilent(value=""){
  const raw=String(value||"").trim();
  return /^\[(?:SILENT_CONTINUE|RETURN_MAIN_POV)/.test(raw) || /^[.…。]+$/u.test(raw);
}

function silentStreak(latestUserMessage="",recentUserMessages=[]){
  const recent=(Array.isArray(recentUserMessages)?recentUserMessages:[]).map((x)=>String(x||"").trim());
  const seq=[...recent];
  if(!seq.length || seq.at(-1)!==String(latestUserMessage||"").trim()) seq.push(String(latestUserMessage||"").trim());
  let count=0;
  for(let i=seq.length-1;i>=0;i--){
    const item=seq[i];
    if(!item) continue;
    if(isSilent(item)){count+=1;continue;}
    break;
  }
  return Math.max(isSilent(latestUserMessage)?1:0,count);
}

function classifyLane(value=""){
  const t=norm(value);
  if(/\b(?:follow|caught up|wait|stay with|dont leave|do not leave|jealous|kiss|flirt|because its you|because it is you|care about you|looked at you|watched you|texted you|called you)\b/.test(t)) return "relationship";
  if(/\b(?:friend|friends|teammate|roommate|party|bar|club|marcus|jules|classmate|group|team|crowd|someone called|someone asked)\b/.test(t)) return "social";
  if(/\b(?:practice|training|class|lecture|work|shift|study|studying|gym|game|match|drive home|went home|sleep|shower|cook|ate|errand|project|assignment|meeting)\b/.test(t)) return "self-life";
  if(/\b(?:problem|argument|fight|late|missed|forgot|broke|broken|consequence|deadline|warning|called out|confronted|mess|mistake|regret|apologized)\b/.test(t)) return "consequence";
  if(/\b(?:left|walked away|headed out|went back|refused|declined|not now|later|turned down|ended the call|hung up)\b/.test(t)) return "exit";
  return "other";
}

function laneSummary(recentCharacterReplies=[]){
  const lanes=(Array.isArray(recentCharacterReplies)?recentCharacterReplies.slice(-5):[]).map(classifyLane);
  const counts={};
  for(const lane of lanes) counts[lane]=(counts[lane]||0)+1;
  const dominant=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0]||"none";
  return {lanes,dominant};
}

export function buildAutonomousStoryFlowV35275({
  character={},relationship={},scene={},mind={},latestUserMessage="",recentUserMessages=[],recentCharacterReplies=[]
}={}){
  const streak=silentStreak(latestUserMessage,recentUserMessages);
  const {lanes,dominant}=laneSummary(recentCharacterReplies);
  const silent=isSilent(latestUserMessage);

  let authority="normal";
  if(streak===1) authority="beat";
  else if(streak===2) authority="scene";
  else if(streak>=3) authority="story";

  const authorityRule = streak===1
    ? "HANDOFF LEVEL 1 · CONTINUE THE BEAT: make one concrete character-owned choice inside the current scene. Do not just wait, watch, or ask the user what happens next."
    : streak===2
      ? "HANDOFF LEVEL 2 · ADVANCE THE SCENE: the user is intentionally observing. Resolve or alter one character-owned action, shift focus to the character's own life / NPCs / consequence, or let the character leave. A modest time or location transition is allowed when it follows from already-established motion and does NOT invent the user's action."
      : streak>=3
        ? "HANDOFF LEVEL 3+ · ADVANCE THE STORY: the user has repeatedly handed over narrative control. You may close the current character-side scene, pass grounded time, follow the character elsewhere, begin a later character-owned situation, create a consequence from existing causes, or contact the user later. Do not remain trapped in the same room/argument merely because the user is silent."
        : "NORMAL TURN: keep initiative with the character whenever the scene would otherwise stall.";

  return [
    "AUTONOMOUS STORY FLOW 3.52.75 · CREATOR RULE (hidden):",
    `SILENT STREAK=${streak}. NARRATIVE AUTHORITY=${authority}.`,
    authorityRule,
    "USER AGENCY FIREWALL: narrative authority applies to the CHARACTER and the world, never to the user's unspoken choices. Do not write the user's dialogue, thoughts, consent, decisions, voluntary movement, romantic response, or agreement.",
    "CHARACTER-OWNED TRANSITIONS ARE ALLOWED: the character can leave, go to practice/work/home, meet friends, make a call, flirt elsewhere, start a task, sleep, wake later, deal with a problem, or begin another scene from their own side when causally grounded.",
    "ALREADY-COMMITTED MOTION MAY COMPLETE: if both are already traveling toward an explicitly established destination, repeated handoff may allow arrival because the transit was already chosen. Do not replace the destination or invent a new one.",
    "DO NOT TELEPORT THE USER: if the character changes location independently, do not silently place the user there too. Reconnect later through a message/call/new encounter only when grounded.",
    "ROTATE INITIATIVE LANES. Recent turns should not all use the same source of momentum. Prefer a grounded lane different from the recent dominant lane when possible: relationship / self-life / social-NPC / consequence-problem / exit-refusal.",
    `RECENT INITIATIVE LANES: ${lanes.length?lanes.join(" → "):"none"}. DOMINANT=${dominant}.`,
    dominant==="relationship"
      ? "ANTI-CLINGING CORRECTION: recent momentum already leaned relationship/user-facing. Prefer the character's own life, social world, consequence, or exit next unless the live conflict truly requires direct follow-through."
      : "Do not force romance into the foreground merely to prove initiative.",
    "ESCALATION MUST BE CAUSAL, NOT RANDOM. New developments grow from established people, plans, obligations, tensions, locations, prior mistakes, or plausible social opportunity. Do not spawn a crisis just because several dots were sent.",
    "REPEATED DOTS ARE NOT A REQUEST FOR REPETITION. Each additional handoff should widen or evolve the story, not produce another version of the same posture, pursuit, silence, or line.",
    "KEEP IT PLAYABLE: even when advancing time or changing the character's situation, end on a concrete state/consequence the user can react to whenever they feel like participating again.",
    `CHARACTER: ${clean(character?.name,100)} | personality=${clean(character?.personality,520)} | relationship=${clean(character?.relationship||relationship?.status||relationship?.stage,520)}.`,
    `SELF-OWNED GOAL: ${clean(mind?.current_goal||mind?.active_goal||mind?.private_intention||"none established",420)}. SCENE: ${clean(scene?.activity||scene?.location||"unknown",360)}.`,
  ].join("\n");
}

export function autonomousStoryFlowV35275Issues({
  reply="",latestUserMessage="",recentUserMessages=[],recentCharacterReplies=[]
}={}){
  const issues=[];
  const streak=silentStreak(latestUserMessage,recentUserMessages);
  if(streak<1 || !String(reply||"").trim()) return issues;

  const lane=classifyLane(reply);
  const {dominant}=laneSummary(recentCharacterReplies);
  const t=norm(reply);

  if(streak>=2 && /\b(?:waited|watched|stood there|sat there|stayed there|remained there|kept quiet|said nothing|didnt say anything|did not say anything)\b/.test(t)
    && !/\b(?:left|went|called|texted|joined|started|finished|decided|refused|headed|returned|confronted|flirted|kissed|argued|worked|studied|drove|ordered|planned)\b/.test(t)){
    issues.push("repeated_handoff_stalled");
  }

  if(streak>=3 && lane==="relationship" && dominant==="relationship"){
    issues.push("repeated_handoff_user_orbit");
  }

  if(streak>=2 && /\b(?:what do you want to do|your call|you decide|up to you|what now)\b/.test(t)){
    issues.push("repeated_handoff_returned_to_user");
  }

  return [...new Set(issues)];
}

export { silentStreak as autonomousSilentStreakV35275 };
