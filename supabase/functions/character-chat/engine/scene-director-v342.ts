export type SceneDirectorThread342 = {
  id: string;
  source: "user" | "scene" | "calendar" | "consequence" | "conflict" | "arc" | "plan" | "npc" | "relationship";
  label: string;
  score: number;
  screenClass: "foreground" | "mention" | "background" | "dormant";
  reason: string;
  participants: string[];
};

export type SceneDirectorV342 = {
  scenePurpose: string;
  purposeBudget: number;
  direction: "continue" | "land" | "shift_small" | "surface_one_thread" | "quiet";
  candidateThreads: SceneDirectorThread342[];
  foregroundThreads: SceneDirectorThread342[];
  mentionThreads: SceneDirectorThread342[];
  backgroundThreads: SceneDirectorThread342[];
  dormantThreads: SceneDirectorThread342[];
  userMomentumLock: boolean;
  userMomentum: string;
  interruptionBudget: number;
  allowedEntrants: string[];
  foregroundActors: string[];
  backgroundActors: string[];
  maxActiveSpeakers: number;
  cooldownActive: boolean;
  cooldownReason: string;
  tensionMode: "cool" | "steady" | "rising" | "landing";
  romanceMonopolyGuard: boolean;
  noveltyAvoid: string[];
  naturalEndingAllowed: boolean;
  naturalEndingDue: boolean;
  sceneSelectionPolicy: string;
  interruptionPolicy: string;
  entryExitPolicy: string;
  attentionPolicy: string;
  pacingPolicy: string;
  romancePolicy: string;
  closurePolicy: string;
  instruction: string;
};

type Args = {
  character?: Record<string, any>;
  userName?: string;
  latestUserMessage?: string;
  recentMessages?: Array<Record<string, any>>;
  sceneState?: Record<string, any>;
  sceneIntelligence?: Record<string, any>;
  sceneVariety?: Record<string, any>;
  calendarLifeSimulation?: Record<string, any>;
  causalTimeline?: Record<string, any>;
  npcEcosystem?: Record<string, any>;
  relationshipChemistry?: Record<string, any>;
  activeArcs?: Array<Record<string, any>>;
  activeConflicts?: Array<Record<string, any>>;
  activePlans?: Array<Record<string, any>>;
};

const norm = (v: unknown) => String(v ?? "").toLowerCase().replace(/[’]/g, "'").replace(/\s+/g, " ").trim();
const clean = (v: unknown, n=280) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0,n);
const uniq = <T,>(xs:T[]) => [...new Set(xs.filter(Boolean))];
const arr = (v: unknown) => Array.isArray(v) ? v : [];

