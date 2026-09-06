export type WorldConsequencesCausalTimeline = {
  activeChains: Array<{
    title:string;
    cause:string;
    effect:string;
    weight:number;
    status:string;
    participants:string[];
    permanence:"scene"|"temporary"|"medium"|"historical";
    decay:string;
  }>;
  causalLedger: string[];
  institutionalMemory: Array<{ domain:string; memory:string; evidence:string; status:string }>;
  liveCommitmentEffects: string[];
  cancelledOrResolved: string[];
  rumorBeliefs: Array<{ holder:string; subject:string; belief:string; source:string }>;
  parallelLifeWindows: string[];
  currentEventImportance: number;
  consequenceBudget: number;
  causeEffectPolicy: string;
  consequencePersistencePolicy: string;
  consequenceDecayPolicy: string;
  institutionalMemoryPolicy: string;
  beliefFactPolicy: string;
  offscreenCausalityPolicy: string;
  crossSystemPolicy: string;
  minorEventPolicy: string;
  instruction: string;
};

type Args = {
  character?:Record<string,any>;
  latestUserMessage?:string;
  recentMessages?:Array<Record<string,any>>;
  sceneState?:Record<string,any>;
  storyConsequences?:Array<Record<string,any>>;
  calendarEvents?:Array<Record<string,any>>;
  storyPlans?:Array<Record<string,any>>;
  storyArcs?:Array<Record<string,any>>;
  storyConflicts?:Array<Record<string,any>>;
  knowledgeLedger?:Array<Record<string,any>>;
  castConnections?:Array<Record<string,any>>;
  npcEcosystem?:Record<string,any>;
  calendarLifeSimulation?:Record<string,any>;
};

type IssueArgs={
  reply?:string;
  latestUserMessage?:string;
  recentCharacterReplies?:string[];
  engine?:Partial<WorldConsequencesCausalTimeline>;
};

