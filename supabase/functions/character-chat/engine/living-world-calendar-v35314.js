// Velvet Stories 3.53.14
// Living World + Story Calendar: keeps the social world moving without stealing user agency.

const clean=(v="",n=900)=>String(v??"").replace(/\s+/g," ").trim().slice(0,n);
const list=v=>Array.isArray(v)?v:[];
const norm=(v="")=>clean(v,12000).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();
const uniq=xs=>[...new Set(xs.filter(Boolean))];

function itemText(v){
  if(typeof v==="string") return clean(v,700);
  if(!v||typeof v!=="object") return "";
  return clean(v.title||v.name||v.summary||v.description||v.content||v.goal||v.plan||v.label||v.event||"",700);
}
function status(v){
  return clean(v?.status||v?.state||v?.stage||v?.resolution_status||"",80).toLowerCase();
}
function activeRows(rows=[],limit=8){
  return list(rows).filter(x=>!/(?:done|complete|completed|resolved|cancelled|canceled|closed|expired)/.test(status(x))).slice(0,limit);
}
function namedCast(cast=[]){
  return activeRows(cast,20).map(x=>clean(x?.name,90)).filter(Boolean);
}
function compactRows(rows=[],limit=8){
  return activeRows(rows,limit).map(x=>{
    const bits=[
      itemText(x),
      clean(x?.when||x?.time_label||x?.starts_at||x?.scheduled_for||x?.date,100),
      clean(x?.current_dynamic||x?.goals||x?.knowledge||x?.consequence||x?.next_step,240)
    ].filter(Boolean);
    return bits.join(" | ");
  }).filter(Boolean);
}
function romanceDensity(recent=[]){
  const t=norm(list(recent).slice(-8).join(" "));
  const romantic=(t.match(/\b(?:kiss|jealous|love|attraction|flirt|date|boyfriend|girlfriend|want you|miss you|touch|close to|celos|bes|amor|atraccion|coquete|cita|novio|novia|te quiero|te extrano|toc|cerca)\w*\b/g)||[]).length;
  const external=(t.match(/\b(?:work|class|exam|friend|family|job|meeting|party|concert|trip|deadline|project|practice|shift|trabajo|clase|examen|amig|familia|reunion|fiesta|concierto|viaje|proyecto|turno)\w*\b/g)||[]).length;
  return romantic>=4 && romantic>external*2;
}
function inventedKnowledge(reply="",knownNames=[]){
  const allowed=new Set(knownNames.map(norm));
  const speakers=[...String(reply||"").matchAll(/(?:^|\n)\s*([A-Z][a-z]{2,})\s*:/g)].map(m=>m[1]);
  return speakers.some(n=>!allowed.has(norm(n)));
}
function rumorLanguage(v=""){
  return /\b(?:heard|heard that|someone said|told me|apparently|word got around|rumor|rumour|found out|me conto|me contó|dicen que|alguien dijo|aparentemente|rumor|se entero|se enteró)\b/.test(norm(v));
}
function groundedInfoSource(v=""){
  return /\b(?:saw|watched|heard from|told by|message from|because .* said|because .* told|vio|vieron|escucho de|escuchó de|le dijo|mensaje de|porque .* dijo|porque .* conto|porque .* contó)\b/.test(norm(v));
}
function returnWithoutHook(v=""){
  const t=norm(v);
  const returned=/\b(?:came back|returned|showed up again|appeared again|was back|volvio|volvió|regreso|regresó|aparecio de nuevo|apareció de nuevo)\b/.test(t);
  const hook=/\b(?:because|after|to tell|to ask|forgot|promised|needed|invited|called|texted|because of|porque|despues|después|para decir|para preguntar|olvido|olvidó|prometio|prometió|necesit|invito|invitó|llamo|llamó|mensaje)\b/.test(t);
  return returned&&!hook;
}
function groupTunnel(v="",knownNames=[]){
  const t=norm(v);
  if(knownNames.length<2) return false;
  const group=/\b(?:everyone|everybody|all of them|the room|the group|todos|todas|todo el mundo|el grupo)\b/.test(t);
  const coupleFocus=/\b(?:looked at them|looked at you two|watched them|noticed the tension|could tell|miraron|los miraron|las miraron|notaron la tension|notaron la tensión)\b/.test(t);
  return group&&coupleFocus;
}
function offscreenSeed(rows=[]){
  const candidates=compactRows(rows,12);
  return candidates[0]||"";
}

