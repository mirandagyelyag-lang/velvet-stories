export type LongTermCharacterEvolution = {
  coreIdentity: string[];
  mutableDefenses: string[];
  learnedBehavior: string[];
  durableShifts: Array<{ pattern:string; evidenceCount:number; scope:string; status:string }>;
  relationshipSpecificGrowth: string[];
  activeBeliefs: string[];
  challengedBeliefs: string[];
  growthMilestones: string[];
  regression: { allowed:boolean; pressure:string; retainedGrowth:string; policy:string };
  growthGate: { status:"hold"|"observe"|"consolidate"|"allow_visible_change"; evidenceCount:number; threshold:number; policy:string };
  offscreenGrowth: { allowed:boolean; pressureSources:string[]; policy:string };
  antiReplacement: string;
  instruction: string;
};

type DeriveArgs = {
  character?: Record<string, unknown>;
  developmentState?: Record<string, any>;
  intelligenceState?: Record<string, any>;
  memories?: Array<Record<string, any>>;
  milestones?: Array<Record<string, any>>;
  activeArcs?: Array<Record<string, any>>;
  recentMessages?: Array<Record<string, any>>;
  relationshipChemistry?: Record<string, any>;
  latestUserMessage?: string;
};

type IssueArgs = {
  reply?: string;
  latestUserMessage?: string;
  recentCharacterReplies?: string[];
  engine?: Partial<LongTermCharacterEvolution>;
  character?: Record<string, unknown>;
  developmentState?: Record<string, any>;
};

