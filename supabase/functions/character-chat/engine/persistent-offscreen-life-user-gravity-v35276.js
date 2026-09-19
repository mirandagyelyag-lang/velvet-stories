// Velvet Stories v3.52.76 · Persistent Off-Screen Life + User Gravity
// The character's life continues without the user while important relationships
// retain believable emotional gravity. Importance is not the same as orbit.

import { autonomousSilentStreakV35275 } from "./autonomous-story-flow-v35275.js";

const clean=(v="",n=1400)=>String(v??"").replace(/\s+/g," ").trim().slice(0,n);
const norm=(v="")=>clean(v,16000).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[’']/g,"");
const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,Number(n)||0));

function relationshipText(character={},relationship={}){
  return norm([
    character?.relationship,
    relationship?.stage,
    relationship?.status,
    relationship?.relationship_phase,
    relationship?.current_dynamic,
    relationship?.relationship_signature,
  ].filter(Boolean).join(" | "));
}

function relationshipBonus(character={},relationship={}){
  const t=relationshipText(character,relationship);
  let bonus=0;
  if(/\b(?:crush|attracted|attraction|likes you|likes the user|into you|romantic tension|enemies to lovers|friends to lovers)\b/.test(t)) bonus=Math.max(bonus,16);
  if(/\b(?:dating|seeing each other|boyfriend|girlfriend|partners?|together|exclusive)\b/.test(t)) bonus=Math.max(bonus,28);
  if(/\b(?:in love|loves you|deeply in love|engaged|fiance|fiancee|married|husband|wife)\b/.test(t)) bonus=Math.max(bonus,42);
  return bonus;
}

function gravityScore(emotion={},character={},relationship={}){
  const attachment=clamp(emotion?.attachment);
  const attraction=clamp(emotion?.attraction);
  const longing=clamp(emotion?.longing);
  const fear=clamp(emotion?.fear_of_loss);
  const awareness=clamp(emotion?.awareness_of_feelings);
  const unresolved=clamp(emotion?.unresolved_intensity);
  const jealousy=clamp(emotion?.jealousy);
  const base=(attachment*.28)+(attraction*.24)+(longing*.14)+(fear*.10)+(awareness*.10)+(unresolved*.08)+(jealousy*.06);
  return clamp(base+relationshipBonus(character,relationship));
}

function gravityLevel(score=0){
  if(score>=78) return "anchored";
  if(score>=56) return "strong";
  if(score>=34) return "medium";
  if(score>=18) return "light";
  return "minimal";
}

function scenePresence(scene={},userName=""){
  const present=Array.isArray(scene?.present)?scene.present.map(norm).filter(Boolean):[];
  const user=norm(userName);
  if(!present.length || !user) return "unknown";
  return present.some((name)=>name===user || name.includes(user) || user.includes(name)) ? "present" : "absent";
}

function explicitNoContact(latestUserMessage="",recentUserMessages=[]){
  const t=norm([...(Array.isArray(recentUserMessages)?recentUserMessages.slice(-4):[]),latestUserMessage].join(" | "));
  return /\b(?:leave me alone|dont contact me|do not contact me|dont text me|do not text me|dont call me|do not call me|stay away|go away|never talk to me|no me hables|no me escribas|no me llames|dejame sola|dejame solo|vete|alejate)\b/.test(t);
}

function visibleUserGravity(value="",userName=""){
  const raw=String(value||"");
  const t=norm(raw);
  const name=norm(userName);
  const named=Boolean(name && t.includes(name));
  const direct=/\b(?:texted you|called you|messaged you|typed your|your name|your chat|your contact|almost texted|almost called|thought of you|reminded .* of you|because of you|missed you|misses you|wanted to text|wanted to call|checked .* phone|opened .* chat|deleted .* message|didnt text you|did not text you)\b/.test(t);
  return named || direct;
}

