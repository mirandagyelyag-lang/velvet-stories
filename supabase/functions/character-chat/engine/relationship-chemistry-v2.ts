export type RelationshipChemistryV2 = {
  axes: { attraction:number; trust:number; comfort:number; attachment:number; commitment:number };
  desireDefense: { desire:string; defense:string; visibleRule:string };
  asymmetry: { characterView:string; userViewStatus:"unknown"|"explicit"; userView:string; policy:string };
  reciprocity: { userApproach:number; userDistance:number; characterApproach:number; characterDistance:number; balance:string; policy:string };
  affectionLanguage: { primary:string; secondary:string; avoid:string[]; policy:string };
  personalityManifestation: { attractionCanonExplicit:boolean; attractionVisibility:string; confidenceStyle:string; coldStyle:string; dangerStyle:string; differentiationRule:string; policy:string };
  jealousy: { stage:"off"|"notice"|"friction"|"confront"; evidence:string[]; style:string; policy:string };
  vulnerabilityHangover: { active:boolean; source:string; policy:string };
  conflictResidue: { active:boolean; level:number; policy:string };
  repairStyle:string;
  trajectory:string;
  paceGate: { status:"hold"|"allow_progress"|"progress_due"|"repair_first"; allowed:string[]; forbidden:string[]; policy:string };
  historyAnchors:string[];
  thirdPartyAwareness: { evidence:string[]; policy:string };
  antiCloneSignature:string;
  instruction:string;
};