const text=(v:any)=>String(v??"").replace(/\s+/g," ").trim();
const norm=(v:any)=>text(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[’']/g,"'").replace(/\s+/g," ").trim();
const list=(v:any)=>Array.isArray(v)?v:[];
const uniq=(xs:string[])=>[...new Set(xs.map(text).filter(Boolean))];
const clamp=(n:number,min=0,max=5)=>Math.max(min,Math.min(max,Number.isFinite(n)?n:0));
const participants=(v:any)=>list(v).map(text).filter(Boolean).slice(0,8);

function permanenceFor(weight:number,effect:string,status:string):WorldConsequencesCausalTimeline["activeChains"][number]["permanence"]{
  const e=norm(effect),s=norm(status);
  if(s==="resolved"||s==="cancelled") return "scene";
  if(weight>=5||/death|marriage|break.?up|expelled|fired|graduat|permanent|scar|public scandal|championship|major injury/.test(e)) return "historical";
  if(weight>=3||/relationship|reputation|repair|conflict|rival|team|family|academic|car|garage|money|trust/.test(e)) return "medium";
  return "temporary";
}
function decayFor(permanence:string){
  if(permanence==="historical") return "does not decay into nonexistence; later scenes may stop foregrounding it";
  if(permanence==="medium") return "may soften only after visible repair, replacement, completion, or enough grounded time";
  if(permanence==="temporary") return "may fade after the practical/emotional effect is plausibly spent";
  return "scene-local unless another recorded event gives it durable weight";
}
function consequenceRows(rows:Array<Record<string,any>>=[]){
  return list(rows).slice(0,20).map((r:any)=>{
    const weight=clamp(Number(r.weight)||2,1,5), status=text(r.status||"active")||"active";
    const permanence=permanenceFor(weight,text(r.effect),status);
    return {title:text(r.title||"Consequence"),cause:text(r.cause),effect:text(r.effect),weight,status,participants:participants(r.participants),permanence,decay:decayFor(permanence)};
  }).filter((r:any)=>r.title&&(r.cause||r.effect));
}
function statusRow(r:Record<string,any>={}){
  return [text(r.title||r.activity||r.name||r.plan),text(r.story_time||r.storyTime||r.when||r.time),text(r.status)].filter(Boolean).join(" · ");
}
function institutionalRows(args:Args){
  const rows:Array<{domain:string;memory:string;evidence:string;status:string}>=[];
  const push=(domain:string,memory:string,evidence:string,status="active")=>{if(memory)rows.push({domain,memory,evidence,status});};
  for(const c of list(args.storyConsequences)){
    const blob=norm([c.title,c.cause,c.effect].join(" "));
    const evidence=text(c.cause||c.title);
    if(/class|exam|professor|university|college|academic|grade|attendance|lab/.test(blob)) push("university/academic",text(c.effect||c.title),evidence,text(c.status||"active"));
    if(/practice|team|coach|match|game|training|sport/.test(blob)) push("sport/team",text(c.effect||c.title),evidence,text(c.status||"active"));
    if(/race|racing|garage|mechanic|car|driver|track/.test(blob)) push("racing/automotive",text(c.effect||c.title),evidence,text(c.status||"active"));
    if(/business|company|board|family|status|wealth|money|press/.test(blob)) push("business/family/status",text(c.effect||c.title),evidence,text(c.status||"active"));
  }
  for(const f of list(args.storyConflicts)){
    const blob=norm([f.title,f.cause,f.positions].join(" "));
    if(/team|coach|practice|sport/.test(blob)) push("sport/team",text(f.title||f.cause),text(f.cause),text(f.status||"active"));
    if(/class|academic|university|professor/.test(blob)) push("university/academic",text(f.title||f.cause),text(f.cause),text(f.status||"active"));
  }
  return rows.slice(0,10);
}
function rumorRows(knowledge:Array<Record<string,any>>=[]){
  return list(knowledge).filter((k:any)=>norm(k.status)==="rumor"||norm(k.status)==="suspected").map((k:any)=>({
    holder:text(k.character_name||k.who||"unknown"),subject:text(k.subject),belief:text(k.knowledge||k.knows),source:text(k.source),
  })).filter((x:any)=>x.belief||x.subject).slice(0,10);
}
function eventImportance(args:Args){
  const latest=norm(args.latestUserMessage);
  if(!latest) return 0;
  if(/break.?up|quit|fired|expelled|arrest|crash|accident|hospital|won the race|lost the race|confess|kiss|fight|promise|cancel|missed .*exam|failed|passed/.test(latest)) return 4;
  if(/argue|argument|damage|broke|missed|late|lied|apolog|invite|date|race|exam|practice|meeting/.test(latest)) return 3;
  if(/coffee|lunch|walk|chat|talk|text|sit|stand|leave|arrive/.test(latest)) return 1;
  return 0;
}
function budgetFor(importance:number){return importance>=5?4:importance>=4?3:importance>=3?2:importance>=2?1:0;}
function parallelWindows(args:Args){
  const out:string[]=[];
  const cal=args.calendarLifeSimulation||{};
  for(const row of list(cal.upcomingEvents).slice(0,8)){
    const p=participants(row.participants);
    if(p.length && norm(row.status)!=="cancelled") out.push(`${text(row.title)} · ${text(row.storyTime)} · participants ${p.join(", ")}`);
  }
  for(const n of list(args.npcEcosystem?.nodes).slice(0,10)){
    const name=text(n.name),goal=text(n.currentGoal),availability=text(n.availability);
    if(name&&(goal||availability)) out.push(`${name}: ${[goal,availability].filter(Boolean).join(" · ")}`);
  }
  return uniq(out).slice(0,10);
}

export function deriveWorldConsequencesCausalTimeline(args:Args={}):WorldConsequencesCausalTimeline{
  const activeChains=consequenceRows(args.storyConsequences).filter((c)=>!/\b(?:resolved|cancelled|completed)\b/i.test(c.status));
  const inactive=consequenceRows(args.storyConsequences).filter((c)=>/\b(?:resolved|cancelled|completed)\b/i.test(c.status)).map((c)=>`${c.title}: ${c.status}`);
  const cancelledCalendar=list(args.calendarEvents).filter((e:any)=>/cancel|completed|resolved/i.test(text(e.status))).map(statusRow);
  const cancelledPlans=list(args.storyPlans).filter((e:any)=>/cancel|completed|resolved/i.test(text(e.status))).map(statusRow);
  const causalLedger=activeChains.map((c)=>`${c.title}: ${c.cause||"unknown cause"} → ${c.effect||"pending effect"}`).slice(0,12);
  const importance=eventImportance(args),budget=budgetFor(importance);
  const liveCommitmentEffects=uniq([
    ...list(args.calendarLifeSimulation?.dueCommitments).map(text),
    ...list(args.calendarLifeSimulation?.scheduleConflicts).map(text),
    ...list(args.storyPlans).filter((p:any)=>!/cancel|completed|resolved/i.test(text(p.status))).map(statusRow),
  ]).slice(0,10);
  const characterName=text(args.character?.name||"character");
  return {
    activeChains,
    causalLedger,
    institutionalMemory:institutionalRows(args),
    liveCommitmentEffects,
    cancelledOrResolved:uniq([...inactive,...cancelledCalendar,...cancelledPlans]).slice(0,10),
    rumorBeliefs:rumorRows(args.knowledgeLedger),
    parallelLifeWindows:parallelWindows(args),
    currentEventImportance:importance,
    consequenceBudget:budget,
    causeEffectPolicy:"Concrete consequences need a visible or stored cause. Never start from an effect and backfill an unseen dramatic event to justify it.",
    consequencePersistencePolicy:"Recorded damage, promises, social fallout, relationship changes, obligations and practical blockers remain true until an explicit repair/completion/cancellation/replacement changes them.",
    consequenceDecayPolicy:"Persistence is tiered: trivial scene residue may die with the scene; temporary effects may fade; medium consequences need grounded resolution/time; historical changes remain canon even when no longer foregrounded.",
    institutionalMemoryPolicy:"Teams, universities, workplaces, families, clubs and domain circles may remember events witnessed/recorded inside their scope. Institutional awareness must come from attendance, records, witnesses, authority, or communication—not omniscience.",
    beliefFactPolicy:"Rumor, suspicion and belief are epistemic states, not facts. A character may act on a rumor while the narration and other characters keep its uncertainty intact.",
    offscreenCausalityPolicy:"Off-screen life can advance only inside a real time window, with availability, motive and domain access. Ordinary routine may progress; major milestones need stronger established setup and cannot appear as surprise retroactive canon.",
    crossSystemPolicy:"Propagate only grounded effects across calendar, social graph, reputation, relationships, objects and institutions. Every hop needs a causal bridge; stop propagation when evidence or relevance runs out.",
    minorEventPolicy:"Do not immortalize trivia. Coffee, ordinary greetings and incidental gestures usually die with the scene unless they genuinely cause a later practical/social effect.",
    instruction:`v3.41 WORLD CONSEQUENCES + CAUSAL TIMELINE: Treat cause → effect as hard continuity. ${characterName} does not receive consequences from invisible events. Carry active effects forward, let resolved effects stop constraining the present, keep rumors uncertain, give institutions scoped memory, and allow parallel lives to advance only through real calendar/availability windows. Current turn importance=${importance}/5, consequence budget=${budget}; never turn a minor beat into a dynasty-changing chain.`,
  };
}

function supports(fragment:string,engine:Partial<WorldConsequencesCausalTimeline>={},latest=""){
  const f=norm(fragment); if(!f) return false;
  const hay=norm([
    latest,
    ...list(engine.causalLedger),...list(engine.liveCommitmentEffects),...list(engine.cancelledOrResolved),
    ...list(engine.institutionalMemory).flatMap((x:any)=>[x.memory,x.evidence,x.domain]),
    ...list(engine.parallelLifeWindows),
  ].join(" | "));
  return hay.includes(f)||f.split(/\s+/).filter((x)=>x.length>4).some((x)=>hay.includes(x));
}

export function worldConsequencesCausalTimelineIssues(args:IssueArgs={}):string[]{
  const reply=text(args.reply),latest=text(args.latestUserMessage),engine=args.engine||{}; if(!reply)return[];
  const issues:string[]=[];
  const causal=norm(list(engine.causalLedger).join(" | "));
  const inactive=norm(list(engine.cancelledOrResolved).join(" | "));

  // Effects that strongly imply an unseen concrete cause.
  const unsupportedPatterns=[
    /\b(?:still )?(?:in the shop|at the mechanic|being repaired)\b/i,
    /\b(?:suspended|benched|on probation|expelled|fired)\b/i,
    /\b(?:still not speaking to|hasn't spoken to|had not spoken to)\b/i,
    /\b(?:the rematch|the disciplinary hearing|the make-up exam|the repair bill)\b/i,
  ];
  if(unsupportedPatterns.some((p)=>p.test(reply)) && !supports(reply,engine,latest)) issues.push("unsupported_consequence_without_cause");

  // Active practical consequence cannot magically reset with no resolution.
  if(causal && /car|vehicle|garage|repair|damage/.test(causal) && /\b(?:car|vehicle)\b[^.!?]{0,45}\b(?:perfect|fine|fixed|good as new|nothing wrong)\b/i.test(reply) && !/fixed|repaired|resolved|completed/.test(norm(latest))) issues.push("active_consequence_magically_reset");

  if(list(engine.activeChains).length && /\b(?:none of that mattered anymore|everything was back to normal|as if nothing had happened|no consequences?)\b/i.test(reply)) issues.push("consequence_residue_erased");

  // Rumor cannot silently become omniscient fact.
  for(const r of list(engine.rumorBeliefs)){
    const belief=norm((r as any).belief||(r as any).subject); if(!belief)continue;
    const key=belief.split(/\s+/).filter((x)=>x.length>=5).slice(0,3);
    if(key.length&&key.every((x)=>norm(reply).includes(x))&&!/rumor|apparently|supposedly|heard|maybe|might|people say|word is|allegedly|thinks?|believes?|suspects?/i.test(reply)) issues.push("rumor_promoted_to_fact");
  }

  // Cancelled/completed events cannot keep acting as upcoming obligations.
  if(inactive && list(engine.cancelledOrResolved).some((row:any)=>{
    const words=norm(row).split(/\s+/).filter((x)=>x.length>4).slice(0,3); return words.length&&words.some((x)=>norm(reply).includes(x));
  }) && /\b(?:have to|need to|still have|heading to|going to|due|tonight|tomorrow|later)\b/i.test(reply)) issues.push("resolved_or_cancelled_event_reactivated");

  // Huge off-screen milestone needs an established window/cause.
  if(/\b(?:while you were gone|while you were away|since you left|off.?screen|over the weekend)\b/i.test(reply) && /\b(?:got married|broke up|was arrested|got expelled|was expelled|was fired|won the championship|crashed|was hospitalized|moved away|sold the company)\b/i.test(reply) && !supports(reply,engine,latest)) issues.push("major_offscreen_event_without_causal_window");

  // Do not manufacture multiple unrelated fallout beats from one tiny turn.
  const connective=(reply.match(/\b(?:so now|which meant|as a result|because of that|therefore|and now|that meant)\b/gi)||[]).length;
  if(Number(engine.consequenceBudget||0)<=1 && connective>=3) issues.push("consequence_budget_overflow");

  if(Number(engine.currentEventImportance||0)<=1 && /\b(?:changed everything|would never be the same|for years to come|the whole campus|everyone would know|ruined his reputation|destroyed their friendship)\b/i.test(reply)) issues.push("minor_event_overcanonized");

  return uniq(issues);
}

export function sanitizeWorldConsequencesCausalTimelineReply(reply:string,issues:string[],engine:Partial<WorldConsequencesCausalTimeline>={}):string{
  let out=text(reply); if(!out)return out;
  const has=(x:string)=>issues.includes(x);
  if(has("unsupported_consequence_without_cause")){
    out=out.replace(/[^.!?]*(?:in the shop|at the mechanic|being repaired|suspended|benched|on probation|expelled|fired|the rematch|disciplinary hearing|make-up exam|repair bill)[^.!?]*[.!?]?/gi,"").trim();
  }
  if(has("active_consequence_magically_reset")) out=out.replace(/\b(?:perfect|fine|fixed|good as new|nothing wrong)\b/gi,"still affected by what happened");
  if(has("consequence_residue_erased")) out=out.replace(/\b(?:none of that mattered anymore|everything was back to normal|as if nothing had happened|no consequences?)\b/gi,"the fallout was still there");
  if(has("rumor_promoted_to_fact")) out=out.replace(/^(?![^.!?]*(?:apparently|supposedly|heard|rumor))/i,"Apparently, ");
  if(has("resolved_or_cancelled_event_reactivated")) out=out.replace(/\b(?:still have to|have to|need to)\b/gi,"had been supposed to");
  if(has("major_offscreen_event_without_causal_window")) out=out.replace(/[^.!?]*(?:got married|broke up|was arrested|got expelled|was expelled|was fired|won the championship|crashed|was hospitalized|moved away|sold the company)[^.!?]*[.!?]?/gi,"").trim();
  if(has("minor_event_overcanonized")) out=out.replace(/\b(?:changed everything|would never be the same|for years to come|the whole campus|everyone would know|ruined his reputation|destroyed their friendship)\b/gi,"mattered for the moment");
  if(has("consequence_budget_overflow")){
    const sentences=out.match(/[^.!?]+[.!?]?/g)||[out]; out=text(sentences.slice(0,3).join(" "));
  }
  return out||"He let the moment stand without inventing a consequence that hadn't happened.";
}
