type AnyRow = Record<string, any>;

export type LongStoryMemory343 = {
  immutableCanon: string[];
  longTermHistory: string[];
  activeThreads: Array<{label:string;source:string;status:string;participants:string[]}>;
  recentContext: string[];
  relationshipTexture: string[];
  entityMemory: Array<{name:string;facts:string[];relationships:string[]}>;
  perspectiveMemory: {
    objective: string[];
    characterKnown: string[];
    publicKnown: string[];
    privateOrScoped: string[];
  };
  retrievalSet: Array<{content:string;tier:string;score:number;reason:string}>;
  compressionPlan: Array<{content:string;from:string;to:"full_detail"|"scene_summary"|"event_memory"|"historical_fact";reason:string}>;
  dormantThreads: string[];
  resolvedThreads: string[];
  garbageCandidates: string[];
  contradictionWarnings: string[];
  falseMemoryAnchors: string[];
  retrievalPolicy: string;
  compressionPolicy: string;
  perspectivePolicy: string;
  supersessionPolicy: string;
  garbageCollectionPolicy: string;
  falseMemoryPolicy: string;
  instruction: string;
};

const clean=(v:any,n=600)=>String(v??"").replace(/\s+/g," ").trim().slice(0,n);
const norm=(v:any)=>clean(v,3000).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9 ]+/g," ").replace(/\s+/g," ").trim();
const uniq=<T>(arr:T[])=>[...new Set(arr.filter(Boolean) as T[])];
const arr=(v:any):AnyRow[]=>Array.isArray(v)?v.filter(Boolean):[];
const words=(v:any)=>uniq(norm(v).split(/\s+/).filter((x)=>x.length>=4&&!STOP.has(x)));
const STOP=new Set("that this with from have were been they them their there what when where then into your you re just very really about because would could should after before only also still over under some como para pero porque esta esto desde entre cuando donde quien ella ellos ellas nosotros ustedes algo muy mas menos".split(/\s+/));

function overlap(a:any,b:any){const wa=words(a), wb=new Set(words(b)); if(!wa.length||!wb.size)return 0; return wa.filter(x=>wb.has(x)).length/Math.max(1,Math.min(wa.length,wb.size));}
function tokenHits(a:any,b:any){const wb=new Set(words(b)); return words(a).filter(x=>wb.has(x)).length;}
function importance(m:AnyRow){return Math.max(1,Math.min(5,Number(m?.importance)||1));}
function ageDays(m:AnyRow,now=Date.now()){const raw=Date.parse(String(m?.updated_at||m?.created_at||""));return Number.isFinite(raw)?Math.max(0,(now-raw)/86400000):0;}
function authority(m:AnyRow){if(m?.is_canon)return "canon";if(m?.is_pinned||m?.source==="manual")return "creator";return "learned";}
function importantCategory(m:AnyRow){return ["boundary","promise","conflict","relationship","event"].includes(clean(m?.category,40));}
function isOpenStatus(v:any){const s=norm(v);return !/(resolved|complete|completed|cancelled|canceled|closed|ended|done|abandoned|superseded)/.test(s);}
function isResolvedStatus(v:any){return /(resolved|complete|completed|cancelled|canceled|closed|ended|done|abandoned|superseded)/.test(norm(v));}
function memoryLabel(m:AnyRow){return clean(m?.content||m?.summary||m?.title||m?.effect||m?.cause,500);}
function participantsOf(v:AnyRow){return uniq((Array.isArray(v?.participants)?v.participants:[]).map((x:any)=>clean(x,100)));}
function recentLine(m:AnyRow){const sender=clean(m?.sender,30);const content=clean(m?.content,420);return content?`${sender||"turn"}: ${content}`:"";}

