// Velvet Stories v3.53.34 · Narrative Director
// One coordinated director for scene lifecycle, event conversion, unresolved threads,
// character-specific escalation, grounded voice, and story-vs-location change.

const clean=(v="",n=12000)=>String(v??"").replace(/\s+/g," ").trim().slice(0,n);
const norm=(v="")=>clean(v).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[’‘]/g,"'");
const arr=(v)=>Array.isArray(v)?v:[];
const words=(v="")=>norm(v).split(/\s+/).filter(Boolean);

function dialogueWords(v=""){
  return [...String(v||"").matchAll(/[“"]([^”"]+)[”"]/g)]
    .flatMap((m)=>words(m[1])).length;
}
function totalWords(v=""){ return words(v).length; }

function storyChange(v=""){
  const t=norm(v);
  return /\b(?:decid(?:e|es|ed|ing)|refus(?:e|es|ed|ing)|reveal(?:s|ed|ing)?|admit(?:s|ted|ting)?|confess(?:es|ed|ing)?|confront(?:s|ed|ing)?|invite(?:s|d|ing)?|cancel(?:s|led|ing)?|promise(?:s|d|ing)?|apolog(?:ize|ized|izes|izing)|choose|chooses|chose|changing the plan|changes the plan|changed the plan|instead|tells? (?:you|him|her|them) (?:that|about)|asks? (?:you|him|her|them) (?:why|whether|about|what happened)|sets? a boundary|turns? (?:him|her|them) down|makes? (?:him|her|them) leave|joins? the conversation|answers? for|takes? responsibility|creates? a consequence|missed deadline|gets? caught|is confronted|gets? confronted)\b/.test(t);
}
function locationChange(v=""){
  const t=norm(v);
  return /\b(?:arriv(?:e|ed|es|ing)|reached|pulled up|parked|went inside|walked inside|stepped inside|left the|headed to|headed toward|drove to|went to|crossed into|entered|exited|outside now|inside the|at the (?:cafe|coffee shop|diner|bar|club|dorm|house|apartment|car|parking lot|library|lecture hall))\b/.test(t);
}
function conversationHeavy(v=""){
  const tw=totalWords(v);
  if(!tw) return false;
  return dialogueWords(v)>=Math.max(12,Math.floor(tw*0.55)) && !storyChange(v);
}
function sceneSaturation(recentCharacterReplies=[]){
  const recent=arr(recentCharacterReplies).slice(-5);
  let talk=0, stagnant=0;
  for(const r of recent){
    if(conversationHeavy(r)) talk++;
    if(!storyChange(r)) stagnant++;
  }
  return {talk,stagnant,overripe:recent.length>=4 && talk>=3 && stagnant>=3};
}
function freshConvenientHook(v=""){
  return /\b(?:just then|right then|suddenly|out of nowhere|perfect timing|phone buzzed|phone rang|a message came in|someone called|someone appeared|someone walked over|the door opened)\b/.test(norm(v));
}
function threadText(unresolvedThreads=[]){
  return norm(arr(unresolvedThreads).map((x)=>typeof x==="string"?x:JSON.stringify(x)).join(" | "));
}
function replyTouchesThread(reply="",unresolvedThreads=[]){
  const rt=threadText(unresolvedThreads);
  if(!rt) return false;
  const tokens=[...new Set(rt.split(/\s+/).filter((w)=>w.length>=5 && !/^(?:about|there|their|which|would|could|should|because|character|status|active|thread|unresolved)$/.test(w)))].slice(0,60);
  const t=norm(reply);
  return tokens.some((token)=>t.includes(token));
}
function ladderFor(name=""){
  const n=norm(name);
  if(n==="rowan hayes") return "ROWAN: observation -> decision -> practical action -> uncomfortable truth. His familiarity can guide a scene, but do not turn him into a therapist or generic campus caretaker.";
  if(n==="chase beaumont") return "CHASE: provocation -> risk -> unexpected reaction -> real problem/consequence. Keep him electric and unpredictable; do not flatten him into nodding agreement.";
  if(n==="theo calloway") return "THEO: broad kindness -> specific attention -> other people notice/misread it -> a meaningful difference becomes visible. He is not a womanizer.";
  if(n==="nathan foster") return "NATHAN: distance -> shared circumstance -> protective/decisive choice -> tension created by access, loyalty or the brother connection.";
  if(n==="alexander bennett") return "ALEXANDER: notice hurt/conflict -> choose a side -> act reliably -> accept the cost of defending or repairing.";
  if(n==="damon blackwood") return "DAMON: restrained observation -> precise action -> silent prioritization -> consequence. Keep intensity behavioral, not explained.";
  if(n==="roman knox") return "ROMAN: friction -> concrete consequence -> danger/cost grounded in the rivalry -> a difficult choice. No random cinematic crisis.";
  if(n==="mateo silva") return "MATEO: notice distress -> reduce pressure -> concrete support -> stay present without turning care into generic therapy.";
  return "GENERIC LADDER: signal -> choice -> consequence -> changed relationship/problem/plan. Escalate through character-specific behavior, not louder prose.";
}
function eventSignal(v=""){
  const t=norm(v);
  return storyChange(v) || /\b(?:leaves?|calls?|texts?|books?|cancels?|shows? up|joins?|interrupts?|takes? over|turns? down|picks? a side|makes? a choice|changes? course|stops? the conversation|starts? the argument|ends? the argument|sets? the phone down|walks? away from (?:him|her|them)|invites? someone|refuses? to go)\b/.test(t);
}

export function deriveNarrativeDirectorStateV35334({recentCharacterReplies=[],unresolvedThreads=[]}={}){
  const saturation=sceneSaturation(recentCharacterReplies);
  return {
    ...saturation,
    unresolvedCount: arr(unresolvedThreads).length,
    needsEvent: saturation.talk>=2 && saturation.stagnant>=2,
  };
}

export function buildNarrativeDirectorV35334({
  character={},scene={},latestUserMessage="",recentCharacterReplies=[],unresolvedThreads=[]
}={}){
  const state=deriveNarrativeDirectorStateV35334({recentCharacterReplies,unresolvedThreads});
  const threads=clean(arr(unresolvedThreads).map((x)=>typeof x==="string"?x:JSON.stringify(x)).join(" | "),900);
  return [
    "NARRATIVE DIRECTOR 3.53.34 · SIX SYSTEMS, ONE DECISION:",
    `SCENE SATURATION: dialogue-heavy=${state.talk}/5; stagnant=${state.stagnant}/5; OVERRIPE=${state.overripe?"YES":"no"}; NEEDS_EVENT=${state.needsEvent?"YES":"no"}.`,
    "1) SCENE LIFE CYCLE: a scene has a job. Establish -> deepen -> turn -> resolve/transition. Do not keep a scene alive merely because characters can still trade lines. If its emotional/social/practical purpose has already paid off, close or transform it naturally.",
    "2) CONVERSATION -> EVENT: after roughly 2-3 dialogue-heavy turns without a meaningful change, convert the next useful beat into a character/world-owned event: a decision, refusal, reveal, consequence, changed plan, concrete action, social shift, obligation, or earned transition. Do NOT solve this with a random interruption.",
    state.overripe
      ? "SCENE IS OVERRIPE NOW: do not produce another conversational variation of the same beat. Transform the situation this turn while preserving user agency."
      : "SCENE STILL HAS ROOM: deepen the current live beat before changing scenery unless the scene objective is complete.",
    "3) UNRESOLVED THREAD MEMORY: prefer paying off or advancing an existing unresolved thread over spawning a shiny new hook. Bring old choices back through consequences, messages, plans, people or obligations only when canon supports them.",
    `UNRESOLVED THREADS: ${threads||"none supplied"}.`,
    "4) CHARACTER ESCALATION LADDER: advancement must look different for each lead. Do not use a universal romance template.",
    ladderFor(character?.name),
    "5) VOICE NEVER OVERRIDES REALITY: a witty, sarcastic, romantic or dramatic line is invalid if it requires inventing what the user is doing, feeling, wanting, remembering or usually does. The joke must be grounded in visible canon.",
    "6) LOCATION CHANGE != STORY CHANGE: track these separately. Walking, driving, arriving, entering a cafe/dorm/car, opening doors or changing rooms can happen, but they DO NOT count as advancement unless the social, emotional or practical state also changes.",
    "When a LOCATION changes, require a STORY change in the same beat or immediately earned consequence. Do not use scenery as a counterfeit plot point.",
    "When STORY changes without moving location, that is valid progression. Prefer this when a live beat can still deepen where it is.",
    `CURRENT SCENE: ${clean(scene?.location||scene?.activity||"unknown",260)}. LATEST USER: ${clean(latestUserMessage,380)||"none"}.`,
  ].join("\n");
}

export function narrativeDirectorIssuesV35334({
  reply="",recentCharacterReplies=[],unresolvedThreads=[]
}={}){
  const issues=[];
  const t=String(reply||"").trim();
  if(!t) return ["narrative_director_empty_reply"];
  const state=deriveNarrativeDirectorStateV35334({recentCharacterReplies,unresolvedThreads});
  const changed=storyChange(t);
  const moved=locationChange(t);

  if(moved && !changed) issues.push("location_change_without_story_change");
  if(state.overripe && !changed) issues.push("scene_lifecycle_overstayed");
  if(state.needsEvent && conversationHeavy(t) && !eventSignal(t)) issues.push("conversation_not_converted_to_event");
  if(arr(unresolvedThreads).length && freshConvenientHook(t) && !replyTouchesThread(t,unresolvedThreads)) {
    issues.push("fresh_hook_ignored_unresolved_thread");
  }
  return [...new Set(issues)];
}

export const __testV35334={
  storyChange,locationChange,conversationHeavy,sceneSaturation,eventSignal,replyTouchesThread,ladderFor
};
