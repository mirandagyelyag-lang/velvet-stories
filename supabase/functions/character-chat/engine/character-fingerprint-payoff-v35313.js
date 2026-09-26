// Velvet Stories 3.53.13
const clean=(v="",n=1200)=>String(v??"").replace(/\s+/g," ").trim().slice(0,n);
const list=(v)=>Array.isArray(v)?v:[];
const norm=(v="")=>clean(v,12000).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();
const words=(v="")=>norm(v).split(/\s+/).filter(Boolean);
const field=(c,...ks)=>ks.map(k=>clean(c?.[k],900)).find(Boolean)||"";

function isCharged(v=""){const t=norm(v);return /\b(?:jealous|hurt|angry|tension|admit|leave|apolog|argument|care about|celos|herid|enojad|tension|admit|irse|disculp|discusi[oó]n|importas)\b/.test(t);}
function isConflict(v=""){return /\b(?:fight|argument|angry|accuse|hurt me|leave me alone|go away|sorry|pelea|discusi[oó]n|enojad|acus|me heriste|dejame|déjame|vete|perdon|perd[oó]n)\b/i.test(String(v||""));}
function resolutionVector(v=""){return /\b(?:apolog|admit|explain|clarif|promise|agree|decid|give space|stop|repair|change|choose|refus|accept|disculp|admit|explic|aclar|promet|decid|espacio|parar|repar|cambiar|eleg|rechaz|acept)\w*\b/.test(norm(v));}
function logisticsDeflation(v=""){const t=norm(v);return /\b(?:water|drink|food|coffee|drive you home|ride home|sit down|breathe|rest|sleep|agua|bebida|comida|caf[eé]|llevarte a casa|sentarte|respira|descansa|dormir)\b/.test(t)&&!/\b(?:because|care|matter|hurt|jealous|sorry|stay|leave|want|admit|refuse|choose|promise|porque|import|herid|celos|perdon|qued|irte|quiero|admit|rechaz|eleg|promet)\w*\b/.test(t);}
function genericJealousy(v=""){return /\b(?:who was that guy|who is that guy|who was he|who is he|is that your boyfriend|are you dating him|do you like him|quien era ese tipo|quien es ese tipo|es tu novio|estas saliendo con el|te gusta el)\b/.test(norm(v));}
function payoffSignal(v=""){return /\b(?:admit|choose|chose|refuse|left|leave|stay|stayed|tell the truth|apolog|promise|step back|give space|invite|cancelled|admite|elige|rechaza|se fue|irse|queda|dice la verdad|disculpa|promete|se aleja|da espacio|invita|cancela)\b/.test(norm(v));}
function tensionAccumulated(recent=[],emotion={},relationship={}){
  const count=list(recent).slice(-6).filter(isCharged).length;
  const numeric=Math.max(Number(emotion?.unresolved_intensity)||0,Number(emotion?.jealousy)||0,Number(emotion?.resentment)||0,Number(relationship?.tension)||0);
  return count>=3||numeric>=45;
}
function skeleton(v=""){return words(v).filter(w=>w.length>=4);}
function similarity(a="",b=""){const A=new Set(skeleton(a)),B=new Set(skeleton(b));if(!A.size||!B.size)return 0;let h=0;for(const w of A)if(B.has(w))h++;return h/Math.min(A.size,B.size);}
function fingerprint(character={},behavior={}){
  return [
    ["personality",field(character,"personality")],
    ["motivation",field(character,"core_motivation","coreMotivation")],
    ["defense",field(character,"emotional_defense","emotionalDefense")],
    ["humor",field(character,"humor_style","humorStyle")],
    ["conflict",field(character,"conflict_style","conflictStyle")],
    ["affection",field(character,"affection_style","affectionStyle")],
    ["speech",field(character,"speech_style","speechStyle","speaking_style","voice")],
    ["vocabulary",field(character,"voice_vocabulary","voiceVocabulary")],
    ["jealousy",clean(behavior?.jealousy_style,300)],
    ["repair",clean(behavior?.relationship_repair_style,300)],
    ["voice_state",clean(behavior?.dialogue_genome_signature||behavior?.writing_style_signature,420)]
  ].filter(([,v])=>v).map(([k,v])=>k+"="+v).join(" | ");
}

