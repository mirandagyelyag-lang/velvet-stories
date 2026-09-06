type AnyRow = Record<string, any>;

export type NarrativeArcIntelligenceV344 = {
  arcs: Array<{
    key:string;
    title:string;
    domain:string;
    status:string;
    stage:"setup"|"developing"|"pressure"|"payoff_ready"|"landing"|"dormant"|"resolved";
    evidenceCount:number;
    repetitionCount:number;
    momentum:"stalled"|"slow"|"steady"|"accelerating"|"landing"|"resolved";
    blockers:string[];
    nextAllowedShift:string;
    payoffReady:boolean;
  }>;
  relationshipPace: {
    attraction:{stage:string;evidenceCount:number};
    trust:{stage:string;evidenceCount:number};
    vulnerability:{stage:string;evidenceCount:number};
    comfort:{stage:string;evidenceCount:number};
    commitment:{stage:string;evidenceCount:number};
    gate:"hold"|"repair_first"|"allow_micro_shift"|"allow_meaningful_shift"|"progress_due";
    policy:string;
  };
  behaviorProgression: {
    oldPattern:string;
    currentPattern:string;
    retainedGrowth:string;
    regressionAllowed:boolean;
    totalResetAllowed:boolean;
    policy:string;
  };
  stagnationWarnings:string[];
  loopSignatures:string[];
  payoffCandidates:string[];
  resolvedArcLocks:string[];
  dormantArcs:string[];
  conflictEvolution:string[];
  progressionMode:"hold"|"allow_micro_shift"|"allow_meaningful_shift"|"land_or_resolve";
  escalationBudget:number;
  escalationPolicy:string;
  personalityGuard:string;
  arcDependencyPolicy:string;
  payoffPolicy:string;
  stagnationPolicy:string;
  conflictEvolutionPolicy:string;
  instruction:string;
};