function recentGravityCount(recentCharacterReplies=[],userName=""){
  return (Array.isArray(recentCharacterReplies)?recentCharacterReplies.slice(-5):[])
    .filter((reply)=>visibleUserGravity(reply,userName)).length;
}

function persistedLifeSummary(behavior={}){
  return {
    life: clean(behavior?.offscreen_life_thread||behavior?.autonomous_plan||behavior?.between_scene_motion,520),
    social: clean(behavior?.offscreen_social_thread||behavior?.npc_active_thread||behavior?.npc_network_shift,520),
    gravity: clean(behavior?.user_gravity_residue||behavior?.emotional_continuity,520),
    last: clean(behavior?.user_gravity_last_manifestation,420),
    cadence: clean(behavior?.user_gravity_cadence,80),
  };
}

export function buildPersistentOffscreenLifeUserGravityV35276({
  character={},relationship={},scene={},mind={},behavior={},emotionState={},userName="",
  latestUserMessage="",recentUserMessages=[],recentCharacterReplies=[]
}={}){
  const score=gravityScore(emotionState,character,relationship);
  const level=gravityLevel(score);
  const presence=scenePresence(scene,userName);
  const streak=autonomousSilentStreakV35275(latestUserMessage,recentUserMessages);
  const noContact=explicitNoContact(latestUserMessage,recentUserMessages);
  const recentGravity=recentGravityCount(recentCharacterReplies,userName);
  const persisted=persistedLifeSummary(behavior);

  const cadence = level==="anchored"
    ? "The user may influence many private choices, but visible callbacks should still usually be separated by at least one independent beat."
    : level==="strong"
      ? "Keep the user emotionally relevant across absence; roughly one subtle manifestation every 1-3 independent beats is enough unless live conflict makes contact urgent."
      : level==="medium"
        ? "Let the user recur naturally every 2-4 independent beats when causally relevant. Do not force a callback into every off-screen scene."
        : level==="light"
          ? "The user matters, but no callback is due by default. Let relevance surface occasionally through real causes."
          : "Do not manufacture user-centered meaning. Let independent life dominate unless canon changes.";

  return [
    "PERSISTENT OFF-SCREEN LIFE + USER GRAVITY 3.52.76 · CREATOR RULE (hidden):",
    `USER PRESENCE=${presence}. SILENT HANDOFF STREAK=${streak}. USER GRAVITY=${level}. NO-CONTACT BOUNDARY=${noContact?"YES":"no"}. RECENT VISIBLE USER-GRAVITY BEATS=${recentGravity}.`,
    "CORE BALANCE: the character has a life that continues without the user, AND an important user remains emotionally real while absent. Neither side deletes the other.",
    "OFF-SCREEN LIFE PERSISTS: established friends, flirting, dates, teammates, work, classes, family, rivalries, routines, obligations, mistakes, promises, arguments and plans may continue across scenes. Reuse grounded people and threads instead of spawning disposable NPCs.",
    "OFF-SCREEN EVENTS MUST HAVE CAUSES. Advance only threads supported by visible canon, saved cast/NPC state, an established plan, role/routine, or a plausible continuation of something already happening. Do not fabricate a major relationship milestone, breakup, emergency or betrayal merely because time passed.",
    "USER GRAVITY IS BACKGROUND CAUSALITY, NOT CONSTANT SCREEN TIME. If the user matters to this character, that importance can alter attention, restraint, choices, timing, who they compare themselves to, whether they text, whether they deliberately do NOT text, what annoys them, what they regret, and what remains unfinished.",
    cadence,
    recentGravity>=2
      ? "ANTI-ORBIT CORRECTION: the user has already surfaced repeatedly in recent character turns. Give the character at least one genuinely independent beat before another visible callback unless an unresolved live conflict requires contact."
      : "Do not mention the user merely to prove they were remembered. A user-related beat should have a real trigger or consequence.",
    noContact
      ? "BOUNDARY: the user asked for distance/no contact. Preserve emotional gravity privately, but do NOT contact, follow, engineer encounters, or use friends to bypass the boundary. Missing someone is not permission."
      : "CONTACT IS A CHOICE, NOT A DUTY. The character may text/call/seek the user when personality + unresolved thread + timing support it, or may resist contact from pride, fear, distraction, another relationship, or simple choice.",
    "OTHER ROMANCE REMAINS REAL: liking the user does not make outside attraction fake. The character may genuinely enjoy, pursue or choose someone else when non-exclusive canon allows it. User gravity may complicate that choice, but must not automatically make every other person feel inferior or disposable.",
    "NO AUTOMATIC COMPARISON TROPE. Do not write 'she wasn't you' / 'nobody compares to you' every time another person appears. Sometimes the character is simply present with the other person. Sometimes the user intrudes emotionally. Vary it.",
    "CONSEQUENCES SURVIVE RE-ENTRY: if something meaningful happens in the character's independent life, carry its real residue into later scenes. A new friend stays known, a flirt can return, a promise remains pending, a mistake can create awkwardness, and a decision can change future behavior.",
    "DO NOT DUMP OFF-SCREEN SUMMARIES. Show one playable slice at a time. The user should discover the character's life through scenes, consequences, messages and changed behavior, not a report of everything that happened.",
    "USER-IMPORTANCE TARGET: let the story orbit the user A LITTLE when feelings are established, like gravity bending a path rather than a planet chained to one spot.",
    `PERSISTED OFF-SCREEN LIFE: ${persisted.life||"none yet"}. PERSISTED SOCIAL/ROMANTIC THREAD: ${persisted.social||"none yet"}. PERSISTED USER-GRAVITY RESIDUE: ${persisted.gravity||"none yet"}. LAST MANIFESTATION: ${persisted.last||"none recorded"}.`,
    `CHARACTER: ${clean(character?.name,100)} | personality=${clean(character?.personality,520)} | current goal=${clean(mind?.current_goal||mind?.active_goal||mind?.private_intention||"none established",420)}.`,
    "PERSISTENCE OUTPUT: when canon actually changes, human_behavior_update may update offscreen_life_thread, offscreen_social_thread, user_gravity_residue, user_gravity_last_manifestation and user_gravity_cadence. Do not update them with imagined events that were not shown or causally established.",
  ].join("\n");
}