export function selectLongStoryMemories(memories:AnyRow[]=[],context:AnyRow={}):AnyRow[]{
  const recent=clean(context?.recentText||context?.latestUserMessage||"",9000);
  const character=clean(context?.characterName||"",120);
  const user=clean(context?.userName||"",120);
  const now=Date.now();
  const scored=arr(memories).map((m)=>{
    const content=memoryLabel(m); const imp=importance(m); const auth=authority(m); const age=ageDays(m,now);
    let score=imp*8;
    if(auth==="canon")score+=60;
    else if(auth==="creator")score+=48;
    if(["boundary","promise","conflict"].includes(clean(m?.category,40)))score+=28;
    else if(importantCategory(m))score+=12;
    const hits=tokenHits(content,recent); score+=Math.min(30,hits*7);
    if(character&&norm(content).includes(norm(character)))score+=8;
    if(user&&norm(content).includes(norm(user)))score+=5;
    if(age>120&&auth==="learned"&&imp<=2&&hits===0)score-=26;
    else if(age>60&&auth==="learned"&&imp<=2&&hits===0)score-=14;
    if(/\b(first|promise|boundary|broke up|kiss|confess|betray|forgav|apolog|fight|argument|secret|milestone|changed|trust|repair)\b/i.test(content))score+=12;
    return {m,score};
  }).sort((a,b)=>b.score-a.score);
  const forced=scored.filter(x=>authority(x.m)!=="learned"||["boundary","promise"].includes(clean(x.m?.category,40))).slice(0,8);
  const out=[...forced];
  for(const item of scored){if(out.some(x=>String(x.m?.id||x.m?.content)===String(item.m?.id||item.m?.content)))continue;if(out.length>=16)break;if(item.score>=12)out.push(item);}
  return out.sort((a,b)=>b.score-a.score).slice(0,16).map(x=>x.m);
}

function threadRows(args:AnyRow){
  const sources:[string,AnyRow[]][]=[
    ["arc",arr(args.storyArcs)],["plan",arr(args.storyPlans)],["conflict",arr(args.storyConflicts)],["consequence",arr(args.storyConsequences)]
  ];
  const active:LongStoryMemory343["activeThreads"]=[]; const resolved:string[]=[];
  for(const [source,rows] of sources){for(const row of rows){const label=clean(row?.title||row?.summary||row?.effect||row?.cause,300);if(!label)continue;const status=clean(row?.status||"active",80);if(isResolvedStatus(status))resolved.push(label);else active.push({label,source,status,participants:participantsOf(row)});}}
  return {active:active.slice(0,12),resolved:uniq(resolved).slice(0,12)};
}

function relationshipTexture(memories:AnyRow[],milestones:AnyRow[]){
  const rows=[...memories.filter(m=>["relationship","conflict","promise","boundary"].includes(clean(m?.category,40))),...milestones];
  return uniq(rows.map((m)=>clean(m?.content||m?.title||m?.summary||m?.evidence,350)).filter(Boolean)).slice(0,12);
}

function entityMemory(persistent:AnyRow[],connections:AnyRow[],memories:AnyRow[]){
  const names=uniq([
    ...persistent.map(x=>clean(x?.name,100)),
    ...connections.flatMap(x=>[clean(x?.from_name||x?.from,100),clean(x?.to_name||x?.to,100)])
  ]).filter(Boolean).slice(0,14);
  return names.map(name=>{
    const n=norm(name);
    const facts=memories.filter(m=>norm(memoryLabel(m)).includes(n)).map(memoryLabel).filter(Boolean).slice(0,4);
    const relationships=connections.filter(c=>[c?.from_name,c?.to_name,c?.from,c?.to].some(x=>norm(x)===n)).map(c=>`${clean(c?.from_name||c?.from,80)} ↔ ${clean(c?.to_name||c?.to,80)}: ${clean(c?.relationship,180)}`).filter(Boolean).slice(0,5);
    return {name,facts,relationships};
  }).filter(x=>x.facts.length||x.relationships.length).slice(0,10);
}