const clean=(v:any,n=800)=>String(v??"").replace(/\s+/g," ").trim().slice(0,n);
const norm=(v:any)=>clean(v,5000).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[’']/g,"'").replace(/[^a-z0-9\s'-]+/g," ").replace(/\s+/g," ").trim();
const arr=(v:any):AnyRow[]=>Array.isArray(v)?v.filter(Boolean):[];
const uniq=<T>(xs:T[])=>[...new Set(xs.filter(Boolean) as T[])];
const clamp=(n:any,min=0,max=100)=>Math.max(min,Math.min(max,Number.isFinite(Number(n))?Number(n):0));
const isResolved=(v:any)=>/\b(?:resolved|complete|completed|closed|ended|done|cancelled|canceled|superseded)\b/.test(norm(v));
const isDormant=(v:any)=>/\b(?:dormant|paused|inactive|shelved|waiting|on hold)\b/.test(norm(v));
const label=(r:AnyRow)=>clean(r?.title||r?.label||r?.name||r?.summary||r?.effect||r?.cause||r?.arc,320);

function messageText(m:any){return clean(m?.content||m?.text||m?.message,1600);}
function sender(m:any){return norm(m?.sender||m?.role||m?.author);}
function recentText(rows:AnyRow[]){return arr(rows).slice(-24).map(messageText).join(" ");}

function domainOf(row:AnyRow){
  const raw=norm([row?.domain,row?.type,row?.category,row?.title,row?.summary].filter(Boolean).join(" "));
  if(/\b(?:race|racing|car|garage|driver|motorsport)\b/.test(raw)) return "racing";
  if(/\b(?:class|exam|assignment|university|college|campus|academic|school)\b/.test(raw)) return "academic";
  if(/\b(?:friend|friendship|group|social|party|rumor|reputation)\b/.test(raw)) return "social";
  if(/\b(?:relationship|romance|dating|kiss|attraction|trust|love|conflict|repair)\b/.test(raw)) return "relationship";
  if(/\b(?:family|father|mother|sibling|home)\b/.test(raw)) return "family";
  if(/\b(?:work|business|company|meeting|client|job)\b/.test(raw)) return "work";
  if(/\b(?:sport|team|practice|training|match|game|captain|coach)\b/.test(raw)) return "sport";
  return clean(row?.domain||row?.category||"general",80)||"general";
}

function arcEvidenceCount(row:AnyRow, recent:AnyRow[], memories:AnyRow[], milestones:AnyRow[]){
  const title=label(row); if(!title) return 0;
  const tokens=norm(title).split(/\s+/).filter(x=>x.length>=4).slice(0,6);
  if(!tokens.length) return Number(row?.evidence_count||row?.evidenceCount||0)||0;
  const blob=[...recent.map(messageText),...memories.map(x=>clean(x?.content||x?.summary||x?.title,700)),...milestones.map(x=>clean(x?.title||x?.summary||x?.evidence,500))].map(norm);
  let hits=0;
  for(const text of blob){const match=tokens.filter(t=>text.includes(t)).length;if(match>=Math.min(2,tokens.length))hits++;}
  return Math.max(Number(row?.evidence_count||row?.evidenceCount||0)||0,Math.min(8,hits));
}

function structuralSignature(value:any){
  const t=norm(value); const parts:string[]=[];
  if(/\b(?:argu(?:e|ed|ing|ment|ments)?|fight(?:ing|s)?|yell(?:ed|ing)?|snap(?:ped|ping)?|angry|mad|tension)\b/.test(t)) parts.push("conflict");
  if(/\b(?:apolog|sorry|repair|make it up|came back|returned)\b/.test(t)) parts.push("repair");
  if(/\b(?:leave|leaves|leaving|left|walked away|walks away|stormed off|storms off|distance|distanced|avoid|avoids|avoided|ignored)\b/.test(t)) parts.push("withdrawal");
  if(/\b(?:flirt|number|asked .* out|date|kiss|jealous|possessive)\b/.test(t)) parts.push("romantic-third-party");
  if(/\b(?:banter|teas(?:e|ed|ing)?|jok(?:e|ed|ing)|sarcas\w*|smirk(?:ed|ing)?|eye roll|rolled .* eyes)\b/.test(t)) parts.push("banter");
  if(/\b(?:confess|admit|vulnerab|truth|honest|i like you|i love you)\b/.test(t)) parts.push("vulnerability");
  if(/\b(?:stay|stayed|didn t leave|did not leave|waited|listened)\b/.test(t)) parts.push("stayed-through-pressure");
  if(/\b(?:class|campus|cafeteria|lecture|assignment)\b/.test(t)) parts.push("campus");
  if(/\b(?:race|garage|car|rival)\b/.test(t)) parts.push("racing");
  return parts.slice(0,4).join("+")||"ordinary";
}

function loopData(recent:AnyRow[]){
  const charRows=recent.filter(m=>!sender(m).includes("user")).slice(-14);
  const signatures=charRows.map(m=>structuralSignature(messageText(m))).filter(x=>x!=="ordinary");
  const counts=new Map<string,number>(); for(const s of signatures)counts.set(s,(counts.get(s)||0)+1);
  const loops=[...counts.entries()].filter(([,n])=>n>=3).sort((a,b)=>b[1]-a[1]).map(([s,n])=>`${s} ×${n}`);
  return {signatures,loops,counts};
}

function qualitativeAxis(value:any){
  const n=clamp(value,0,100);
  if(n>=80)return "deep";
  if(n>=65)return "established";
  if(n>=45)return "developing";
  if(n>=25)return "emerging";
  return "low";
}

function axisEvidence(recent:AnyRow[], memories:AnyRow[], pattern:RegExp){
  const rows=[...recent.slice(-20).map(messageText),...memories.slice(-30).map(m=>clean(m?.content||m?.summary||m?.title,800))];
  return Math.min(8,rows.filter(x=>pattern.test(norm(x))).length);
}

function relationshipPace(args:AnyRow):NarrativeArcIntelligenceV344["relationshipPace"]{
  const c=args.relationshipChemistry||{}; const recent=arr(args.recentMessages), memories=arr(args.memories);
  const axes=c?.axes||{};
  const attractionE=axisEvidence(recent,memories,/\b(?:attract|flirt|crush|date|kiss|want(?:ed)? .* close|chemistry)\b/);
  const trustE=axisEvidence(recent,memories,/\b(?:trust|kept .* word|reliable|showed up|honest|believ|confided|repair)\b/);
  const vulnE=axisEvidence(recent,memories,/\b(?:vulnerab|admit|confess|told .* truth|opened up|apolog|scared|afraid|need you)\b/);
  const comfortE=axisEvidence(recent,memories,/\b(?:comfortable|routine|inside joke|private joke|quiet together|sat together|familiar|ease|shared time)\b/);
  const commitmentE=axisEvidence(recent,memories,/\b(?:committed|boyfriend|girlfriend|partner|exclusive|relationship|promise|choose you|together)\b/);
  let gate:NarrativeArcIntelligenceV344["relationshipPace"]["gate"]="hold";
  const pace=String(c?.paceGate?.status||"");
  if(pace==="repair_first") gate="repair_first";
  else if(pace==="progress_due") gate="progress_due";
  else if(pace==="allow_progress") gate=(commitmentE>=2||vulnE>=2||trustE>=2)?"allow_meaningful_shift":"allow_micro_shift";
  else if(attractionE+trustE+vulnE+comfortE>=6) gate="allow_micro_shift";
  return {
    attraction:{stage:qualitativeAxis(axes?.attraction),evidenceCount:attractionE},
    trust:{stage:qualitativeAxis(axes?.trust),evidenceCount:trustE},
    vulnerability:{stage:qualitativeAxis((Number(axes?.trust)||0)*0.45+(Number(axes?.comfort)||0)*0.35+vulnE*4),evidenceCount:vulnE},
    comfort:{stage:qualitativeAxis(axes?.comfort),evidenceCount:comfortE},
    commitment:{stage:qualitativeAxis(axes?.commitment),evidenceCount:commitmentE},
    gate,
    policy:"Relationship progression follows evidence, not turn count or intensity. Attraction, trust, vulnerability, comfort and commitment move separately. A strong scene may accelerate one axis, but cannot silently advance all of them or skip repair.",
  };
}

function behaviorProgression(args:AnyRow):NarrativeArcIntelligenceV344["behaviorProgression"]{
  const evo=args.longTermEvolution||{};
  const oldPattern=clean((evo?.mutableDefenses||[])[0]||args?.developmentState?.old_pattern||"old defense remains available under pressure",300);
  const durable=(evo?.durableShifts||[]).filter((x:any)=>String(x?.status||"")==="durable"||Number(x?.evidenceCount||0)>=3);
  const currentPattern=clean(durable[durable.length-1]?.pattern||(evo?.learnedBehavior||[])[0]||"no durable behavioral change proven yet",360);
  const retained=clean(evo?.regression?.retainedGrowth||currentPattern,360);
  return {oldPattern,currentPattern,retainedGrowth:retained,regressionAllowed:true,totalResetAllowed:false,policy:"A relapse may revive an old defense, but it cannot erase proven learning. Show regression as old pattern + retained skill, memory, trust or faster repair. Total reset requires repeated on-page deterioration, not one bad scene."};
}

function conflictEvolution(rows:AnyRow[], recent:AnyRow[]){
  const recentBlob=norm(recent.slice(-16).map(messageText).join(" "));
  return rows.map(r=>{
    const title=label(r); const status=clean(r?.status||"active",70);
    if(!title)return "";
    if(isResolved(status)) return `${title}: resolved; do not replay as a fresh conflict without a new cause.`;
    const referenced=norm(title).split(/\s+/).filter(x=>x.length>=4).some(x=>recentBlob.includes(x));
    return `${title}: ${referenced?"current conversation has contact with this conflict; evolve from prior history instead of restarting its premise":"active but not necessarily foreground; keep residue available without forcing it on-screen"}.`;
  }).filter(Boolean).slice(0,10);
}

function arcStage(row:AnyRow,evidence:number,repetition:number,payoffSeed:boolean){
  const status=clean(row?.status||"active",80);
  if(isResolved(status)) return "resolved" as const;
  if(isDormant(status)) return "dormant" as const;
  const raw=norm([row?.stage,row?.phase,row?.status,row?.next_pressure,row?.nextPressure,row?.change_in_progress,row?.changeInProgress].filter(Boolean).join(" "));
  if(/\b(?:landing|cooldown|aftermath|wrap|closing|resolve next)\b/.test(raw)) return "landing" as const;
  if(payoffSeed||/\b(?:payoff|ready|culminat|decision point|turning point)\b/.test(raw)) return "payoff_ready" as const;
  if(/\b(?:pressure|crisis|test|setback|rising|confront)\b/.test(raw)||evidence>=4) return "pressure" as const;
  if(evidence>=2||/\b(?:develop|active|progress|building)\b/.test(raw)) return "developing" as const;
  return "setup" as const;
}

function momentumFor(stage:string,evidence:number,repetition:number){
  if(stage==="resolved")return "resolved" as const;
  if(stage==="landing")return "landing" as const;
  if(repetition>=4&&evidence<4)return "stalled" as const;
  if(evidence>=5)return "accelerating" as const;
  if(evidence>=3)return "steady" as const;
  return "slow" as const;
}

function nextShift(stage:string,domain:string,relationshipGate:string){
  if(stage==="resolved") return "none; preserve the result unless a new cause creates a new arc";
  if(stage==="dormant") return "reactivate only when present events make this thread relevant again";
  if(stage==="setup") return "one concrete behavior, obstacle, choice or consequence that proves the premise";
  if(stage==="developing") return domain==="relationship"&&relationshipGate==="hold"?"micro-shift only: changed access, honesty, routine or choice; no milestone":"one earned behavioral change or complication, not a dramatic leap";
  if(stage==="pressure") return "let prior behavior alter the response; escalation is optional, consequence or changed choice can count as progress";
  if(stage==="payoff_ready") return "allow a payoff only if the present scene naturally opens the door; payoff is not mandatory";
  return "land, resolve, or leave residue; do not reopen just to keep content flowing";
}

export function deriveNarrativeArcIntelligenceV344(args:AnyRow={}):NarrativeArcIntelligenceV344{
  const recent=arr(args.recentMessages), memories=arr(args.memories), milestones=arr(args.storyMilestones), storyArcs=arr(args.storyArcs), conflicts=arr(args.storyConflicts);
  const loops=loopData(recent);
  const pace=relationshipPace(args);
  const behavior=behaviorProgression(args);
  const resolvedArcLocks=uniq([...storyArcs,...conflicts].filter(r=>isResolved(r?.status)).map(label).filter(Boolean)).slice(0,12);
  const dormantArcs=uniq(storyArcs.filter(r=>isDormant(r?.status)).map(label).filter(Boolean)).slice(0,10);
  const milestoneBlob=norm(milestones.map(m=>clean(m?.title||m?.summary||m?.evidence,500)).join(" "));
  const arcs=storyArcs.map((row,index)=>{
    const title=label(row)||`Arc ${index+1}`; const domain=domainOf(row); const evidence=arcEvidenceCount(row,recent,memories,milestones);
    const titleTokens=norm(title).split(/\s+/).filter(x=>x.length>=4); const relevantSigs=[...loops.counts.entries()].filter(([sig])=>titleTokens.some(t=>sig.includes(t))||sig.includes(domain));
    const repetition=Math.max(Number(row?.repetition_count||row?.repetitionCount||0)||0,...relevantSigs.map(([,n])=>n),0);
    const payoffSeed=Boolean(row?.payoff_ready||row?.payoffReady)||titleTokens.some(t=>milestoneBlob.includes(t))&&evidence>=3;
    const stage=arcStage(row,evidence,repetition,payoffSeed);
    const blockers=uniq([
      ...(Array.isArray(row?.blockers)?row.blockers.map((x:any)=>clean(x,180)):[]),
      domain==="relationship"&&pace.gate==="repair_first"?"repair required before clean escalation":"",
      domain==="relationship"&&pace.gate==="hold"?"relationship evidence does not support a major milestone yet":"",
      repetition>=3&&evidence<4?"repeated scene shape risks stagnation":"",
    ]).filter(Boolean).slice(0,5);
    return {key:clean(row?.id||row?.key||title,120),title,domain,status:clean(row?.status||"active",70),stage,evidenceCount:evidence,repetitionCount:repetition,momentum:momentumFor(stage,evidence,repetition),blockers,nextAllowedShift:nextShift(stage,domain,pace.gate),payoffReady:stage==="payoff_ready"};
  }).slice(0,12);

  if(!arcs.some(a=>a.domain==="relationship")&&(pace.attraction.evidenceCount+pace.trust.evidenceCount+pace.vulnerability.evidenceCount+pace.commitment.evidenceCount>=2)){
    const evidence=pace.attraction.evidenceCount+pace.trust.evidenceCount+pace.vulnerability.evidenceCount+pace.commitment.evidenceCount;
    const stage=pace.gate==="progress_due"?"payoff_ready":pace.gate==="allow_meaningful_shift"?"developing":"setup";
    arcs.push({key:"relationship-evolution",title:"Relationship evolution",domain:"relationship",status:"derived",stage,evidenceCount:Math.min(8,evidence),repetitionCount:0,momentum:evidence>=5?"steady":"slow",blockers:pace.gate==="repair_first"?["repair required before clean escalation"]:[],nextAllowedShift:nextShift(stage,"relationship",pace.gate),payoffReady:stage==="payoff_ready"});
  }

  const stagnationWarnings:string[]=[];
  for(const loop of loops.loops)stagnationWarnings.push(`Repeated recent scene pattern: ${loop}. Change the consequence, tactic, setting function, outcome or behavioral choice instead of replaying the same beat.`);
  for(const a of arcs)if(a.momentum==="stalled")stagnationWarnings.push(`${a.title} is stalling: repetition is rising faster than meaningful evidence.`);
  const payoffCandidates=arcs.filter(a=>a.payoffReady&&a.stage!=="resolved").map(a=>`${a.title}: payoff is licensed, not compulsory.`).slice(0,8);
  const active=arcs.filter(a=>!["resolved","dormant"].includes(a.stage));
  const landing=active.filter(a=>a.stage==="landing");
  const meaningful=active.filter(a=>a.stage==="payoff_ready"||a.momentum==="accelerating");
  let progressionMode:NarrativeArcIntelligenceV344["progressionMode"]="hold";
  if(landing.length&&landing.length>=active.length) progressionMode="land_or_resolve";
  else if(meaningful.length||pace.gate==="progress_due") progressionMode="allow_meaningful_shift";
  else if(active.some(a=>a.evidenceCount>=2)||pace.gate==="allow_micro_shift"||pace.gate==="allow_meaningful_shift") progressionMode="allow_micro_shift";
  const escalationBudget=pace.gate==="repair_first"?1:progressionMode==="allow_meaningful_shift"?2:progressionMode==="allow_micro_shift"?1:0;
  return {
    arcs,
    relationshipPace:pace,
    behaviorProgression:behavior,
    stagnationWarnings:uniq(stagnationWarnings).slice(0,10),
    loopSignatures:loops.loops.slice(0,8),
    payoffCandidates,
    resolvedArcLocks,
    dormantArcs,
    conflictEvolution:conflictEvolution(conflicts,recent),
    progressionMode,
    escalationBudget,
    escalationPolicy:"Progress does not mean more drama. Spend escalation only when a causal event already supports it. Changed behavior, quieter trust, a new routine, a repaired expectation, a decision, or natural closure can advance an arc without a crisis.",
    personalityGuard:"Character growth may change coping behavior, habits, access and relationship-specific responses while preserving core temperament, values, voice, public identity and decision style. Love is not a personality replacement switch.",
    arcDependencyPolicy:"Major shifts require their prerequisites. Trust needs reliability; repaired intimacy needs repair evidence; commitment needs repeated mutual access/choice. One intense scene cannot satisfy an entire dependency chain.",
    payoffPolicy:"Setup → development → payoff is a permission structure, not a railroad. A payoff needs accumulated evidence and a natural opening in the current scene. Some setups may remain dormant or die naturally.",
    stagnationPolicy:"When the same conflict/banter/jealousy/withdrawal skeleton repeats, do not increase volume. Change what the character chooses, what consequence survives, who carries the interaction, or let the thread rest/resolve.",
    conflictEvolutionPolicy:"Old conflicts retain shared history. Later arguments can use shorthand, changed expectations and prior repair. Do not restart the premise from zero or resurrect a resolved conflict without a new cause.",
    instruction:"NARRATIVE ARC INTELLIGENCE + STORY EVOLUTION 3.44: let history change future choices without railroading the user. Track multiple arcs independently. Detect stagnation and evolve behavior instead of replaying the same scene skeleton. Relationship pace follows evidence, not turn count; no turbo romance and no eternal limbo when meaningful progression is earned. Resolved conflicts stay resolved unless a new cause creates a new conflict. Regression is allowed but never a total reset of proven growth. Protect core personality. Payoffs require setup and can be delayed naturally. Progress may be quiet. Never invent drama, a confession, a breakup, a crisis, a rival, a message or a milestone merely to move an arc.",
  };
}

function unsupportedMilestone(reply:string,engine:Partial<NarrativeArcIntelligenceV344>){
  const t=norm(reply); const pace=engine.relationshipPace;
  const big=/\b(?:i love you|confessed (?:his|her|their) love|asked (?:you|her|him) to be (?:his|her|their) (?:girlfriend|boyfriend|partner)|became official|were official|got engaged|proposed|first kiss|finally kissed|moved in together|we re together now|we are together now)\b/.test(t);
  if(!big)return false;
  if((engine.payoffCandidates||[]).length>0&&["allow_meaningful_shift","land_or_resolve"].includes(String(engine.progressionMode)))return false;
  return ["hold","allow_micro_shift"].includes(String(engine.progressionMode)) || pace?.gate==="hold" || pace?.gate==="repair_first";
}
function forcedArcProgression(reply:string,engine:Partial<NarrativeArcIntelligenceV344>){
  const t=norm(reply);
  const totalizing=/\b(?:everything changed between them|this changed everything|from that moment on .* relationship|all at once .* knew|suddenly .* relationship|there was no going back now|finally everything fell into place|the wall between them was gone for good)\b/.test(t);
  if(!totalizing)return false;
  // Even when a meaningful shift is licensed, totalizing prose overclaims what one beat can prove.
  return String(engine.progressionMode)!=="land_or_resolve" || !(engine.payoffCandidates||[]).length;
}
function resolvedConflictReopened(reply:string,engine:Partial<NarrativeArcIntelligenceV344>){
  const t=norm(reply); const locks=engine.resolvedArcLocks||[];
  if(!locks.length)return false;
  const activeLanguage=/\b(?:still fighting about|still unresolved|we never fixed|nothing was resolved|the same fight was back|the issue between them was still open|still needed to settle)\b/.test(t);
  if(!activeLanguage)return false;
  return locks.some(x=>norm(x).split(/\s+/).filter(w=>w.length>=4).some(w=>t.includes(w)))||locks.length===1;
}
function totalGrowthReset(reply:string,engine:Partial<NarrativeArcIntelligenceV344>){
  const retained=norm(engine.behaviorProgression?.retainedGrowth||""); if(!retained||/no durable/.test(retained))return false;
  return /\b(?:back to square one|all (?:his|her|their) progress (?:was|is) gone|nothing (?:he|she|they) learned mattered|exactly the same as (?:he|she|they) was at the start|reset to how (?:he|she|they) used to be|every bit of growth disappeared)\b/.test(norm(reply));
}
function personalityReplacement(reply:string){
  return /\b(?:became a completely different person|all (?:his|her|their) edge was gone|no trace of the old .* remained|turned into a golden retriever|was soft with everyone now|no longer had any of (?:his|her|their) old flaws|love had fixed (?:him|her|them))\b/.test(norm(reply));
}
function payoffWithoutSetup(reply:string,engine:Partial<NarrativeArcIntelligenceV344>){
  const t=norm(reply); const payoff=/\b(?:the payoff|finally paid off|culminated in|at last .* confessed|at last .* kissed|after all that build up|after all that buildup)\b/.test(t);
  return payoff&&!(engine.payoffCandidates||[]).length;
}
function dramaForProgress(reply:string,engine:Partial<NarrativeArcIntelligenceV344>){
  if(Number(engine.escalationBudget||0)>=2)return false;
  const t=norm(reply);
  const big=/\b(?:car crash|hospital|arrested|expelled|suspended|violent fight|punched|gun|knife|death|died|breakup|broke up|cheated|pregnan|secret sibling|inheritance scandal|family scandal|blackmail|threatened his life|threatened her life)\b/.test(t);
  const meta=/\b(?:to move things forward|to finally change things|so something would happen|needed something dramatic)\b/.test(t);
  return big&&meta;
}
function repeatedLoop(reply:string,engine:Partial<NarrativeArcIntelligenceV344>){
  const loops=engine.loopSignatures||[]; if(!loops.length)return false;
  const sig=structuralSignature(reply); if(sig==="ordinary")return false;
  return loops.some(x=>x.startsWith(sig+" ×")||x.startsWith(sig+" x"));
}
function arcExposition(reply:string){
  const t=norm(reply);
  const announce=/\b(?:their relationship had evolved|their dynamic had changed|the arc had shifted|he had finally grown as a person|she had finally grown as a person|this was character development|things were different now between them)\b/.test(t);
  const behavior=/\b(?:stayed|left|asked|answered|apolog|refused|returned|waited|chose|said|told|admitted|kept|listened|walked|sat|called|texted|showed up)\b/.test(t);
  return announce&&!behavior;
}

export function narrativeArcIntelligenceV344Issues(args:{reply?:string;engine?:Partial<NarrativeArcIntelligenceV344>;latestUserMessage?:string;recentCharacterReplies?:string[]}={}):string[]{
  const reply=String(args.reply||""); const engine=args.engine||{}; const issues:string[]=[];
  if(unsupportedMilestone(reply,engine))issues.push("relationship_pace_jump");
  if(forcedArcProgression(reply,engine))issues.push("arc_forced_progression");
  if(resolvedConflictReopened(reply,engine))issues.push("resolved_arc_reopened_without_cause");
  if(totalGrowthReset(reply,engine))issues.push("arc_growth_total_reset");
  if(personalityReplacement(reply))issues.push("arc_personality_replacement");
  if(payoffWithoutSetup(reply,engine))issues.push("payoff_without_setup");
  if(dramaForProgress(reply,engine))issues.push("drama_escalation_for_progress");
  if(repeatedLoop(reply,engine))issues.push("arc_stagnation_replay");
  if(arcExposition(reply))issues.push("arc_progress_exposition");
  return uniq(issues);
}

function stripSentences(reply:string,patterns:RegExp[]){
  return String(reply||"").split(/(?<=[.!?])\s+(?=["“'A-Z0-9])/).filter(sentence=>!patterns.some(p=>p.test(norm(sentence)))).join(" ").replace(/\s{2,}/g," ").trim();
}

export function sanitizeNarrativeArcIntelligenceV344Reply(reply:string,issues:string[]=[]){
  const active=new Set(issues||[]); let out=String(reply||"").trim();
  if(active.has("relationship_pace_jump")||active.has("payoff_without_setup")){
    out=stripSentences(out,[/\b(?:i love you|confessed .* love|became official|got engaged|proposed|first kiss|finally kissed|moved in together|girlfriend|boyfriend|partner)\b/]);
  }
  if(active.has("arc_forced_progression")||active.has("arc_progress_exposition")){
    out=stripSentences(out,[/\b(?:everything changed between them|this changed everything|their relationship had evolved|their dynamic had changed|there was no going back now|things were different now between them|finally everything fell into place)\b/]);
  }
  if(active.has("resolved_arc_reopened_without_cause")){
    out=stripSentences(out,[/\b(?:still fighting about|still unresolved|we never fixed|nothing was resolved|same fight was back|still needed to settle)\b/]);
  }
  if(active.has("arc_growth_total_reset")||active.has("arc_personality_replacement")){
    out=stripSentences(out,[/\b(?:back to square one|all .* progress .* gone|growth disappeared|completely different person|all .* edge was gone|golden retriever|love had fixed)\b/]);
  }
  if(active.has("drama_escalation_for_progress")){
    out=stripSentences(out,[/\b(?:car crash|hospital|arrested|expelled|violent fight|punched|breakup|broke up|cheated|blackmail|needed something dramatic|to move things forward)\b/]);
  }
  if(active.has("arc_stagnation_replay")){
    // Do not rewrite the character's substantive dialogue deterministically; only strip explicit filler gestures/loop framing.
    out=out.replace(/\b(?:his|her|their) jaw (?:tightened|clenched)[^.?!]*[.?!]?/gi,"").replace(/\b(?:he|she|they) (?:stormed|walked) away again[^.?!]*[.?!]?/gi,"").replace(/\s{2,}/g," ").trim();
  }
  return out.trim();
}
