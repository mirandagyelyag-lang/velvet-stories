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

function threadKind(thread){
  const t=norm(typeof thread==="string"?thread:JSON.stringify(thread||{}));
  if(/\b(?:promise|promised|owe|owed|commitment|deadline|appointment|reservation|plan)\b/.test(t)) return "promise_or_plan";
  if(/\b(?:secret|lied|lie|hidden|truth|confession|doesn'?t know|does not know)\b/.test(t)) return "secret_or_information";
  if(/\b(?:fight|argument|conflict|hurt|betray|resent|angry|repair|apology|boundary|refus)\b/.test(t)) return "active_conflict";
  if(/\b(?:kiss|date|jealous|crush|romantic|attraction|relationship|feelings|ex|rival)\b/.test(t)) return "relationship_pressure";
  if(/\b(?:friend|brother|sister|roommate|family|npc|marcus|jules|juliette)\b/.test(t)) return "important_person";
  return "detail";
}
function threadLabel(thread){
  if(typeof thread==="string") return clean(thread,260);
  const x=thread||{};
  return clean(x.title||x.label||x.summary||x.description||x.effect||x.cause||JSON.stringify(x),260);
}
function threadPriority(thread){
  const base={active_conflict:6,promise_or_plan:5,secret_or_information:5,relationship_pressure:4,important_person:3,detail:1}[threadKind(thread)]||1;
  const raw=norm(typeof thread==="string"?thread:JSON.stringify(thread||{}));
  const status=norm(typeof thread==="string"?"active":thread?.status||"active");
  if(/\b(?:resolved|closed|complete|completed|cancelled|canceled)\b/.test(status)) return -10;
  let score=base;
  if(/\b(?:urgent|due|today|tonight|now|deadline|waiting|promised)\b/.test(raw)) score+=2;
  const weight=Number(thread?.weight||thread?.priority||0);
  if(Number.isFinite(weight)) score+=Math.max(0,Math.min(3,weight));
  return score;
}
function tokenSet(v=""){
  return new Set(norm(v).split(/\s+/).filter((w)=>w.length>=5 && !/^(?:about|there|their|which|would|could|should|because|character|status|active|thread|unresolved|scene|story)$/.test(w)));
}
function overlap(a="",b=""){
  const A=tokenSet(a),B=tokenSet(b);
  if(!A.size||!B.size) return 0;
  let hit=0; for(const w of A) if(B.has(w)) hit++;
  return hit/Math.min(A.size,B.size);
}
function mentionsThread(text="",thread){ return overlap(text,threadLabel(thread))>=0.18; }
function recentThreadDistance(thread,recentCharacterReplies=[]){
  const recent=arr(recentCharacterReplies).slice(-6);
  for(let i=recent.length-1,d=0;i>=0;i--,d++) if(mentionsThread(recent[i],thread)) return d;
  return 99;
}
function prioritizeThreads(unresolvedThreads=[],recentCharacterReplies=[]){
  return arr(unresolvedThreads).map((thread,index)=>{
    const kind=threadKind(thread);
    const distance=recentThreadDistance(thread,recentCharacterReplies);
    let score=threadPriority(thread);
    if(distance===0) score-=4;
    else if(distance===1) score-=2;
    else if(distance>=3 && score>=4) score+=1;
    return {index,kind,distance,score,label:threadLabel(thread),thread};
  }).filter((x)=>x.score>0).sort((a,b)=>b.score-a.score || b.distance-a.distance);
}
function sceneObjective(scene={},latestUserMessage="",recentCharacterReplies=[]){
  const explicit=clean(scene?.objective||scene?.goal||scene?.pending||scene?.purpose||scene?.active_problem||scene?.scene_objective||"",320);
  if(explicit) return explicit;
  const live=norm(arr(recentCharacterReplies).slice(-3).join(" | ")+" | "+latestUserMessage);
  if(/\b(?:argue|fight|angry|hurt|apolog|sorry|leave me|go away|boundary)\b/.test(live)) return "change the live conflict state through repair, refusal, consequence, or a clearer boundary";
  if(/\b(?:jealous|flirt|date|kiss|crush|attention|rival)\b/.test(live)) return "make the current relationship pressure produce one observable choice or consequence";
  if(/\b(?:plan|going to|lets go|let's go|come with|follow|appointment|deadline|promised)\b/.test(live)) return "complete, alter, or meaningfully complicate the active plan";
  return "change one social, emotional, or practical state without inventing the user's agency";
}
function characterWant(character={},scene={}){
  return clean(character?.goal||character?.goals||character?.motivation||character?.drive||scene?.character_goal||scene?.character_want||"",320)
    || "act according to the character's established priorities and personality";
}
function narrativeSkeleton(v=""){
  const t=norm(v);
  if(/\b(?:spots?|sees?|notices?) (?:you|her|him).*\b(?:crosses?|walks?|comes?|heads?) (?:over|toward|towards)\b/.test(t)) return "spot_and_cross_over";
  if(/\b(?:keys?|car|drive|ride|parking).*\b(?:come on|lets go|let's go|follow me|come with me)\b/.test(t)) return "transit_invitation";
  if(/\b(?:phone|cup|coffee|door|bag|keys?|bottle)\b/.test(t) && /\b(?:grin|smirk|joke|tease|quip|shrug|glance)\b/.test(t)) return "prop_plus_banter";
  if((String(v||"").match(/\?/g)||[]).length>=2 && !storyChange(v)) return "question_loop";
  if(/\b(?:just then|suddenly|someone|friend|roommate|classmate).*\b(?:walked over|called|texted|interrupted|appeared)\b/.test(t)) return "npc_interruption";
  if(/\b(?:admit|reveal|confess|tell(?:s|ing)? .* that)\b/.test(t)) return "reveal";
  if(/\b(?:refus|confront|challenge|argue|sets? a boundary|walks? away)\b/.test(t)) return "confront_or_refuse";
  if(storyChange(v)) return "decision_or_change";
  return "low_signal";
}
function repeatedSkeleton(reply="",recentCharacterReplies=[]){
  const current=narrativeSkeleton(reply);
  if(current==="low_signal") return false;
  return arr(recentCharacterReplies).slice(-5).map(narrativeSkeleton).filter((x)=>x===current).length>=2;
}
function decorativeCallback(reply="",unresolvedThreads=[]){
  const t=norm(reply);
  if(!/\b(?:remember when|remember that|you remember|as you remember|back when|like before|again,? like last time)\b/.test(t)) return false;
  const touches=arr(unresolvedThreads).some((thread)=>mentionsThread(reply,thread));
  return !touches || !storyChange(reply);
}
function purposeFor({scene={},latestUserMessage="",unresolvedThreads=[],recentCharacterReplies=[],character={}}={}){
  const ranked=prioritizeThreads(unresolvedThreads,recentCharacterReplies);
  const objective=sceneObjective(scene,latestUserMessage,recentCharacterReplies);
  const want=characterWant(character,scene);
  const top=ranked[0];
  if(top && top.score>=6 && top.distance>=2) return `advance or pay off "${top.label}" while serving the current scene objective`;
  if(top && top.score>=4 && top.distance>=3) return `let the dormant thread "${top.label}" affect a present choice without hijacking the scene`;
  return `serve the scene objective through a choice consistent with the character's want: ${want}`;
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
  const rankedThreads=prioritizeThreads(unresolvedThreads,recentCharacterReplies).slice(0,4);
  const objective=sceneObjective(scene,latestUserMessage,recentCharacterReplies);
  const want=characterWant(character,scene);
  const purpose=purposeFor({scene,latestUserMessage,unresolvedThreads,recentCharacterReplies,character});
  const skeletons=arr(recentCharacterReplies).slice(-5).map(narrativeSkeleton);
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
    "7) THREAD PRIORITY: active conflict, promises/plans and secrets outrank decorative details. Relationship pressure and important people matter when causally live. Resolved threads stay dead.",
    `PRIORITIZED THREADS: ${rankedThreads.length?rankedThreads.map((x)=>"["+x.kind+"|priority="+x.score+"|last_seen="+(x.distance>=99?"not_recent":x.distance+" turns ago")+"] "+x.label).join(" || "):"none"}.`,
    "8) PAYOFF TIMING: do not boomerang the same thread every turn. A just-foregrounded thread should breathe unless urgent. Dormant high-priority threads may return after several beats when the current scene gives them a natural entry point.",
    "9) CALLBACK QUALITY: never use 'remember when...' as decorative nostalgia. A callback must change a present decision, access, trust, plan, expectation, consequence, or relationship dynamic.",
    `10) SCENE OBJECTIVE: ${objective}.`,
    `11) CHARACTER WANT: ${want}. CHARACTER WANT != SCENE WANT. The character may resist, refuse, delay, protect pride or pursue a competing goal, but that friction still has to change the live situation.`,
    "12) NARRATIVE ECHO FIREWALL: do not repeat the same structural skeleton with different nouns. Especially avoid spot-user -> cross-room -> quip -> invitation, keys/car -> move elsewhere, prop+banter, question loops, and convenient NPC interruptions.",
    `RECENT STORY SKELETONS: ${skeletons.join(" -> ")||"none"}.`,
    `WHY THIS TURN EXISTS: ${purpose}.`,
    "TURN PURPOSE TEST: silently complete 'This turn exists to ____.' If the answer is only keep talking, maintain the vibe, show chemistry, move them somewhere, or fill the beat, rewrite. One clear purpose is enough; do not cram five developments into one turn.",
    "HUMAN CONSEQUENCES 3.53.38: preserve believable imperfect judgment, limited knowledge, delayed emotional understanding, different emotional timing between people, realistic aftermath, quiet payoffs, and specific behavior changes caused by prior events.",
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
  if(repeatedSkeleton(t,recentCharacterReplies)) {
    issues.push("narrative_skeleton_echo");
    issues.push("conversation_not_converted_to_event");
  }
  if(decorativeCallback(t,unresolvedThreads)) {
    issues.push("decorative_callback_without_payoff");
    issues.push("fresh_hook_ignored_unresolved_thread");
  }
  if(/\b(?:kept walking|kept driving|kept going|gave a small nod|gave a short nod|said nothing|let the silence|waited|watched)\b/.test(norm(t)) && !storyChange(t)) {
    issues.push("turn_without_clear_purpose");
    issues.push("scene_lifecycle_overstayed");
  }
  return [...new Set(issues)];
}

export const __testV35334={
  storyChange,locationChange,conversationHeavy,sceneSaturation,eventSignal,replyTouchesThread,ladderFor,
  threadKind,threadPriority,prioritizeThreads,sceneObjective,characterWant,narrativeSkeleton,repeatedSkeleton,decorativeCallback,purposeFor
};