function perspectiveMemory(args:AnyRow,memories:AnyRow[]){
  const char=norm(args?.character?.name||args?.characterName||"");
  const objective=uniq([
    ...memories.filter(m=>m?.is_canon||m?.is_pinned||m?.source==="manual").map(memoryLabel),
    ...arr(args.storyMilestones).map(m=>clean(m?.title||m?.summary||m?.evidence,300)),
    ...arr(args.storyBible).filter(x=>/canon|hard|creator/i.test(clean(x?.authority,80))).map(x=>clean(x?.content||x?.title,300))
  ]).filter(Boolean).slice(0,12);
  const characterKnown=uniq(arr(args.knowledgeLedger).filter(k=>norm(k?.character_name)===char&&!k?.secret).map(k=>clean(k?.knowledge||k?.subject,300))).slice(0,10);
  const publicKnown=uniq(arr(args.knowledgeLedger).filter(k=>!k?.secret&&/(public|known|rumor|shared)/i.test(clean(k?.status,80))).map(k=>clean(k?.knowledge||k?.subject,300))).slice(0,8);
  const privateOrScoped=uniq(arr(args.knowledgeLedger).filter(k=>Boolean(k?.secret)||(!char||norm(k?.character_name)!==char)).map(k=>clean(k?.knowledge||k?.subject,300))).slice(0,8);
  return {objective,characterKnown,publicKnown,privateOrScoped};
}

function compressionTier(m:AnyRow,now=Date.now()):LongStoryMemory343["compressionPlan"][number]["to"]{
  const auth=authority(m),imp=importance(m),age=ageDays(m,now);
  if(auth!=="learned"||imp>=5||["boundary","promise"].includes(clean(m?.category,40)))return "historical_fact";
  if(age<=7&&imp>=3)return "full_detail";
  if(age<=35&&imp>=3)return "scene_summary";
  if(imp>=3||importantCategory(m))return "event_memory";
  return "historical_fact";
}

function contradictionWarnings(memories:AnyRow[]){
  const out:string[]=[];
  for(let i=0;i<memories.length;i++)for(let j=i+1;j<memories.length;j++){
    const a=memoryLabel(memories[i]),b=memoryLabel(memories[j]); if(!a||!b)continue;
    if(overlap(a,b)>=0.6&&(/\b(no longer|not |never|sold|ended|stopped|quit|left)\b/i.test(a)!==/\b(no longer|not |never|sold|ended|stopped|quit|left)\b/i.test(b))) out.push(`${a} ↔ ${b}`);
  }
  return uniq(out).slice(0,6);
}