export function buildCharacterFingerprintPayoffV35313({
  character={},latestUserMessage="",recentCharacterReplies=[],relationshipState={},
  intelligenceState={},persistentCast=[],isRegeneration=false,rejectedResponses=[]
}={}){
  const behavior=intelligenceState?.human_behavior_state||{};
  const emotion=intelligenceState?.relationship_emotion_core||{};
  const charged=isCharged(latestUserMessage)||isCharged(list(recentCharacterReplies).slice(-2).join(" "));
  const conflict=isConflict(latestUserMessage)||isConflict(list(recentCharacterReplies).slice(-2).join(" "));
  const payoff=tensionAccumulated(recentCharacterReplies,emotion,relationshipState);
  return [
    "CHARACTER FINGERPRINT + SCENE PAYOFF 3.53.13:",
    "FINGERPRINT="+clean(fingerprint(character,behavior),1900),
    "1) EMOTIONAL MICRO-CONTINUITY: carry HOW this person has been showing an emotion, not only the emotion label.",
    "2) COMMODITY PHRASE FIREWALL: avoid generic lines and stock gestures that could belong to any character.",
    "3) CHARACTER-SPECIFIC SILENCE: silence must contain a decision, restraint, refusal, changed priority or consequence.",
    conflict?"4) CONFLICT DEVELOPMENT: each conflict turn adds information, accountability, boundary, decision, repair, withdrawal or changed access. Do not loop the same grievance.":"4) CONFLICT ECONOMY: do not manufacture long repetitive fights.",
    "5) JEALOUSY FINGERPRINT: express jealousy through this character's priorities, disclosure, humor, distance, competitiveness or choices. Avoid generic interrogation.",
    "6) NPC NATURALISM: approved NPCs enter for their own goals and existing threads, not only to trigger jealousy or deliver exposition.",
    "7) SCENE TRANSITION CONTINUITY: when place/time changes, carry at least one unresolved emotion, promise, decision, consequence or NPC thread.",
    charged?"8) ANTI-CLIMAX LOCK: do not replace the charged beat with food, water, rides, rest or polite logistics. Practical care may support the emotional answer, not substitute for it.":"8) ANTI-CLIMAX LOCK: logistics cannot replace the scene's real social or emotional job.",
    (isRegeneration||list(rejectedResponses).length)?"9) REGENERATION DIVERGENCE: change at least two structural dimensions from rejected output: decision, tactic, emotional emphasis, dialogue opening, NPC use, scene use or outcome.":"9) REGENERATION SAFETY: keep the response structurally specific so alternate branches can truly differ.",
    payoff?"10) PAYOFF DUE: tension has accumulated. Deliver one earned concrete consequence now if the live scene permits it: admission, invitation, refusal, changed access, pursuit, boundary, apology, withdrawal or decision.":"10) PAYOFF CALIBRATION: do not force milestones early, but do not stall once repeated evidence earns a concrete consequence.",
    "DIFFERENTIATION TEST: if another lead character's name could replace this one with almost no change, rewrite the decision/disclosure style.",
    "PERSISTENCE: human_behavior_update.character_fingerprint_state may store current jealousy expression, vulnerability defense, conflict tactic, repair style, silence style and latest earned payoff using only visible canon.",
    "AUTHORIZED NPCS="+(list(persistentCast).map(x=>clean(x?.name,80)).filter(Boolean).slice(0,12).join(" | ")||"none")
  ].join("\n");
}

export function characterFingerprintPayoffIssuesV35313({
  reply="",latestUserMessage="",recentCharacterReplies=[],character={},relationshipState={},
  intelligenceState={},isRegeneration=false,rejectedResponses=[]
}={}){
  const issues=[];
  const behavior=intelligenceState?.human_behavior_state||{};
  const emotion=intelligenceState?.relationship_emotion_core||{};
  const charged=isCharged(latestUserMessage)||isCharged(list(recentCharacterReplies).slice(-2).join(" "));
  const conflict=isConflict(latestUserMessage)||isConflict(list(recentCharacterReplies).slice(-2).join(" "));
  if(charged&&logisticsDeflation(reply))issues.push("charged_scene_logistics_deflation");
  if(genericJealousy(reply)&&(Number(emotion?.jealousy)||0)>=20)issues.push("generic_jealousy_interrogation");
  if(conflict&&list(recentCharacterReplies).slice(-5).filter(isConflict).length>=3&&!resolutionVector(reply))issues.push("conflict_loop_without_development");
  if(tensionAccumulated(recentCharacterReplies,emotion,relationshipState)&&!payoffSignal(reply)&&words(reply).length>22)issues.push("earned_scene_payoff_stalled");
  const fp=fingerprint(character,behavior);
  if(fp.length>80&&/\b(?:all right im listening|okay im listening|fair enough|your choice|whatever you want)\b/.test(norm(reply)))issues.push("fingerprint_collapsed_to_generic_line");
  if(isRegeneration||list(rejectedResponses).length){
    const max=Math.max(0,...list(rejectedResponses).slice(-5).map(x=>similarity(reply,x)));
    if(max>=0.52)issues.push("regeneration_same_structure");
  }
  return [...new Set(issues)];
}

export function instantStoryCharacterFingerprintV35313(character={}){
  return [
    "CHARACTER FINGERPRINT 3.53.13:",
    clean(fingerprint(character,{}),1500)||clean(character?.personality,900)||"Use the configured profile.",
    "Reveal personality through a specific choice, priority, social tactic or line of dialogue, not generic swagger or stock flirt behavior.",
    "If jealousy or attraction appears, express it through this character's own behavior and current relationship stage.",
    "Supporting people need a story reason beyond provoking jealousy."
  ].join("\n");
}

export const __testV35313={isCharged,isConflict,logisticsDeflation,genericJealousy,resolutionVector,tensionAccumulated,similarity,fingerprint};
