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
 const signals={
 relationship:[/\b(?:kiss(?:ed|ing)?|flirt(?:ed|ing)?|jealous|dont leave|do not leave|care about you|held your hand|touched your face)\b/g],
 social:[/\b(?:friends?|teammates?|roommates?|party|classmates?|crowd|group|someone (?:called|asked))\b/g],
 "self-life":[/\b(?:practice|training|lecture|shift|studying|study|project|assignment|work(?:ed|ing)?|cooking|sleep(?:ing)?)\b/g],
 consequence:[/\b(?:argument|fight|deadline|mistake|apologiz(?:ed|ing)|confront(?:ed|ing)|consequence|regret)\b/g],
 exit:[/\b(?:walked away|headed out|went back|refused|declined|ended the call|hung up|left the room)\b/g]
 };
 const scores=Object.entries(signals).map(([lane,patterns])=>[lane,patterns.reduce((n,p)=>n+[...t.matchAll(p)].length,0)]).sort((a,b)=>b[1]-a[1]);
 return scores[0]?.[1]>0 && scores[0][1]>scores[1]?.[1] ? scores[0][0] : "other";
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
  if(streak===1) authority="scene";
  else if(streak===2) authority="scene";
  else if(streak>=3) authority="scene";

  const authorityRule = streak===1
    ? "HANDOFF LEVEL 1 · CONTINUE THE LIVING SCENE: make meaningful forward progress. If the character has already left, follow their independent life, NPC encounter or established destination rather than resetting the user-facing scene. Keep the same time and location unless the character has already established a departure or an explicit time skip. Never just wait or ask the user what happens next."
    : streak===2
      ? "HANDOFF LEVEL 2 · ADVANCE THE SCENE: the user is intentionally observing. Resolve or alter one character-owned action, shift focus to the character's own life / NPCs / consequence, or let the character leave. Preserve the location and active interaction unless a transition was already established; never invent the user's action."
      : streak>=3
        ? "HANDOFF LEVEL 3+ · ADVANCE THE STORY: the user has repeatedly handed over narrative control. Keep the established location, cast, ongoing task, and timeline. Advance the character-owned situation with a meaningful action or consequence. Only follow the character elsewhere if their departure was already established; never relocate the user. Do not invent a new encounter or skip hours/days merely because the user sent dots."
        : "NORMAL TURN: keep initiative with the character whenever the scene would otherwise stall.";

  return [
    "AUTONOMOUS STORY FLOW 3.52.75 · CREATOR RULE (hidden):",
    `SILENT STREAK=${streak}. NARRATIVE AUTHORITY=${authority}.`,
    authorityRule,
    "USER AGENCY FIREWALL: narrative authority applies to the CHARACTER and the world, never to the user's unspoken choices. Do not write the user's dialogue, thoughts, consent, decisions, voluntary movement, romantic response, or agreement.",
    "SCENE-EXIT PRIORITY: when the last character turn establishes an exit, departure, closed conversation, or separate locations, do not snap back to the user, repeat the farewell, or reopen the same exchange. Follow the character to their next plausible action, obligation, private reflection, or NPC interaction. Do not manufacture a new location or time skip solely because the user is silent.",
    "OFFSCREEN POV: follow only what the viewpoint character can know, observe, remember, or privately think. NPCs have independent motives and dialogue; they must not exist solely to discuss or praise the user.",
    "TIME-SKIP DISCIPLINE: only when a time skip was already established or explicitly requested, preserve established chronology and relationships; do not silently move, speak for, or decide on behalf of the user. Establish the new time/place through action, not an exposition dump.",
    "CHARACTER-OWNED TRANSITIONS ARE ALLOWED: the character may take plausible actions within the active scene; a departure or new location must follow an established intention, obligation, or completed scene, not repeated dots alone.",
    "ALREADY-COMMITTED MOTION MAY COMPLETE: if both are already traveling toward an explicitly established destination, repeated handoff may allow arrival because the transit was already chosen. Do not replace the destination or invent a new one.",
    "DO NOT TELEPORT THE USER: if the character changes location independently, do not silently place the user there too. Reconnect later through a message/call/new encounter only when grounded.",
    "INITIATIVE VARIETY IS OPTIONAL: keep developing the active emotional or practical thread while it remains alive. Do not force a lane change or an exit to create variety.",
    `RECENT INITIATIVE LANES: ${lanes.length?lanes.join(" → "):"none"}. DOMINANT=${dominant}.`,
    dominant==="relationship"
      ? "RELATIONSHIP CONTINUITY: previous romantic turns do not require disengagement. Continue the live interaction with fresh action, dialogue, or consequences rather than repeating the same beat."
      : "Do not force romance into the foreground merely to prove initiative.",
    "ESCALATION MUST BE CAUSAL, NOT RANDOM. New developments grow from established people, plans, obligations, tensions, locations, prior mistakes, or plausible social opportunity. Do not spawn a crisis just because several dots were sent.",
    "REPEATED DOTS ARE NOT A REQUEST FOR REPETITION. Each additional handoff should move the current scene forward without resetting its location, characters, task, or dialogue.",
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

  const t=norm(reply);

  if(streak>=2 && /\b(?:waited|watched|stood there|sat there|stayed there|remained there|kept quiet|said nothing|didnt say anything|did not say anything)\b/.test(t)
    && !/\b(?:left|went|called|texted|joined|started|finished|decided|refused|headed|returned|confronted|flirted|kissed|argued|worked|studied|drove|ordered|planned)\b/.test(t)){
    issues.push("repeated_handoff_stalled");
  }

  if(streak>=2 && /\b(?:what do you want to do|your call|you decide|up to you|what now)\b/.test(t)){
    issues.push("repeated_handoff_returned_to_user");
  }

  return [...new Set(issues)];
}

export { silentStreak as autonomousSilentStreakV35275 };
