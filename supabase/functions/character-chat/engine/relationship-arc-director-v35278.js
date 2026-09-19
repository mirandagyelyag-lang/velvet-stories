// Velvet Stories v3.52.78 · Relationship Arc Director
// Trope is a route, not a speed boost. The character owns their side of romance;
// the user's reciprocity is never inferred.

const clean=(v="",n=1400)=>String(v??"").replace(/\s+/g," ").trim().slice(0,n);
const norm=(v="")=>clean(v,18000).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[’']/g,"");
const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,Number(n)||0));

const STAGES=[
  "friction_or_distance",
  "attention",
  "preference",
  "pull",
  "awareness",
  "vulnerable_trust",
  "deliberate_choice",
  "committed",
];

const LABELS={
  friction_or_distance:"friction / distance",
  attention:"selective attention",
  preference:"preference / repeated choosing",
  pull:"romantic pull",
  awareness:"recognized feelings",
  vulnerable_trust:"vulnerable trust",
  deliberate_choice:"deliberate choosing",
  committed:"committed relationship",
};

function relationshipText(character={},relationship={}){
  return norm([
    character?.relationship, character?.scenario, character?.description,
    relationship?.stage, relationship?.status, relationship?.relationship_phase,
    relationship?.current_dynamic, relationship?.relationship_signature,
  ].filter(Boolean).join(" | "));
}

function tropeRoute(character={},relationship={}){
  const t=relationshipText(character,relationship);
  if(/enemies to lovers|rivals to lovers/.test(t)) return {
    id:"enemies_to_lovers",
    steps:["friction","reluctant attention","earned respect / preference","attraction leaking through conflict","recognized feelings / denial","trust under pressure","deliberate choice despite history","commitment with remembered friction"],
  };
  if(/friends to lovers|best friends to lovers/.test(t)) return {
    id:"friends_to_lovers",
    steps:["familiar bond","changed attention","selective preference","new romantic tension","recognition that friendship changed","risking familiar safety","deliberate romantic choice","commitment without deleting friendship"],
  };
  if(/best friend.?s older brother|best friend.?s brother|brother.?s best friend/.test(t)) return {
    id:"forbidden_familiarity",
    steps:["familiar boundary","selective attention","private preference","attraction under restraint","awareness + social complication","vulnerability despite boundary","deliberate choice with consequence","commitment after social reality is faced"],
  };
  if(/she fell first.*he fell harder|fell first.*fell harder/.test(t)) return {
    id:"fell_first_fell_harder",
    steps:["later-starting interest","attention","preference","growing pull","recognition","rapidly deepening investment once earned","character takes costly initiative","commitment"],
  };
  if(/slow burn|slowburn/.test(t)) return {
    id:"slow_burn",
    steps:["distance / ordinary baseline","attention","preference","pull","awareness","vulnerable trust","deliberate choice","commitment"],
  };
  return {
    id:"organic_romance",
    steps:["baseline","attention","preference","pull","awareness","vulnerable trust","deliberate choice","commitment"],
  };
}

function explicitCanonFloor(character={},relationship={}){
  const t=relationshipText(character,relationship);
  if(/\b(?:married|husband|wife|fiance|fiancee|engaged|exclusive|boyfriend|girlfriend|officially together|committed relationship)\b/.test(t)) return 7;
  if(/\b(?:in love|loves you|deeply in love)\b/.test(t)) return 6;
  if(/\b(?:dating|seeing each other|relationship|together)\b/.test(t)) return 6;
  if(/\b(?:crush|likes you|likes the user|into you|romantic tension)\b/.test(t)) return 2;
  return 0;
}

function stageIndexFromState({emotionState={},chemistry={},character={},relationship={}}={}){
  const axes=chemistry?.axes||{};
  const attraction=Math.max(clamp(axes?.attraction),clamp(emotionState?.attraction));
  const trust=Math.max(clamp(axes?.trust),clamp(emotionState?.trust));
  const comfort=clamp(axes?.comfort);
  const attachment=Math.max(clamp(axes?.attachment),clamp(emotionState?.attachment));
  const commitment=clamp(axes?.commitment);
  const awareness=clamp(emotionState?.awareness_of_feelings);
  const vulnerability=clamp(emotionState?.vulnerability);

  let idx=0;
  if(attraction>=15||attachment>=18) idx=1;
  if(attraction>=28||attachment>=28||comfort>=30) idx=2;
  if(attraction>=40&&attachment>=28) idx=3;
  if((awareness>=35&&attraction>=40)||(attraction>=55&&attachment>=40)) idx=4;
  if(trust>=45&&attachment>=45&&(vulnerability>=28||awareness>=48||comfort>=50)) idx=5;
  if((awareness>=60&&attachment>=58&&trust>=48)||(commitment>=48&&attachment>=55)) idx=6;
  if(commitment>=70) idx=7;

  return Math.max(idx,explicitCanonFloor(character,relationship));
}

function previousStage(behavior={}){
  const raw=String(behavior?.relationship_arc_stage||"");
  const idx=STAGES.indexOf(raw);
  return { exists:idx>=0, index:idx>=0?idx:0 };
}