export function buildLivingWorldCalendarV35314({
  character={},latestUserMessage="",recentCharacterReplies=[],persistentCast=[],
  castConnections=[],calendarEvents=[],storyPlans=[],storyConsequences=[],storyConflicts=[],
  storyArcs=[],knowledgeLedger=[],unresolvedThreads=[],turnContract={}
}={}){
  const contractCalendar=turnContract?.calendarLifeSimulation||turnContract?.calendarLifeSimulationV3||{};
  const contractWorld=turnContract?.worldConsequencesCausalTimeline||{};
  const events=uniq([...compactRows(calendarEvents,8),...compactRows(contractCalendar?.events||contractCalendar?.upcomingEvents||[],6)]);
  const plans=compactRows(storyPlans,8);
  const consequences=uniq([...compactRows(storyConsequences,8),...compactRows(contractWorld?.activeChains||[],6)]);
  const conflicts=compactRows(storyConflicts,6);
  const arcs=compactRows(storyArcs,6);
  const threads=list(unresolvedThreads).slice(0,8).map(itemText).filter(Boolean);
  const cast=namedCast(persistentCast);
  const worldHeavy=romanceDensity(recentCharacterReplies);
  const nextSeed=offscreenSeed([...calendarEvents,...storyPlans,...storyConsequences,...storyConflicts,...storyArcs]);
  return [
    "LIVING WORLD + STORY CALENDAR 3.53.14 · WORLD CONTINUITY DIRECTOR:",
    `LEAD=${clean(character?.name,90)||"character"} | authorized cast=${cast.join(" | ")||"none"}.`,
    `ACTIVE CALENDAR=${events.join(" || ")||"none recorded"}.`,
    `ACTIVE PLANS=${plans.join(" || ")||"none recorded"}.`,
    `ACTIVE CONSEQUENCES=${consequences.join(" || ")||"none recorded"}.`,
    `ACTIVE SOCIAL/CONFLICT THREADS=${[...conflicts,...arcs,...threads].join(" || ")||"none recorded"}.`,
    `WORLD PRESSURE=${worldHeavy?"relationship has dominated recent beats; prefer a grounded external pressure when one naturally fits":"balanced; do not force an external interruption"}.`,
    `NEXT GROUNDED LIFE SEED=${nextSeed||"none; do not invent a scheduled event merely to fill space"}.`,
    "1) OFF-SCREEN LIFE: the lead and approved NPCs may continue established work, study, family, friendships, plans and obligations off-screen. Their return may carry consequences. Do not invent major occupations, relationships or commitments that contradict canon.",
    "2) PERSISTENT AGENDA: promises, invitations, deadlines, shifts, classes, trips, meetings and plans remain pending until fulfilled, changed or cancelled. A scene change does not erase them.",
    "3) NPC MEMORY CROSS-SCENE: approved NPCs may remember only what they personally witnessed, were told, or canonically learned. Their later choices can reflect that memory.",
    "4) INFORMATION FLOW: rumors and second-hand knowledge need a plausible source path. No social telepathy. If the source is unknown, keep the information uncertain instead of treating it as fact.",
    "5) GROUP CHEMISTRY: in group scenes, each relevant person keeps their own attention, alliances, goals and conversations. Do not make the whole room orbit the central pair or collectively notice romantic tension.",
    "6) INDEPENDENT DECISIONS: the lead can prioritize friends, obligations, work, fun, privacy or another existing commitment. This should emerge from their established life, not as arbitrary neglect designed to provoke the user.",
    "7) RETURN HOOKS: when someone leaves a scene, a later return needs a causal bridge: a promise, forgotten task, message, invitation, consequence, scheduled event, unfinished thread or new information.",
    "8) LIFE-BASED SCENE SEEDS: prefer new scenes that grow from existing plans, commitments, NPC goals, consequences and calendar items instead of generating romance/jealousy premises from scratch.",
    "9) LONG-TERM SOCIAL CONSEQUENCES: awkwardness, trust loss, loyalty, repaired conflict, broken promises and favors can persist across days/scenes until something changes them. Do not auto-reset social relationships.",
    "10) WORLD PRESSURE DETECTOR: if several consecutive beats are relationship-only, allow ONE coherent outside pressure from existing canon to enter. It must create choices, not hijack the story, and must not manufacture emergencies.",
    "STORY CALENDAR RULE: calendar is internal continuity, not a rigid railroad. Existing events create opportunities and constraints; the user still controls only their own choices.",
    "EVENT QUEUE OUTPUT: human_behavior_update.living_world_state may compactly retain pending lead obligations, approved-NPC pending threads, information-source paths, and the next grounded life seed. Never record invented user commitments or feelings.",
    `LATEST USER TURN=${clean(latestUserMessage,500)||"none"}.`
  ].join("\n");
}