function content(m:any){ return clean(m?.content ?? m?.text ?? m?.message ?? "",900); }
function sender(m:any){ return norm(m?.sender ?? m?.role ?? ""); }
function tokenize(v:string){
  return uniq(norm(v).replace(/[^a-z0-9áéíóúñü\s]/gi," ").split(/\s+/).filter(x=>x.length>=4 && !["this","that","with","from","have","were","been","about","your","their","they","them","then","when","where","into","just","really","scene","active","current"].includes(x))).slice(0,12);
}
function overlapScore(a:string,b:string){
  const aa=tokenize(a), bb=new Set(tokenize(b));
  return aa.reduce((n,t)=>n+(bb.has(t)?1:0),0);
}
function participantsOf(row:any){
  const raw=row?.participants ?? row?.people ?? row?.cast ?? row?.characters ?? [];
  if(Array.isArray(raw)) return raw.map((x:any)=>clean(typeof x==="string"?x:(x?.name||x?.character_name||""),100)).filter(Boolean).slice(0,8);
  return String(raw||"").split(/[,|/]/).map(x=>clean(x,100)).filter(Boolean).slice(0,8);
}
function rowLabel(row:any){ return clean(row?.title || row?.name || row?.summary || row?.effect || row?.details || row?.goal || row?.thread || row?.description || "",260); }
function userHasMomentum(text=""){
  const t=norm(text);
  if(!t) return false;
  if(/\?\s*$/.test(text.trim())) return true;
  if(/\b(?:i (?:go|walk|leave|enter|sit|stand|take|grab|open|close|drive|head|start|finish|call|text|ask|tell|follow|turn|move|pay|order|study|work|run)|i'm (?:going|trying|looking|heading|leaving)|i am (?:going|trying|looking|heading|leaving)|we (?:go|leave|start|need|have to|should)|let's|lets)\b/.test(t)) return true;
  if(/\*[^*]*(?:walk|leave|enter|sit|stand|take|grab|open|close|drive|head|start|finish|turn|move|follow|pay|order)[^*]*\*/i.test(text)) return true;
  return false;
}
function momentumSummary(text=""){
  const outside=clean(String(text||"").replace(/\*([^*]+)\*/g,"$1"),220);
  return outside || "continue the user's visible current beat";
}
function recentIntensity(messages:Array<Record<string,any>>=[]){
  const rows=messages.slice(-8).map(content).join(" ");
  const hot=(rows.match(/\b(?:scream(?:ed|ing)?|yell(?:ed|ing)?|cry(?:ing|ied)?|tears?|breakup|broke up|kiss(?:ed|ing)?|confess(?:ed|ion)?|love you|hate you|slammed|punched|hit him|hit her|fight|fought|panic|emergency|hospital|bleeding|threat(?:ened|ening)?)\b/gi)||[]).length;
  return hot;
}
function latestIsHot(text=""){
  return /\b(?:scream|yell|cry|tears?|break up|kiss|confess|love you|hate you|slam|punch|fight|panic|emergency|hospital|bleed|threat)\b/i.test(text);
}
function relationBeatRequested(text=""){
  return /\b(?:like me|love me|kiss|date|jealous|relationship|us\b|feel about me|miss me|want me|crush|boyfriend|girlfriend|together)\b/i.test(text);
}
function addThread(rows:SceneDirectorThread342[], source:SceneDirectorThread342["source"], label:string, score:number, reason:string, participants:string[]=[]){
  const cleaned=clean(label,260);
  if(!cleaned) return;
  const key=norm(cleaned);
  if(rows.some(r=>norm(r.label)===key)) return;
  rows.push({id:`${source}:${rows.length+1}:${key.slice(0,40)}`,source,label:cleaned,score,screenClass:"dormant",reason:clean(reason,260),participants:uniq(participants.map(x=>clean(x,100))).slice(0,8)});
}
function deriveThreadClasses(threads:SceneDirectorThread342[], userMomentumLock:boolean){
  const sorted=[...threads].sort((a,b)=>b.score-a.score);
  let fg=0, mention=0;
  for(const t of sorted){
    if(t.source==="user") { t.screenClass="foreground"; fg++; continue; }
    if(!userMomentumLock && t.score>=8 && fg<2){ t.screenClass="foreground"; fg++; continue; }
    if(t.score>=6 && mention<2){ t.screenClass="mention"; mention++; continue; }
    if(t.score>=3){ t.screenClass="background"; continue; }
    t.screenClass="dormant";
  }
  if(userMomentumLock && fg>1){
    let kept=false;
    for(const t of sorted.filter(x=>x.screenClass==="foreground")){
      if(t.source==="user"&&!kept){kept=true;continue;}
      t.screenClass=t.score>=6?"mention":"background";
    }
  }
  // A large world must keep a real dormant queue instead of treating every live thread as camera-adjacent.
  const background=sorted.filter(x=>x.screenClass==="background");
  if(sorted.length>=7 && background.length>4){
    for(const t of background.slice(4)) t.screenClass="dormant";
  }
  return sorted;
}