export function deriveLongStoryMemoryV343(args:AnyRow={}):LongStoryMemory343{
  const memories=arr(args.memories).filter(m=>!m?.superseded_at);
  const latest=clean(args.latestUserMessage,3000);
  const recentMessages=arr(args.recentMessages);
  const contextText=[latest,...recentMessages.slice(-8).map(x=>clean(x?.content,700)),clean(args.storyRecap,1800),clean(args.activeChapter?.summary||args.activeChapter?.title,600)].join(" ");
  const selected=selectLongStoryMemories(memories,{recentText:contextText,characterName:args?.character?.name,userName:args.userName});
  const identityTokens=new Set([...words(args?.character?.name),...words(args.userName)]);
  const contextTokens=new Set(words(contextText).filter((token)=>!identityTokens.has(token)));
  const contextualHits=(value:any)=>words(value).filter((token)=>!identityTokens.has(token)&&contextTokens.has(token)).length;
  const now=Date.now();
  const immutableCanon=uniq(selected.filter(m=>m?.is_canon||m?.is_pinned||m?.source==="manual"||["boundary","promise"].includes(clean(m?.category,40))).map(memoryLabel)).slice(0,12);
  const longTermHistory=uniq(selected.filter(m=>importance(m)>=4||importantCategory(m)).map(memoryLabel)).filter(Boolean).slice(0,14);
  const recentContext=recentMessages.slice(-6).map(recentLine).filter(Boolean).slice(0,6);
  const {active:activeThreads,resolved:resolvedThreads}=threadRows(args);
  const retrievalSet=selected.map(m=>{
    const content=memoryLabel(m); const imp=importance(m); const auth=authority(m); const hits=tokenHits(content,contextText); let score=imp*10+hits*8+(auth==="canon"?55:auth==="creator"?42:0)+(importantCategory(m)?10:0);
    const tier=auth!=="learned"?"immutable_canon":imp>=4?"long_term_history":hits?"active_retrieval":"background_memory";
    return {content,tier,score,reason:hits?`relevant to current context (${hits} keyword hit${hits===1?"":"s"})`:auth!=="learned"?"creator/canon authority":importantCategory(m)?"behavior-changing history":"importance/recency"};
  }).filter(x=>x.content).sort((a,b)=>b.score-a.score).slice(0,12);
  const compressionPlan=selected.map(m=>({content:memoryLabel(m),from:`${authority(m)}/importance-${importance(m)}`,to:compressionTier(m,now),reason:authority(m)!=="learned"?"creator/canon memory never decays into uncertainty":ageDays(m,now)>35?"old memory keeps meaning, not transcript detail":"recent memory may retain more detail"})).filter(x=>x.content).slice(0,12);
  const garbageCandidates=memories.filter(m=>authority(m)==="learned"&&importance(m)<=2&&ageDays(m,now)>45&&contextualHits(memoryLabel(m))===0&&!["boundary","promise","conflict","relationship"].includes(clean(m?.category,40))).map(memoryLabel).filter(Boolean).slice(0,10);
  const dormantThreads=uniq([
    ...arr(args.storyArcs).filter(x=>isOpenStatus(x?.status)&&!activeThreads.slice(0,4).some(a=>a.label===clean(x?.title||x?.summary,300))).map(x=>clean(x?.title||x?.summary,300)),
    ...arr(args.unresolvedThreads).map(x=>clean(x?.title||x?.summary||x,300))
  ]).filter(Boolean).slice(0,10);
  const perspective=perspectiveMemory(args,selected);
  const anchors=uniq([...immutableCanon,...longTermHistory,...activeThreads.map(x=>x.label),...resolvedThreads,...perspective.objective,...perspective.characterKnown,...recentContext]).filter(Boolean).slice(0,40);
  return {
    immutableCanon,longTermHistory,activeThreads,recentContext,
    relationshipTexture:relationshipTexture(selected,arr(args.storyMilestones)),
    entityMemory:entityMemory(arr(args.persistentCast),arr(args.castConnections),selected),
    perspectiveMemory:perspective,
    retrievalSet,compressionPlan,dormantThreads,resolvedThreads,garbageCandidates,
    contradictionWarnings:contradictionWarnings(selected),
    falseMemoryAnchors:anchors,
    retrievalPolicy:"Retrieve by current entities + relationship + location/domain + active thread + behavioral consequence. Canon and creator-owned memory outrank recency; irrelevant trivia does not enter the turn merely because it exists.",
    compressionPolicy:"Progressive compression preserves meaning while shedding transcript detail: recent detail → scene summary → event memory → historical fact. Boundaries, promises, creator canon, firsts and behavior-changing milestones never decay into trivia.",
    perspectivePolicy:"Objective history is not universal knowledge. Character memory, NPC knowledge, public/social knowledge and secret/scoped knowledge remain separate. Retrieval cannot grant information to a character who never had a route to it.",
    supersessionPolicy:"Newer explicit corrections supersede old current-state facts without deleting history. Keep the old fact as historical only when it truly used to be true; never merge contradictory current states into one fuzzy memory.",
    garbageCollectionPolicy:"Low-importance automatic trivia may fade when old, unrepeated and behaviorally irrelevant. Never garbage-collect creator/canon/pinned memories, boundaries, promises, milestones, unresolved conflicts or facts still affecting active systems.",
    falseMemoryPolicy:"A remembered event must be grounded in visible transcript, creator/canon memory, milestone, consequence, chapter/recap or knowledge with a valid perspective. Never invent a past event to make intimacy, rivalry, fame or continuity feel richer.",
    instruction:"LONG-STORY MEMORY 3.43: remember selectively and causally. Preserve hard canon and relationship texture, retrieve only what the current beat can use, keep open/dormant/resolved threads distinct, compress old scenes without changing meaning, and maintain separate objective/character/public knowledge. A confident-sounding recollection is not evidence. If a past event cannot be grounded, do not say it happened. Forget trivia correctly; never forget the facts that changed behavior.",
  };
}