const text=(v:any)=>String(v??"").replace(/\s+/g," ").trim();
const norm=(v:any)=>text(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[’']/g,"'").replace(/[^a-z0-9\s'-]/g," ").replace(/\s+/g," ").trim();
const uniq=(xs:string[])=>[...new Set(xs.map(text).filter(Boolean))];
const list=(v:any)=>Array.isArray(v)?v:[];

function profileBlob(character:Record<string,unknown>={}){
  return norm([
    character.personality,character.description,character.role,character.relationship,character.world,character.scenario,
    character.core_motivation,character.coreMotivation,character.emotional_defense,character.emotionalDefense,
    character.character_values,character.values,character.fears,character.habits,character.contradictions,
    character.conflict_style,character.conflictStyle,character.affection_style,character.affectionStyle,
    character.growth_direction,character.growthDirection,character.softening_triggers,character.softeningTriggers,
  ].filter(Boolean).join(" | "));
}
function sentenceBits(value:any){return text(value).split(/[.;|]/).map((x)=>text(x)).filter((x)=>x.length>=4);}
function extractCoreIdentity(character:Record<string,unknown>={}){
  const bits=[
    ...sentenceBits(character.core_motivation||character.coreMotivation),
    ...sentenceBits(character.character_values||character.values),
    ...sentenceBits(character.personality),
    ...sentenceBits(character.contradictions),
  ];
  const profile=profileBlob(character);
  if(/\b(?:reserved|guarded|stoic|cold|private)\b/.test(profile)) bits.push("guarded/private baseline");
  if(/\b(?:direct|blunt|honest|straightforward)\b/.test(profile)) bits.push("direct communication baseline");
  if(/\b(?:sarcastic|teasing|playful|dry humor)\b/.test(profile)) bits.push("established humor style");
  if(/\b(?:feared|intimidating|powerful|dominant|respected)\b/.test(profile)) bits.push("public presence and status remain identity-bearing");
  return uniq(bits).slice(0,7);
}
function extractMutableDefenses(character:Record<string,unknown>={}){
  const p=profileBlob(character), out:string[]=[];
  const explicit=text(character.emotional_defense||character.emotionalDefense);
  if(explicit) out.push(...sentenceBits(explicit));
  if(/\b(?:avoid|withdraw|leave when|runs? away|distance|shut down|stonewall)\b/.test(p)) out.push("withdrawal/avoidance under emotional pressure");
  if(/\b(?:sarcastic|teasing|joke|humor)\b/.test(p)) out.push("humor as a possible defense");
  if(/\b(?:control|controlling|protective|possessive)\b/.test(p)) out.push("control/protection as a pressure response");
  if(/\b(?:proud|stubborn|guarded|reserved)\b/.test(p)) out.push("pride/guardedness delays vulnerable admission");
  return uniq(out).slice(0,6);
}
function behaviorFromState(development:Record<string,any>={}){
  const out:string[]=[];
  for(const key of ["retained_growth","repair_progress","private_pattern","voice_shift","trust_direction","growth_behavior_shift","regression_pattern"]){
    if(text(development?.[key])) out.push(text(development[key]));
  }
  for(const item of list(development?.durable_behavior_shifts)){
    const pattern=text(item?.pattern||item?.shift||item);
    if(pattern) out.push(pattern);
  }
  return uniq(out).slice(0,8);
}
function evidenceRows(development:Record<string,any>={}){
  return list(development?.growth_evidence).map((item:any)=>({
    pattern:text(item?.pattern||item?.shift), evidenceCount:Math.max(0,Number(item?.evidence_count||item?.evidenceCount||0)),
    scope:text(item?.scope||"general"), status:text(item?.status||"candidate"),
  })).filter((x:any)=>x.pattern).slice(-8);
}
function beliefRows(development:Record<string,any>={},character:Record<string,unknown>={}){
  const out:string[]=[];
  out.push(...list(development?.active_beliefs).map(text));
  const p=profileBlob(character);
  if(/\b(?:trust issues|doesn t trust|does not trust|people leave|abandon)\b/.test(p)) out.push("closeness can end in abandonment or loss");
  if(/\b(?:independent|self reliant|self-reliant|hates relying|doesn t need anyone|does not need anyone)\b/.test(p)) out.push("depending on someone threatens autonomy");
  if(/\b(?:useful|fixes things|acts of service|provider|protector)\b/.test(p)) out.push("being useful can feel safer than verbal vulnerability");
  if(/\b(?:weakness|vulnerability|guarded|proud)\b/.test(p)) out.push("visible vulnerability can feel costly");
  return uniq(out).slice(0,6);
}
function milestoneRows(development:Record<string,any>={},memories:Array<Record<string,any>>=[],milestones:Array<Record<string,any>>=[]){
  const stored=list(development?.growth_milestones).map((x:any)=>text(x?.event||x?.label||x));
  const fromMilestones=list(milestones).map((x:any)=>text(x?.label||x?.title||x?.detail)).filter((x)=>/first|apolog|stayed|stay|asked for help|admit|vulnerab|boundary|repair|trust|confess|initiated/i.test(x));
  const fromMemory=list(memories).map((x:any)=>text(x?.content)).filter((x)=>/first time|apolog|stayed|asked for help|admitted|vulnerab|boundary|repair|earned trust|initiated/i.test(x));
  return uniq([...stored,...fromMilestones,...fromMemory]).slice(-8);
}
function recentEvidenceCount(recentMessages:Array<Record<string,any>>=[]){
  const rows=list(recentMessages).slice(-18).map((m:any)=>norm(m?.content||m?.text||m?.message));
  return rows.filter((x)=>/\b(?:stayed|didn t leave|did not leave|apolog|came back|asked for help|admit|told you|trusted|let you|opened up|kept his word|kept her word|respected|backed off|gave space|checked in)\b/.test(x)).length;
}
function pressureSources(activeArcs:Array<Record<string,any>>=[],development:Record<string,any>={}){
  return uniq([
    ...list(activeArcs).map((x:any)=>text(x?.title||x?.arc||x?.next_pressure||x?.status)).filter(Boolean),
    text(development?.flaw_pressure),text(development?.setback_pressure),text(development?.independent_priority),
  ]).slice(0,5);
}

export function deriveLongTermCharacterEvolution(args:DeriveArgs={}):LongTermCharacterEvolution{
  const character=args.character||{};
  const development=args.developmentState||{};
  const durable=evidenceRows(development);
  const repeatedProof=Math.max(recentEvidenceCount(args.recentMessages||[]), ...durable.map((x)=>x.evidenceCount), 0);
  const threshold=3;
  const status:LongTermCharacterEvolution["growthGate"]["status"] = repeatedProof>=4?"allow_visible_change":repeatedProof>=3?"consolidate":repeatedProof>=1?"observe":"hold";
  const relationshipSpecific=uniq([
    ...list(development?.relationship_specific_growth).map((x:any)=>text(x?.pattern||x)),
    text(development?.relationship_growth),
  ]).slice(0,6);
  const challenged=uniq(list(development?.challenged_beliefs).map((x:any)=>text(x?.belief||x))).slice(0,6);
  const retained=text(development?.retained_growth)||durable.filter((x)=>x.status==="durable").map((x)=>x.pattern).slice(-2).join("; ")||"no durable shift has been proven yet";
  const pressures=pressureSources(args.activeArcs||[],development);
  return {
    coreIdentity:extractCoreIdentity(character),
    mutableDefenses:extractMutableDefenses(character),
    learnedBehavior:behaviorFromState(development),
    durableShifts:durable,
    relationshipSpecificGrowth:relationshipSpecific,
    activeBeliefs:beliefRows(development,character),
    challengedBeliefs:challenged,
    growthMilestones:milestoneRows(development,args.memories||[],args.milestones||[]),
    regression:{
      allowed:true,
      pressure:text(development?.setback_pressure)||pressures[0]||"ordinary stress can reactivate an old defense without erasing proven growth",
      retainedGrowth:retained,
      policy:"Regression is state-dependent, not a reset. Under strong pressure an old defense may resurface, but proven skills, trust, memories and later repair remain available unless the story provides repeated evidence of genuine deterioration.",
    },
    growthGate:{
      status,evidenceCount:repeatedProof,threshold,
      policy:"A single tender conversation, apology, kiss or conflict cannot rewrite personality. Candidate changes need repeated behavioral evidence across separate beats. High-impact events can accelerate evidence, but core identity still changes slowly.",
    },
    offscreenGrowth:{
      allowed:pressures.length>0,
      pressureSources:pressures,
      policy:"Off-screen life may create small consequences, practice, fatigue, confidence, setbacks or new context when an established domain/arc supplies the cause. Never invent a total personality transformation off-screen or skip a major relationship milestone the user should witness.",
    },
    antiReplacement:"Growth reveals range; it does not replace the character. Falling in love does not convert a guarded, intimidating, sarcastic, ambitious or difficult character into a generic soft caretaker. Keep voice, values, social identity, flaws and decision style recognizable while specific defenses and learned behaviors can evolve.",
    instruction:"LONG-TERM CHARACTER EVOLUTION 3.38.0: same person, different history. Preserve core temperament/values/voice/social identity. Let defenses and learned behaviors change only through accumulated evidence. Relationship-specific growth may exist without global personality change. Show growth behaviorally rather than announcing it. Allow relapse under pressure without erasing retained growth. Beliefs can be challenged gradually. Milestones record first meaningful behavioral changes, not every warm line. Off-screen growth must come from established life/arc pressure. Never use romance as a personality replacement switch.",
  };
}

function coreGuarded(character:Record<string,unknown>={}){
  return /\b(?:guarded|reserved|stoic|cold|private|avoidant|intimidating|feared|proud|sarcastic|stubborn|independent)\b/.test(profileBlob(character));
}
function instantRewrite(reply:string, latest:string, character:Record<string,unknown>={}){
  if(!coreGuarded(character)) return false;
  const r=norm(reply), u=norm(latest);
  const grand=/\b(?:all (?:his|her|their) walls (?:were )?(?:gone|down)|no longer (?:guarded|avoidant|afraid|distant|closed off)|completely open|an open book now|finally learned to communicate|changed completely|a different person now|nothing like (?:himself|herself|themselves)|left all that behind)\b/.test(r);
  const tinyTurn=u.length<260 && !/\b(?:months|years|weeks|over time|again and again|repeatedly|after everything|therapy|life changing|life-changing)\b/.test(u);
  return grand && tinyTurn;
}
function personalityReplacement(reply:string,character:Record<string,unknown>={}){
  const r=norm(reply); if(!coreGuarded(character)) return false;
  return /\b(?:(?:became|had become) (?:a )?(?:total|complete)? ?(?:softie|golden retriever|open book)|all (?:his |her |their )?edge (?:was |were )?gone|all his rough edges vanished|all her rough edges vanished|the old .* was gone|he was soft now period|she was soft now period|nothing guarded remained|completely different man|completely different woman)\b/.test(r);
}
function growthExposition(reply:string){
  const r=norm(reply);
  const announce=/\b(?:he had grown|she had grown|they had grown|he had changed|she had changed|they had changed|growth had changed him|growth had changed her|he was finally better now|she was finally better now)\b/.test(r);
  const behavior=/\b(?:stayed|asked|answered|apolog|backed off|waited|returned|came back|admitted|said|didn t leave|did not leave|kept|paused|listened|told|let)\b/.test(r);
  return announce && !behavior;
}
function regressionReset(reply:string,engine:Partial<LongTermCharacterEvolution>={}){
  const retained=norm(engine?.regression?.retainedGrowth||"");
  if(!retained || /no durable shift/.test(retained)) return false;
  return /\b(?:back to square one|none of (?:his|her|their) progress mattered|nothing had changed after all|all the progress was gone|everything (?:he|she|they) learned was gone|right back to who (?:he|she|they) was at the start)\b/.test(norm(reply));
}
function unearnedOffscreenTransformation(reply:string,engine:Partial<LongTermCharacterEvolution>={}){
  const r=norm(reply);
  if(!/\b(?:since you last saw|while you were gone|over the past few days|in the days since|off screen|off-screen)\b/.test(r)) return false;
  if(engine?.offscreenGrowth?.allowed) return /\b(?:(?:had )?completely changed|totally different person|no longer guarded|all his issues were gone|all her issues were gone)\b/.test(r);
  return /\b(?:(?:had )?completely changed|changed completely|became a different person|learned to trust everyone|stopped being guarded|no longer guarded|fixed himself|fixed herself)\b/.test(r);
}
function relationshipGlobalization(reply:string,engine:Partial<LongTermCharacterEvolution>={}){
  if(!(engine.relationshipSpecificGrowth||[]).length) return false;
  const r=norm(reply);
  return /\b(?:he was like this with everyone now|she was like this with everyone now|he trusted people now|she trusted people now|he had become open with everyone|she had become open with everyone|no longer kept anyone at a distance)\b/.test(r);
}

export function longTermCharacterEvolutionIssues(args:IssueArgs={}):string[]{
  const reply=String(args.reply||"");
  const issues:string[]=[];
  if(instantRewrite(reply,args.latestUserMessage||"",args.character||{})) issues.push("instant_personality_rewrite");
  if(personalityReplacement(reply,args.character||{})) issues.push("relationship_personality_replacement");
  if(growthExposition(reply)) issues.push("growth_exposition_without_behavior");
  if(regressionReset(reply,args.engine||{})) issues.push("growth_regression_reset");
  if(unearnedOffscreenTransformation(reply,args.engine||{})) issues.push("unearned_offscreen_transformation");
  if(relationshipGlobalization(reply,args.engine||{})) issues.push("relationship_growth_globalized");
  return [...new Set(issues)];
}

function stripGrowthAnnouncements(reply:string){
  return String(reply||"")
    .replace(/[^.!?\n]{0,120}\b(?:he had grown|she had grown|they had grown|he had changed|she had changed|they had changed|he was finally better now|she was finally better now|they were finally better now|finally learned to communicate|changed completely|a different person now|back to square one|all the progress was gone|nothing had changed after all)\b[^.!?\n]{0,140}[.!?]?/gi," ")
    .replace(/\s+/g," ").trim();
}
export function sanitizeLongTermCharacterEvolutionReply(reply:string,issues:string[]=[]){
  const active=new Set(issues||[]); let out=String(reply||"").trim();
  if(["instant_personality_rewrite","relationship_personality_replacement","growth_exposition_without_behavior","growth_regression_reset","unearned_offscreen_transformation","relationship_growth_globalized"].some((x)=>active.has(x))) out=stripGrowthAnnouncements(out);
  return out.trim();
}