export function persistentOffscreenLifeUserGravityV35276Issues({
  reply="",character={},relationship={},scene={},behavior={},emotionState={},userName="",
  latestUserMessage="",recentUserMessages=[],recentCharacterReplies=[]
}={}){
  const issues=[];
  if(!String(reply||"").trim()) return issues;

  const level=gravityLevel(gravityScore(emotionState,character,relationship));
  const presence=scenePresence(scene,userName);
  const noContact=explicitNoContact(latestUserMessage,recentUserMessages);
  const recentGravity=recentGravityCount(recentCharacterReplies,userName);
  const currentGravity=visibleUserGravity(reply,userName);

  if(presence==="absent" && currentGravity && recentGravity>=2){
    issues.push("offscreen_user_gravity_overused");
  }

  if(noContact && /\b(?:texted you|called you|messaged you|showed up|went after you|came to find you|sent .* friend|asked .* friend .* you)\b/.test(norm(reply))){
    issues.push("offscreen_no_contact_boundary_bypassed");
  }

  const streak=autonomousSilentStreakV35275(latestUserMessage,recentUserMessages);
  if(presence==="absent" && !noContact && streak>=3 && ["strong","anchored"].includes(level)
    && recentGravity===0 && !currentGravity
    && !clean(behavior?.user_gravity_last_manifestation,100)){
    issues.push("offscreen_user_gravity_at_risk_of_erasure");
  }

  return [...new Set(issues)];
}

export { gravityScore as userGravityScoreV35276, gravityLevel as userGravityLevelV35276 };