export function deriveSceneDirectorV342(args:Args={}):SceneDirectorV342 {
  const latest=String(args.latestUserMessage||"");
  const latestNorm=norm(latest);
  const lead=clean(args.character?.name||"lead",100);
  const user=clean(args.userName||"user",100);
  const present=uniq(arr(args.sceneState?.present).map((x:any)=>clean(typeof x==="string"?x:(x?.name||""),100))).filter(Boolean);
  const userMomentumLock=userHasMomentum(latest);
  const threads:SceneDirectorThread342[]=[];
  addThread(threads,"user",momentumSummary(latest), userMomentumLock?12:8, userMomentumLock?"The user's visible action/question owns first screen priority.":"The latest user turn is the live scene anchor.",[user,lead]);

  const scenePurpose=clean(args.sceneIntelligence?.purpose || args.sceneState?.activity || "let the current interaction unfold naturally",360);
  if(scenePurpose && overlapScore(scenePurpose,latest)<2) addThread(threads,"scene",scenePurpose,5,"Existing scene purpose may continue quietly without becoming a new plot.",[lead,user]);

  const due=arr(args.calendarLifeSimulation?.dueCommitments).slice(0,6);
  for(const item of due){
    const label=clean(typeof item==="string"?item:(item?.title||item?.label||item?.details||""),260);
    addThread(threads,"calendar",label, userMomentumLock?6:9,"Due commitments have temporal relevance, but may only take screen time when they can causally affect this scene.",participantsOf(item));
  }
  for(const item of arr(args.causalTimeline?.activeChains).slice(0,7)){
    const label=clean(`${item?.title||"Consequence"}: ${item?.effect||""}`,300);
    const weight=Math.max(0,Math.min(5,Number(item?.weight||2)));
    addThread(threads,"consequence",label,5+weight+(overlapScore(label,latest)>=1?2:0),"Active fallout can surface when it changes the present beat; it does not automatically deserve a scene.",participantsOf(item));
  }
  for(const item of arr(args.activeConflicts).slice(0,6)){
    const label=rowLabel(item); addThread(threads,"conflict",label,5+(overlapScore(label,latest)>=1?3:0),"Unresolved conflict is eligible only when the current people/place/topic can actually touch it.",participantsOf(item));
  }
  for(const item of arr(args.activeArcs).slice(0,6)){
    const label=rowLabel(item); addThread(threads,"arc",label,4+(overlapScore(label,latest)>=1?3:0),"Arc pressure may remain dormant for many turns; relevance outranks plot hunger.",participantsOf(item));
  }
  for(const item of arr(args.activePlans).slice(0,6)){
    const label=rowLabel(item); addThread(threads,"plan",label,4+(overlapScore(label,latest)>=1?3:0),"Plans exist in the world without needing to interrupt every current scene.",participantsOf(item));
  }
  for(const item of arr(args.npcEcosystem?.activeNpcThreads).slice(0,7)){
    const label=clean(typeof item==="string"?item:(item?.title||item?.thread||item?.goal||""),260);
    addThread(threads,"npc",label,3+(overlapScore(label,latest)>=1?3:0),"NPC life continues in parallel; surface it only through a grounded point of contact.",participantsOf(item));
  }
  const chemistryRelevant=relationBeatRequested(latest) || /\b(?:date|romance|relationship|kiss|flirt|jealous|trust|repair|attraction)\b/i.test(scenePurpose);
  if(chemistryRelevant){
    const trajectory=clean(args.relationshipChemistry?.trajectory || args.relationshipChemistry?.relationshipTrajectory || args.relationshipChemistry?.currentDynamic || "relationship thread",240);
    addThread(threads,"relationship",trajectory,8,"Relationship chemistry is foreground only because the current turn/scene actually activates it.",[lead,user]);
  }

  const ranked=deriveThreadClasses(threads,userMomentumLock);
  const foregroundThreads=ranked.filter(t=>t.screenClass==="foreground").slice(0,2);
  const mentionThreads=ranked.filter(t=>t.screenClass==="mention").slice(0,2);
  const backgroundThreads=ranked.filter(t=>t.screenClass==="background").slice(0,6);
  const dormantThreads=ranked.filter(t=>t.screenClass==="dormant").slice(0,10);

  const recurrence=arr(args.npcEcosystem?.recurringCandidates).map((x:any)=>clean(typeof x==="string"?x:(x?.name||""),100)).filter(Boolean);
  const npcNodes=arr(args.npcEcosystem?.nodes);
  const busyNames=new Set(npcNodes.filter((n:any)=>/(?:class|work|busy|training|practice|travel|away|unavailable)/i.test(String(n?.availability||""))).map((n:any)=>norm(n?.name)).filter(Boolean));
  const availableNodes=npcNodes.filter((n:any)=>!busyNames.has(norm(n?.name))).map((n:any)=>clean(n?.name,100)).filter(Boolean);
  const allowedEntrants=uniq([...recurrence.filter(n=>!busyNames.has(norm(n))),...availableNodes]).filter(n=>!present.some(p=>norm(p)===norm(n))).slice(0,8);

  const presentActors=present.length?present:uniq([user,lead]);
  const maxFromGraph=Math.max(2,Math.min(3,Number(args.npcEcosystem?.groupTraffic?.maxActiveSpeakers||3)));
  const foregroundActors=uniq([lead,user,...presentActors.slice(0,Math.max(0,maxFromGraph-2))]).slice(0,maxFromGraph);
  const backgroundActors=presentActors.filter(p=>!foregroundActors.some(f=>norm(f)===norm(p))).slice(0,10);

  const hotCount=recentIntensity(args.recentMessages||[]);
  const cooldownActive=hotCount>=2 && !latestIsHot(latest);
  const cooldownReason=cooldownActive?"A recent high-intensity beat is still close enough that escalation should not be automatic.":"none";
  const closureDue=Boolean(args.sceneIntelligence?.closureDue);
  const closureAllowed=Boolean(args.sceneIntelligence?.closureAllowed);
  const phase=norm(args.sceneIntelligence?.phase||"");
  const naturalEndingDue=closureDue || phase==="close" || (phase==="land" && !userMomentumLock);
  const naturalEndingAllowed=closureAllowed || naturalEndingDue || phase==="land" || phase==="close";
  const progressionNeed=norm(args.sceneIntelligence?.progressionNeed||"none");
  const direction:SceneDirectorV342["direction"] = naturalEndingDue ? "land" : userMomentumLock ? "continue" : progressionNeed==="clear" && foregroundThreads.some(t=>t.source!=="user") ? "surface_one_thread" : progressionNeed==="small" ? "shift_small" : latestNorm==="."||latestNorm===".." ? "quiet" : "continue";
  const interruptionBudget = userMomentumLock || cooldownActive || naturalEndingDue ? 0 : (direction==="surface_one_thread" && foregroundThreads.some(t=>["calendar","npc","consequence","conflict"].includes(t.source)) ? 1 : 0);
  const romanceMonopolyGuard=!chemistryRelevant && !relationBeatRequested(latest);
  const noveltyAvoid=uniq([
    ...arr(args.sceneVariety?.avoidNext).map((x:any)=>clean(x,180)),
    ...arr(args.sceneVariety?.recentSignatures).slice(-3).map((x:any)=>clean(x,180)),
  ]).filter(Boolean).slice(0,7);
  const tensionMode:SceneDirectorV342["tensionMode"] = naturalEndingDue?"landing":cooldownActive?"cool":foregroundThreads.some(t=>t.source==="conflict"&&t.score>=8)?"rising":"steady";

  return {
    scenePurpose,
    purposeBudget:2,
    direction,
    candidateThreads:ranked.slice(0,18), foregroundThreads, mentionThreads, backgroundThreads, dormantThreads,
    userMomentumLock,
    userMomentum:momentumSummary(latest),
    interruptionBudget,
    allowedEntrants,
    foregroundActors,
    backgroundActors,
    maxActiveSpeakers:maxFromGraph,
    cooldownActive,
    cooldownReason,
    tensionMode,
    romanceMonopolyGuard,
    noveltyAvoid,
    naturalEndingAllowed,
    naturalEndingDue,
    sceneSelectionPolicy:"Events compete for screen time. Foreground at most two live purposes/threads, mention at most two more, and let the rest stay alive off-screen. Importance alone does not grant screen time; current causality, location, people, timing and the user's momentum decide.",
    interruptionPolicy: interruptionBudget>0 ? "At most ONE interruption may occur, and only from an already-grounded person/obligation/consequence that can physically and temporally reach this scene. No filler buzz, knock, stranger, rival or surprise message." : "No new interruption this turn. Continue the user's beat, current activity, silence or landing without spawning a phone buzz, knock, passerby, surprise NPC, new obligation or unrelated event.",
    entryExitPolicy:`Present people may leave when their established availability, obligation or choice gives them a reason. New entrants must be plausible now and come from the grounded recurring/available set when named. Allowed entrant candidates this turn: ${allowedEntrants.join(", ")||"none by default"}.`,
    attentionPolicy:`Group traffic is sparse. At most ${maxFromGraph} people should actively speak/drive this turn. Background actors may listen, continue their own activity, talk among themselves briefly, or do nothing; presence does not create a speaking quota.`,
    pacingPolicy:cooldownActive?"COOLDOWN ACTIVE: after recent intensity, prefer ordinary logistics, quieter dialogue, distance, humor, silence or a natural transition. Do not immediately stack another confession, fight, kiss, crisis or dramatic reveal unless the user explicitly creates it.":"Tension may rise only from existing pressure and visible choices. It may also stabilize, cool, divert or end; escalation is not mandatory.",
    romancePolicy:romanceMonopolyGuard?"Romance does not own the camera this turn. Do not convert neutral logistics, friendship, school/work, group life or ordinary silence into jealousy, possessiveness, a kiss, erotic micro-tension or relationship talk unless visible evidence/current user intent activates it.":"Relationship material may use screen time because the current scene actually activates it; still preserve other lives and do not erase unresolved non-romantic pressures.",
    closurePolicy:naturalEndingAllowed?"A clean ending is legal. If the beat lands, end without a teaser, ominous future sentence, sudden notification, arriving NPC or manufactured cliffhanger.":"Continue only as long as the current purpose/beat has real fuel; do not create a hook merely to prevent closure.",
    instruction:"SCENE DIRECTOR 3.42: choose what deserves the camera. Start with the user's visible momentum, rank existing threads by present relevance, put at most two in foreground, and let everything else remain background or dormant without deleting it from world state. Do not confuse world simulation with mandatory exposition. People can be present without speaking. Events can matter without appearing. New entrances/interruption need availability + location + motive + causal path. Strong scenes may cool down. Romance may stay out of frame. Natural endings need no cliffhanger. Never move or decide for the user to reach a preferred plot.",
  };
}