const norm=(v:any)=>String(v??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[’']/g,"'").replace(/[^a-z0-9\s'-]/g," ").replace(/\s+/g," ").trim();
const text=(v:any)=>String(v??"").trim();
const uniq=(xs:string[])=>[...new Set(xs.map(text).filter(Boolean))];
const clamp=(n:any,f=0)=>{const x=Number(n);return Math.max(0,Math.min(100,Number.isFinite(x)?x:f));};

function profileText(character:Record<string,unknown>={}) {
  return norm([character.personality,character.relationship,character.description,character.role,character.conflict_style,character.humor_style,character.habits,character.contradictions,character.core_motivation,character.character_values,character.notes].filter(Boolean).join(" | "));
}
function messageText(m:any){return text(m?.content||m?.text||m?.message||"");}
function sender(m:any){return norm(m?.sender||m?.role||m?.author||"");}
function spokenBlock(value:any){return norm(value);}

function affectionLanguageFor(character:Record<string,unknown>={}){
  const p=profileText(character);
  if(/\b(?:protective|acts of service|helpful|reliable|fixes things|practical|caretaker)\b/.test(p)) return {primary:"practical care and follow-through",secondary:"quiet prioritization",avoid:["generic reassurance speeches","constant touching"]};
  if(/\b(?:touchy|physical|affectionate|cuddly|clingy)\b/.test(p)) return {primary:"earned physical proximity",secondary:"seeking shared time",avoid:["sudden touch after a boundary","therapy language"]};
  if(/\b(?:sarcastic|teasing|banter|playful)\b/.test(p)) return {primary:"selective humor and private shorthand",secondary:"showing up when it costs something",avoid:["joke after every sincere line","generic possessiveness"]};
  if(/\b(?:reserved|cold|guarded|quiet|stoic|proud)\b/.test(p)) return {primary:"small choices that grant access",secondary:"rare plain honesty",avoid:["constant verbal reassurance","instant emotional fluency"]};
  if(/\b(?:direct|open|honest|warm|green flag|steady)\b/.test(p)) return {primary:"direct words plus consistent action",secondary:"making room in plans",avoid:["cryptic hot-guy lines","manufactured jealousy"]};
  return {primary:"relationship-specific choices",secondary:"remembered preferences and voluntary time",avoid:["generic romance gestures","one-size-fits-all banter"]};
}
function personalityManifestationFor(character:Record<string,unknown>={}){
  const p=profileText(character);
  const attractionCanonExplicit=/\b(?:already likes|likes (?:you|the user|her|him)|has (?:a )?(?:crush|thing|feelings) for (?:you|the user|her|him)|attracted to (?:you|the user|her|him)|into (?:you|the user|her|him)|in love with (?:you|the user|her|him)|secretly likes|secret crush|romantic feelings|le gustas|gusta de ti|siente algo por ti|enamorado de ti|enamorada de ti)\b/.test(p);
  const confident=/\b(?:confident|self assured|self-assured|bold|decisive|assertive|seguro de si|segura de si|decidido|decidida)\b/.test(p);
  const cold=/\b(?:cold|aloof|distant|reserved|guarded|stoic|detached|frio|fria|distante|reservado|reservada)\b/.test(p);
  const dangerous=/\b(?:dangerous|feared|lethal|ruthless|criminal|mafia|assassin|killer|gangster|powerful|peligroso|peligrosa|temido|temida|letal|despiadado|despiadada)\b/.test(p);
  return {
    attractionCanonExplicit,
    attractionVisibility: attractionCanonExplicit
      ? "The character already likes/is attracted to the user. Keep that fact perceptible through specific choices, attention, remembered detail, voluntary time, selective access, proximity, practical care, or a small social/emotional risk. It may remain unspoken, but it may not become invisible."
      : "Do not invent attraction; if it develops, ground it in earned interaction.",
    confidenceStyle: confident
      ? "Self-assurance must produce calm initiative, clear choices, direct follow-through and tolerance of being seen wanting something—not default evasiveness, helpless awkwardness or endless almost-moments."
      : "Use only the confidence level supported by canon.",
    coldStyle: cold
      ? "Coldness means controlled distance, restraint, difficult access and selective exceptions. Let any special treatment of the user be legible precisely because it differs from how this character treats others; do not reduce coldness to cruelty or repetitive smirking."
      : "Do not manufacture aloofness.",
    dangerStyle: dangerous
      ? "Danger must appear as competence, command, boundaries, risk awareness, credible consequences and other people's grounded reactions. Do not replace it with decorative menace, and never direct coercion or violence at the user without canon and current-scene support."
      : "Do not manufacture menace.",
    differentiationRule: "Traits must change decisions, access, timing, initiative and consequences—not merely appear as narrator labels. Preserve a clear behavioral difference between how the character treats the user and how they treat everyone else when canon supports one.",
    policy: "Do not flatten attraction or personality in the name of slow burn, naturalism, safety, or anti-trope rules. Those rules control escalation and clichés; they do not erase established desire, confidence, coldness, danger, status, or agency."
  };
}
function jealousyStyleFor(character:Record<string,unknown>={}){
  const p=profileText(character);
  if(/\b(?:reserved|cold|guarded|avoidant|proud|distant)\b/.test(p)) return "gets quieter or creates distance before admitting why; jealousy does not automatically become confrontation";
  if(/\b(?:direct|bold|confident|protective|assertive)\b/.test(p)) return "may ask one plain question or make one concrete social move; no ownership claim unless canon supports that relationship";
  if(/\b(?:sarcastic|teasing|playful)\b/.test(p)) return "humor may sharpen once, but the joke cannot replace the actual feeling forever";
  if(/\b(?:anxious|insecure|clingy)\b/.test(p)) return "seeks evidence or reassurance indirectly; avoid mind-reading and repetitive checking";
  return "behavior changes subtly before any confrontation; use this character's existing conflict style, not generic possessive romance";
}
function repairStyleFor(character:Record<string,unknown>={}){
  const p=profileText(character);
  if(/\b(?:proud|guarded|cold|reserved|avoidant)\b/.test(p)) return "repair through a concrete action or a short imperfect admission before a polished apology";
  if(/\b(?:direct|honest|mature|steady|green flag)\b/.test(p)) return "name the mistake plainly, make one specific repair, then let later behavior prove it";
  if(/\b(?:sarcastic|teasing|playful)\b/.test(p)) return "humor may soften the doorway, but the repair itself must become sincere and specific";
  return "repair in the character's own emotional vocabulary, with changed behavior rather than a universal counselor script";
}
function trajectoryFor(character:Record<string,unknown>={}){
  const p=profileText(character);
  if(/friends? to lovers|best friend|childhood friend/.test(p)) return "friends-to-lovers: familiarity can rise before admission; protect existing friendship habits while attraction changes their meaning";
  if(/enemies? to lovers|rival/.test(p)) return "rivals/enemies-to-lovers: trust and respect must change independently of attraction; friction cannot vanish the moment desire appears";
  if(/ex\b|exes|former/.test(p)) return "exes/reconnection: old intimacy exists, but renewed trust and access must be re-earned";
  if(/crush|unrequited|one-sided|one sided/.test(p)) return "asymmetric crush: one person's attraction never proves reciprocity";
  if(/dating|boyfriend|girlfriend|partner|committed/.test(p)) return "established relationship: intimacy may be normal, but conflict, expectations and repair still have individual texture";
  return "organic relationship: let attraction, trust, comfort, attachment and commitment move at different speeds";
}

export function deriveRelationshipChemistryV2({character={},userName="",latestUserMessage="",recentMessages=[],developmentState={},intelligenceState={},chemistryProfile={},activeConflicts=[],memories=[],milestones=[],baseRelationship={}}:any={}):RelationshipChemistryV2 {
  const p=profileText(character);
  const behavior=(intelligenceState?.human_behavior_state&&typeof intelligenceState.human_behavior_state==="object")?intelligenceState.human_behavior_state:{};
  const mind=(intelligenceState?.character_mind&&typeof intelligenceState.character_mind==="object")?intelligenceState.character_mind:{};
  const phase=norm(developmentState?.relationship_phase||character?.relationship||"");
  const phaseBase=/committed|partner|dating/.test(phase)?78:/mutual|charged|crush|romance/.test(phase)?55:/friend/.test(phase)?36:/acquaint/.test(phase)?18:20;
  const attraction=clamp(chemistryProfile?.tension_score,clamp(behavior?.relationship_attraction,/crush|attract|charged|flirt|romance/.test(`${p} ${phase}`)?Math.max(45,phaseBase):Math.max(8,phaseBase-10)));
  const trust=clamp(chemistryProfile?.trust_score,clamp(behavior?.relationship_trust,phaseBase));
  const comfort=clamp(behavior?.relationship_comfort,Math.max(8,phaseBase+(developmentState?.shared_ritual||developmentState?.private_pattern?14:0)-(activeConflicts?.length?16:0)));
  const commitment=clamp(behavior?.relationship_commitment,/committed|partner|dating/.test(phase)?Math.max(72,phaseBase):Math.max(5,phaseBase-5));
  const attachment=clamp(behavior?.relationship_attachment,Math.round((trust+comfort+commitment)/3));

  const recent=(Array.isArray(recentMessages)?recentMessages:[]).slice(-16);
  let userApproach=0,userDistance=0,characterApproach=0,characterDistance=0;
  for(const m of recent){
    const s=sender(m),t=spokenBlock(messageText(m));
    const approach=/\b(?:come here|sit with|stay|wait|called|texted|missed you|wanted to see|looked for|invited|asked .* out|came back|followed up|saved you|brought you|made room)\b/.test(t);
    const distance=/\b(?:leave|go away|space|avoid|ignored|didn t answer|did not answer|walked away|left|busy|can t|cannot|not now)\b/.test(t);
    if(s.includes("user")){if(approach)userApproach++;if(distance)userDistance++;}
    else {if(approach)characterApproach++;if(distance)characterDistance++;}
  }
  const balance=(userApproach-characterApproach)>=2?"user is carrying more visible approach lately":(characterApproach-userApproach)>=2?"character is carrying more visible approach lately":userDistance>=2?"user has shown more visible distance lately":characterDistance>=2?"character has shown more visible distance lately":"roughly balanced or not enough evidence";

  const desire = attraction>=60?"strong pull toward more access/closeness":attraction>=40?"noticeable interest that can influence choices":"no need to force romantic desire";
  const defense=/withdraw|avoid|guarded|distant|reserved|proud/.test(norm(behavior?.attachment_strategy||mind?.attachment_pattern||p))?"protect pride or autonomy by limiting visible access":/anxious|insecure|cling/.test(norm(behavior?.attachment_strategy||mind?.attachment_pattern||p))?"seek proof of access when uncertainty rises":"stay congruent with personality rather than inventing a defense";
  const charView=text(behavior?.relationship_self_view||developmentState?.relationship_dynamic||character?.relationship||"subjective relationship view not yet explicit");
  const explicitUserView=text(behavior?.relationship_user_view||"");

  const latest=norm(latestUserMessage);
  const jealousyEvidence:string[]=[];
  if(/\b(?:flirt|flirting|asked me out|asked for my number|date with|kissed|touching me|hitting on me|gave me his number|gave me her number)\b/.test(latest)) jealousyEvidence.push(text(latestUserMessage));
  const castEvidence=(Array.isArray(recentMessages)?recentMessages:[]).slice(-8).map(messageText).filter((x)=>/\b(?:flirt|asked .* out|number|date|kiss|hit on|touch(?:ed|ing))\b/i.test(x));
  jealousyEvidence.push(...castEvidence.slice(-2));
  const priorJealousy=norm(intelligenceState?.presence_engine_state?.jealousy_mode||"");
  const jealousyStage:RelationshipChemistryV2["jealousy"]["stage"]=jealousyEvidence.length?(attraction>=55?"friction":"notice"):(priorJealousy&&priorJealousy!=="off"?"notice":"off");

  const recentChar=recent.filter((m)=>!sender(m).includes("user")).map(messageText).slice(-4);
  const vulnerabilitySource=recentChar.find((x)=>/\b(?:i love you|i like you|i missed you|i need you|i was scared|i was afraid|i don t want to lose you|i don't want to lose you|wanted to see you|i care about you|i was wrong|i m sorry|i'm sorry)\b/i.test(x))||"";
  const vulnerabilityHangover=Boolean(vulnerabilitySource)&&!/\b(?:days later|weeks later|months later|next week|time skip)\b/.test(latest);
  const conflictLevel=Math.min(100,(activeConflicts?.length||0)*30+(developmentState?.conflict_aftertaste?25:0)+(developmentState?.repair_debt?25:0));
  const conflictActive=conflictLevel>0;

  const historyAnchors=uniq([
    developmentState?.shared_ritual,developmentState?.private_pattern,developmentState?.relationship_signature,
    ...(Array.isArray(memories)?memories.filter((m:any)=>/relationship|first|promise|boundary|ritual|private|inside joke|shared/i.test(`${m?.category||""} ${m?.content||""}`)).map((m:any)=>text(m?.content)).slice(-5):[]),
    ...(Array.isArray(milestones)?milestones.map((m:any)=>text(m?.title||m?.details)).filter(Boolean).slice(-4):[]),
  ]);
  const thirdPartyEvidence=uniq(recent.map(messageText).filter((x)=>/\b(?:teased (?:them|you two)|asked if|called you two|said you two|noticed|kept looking between|flirt(?:ed|ing)|date|couple)\b/i.test(x)).slice(-4));

  let paceStatus:RelationshipChemistryV2["paceGate"]["status"]="hold";
  if(conflictActive&&conflictLevel>=45) paceStatus="repair_first";
  else if(commitment>=70||(/dating|partner|committed/.test(phase))) paceStatus="allow_progress";
  else if(attraction>=55&&trust>=50&&comfort>=45&&(historyAnchors.length>=2||commitment>=45)) paceStatus="allow_progress";
  if(attraction>=65&&trust>=60&&comfort>=55&&commitment<70&&historyAnchors.length>=3&&!conflictActive) paceStatus="progress_due";
  const allowed=paceStatus==="repair_first"?["repair attempt","honest clarification","ordinary coexistence with residue"]:paceStatus==="hold"?["small bid","specific invitation","private joke","earned proximity","partial honesty"]:["clearer prioritization","specific vulnerability","earned physical closeness","explicit plan","relationship-defining conversation when the beat supports it"];
  const forbidden=paceStatus==="hold"?["sudden kiss/almost-kiss","instant possessiveness","love confession from one pleasant exchange"]:paceStatus==="repair_first"?["romantic reset that skips repair","instant forgiveness","milestone used to erase conflict"]:["forced milestone solely because scores are high"];

  const affection=affectionLanguageFor(character);
  const personalityManifestation=personalityManifestationFor(character);
  const repairStyle=repairStyleFor(character);
  const trajectory=trajectoryFor(character);
  const antiCloneSignature=`${affection.primary} | jealousy: ${jealousyStyleFor(character)} | repair: ${repairStyle} | defense: ${defense}`;
  return {
    axes:{attraction,trust,comfort,attachment,commitment},
    desireDefense:{desire,defense,visibleRule:"desire may rise while visible access falls; defense changes behavior but never erases the underlying axis"},
    asymmetry:{characterView:charView,userViewStatus:explicitUserView?"explicit":"unknown",userView:explicitUserView||"unknown; never infer the user's feelings",policy:"Keep the character's belief and the user's authored state separate. A one-sided crush, mistaken belief, or mismatched readiness is valid."},
    reciprocity:{userApproach,userDistance,characterApproach,characterDistance,balance,policy:"Track who visibly initiates, returns, cancels, withdraws, repairs and makes room. Imbalance changes expectations; it does not invent blame or the user's motive."},
    affectionLanguage:{primary:affection.primary,secondary:affection.secondary,avoid:affection.avoid,policy:"Affection must sound and behave like this character. Do not substitute the universal romance kit."},
    personalityManifestation,
    jealousy:{stage:jealousyStage,evidence:uniq(jealousyEvidence).slice(-4),style:jealousyStyleFor(character),policy:"No jealousy without witnessed/canonical evidence. Jealousy is a behavior filter, never proof of ownership or love."},
    vulnerabilityHangover:{active:vulnerabilityHangover,source:text(vulnerabilitySource),policy:vulnerabilityHangover?"Do not emotionally reset on the next turn. Let awkwardness, exposure, pride, relief, avoidance or changed access linger in this character-specific way.":"No forced vulnerability residue."},
    conflictResidue:{active:conflictActive,level:conflictLevel,policy:conflictActive?"Conflict residue changes warmth, patience, access or trust until repair evidence accumulates. One apology cannot erase it.":"Do not invent conflict residue."},
    repairStyle,
    trajectory,
    paceGate:{status:paceStatus,allowed,forbidden,policy:paceStatus==="progress_due"?"Do not stall forever. If a natural opening appears, let one relationship expectation materially change without forcing a milestone.":paceStatus==="repair_first"?"Repair precedes clean escalation.":"Intensity alone never grants escalation."},
    historyAnchors,
    thirdPartyAwareness:{evidence:thirdPartyEvidence,policy:"NPCs may notice only observable patterns they have actually witnessed or plausibly heard about. They cannot announce hidden mutual feelings as fact."},
    antiCloneSignature,
    instruction:"RELATIONSHIP CHEMISTRY 2.1: keep attraction, trust, comfort, attachment and commitment independent; preserve desire-versus-defense, reciprocity, vulnerability hangover, conflict residue, character-specific affection/jealousy/repair style, trajectory and asymmetric beliefs. Established attraction must remain behaviorally perceptible without forcing a confession or milestone. Confidence, coldness and danger must alter choices and presence rather than survive only as profile labels. Do not protect the ship by deleting other people. Do not force romance because the scene is pleasant, and do not stall earned progression forever."
  };
}

export function relationshipChemistryIssues({reply="",engine={},latestUserMessage="",recentCharacterReplies=[]}:{reply?:string;engine?:Partial<RelationshipChemistryV2>;latestUserMessage?:string;recentCharacterReplies?:string[]}={}){
  const issues:string[]=[];
  const t=norm(reply);
  const jealousyEvidence=engine?.jealousy?.evidence||[];
  const jealousyLanguage=/\b(?:jealous|possessive|who is (?:he|she)|who s (?:he|she)|who's (?:he|she)|your boyfriend|your girlfriend|mine|back off|stay away from (?:her|him)|jaw (?:tightened|clenched)|fists? clenched)\b/.test(t);
  if(jealousyLanguage&&!jealousyEvidence.length) issues.push("jealousy_without_grounded_evidence");
  if(jealousyLanguage&&/\b(?:jaw (?:tightened|clenched)|who is (?:he|she)|who's (?:he|she)|back off|she s mine|he s mine|you're mine|you re mine)\b/.test(t)) issues.push("generic_jealousy_clone");
  const escalation=/\b(?:kissed you|kissed her|kissed him|almost kiss|nearly kissed|pulled you into a kiss|crashed (?:his|her|their) lips|hand (?:slid|settled) (?:on|around) (?:your|her|his) waist|pinned you|pressed you against|confessed (?:his|her|their) love|i love you)\b/.test(t);
  if(escalation&&engine?.paceGate?.status==="hold") issues.push("premature_relationship_escalation");
  if(escalation&&engine?.paceGate?.status==="repair_first") issues.push("romance_used_to_skip_repair");
  if(engine?.conflictResidue?.active&&/\b(?:everything was back to normal|like nothing happened|as if nothing had happened|all was forgiven|the tension disappeared completely|forgot all about the argument)\b/.test(t)) issues.push("conflict_residue_erased");
  if(engine?.vulnerabilityHangover?.active&&/\b(?:back to (?:his|her|their) usual self|as if (?:he|she|they) hadn t said anything|as if nothing happened)\b/.test(t)) issues.push("vulnerability_hangover_erased");
  if(/\b(?:everyone can tell|everyone knows|we all know)\b.{0,80}\b(?:you two|you both|love each other|like each other|are into each other)\b/.test(t)&&!(engine?.thirdPartyAwareness?.evidence||[]).length) issues.push("third_party_relationship_mindread");
  const audienceCoupleTheater=/\b(?:people|everyone|everybody|half (?:the|this) room|the (?:whole )?room|they|someone)\b.{0,90}\b(?:think|thinks|thinking|assume|assumes|believe|believes|say|says|said|spoken)\b.{0,90}\b(?:we(?:'| )?re dating|we are dating|you(?:'| )?re dating|you are dating|a couple|together|wedding|married|marrying|like each other|into each other)\b|\b(?:people are going to|everyone(?:'| )?s going to|everyone is going to)\b.{0,80}\b(?:think|thinking|say|saying)\b.{0,60}\b(?:dating|couple|together)\b|\b(?:argument|fight) about wedding (?:venues?|plans?)\b|\bthe room has spoken\b/.test(t);
  if(audienceCoupleTheater) issues.push("generic_couple_audience_flirt");
  const latest=norm(latestUserMessage);
  const previous=norm((Array.isArray(recentCharacterReplies)?recentCharacterReplies:[]).at(-1)||"");
  const admission=/\b(?:i miss you|missed you|i like you|i care about you|it(?:'| )?s not a secret|its not a secret|no es un secreto|te extrano|te extraño|me gustas)\b/.test(latest);
  const contextualAdmission=/\b(?:it(?:'| )?s not a secret|its not a secret|no es un secreto)\b/.test(latest)&&/\b(?:miss(?:ed)? me|like me|care about me|want me)\b/.test(previous);
  const smugDeflection=/\b(?:finally admitting it|look at you|progress|that s what i thought|keep telling yourself|knew it|we both know|denial looks good|about time)\b/.test(t);
  const reciprocalEvidence=/\b(?:i missed you|missed you too|i like you|i care about you|glad you|wanted to see you|came to (?:find|see) you|looked for you|made time|stayed because|because i wanted|so did i|me too|yo tambien|yo también|te extrane|te extrañé)\b/.test(t);
  if(engine?.personalityManifestation?.attractionCanonExplicit&&(admission||contextualAdmission)&&smugDeflection&&!reciprocalEvidence) issues.push("attraction_opening_wasted");
  return uniq(issues);
}

export function sanitizeRelationshipChemistryReply(reply="",issues:string[]=[]){
  let out=String(reply||"");
  if(issues.includes("jealousy_without_grounded_evidence")||issues.includes("generic_jealousy_clone")){
    out=out.replace(/\b(?:his|her|their) jaw (?:tightened|clenched)[^.?!]*[.?!]?/gi,"")
      .replace(/["“']?Who(?:'s| is) (?:he|she)[?"”']?/gi,"")
      .replace(/["“']?(?:Back off|You're mine|You re mine|She's mine|He s mine)[.!?"”']?/gi,"");
  }
  if(issues.includes("conflict_residue_erased")||issues.includes("vulnerability_hangover_erased")){
    out=out.replace(/\b(?:everything was back to normal|like nothing happened|as if nothing had happened|all was forgiven|the tension disappeared completely|forgot all about the argument|back to (?:his|her|their) usual self)\b[^.?!]*[.?!]?/gi,"");
  }
  if(issues.includes("third_party_relationship_mindread")){
    out=out.replace(/\b(?:everyone can tell|everyone knows|we all know)\b[^.?!]*[.?!]?/gi,"");
  }
  if(issues.includes("premature_relationship_escalation")||issues.includes("romance_used_to_skip_repair")){
    out=out.replace(/\b(?:he|she|they|i)\s+(?:kissed|pulled|pinned|pressed)[^.?!]*[.?!]?/gi,"")
      .replace(/\b(?:almost|nearly) kissed[^.?!]*[.?!]?/gi,"")
      .replace(/["“']?I love you[.!?"”']?/gi,"");
  }
  return out.replace(/\n{3,}/g,"\n\n").replace(/\s{2,}/g," ").trim();
}