function historicalClaimSentences(reply:string){
  return String(reply||"").split(/(?<=[.!?])\s+|\n+/).map(x=>x.trim()).filter(x=>/\b(?:remember when|remember that time|the time (?:we|you|i)|that night (?:we|you|i)|that day (?:we|you|i)|ever since (?:we|you|i)|back when (?:we|you|i)|we used to|you used to|our first|the first time (?:we|you|i)|like last time|again,? like|after what happened|since what happened)\b/i.test(x));
}
function claimSupported(sentence:string,anchors:string[]){
  if(!anchors.length)return false;
  return anchors.some(a=>overlap(sentence,a)>=0.34||tokenHits(sentence,a)>=3);
}

export function longStoryMemoryV343Issues({reply="",engine={} as Partial<LongStoryMemory343>,latestUserMessage=""}={}){
  const issues:string[]=[]; const text=String(reply||"").trim(); if(!text)return issues;
  const anchors=engine.falseMemoryAnchors||[];
  for(const sentence of historicalClaimSentences(text)){
    if(historicalClaimSentences(String(latestUserMessage||"")).some(u=>overlap(sentence,u)>=0.45))continue;
    if(!claimSupported(sentence,anchors)){issues.push("false_memory_claim");break;}
  }
  const r=norm(text);
  for(const thread of engine.resolvedThreads||[]){const t=norm(thread);const toks=words(t).slice(0,6);if(toks.length>=2&&toks.filter(x=>r.includes(x)).length>=2&&/\b(?:still need|still have to|has to|need to|upcoming|tomorrow|later today|not over|still active)\b/i.test(text)){issues.push("resolved_thread_reactivated");break;}}
  if((engine.perspectiveMemory?.privateOrScoped||[]).length&&/\b(?:everyone knew|the whole campus knew|everybody knew|everyone had heard|it was common knowledge)\b/i.test(text)){
    const publicText=(engine.perspectiveMemory?.publicKnown||[]).join(" ");
    if(!publicText||tokenHits(text,publicText)<2)issues.push("perspective_memory_leak");
  }
  if((engine.contradictionWarnings||[]).length&&/\b(?:definitely|always|never changed|still exactly|of course)\b/i.test(text))issues.push("memory_conflict_overclaim");
  return uniq(issues);
}

function removeSentences(text:string,predicate:(s:string)=>boolean){return String(text||"").split(/(?<=[.!?])\s+|\n{2,}/).filter(s=>s.trim()&&!predicate(s)).join(" ").replace(/\s{2,}/g," ").trim();}
export function sanitizeLongStoryMemoryV343Reply(reply="",issues:string[]=[],engine:Partial<LongStoryMemory343>={}){
  let out=String(reply||"").trim();
  if(issues.includes("false_memory_claim"))out=removeSentences(out,s=>historicalClaimSentences(s).length>0&&!claimSupported(s,engine.falseMemoryAnchors||[]));
  if(issues.includes("resolved_thread_reactivated"))out=removeSentences(out,s=>(engine.resolvedThreads||[]).some(t=>tokenHits(s,t)>=2)&&/\b(?:still need|still have to|has to|need to|upcoming|tomorrow|not over|still active)\b/i.test(s));
  if(issues.includes("perspective_memory_leak"))out=removeSentences(out,s=>/\b(?:everyone knew|the whole campus knew|everybody knew|everyone had heard|common knowledge)\b/i.test(s));
  if(issues.includes("memory_conflict_overclaim"))out=out.replace(/\b(?:definitely|of course|still exactly)\b/gi,"").replace(/\s{2,}/g," ").trim();
  return out.trim();
}

export function automaticMemoryGroundingIssues({content="",sourceUser="",sourceReply="",existingAnchors=[] as string[],isCanon=false,isPinned=false,source="automatic"}={}){
  if(isCanon||isPinned||source==="manual")return [];
  const c=clean(content,700); if(!c)return ["empty_memory"];
  const visible=`${clean(sourceUser,1200)} ${clean(sourceReply,1600)} ${(existingAnchors||[]).join(" ")}`;
  const highRisk=/\b(?:remember when|that night|that day|ever since|first kiss|first date|first time|used to|always did|promised|betrayed|cheated|broke up|hit |punched|hospital|arrested|expelled|suspended|died|funeral|wedding|engaged)\b/i.test(c);
  if(highRisk&&tokenHits(c,visible)<2&&overlap(c,visible)<0.22)return ["ungrounded_automatic_memory"];
  return [];
}