function conflictMode(chemistry={},emotionState={}){
  const conflict=Number(chemistry?.conflictResidue?.level)||0;
  const resentment=clamp(emotionState?.resentment);
  const unresolved=clamp(emotionState?.unresolved_intensity);
  if(chemistry?.paceGate?.status==="repair_first"||conflict>=45||resentment>=45) return "repair";
  if(conflict>=20||resentment>=28||unresolved>=38) return "setback";
  if(chemistry?.paceGate?.status==="progress_due") return "progress_due";
  if(chemistry?.paceGate?.status==="allow_progress") return "open";
  return "hold";
}

function allowedNext(idx,mode){
  if(mode==="repair") return "repair access/trust first; attraction may remain but no clean milestone";
  if(mode==="setback") return "show residue or changed access; do not reset attraction/history and do not force progression";
  if(idx>=7) return "deepen ordinary commitment through behavior; do not manufacture a bigger milestone every scene";
  return `one earned step toward ${LABELS[STAGES[idx+1]]}; never skip multiple stages`;
}

function forbiddenFor(idx,mode){
  const out=[];
  if(idx<=1) out.push("love confession","relationship labels","possessive ownership","destiny language");
  if(idx<=2) out.push("sudden devotion","acting emotionally exclusive without canon");
  if(idx<=3) out.push("I love you as an unearned escalation","commitment talk as if already mutual");
  if(idx<=4) out.push("assuming the user reciprocates","speaking as an established couple without authored evidence");
  if(mode==="repair") out.push("kiss/confession used as a shortcut around repair","instant forgiveness");
  return out;
}

export function deriveRelationshipArcStateV35278({
  character={},relationship={},behavior={},emotionState={},chemistry={},narrativeArc={}
}={}){
  const route=tropeRoute(character,relationship);
  const derived=stageIndexFromState({emotionState,chemistry,character,relationship});
  const previous=previousStage(behavior);
  const prev=previous.index;
  const explicitFloor=explicitCanonFloor(character,relationship);

  // First install may catch up to already-earned history. Once an arc stage exists,
  // one saved turn may advance at most one stage. Setbacks change mode/access instead
  // of deleting accumulated history.
  const earned=Math.max(explicitFloor,prev,derived);
  const idx=previous.exists
    ? Math.max(explicitFloor,prev,Math.min(earned,prev+1))
    : Math.max(explicitFloor,derived);
  const stage=STAGES[Math.min(idx,STAGES.length-1)];
  const mode=conflictMode(chemistry,emotionState);
  const routeStep=route.steps[Math.min(idx,route.steps.length-1)]||route.steps.at(-1);
  const next=allowedNext(idx,mode);

  return {
    version:"3.52.78",
    route:route.id,
    stage,
    stage_index:idx,
    route_step:routeStep,
    mode,
    next_allowed_shift:next,
    forbidden:forbiddenFor(idx,mode),
    chemistry_gate:String(chemistry?.paceGate?.status||"hold"),
    narrative_gate:String(narrativeArc?.relationshipPace?.gate||"hold"),
  };
}

function stagePrompt(state={}){
  const idx=Number(state.stage_index)||0;
  const current=LABELS[state.stage]||state.stage;
  const prior=idx>0?LABELS[STAGES[idx-1]]:null;
  const next=idx<STAGES.length-1?LABELS[STAGES[idx+1]]:null;
  return `CURRENT CHARACTER-SIDE ARC: stage ${idx}/7 · ${current}. ${prior?`Already earned beneath it: ${prior}. `:""}${next?`Next possible layer: ${next}.`:"No higher relationship label is required."}`;
}