export function livingWorldCalendarIssuesV35314({
  reply="",recentCharacterReplies=[],recentUserMessages=[],latestUserMessage="",persistentCast=[],calendarEvents=[],storyPlans=[],
  storyConsequences=[],storyConflicts=[],storyArcs=[],knowledgeLedger=[]
}={}){
  const issues=[];
  const names=namedCast(persistentCast);
  if(inventedKnowledge(reply,names)) issues.push("living_world_unapproved_speaker");
  if(rumorLanguage(reply)&&!groundedInfoSource(reply)&&!compactRows(knowledgeLedger,12).some(x=>norm(reply).includes(norm(x).slice(0,28)))) {
    issues.push("information_flow_source_missing");
  }
  if(groupTunnel(reply,names)) issues.push("group_scene_couple_tunnel_vision");
  if(returnWithoutHook(reply)) issues.push("return_without_causal_hook");
  // v3.54.22: A reply may create a new plan prospectively, but it cannot
  // pretend a shared plan/appointment already existed unless visible canon
  // or the structured calendar/plan state contains evidence for it.
  const presupposedPlan=/\b(?:are we still|weren['’]?t we|we were supposed to|we['’]?re supposed to|did you forget|you forgot|still meeting|still going to|still headed to)\b/i.test(reply);
  if(presupposedPlan){
    const groundedBlob=norm([
      ...compactRows(calendarEvents,20).map(itemText),
      ...compactRows(storyPlans,20).map(itemText),
      ...list(recentCharacterReplies).slice(-8),
      ...list(recentUserMessages).slice(-8),
      latestUserMessage,
    ].filter(Boolean).join(" | "));
    const replyWords=norm(reply).split(/\s+/).filter((w)=>w.length>=5 && !["still","meeting","going","supposed","forgot","forget"].includes(w));
    const overlap=replyWords.filter((w)=>groundedBlob.includes(w)).length;
    if(!groundedBlob || overlap<2) issues.push("invented_prior_shared_plan");
  }
  if(romanceDensity(recentCharacterReplies)){
    const grounded=[...calendarEvents,...storyPlans,...storyConsequences,...storyConflicts,...storyArcs].some(x=>itemText(x)&&norm(reply).includes(norm(itemText(x)).split(" ").slice(0,3).join(" ")));
    if(!grounded && /\b(?:randomly|suddenly|out of nowhere|de repente|sin razon|sin razón)\b/.test(norm(reply))) issues.push("world_pressure_random_invention");
  }
  return [...new Set(issues)];
}

export function instantStoryLivingWorldV35314({
  character={},persistentCast=[],calendarEvents=[],storyPlans=[],storyConsequences=[],storyArcs=[]
}={}){
  const seed=offscreenSeed([...calendarEvents,...storyPlans,...storyConsequences,...storyArcs]);
  const cast=namedCast(persistentCast);
  return [
    "LIVING WORLD OPENING 3.53.14:",
    `Existing life seed: ${seed||"none recorded"}.`,
    `Approved recurring people: ${cast.join(" | ")||"none"}.`,
    seed
      ? "When useful, let the opening grow from this existing commitment/consequence rather than inventing another generic romantic setup."
      : "No grounded calendar seed is available, so create an ordinary-life situation consistent with the character profile without pretending it was previously scheduled.",
    "The world must have a reason to exist beyond attraction: at least one person or circumstance should have an independent goal, obligation, plan or consequence.",
    "Do not make a group collectively watch, ship, tease or diagnose the central pair."
  ].join("\n");
}

export const __testV35314={romanceDensity,rumorLanguage,groundedInfoSource,returnWithoutHook,groupTunnel,compactRows,offscreenSeed};