function threadHitCount(reply:string, threads:SceneDirectorThread342[]=[]){
  const r=norm(reply); let hits=0;
  for(const t of threads){
    const tokens=tokenize(t.label).filter(x=>x.length>=5).slice(0,5);
    if(tokens.length>=2 && tokens.filter(tok=>r.includes(tok)).length>=2) hits++;
    else if(tokens.length===1 && r.includes(tokens[0])) hits++;
  }
  return hits;
}
function dormantThreadHit(reply:string, threads:SceneDirectorThread342[]=[]){
  const r=norm(reply);
  return threads.some(t=>{
    const toks=tokenize(t.label).filter(x=>x.length>=5).slice(0,6);
    return toks.length>=2 && toks.filter(x=>r.includes(x)).length>=2;
  });
}
function interruptionCue(text:string){
  return /\b(?:phone (?:buzzed|vibrated|rang|lit up)|screen lit up|notification (?:appeared|popped up)|door (?:opened|swung open)|knock(?:ed|ing)? at the door|someone (?:walked|burst|came|stepped) in|someone called (?:his|her|their) name|a stranger (?:approached|appeared)|just then|suddenly)\b/i.test(text);
}
function cliffhangerCue(text:string){
  return /\b(?:little did (?:he|she|they|you) know|neither of (?:them|you) knew|everything was about to change|nothing would be the same|but (?:that|this) was only the beginning|what (?:he|she|they|you) didn'?t know|just then|suddenly|until a voice|until the door|until the phone)\b/i.test(text);
}
function romanceInjection(text:string){
  return /\b(?:jealous|possessive|mine\b|kiss(?:ed|ing)?|lips? (?:hovered|brushed)|sexual tension|wanted to kiss|couldn'?t stop looking at (?:her|him|you)|eyes? darkened|claim(?:ed|ing)? (?:her|him|you)|pulled (?:her|him|you) closer|hand (?:slid|settled) (?:on|around) (?:her|his|your) waist)\b/i.test(text);
}
function escalationSpike(text:string){
  return /\b(?:exploded|screamed|shouted|slammed (?:the|his|her)|punched|shoved|kissed (?:her|him|you)|confessed|i love you|i hate you|broke down sobbing|started a fight|threw a punch|stormed out)\b/i.test(text);
}
function activeSpeakerCount(reply:string, actors:string[]=[]){
  let n=0;
  for(const actor of actors){
    const first=clean(actor,100).split(/\s+/)[0]; if(!first) continue;
    const esc=first.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
    if(new RegExp(`(?:^|\\n|\\b)${esc}\\s*[:—-]|\\b${esc}\\s+(?:said|asked|replied|called|laughed|muttered|added|cut in)\\b`,`i`).test(reply)) n++;
  }
  return n;
}

export function sceneDirectorV342Issues({reply="",engine={} as Partial<SceneDirectorV342>,latestUserMessage=""}={}){
  const issues:string[]=[];
  const text=String(reply||"").trim(); if(!text) return issues;
  const latest=String(latestUserMessage||"");
  const selected=[...(engine.foregroundThreads||[]),...(engine.mentionThreads||[])];
  if(threadHitCount(text,engine.candidateThreads||[])>=4) issues.push("scene_thread_dump_overload");
  if(dormantThreadHit(text,engine.dormantThreads||[]) && !dormantThreadHit(latest,engine.dormantThreads||[])) issues.push("dormant_thread_forced_onscreen");
  if((engine.interruptionBudget||0)===0 && interruptionCue(text) && !interruptionCue(latest)) issues.push("ungrounded_scene_interruption");
  if(engine.userMomentumLock && interruptionCue(text) && !interruptionCue(latest)) issues.push("user_momentum_hijacked");
  if(engine.cooldownActive && escalationSpike(text) && !escalationSpike(latest)) issues.push("cooldown_escalation_spike");
  if(engine.romanceMonopolyGuard && romanceInjection(text) && !romanceInjection(latest)) issues.push("romance_gravity_monopoly");
  if(engine.naturalEndingDue && cliffhangerCue(text)) issues.push("director_forced_cliffhanger");
  const speakerCount=activeSpeakerCount(text,[...(engine.foregroundActors||[]),...(engine.backgroundActors||[])]);
  if((engine.backgroundActors||[]).length>=2 && speakerCount>(engine.maxActiveSpeakers||3)) issues.push("group_scene_roll_call");
  const backgroundActives=activeSpeakerCount(text,engine.backgroundActors||[]);
  if(backgroundActives>=3) issues.push("background_actor_overactivation");
  if(selected.length===0 && threadHitCount(text,engine.candidateThreads||[])>=2) issues.push("screen_time_selection_bypassed");
  if(engine.noveltyAvoid?.length){
    const r=norm(text);
    const repeated=engine.noveltyAvoid.filter(x=>{
      const toks=tokenize(x).filter(t=>t.length>=5).slice(0,5); return toks.length>=2 && toks.filter(t=>r.includes(t)).length>=2;
    });
    if(repeated.length>=2) issues.push("scene_pattern_recycled");
  }
  return uniq(issues);
}

function removeSentences(text:string,predicate:(s:string)=>boolean){
  return String(text||"").split(/(?<=[.!?])\s+|\n{2,}/).filter(s=>s.trim()&&!predicate(s)).join(" ").replace(/\s{2,}/g," ").trim();
}

export function sanitizeSceneDirectorV342Reply(reply="",issues:string[]=[],engine:Partial<SceneDirectorV342>={}){
  let out=String(reply||"").trim();
  const stripInterruption=issues.includes("ungrounded_scene_interruption")||issues.includes("user_momentum_hijacked")||issues.includes("director_forced_cliffhanger");
  if(stripInterruption) out=removeSentences(out,s=>interruptionCue(s)||cliffhangerCue(s));
  if(issues.includes("dormant_thread_forced_onscreen")){
    const dormant=engine.dormantThreads||[];
    out=removeSentences(out,s=>dormantThreadHit(s,dormant));
  }
  if(issues.includes("cooldown_escalation_spike")) out=removeSentences(out,s=>escalationSpike(s));
  if(issues.includes("romance_gravity_monopoly")) out=removeSentences(out,s=>romanceInjection(s));
  if(issues.includes("scene_thread_dump_overload")||issues.includes("screen_time_selection_bypassed")){
    const allowed=[...(engine.foregroundThreads||[]),...(engine.mentionThreads||[])];
    const dormant=[...(engine.backgroundThreads||[]),...(engine.dormantThreads||[])];
    out=removeSentences(out,s=>dormantThreadHit(s,dormant)&&!dormantThreadHit(s,allowed));
  }
  if((issues.includes("group_scene_roll_call")||issues.includes("background_actor_overactivation")) && out){
    const max=Math.max(1,engine.maxActiveSpeakers||3); let seen=0;
    const actorNames=[...(engine.foregroundActors||[]),...(engine.backgroundActors||[])];
    out=removeSentences(out,s=>{
      const active=activeSpeakerCount(s,actorNames)>0; if(!active) return false; seen++; return seen>max;
    });
  }
  if(issues.includes("scene_pattern_recycled") && out.split(/\s+/).length>70){
    const dialogue=out.match(/["“][^"”]{1,260}["”]/g)?.slice(0,2).join(" ");
    if(dialogue) out=dialogue;
  }
  return out.replace(/\s{2,}/g," ").replace(/\n{3,}/g,"\n\n").trim();
}