export function buildRelationshipArcDirectorV35278({
  character={},relationship={},behavior={},emotionState={},chemistry={},narrativeArc={},
  latestUserMessage="",recentCharacterReplies=[],worldConsequences={}
}={}){
  const state=deriveRelationshipArcStateV35278({character,relationship,behavior,emotionState,chemistry,narrativeArc});
  const route=tropeRoute(character,relationship);
  const activeConsequences=(Array.isArray(worldConsequences?.activeChains)?worldConsequences.activeChains:[]).slice(0,5);

  return [
    "RELATIONSHIP ARC DIRECTOR 3.52.78 · CREATOR RULE (hidden):",
    `ROUTE=${state.route}. ROUTE STEP=${state.route_step}. MODE=${state.mode}. CHEMISTRY GATE=${state.chemistry_gate}. NARRATIVE GATE=${state.narrative_gate}.`,
    stagePrompt(state),
    `ROUTE MAP: ${route.steps.map((x,i)=>`${i}:${x}`).join(" → ")}.`,
    "TROPE IS DIRECTION, NOT DESTINY OR SPEED. Enemies-to-lovers, friends-to-lovers, slow burn, etc. define the shape of earned change. They never guarantee that this particular scene must become romantic, and they never override visible canon.",
    "THE CHARACTER OWNS INITIATIVE FOR THEIR SIDE. When progression is genuinely due and no boundary blocks it, the CHARACTER should make the next earned move instead of waiting for the user to manufacture romantic momentum. One move is enough: choose time together, reveal a partial truth, make a specific invitation, repair something, take a social risk, admit a preference, or act on recognized feeling.",
    "INITIATIVE ≠ CONSTANT COURTSHIP. After one meaningful relationship move, ordinary life may resume. Do not make every scene a romantic advancement checkpoint.",
    "ONE DIMENSION AT A TIME. A strong scene can increase attraction, trust, comfort, vulnerability, awareness OR commitment without moving all axes together. A kiss does not automatically equal trust. Jealousy does not equal love. Vulnerability does not equal exclusivity.",
    "ONE STAGE MAX PER EARNED BEAT. Never leap several relationship stages because a scene was intense. Explicit creator canon may start at a later stage; otherwise progression accumulates through repeated behavior and consequences.",
    "SETBACKS CHANGE ACCESS, NOT HISTORY. Conflict, rejection, another romantic interest, distance or a bad choice may reduce warmth/trust or create repair debt without deleting established attraction, familiarity, longing or prior vulnerability.",
    "THIRD PARTIES ARE REAL BRANCHES, NOT PAUSE BUTTONS. The character may genuinely date/kiss/choose someone else. That can delay this arc, complicate awareness, alter trust or create consequences. It does not automatically prove the central romance, and it does not erase it either.",
    "NO MUTUALITY HALLUCINATION. This director tracks the CHARACTER'S arc only. Never infer that the user is falling, jealous, ready, attracted, in love, forgiving, exclusive or waiting. The user's side advances only through user-authored evidence.",
    "NO TROPE SELF-AWARENESS. Characters do not know they are in 'enemies to lovers' or 'slow burn'. Never speak the route label or narrate destiny.",
    "NO DESTINY SHORTCUTS: avoid 'we both know', 'you feel it too', 'we were always going to end up here', 'you're mine', or relationship labels before authored/canonical reciprocity earns them.",
    state.mode==="repair"
      ? "REPAIR MODE: romance cannot be used to skip the wound. The character may still feel attraction/attachment, but the next meaningful relationship movement must address access, accountability, trust, boundaries or changed behavior first."
      : state.mode==="setback"
        ? "SETBACK MODE: let friction matter. Preserve what was earned underneath while allowing colder access, avoidance, competing priorities, another person, pride or uncertainty."
        : state.mode==="progress_due"
          ? "PROGRESSION IS DUE: do not stall behind another neutral glance or generic line. Let the character initiate ONE concrete stage-appropriate change if the live scene naturally permits it."
          : "HOLD/OPEN MODE: allow the current stage to breathe. Progress only when the live beat provides evidence or opportunity.",
    `NEXT ALLOWED SHIFT: ${state.next_allowed_shift}.`,
    `FORBIDDEN RIGHT NOW: ${state.forbidden.length?state.forbidden.join(" | "):"no special extra restriction beyond canon, consent and pacing"}.`,
    `ACTIVE CONSEQUENCE PRESSURE: ${clean(JSON.stringify(activeConsequences),1500)||"none"}.`,
    `RECENT CHARACTER REPLIES: ${clean((Array.isArray(recentCharacterReplies)?recentCharacterReplies.slice(-5):[]).join(" | "),1200)||"none"}. LATEST USER: ${clean(latestUserMessage,500)||"none"}.`,
    "PERSISTENCE OUTPUT: relationship_arc_stage, relationship_arc_route, relationship_arc_mode, relationship_arc_last_shift and relationship_arc_next_gate summarize the CHARACTER'S earned arc only. Never store invented user reciprocity.",
  ].join("\n");
}

export function relationshipArcDirectorV35278Issues({
  reply="",state={},latestUserMessage=""
}={}){
  const issues=[];
  const t=norm(reply);
  const idx=Number(state?.stage_index)||0;

  if(idx<=2 && /\b(?:i love you|im in love with you|i am in love with you|youre mine|you are mine|my girlfriend|my boyfriend|we re together|we are together)\b/.test(t)){
    issues.push("relationship_arc_major_leap");
  }
  if(idx<=4 && /\b(?:we both know|you feel it too|you love me too|you want me too|youre in love with me|you are in love with me)\b/.test(t)
    && !/\b(?:i love you too|i want you too|i feel it too|im in love with you too|i am in love with you too)\b/.test(norm(latestUserMessage))){
    issues.push("relationship_arc_user_reciprocity_invented");
  }
  if(state?.mode==="repair" && /\b(?:kissed you|pulled you into a kiss|i love you|lets just forget|let s just forget|everything is fine now)\b/.test(t)){
    issues.push("relationship_arc_repair_bypassed");
  }
  if(/\b(?:enemies to lovers|friends to lovers|slow burn|fell harder|this trope|we were always going to end up together)\b/.test(t)){
    issues.push("relationship_arc_trope_leaked");
  }
  return [...new Set(issues)];
}

export { STAGES as RELATIONSHIP_ARC_STAGES_V35278 };
