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

function chargedApproachPending(recent=[]){
  const rs=list(recent).slice(-3);
  if(!rs.length)return false;
  const last=norm(rs[rs.length-1]||"");
  const context=norm(rs.join(" | "));
  const approach=/\b(?:started|began|headed|walked|crossed|moved|made his way|made her way|came|went|stepped)\b.{0,70}\b(?:toward|towards|over to|across)\b.{0,80}\b(?:you|where you|her|him)\b/.test(last)
    || /\b(?:closed the distance|came over|approached you|approached her|approached him)\b/.test(last);
  const charged=/\b(?:jealous|doesnt mean i have to like|does not mean i have to like|dont like him|don t like him|dont like her|don t like her|who is that|who was that|talking to (?:him|her)|laughing with (?:him|her)|celos|no significa que tenga que gustarme|no me gusta)\b/.test(context);
  return approach&&charged;
}
function arrivalPayoffSignal(v=""){
  const t=norm(v);
  const direct=/\b(?:who(?:s| is| was) (?:your|that|he|she)|you two know|how do you know|friend of yours|your friend|that guy|that girl|him again|her again|talking to him|talking to her|came over because|i came over because|wanted your attention|want your attention|come with me|dance with me|stay with me|join me|im stealing you|i m stealing you|mind if i join|can i join|move over|let me in|introduce me|are you two|dating him|dating her|like him|like her|te conozco|quien es|tu amigo|tu amiga|ese tipo|esa chica|estas saliendo|te gusta|vine porque|ven conmigo)\b/.test(t);
  const interpersonal=/\b(?:jealous|bothered|annoyed|irritated|didnt like|did not like|dont like|don t like|wanted to interrupt|cut in|interrupted|claimed|challenged|asked|invited|refused|admitted|celos|molest|no me gusto|interrump|pregunt|invit|admit)\w*\b/.test(t);
  return direct||interpersonal;
}
function npcDeflectionAfterApproach(reply="",recent=[],persistentCast=[]){
  if(!chargedApproachPending(recent))return false;
  const t=norm(reply);
  if(arrivalPayoffSignal(reply))return false;
  const names=list(persistentCast).map(x=>norm(x?.name||"")).filter(Boolean);
  const namedNpc=names.some(n=>n&&t.split(/\s+/).includes(n));
  const genericNpc=/\b(?:my friend|his friend|her friend|one of his friends|one of her friends|the bartender|someone else|somebody else|another guy|another girl|another friend)\b/.test(t);
  const sideBusiness=/\b(?:bartender|champagne|hydration|drink|drinks|bar|kitchen|music|playlist|game|bet|parking|keys|phone|texted|called)\b/.test(t);
  return (namedNpc||genericNpc)&&sideBusiness;
}
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
    chargedApproachPending(recentCharacterReplies)?"11) ARRIVAL PAYOFF LOCK: the character deliberately approached because of an active charged social beat. Their first interaction after arriving MUST address, alter or complicate that exact beat. A joke, unrelated observation, NPC anecdote or small talk is not a payoff.":"11) ARRIVAL PAYOFF LOCK: when a character approaches because of jealousy, hurt, attraction, suspicion or another active tension, the arrival must pay off the reason for approaching.",
    "12) NPC DEFLECTION FIREWALL: supporting NPCs may remain alive in the scene, but they cannot become an escape hatch from the lead interaction. Resolve or advance the active interpersonal beat before pivoting attention to an NPC\'s unrelated business.",
    "13) INITIATED-CONFRONTATION INTENT LOCK: if the lead deliberately starts, interrupts, follows, isolates, stops, or reopens a charged conversation, they MUST already have a concrete immediate want. They may be conflicted about deeper feelings, but cannot answer a direct what-do-you-want challenge with I don\'t know yet / not sure / nothing / forget it unless visible canon explicitly establishes genuine confusion.",
    "14) CLARITY AFTER CHALLENGE: when the user says what do you want, what does that mean, drop the game, be serious, say it plainly, or equivalent, answer the substance in ordinary spoken language before any teasing, metaphor, counter-question, or mysterious line.",
    "15) INITIATIVE OWNERSHIP: if the lead initiated, interrupted, pulled the user aside, invited them away, or otherwise created the private interaction, do not immediately rewrite history by teasing or accusing the user as though they chased him, missed him, wanted his attention, or could not stand competition. The lead owns the move he just made.",
    "16) STYLE ECHO FIREWALL: do not recycle the same delivery choreography across nearby turns. Especially avoid repeated voice/tone dropping, gaze holding/staying locked, stepping closer, easy/steady cadence, or equivalent cosmetic rewrites. Change the conversational tactic, not the adjective.",
    "DIFFERENTIATION TEST: if another lead character's name could replace this one with almost no change, rewrite the decision/disclosure style.",
    "PERSISTENCE: human_behavior_update.character_fingerprint_state may store current jealousy expression, vulnerability defense, conflict tactic, repair style, silence style and latest earned payoff using only visible canon.",
    "AUTHORIZED NPCS="+(list(persistentCast).map(x=>clean(x?.name,80)).filter(Boolean).slice(0,12).join(" | ")||"none")
  ].join("\n");
}

function directClarityDemand(value=""){
  return /\b(?:what (?:do|did) you want|what you want|what does (?:that|this) (?:even )?mean|what are you (?:trying to )?say|drop (?:the|your) (?:game|act)|stop (?:playing|dodging|deflecting)|be serious|say it (?:plainly|straight)|just say it|answer me)\b/.test(norm(value));
}
function evasiveAfterClarity(value=""){
  const t=norm(value);
  return /\b(?:i dont know(?: yet)?|not sure(?: yet)?|nothing|never mind|forget it|does it matter|why do you care|you tell me|figure it out)\b/.test(t)
    || /\b(?:only one keeping score|if you have to ask|you know what i mean|you know exactly what i mean)\b/.test(t);
}
function initiatedChargedBeat(recent=[]){
  const t=norm(list(recent).slice(-3).join(" "));
  return /\b(?:outside\. now|come with me|we need to talk|going somewhere|stepped (?:directly )?into (?:your|the) path|blocked (?:your|the) path|followed (?:you|after)|caught up|pulled .* aside|stopped you)\b/.test(t);
}
function initiativeReversalBlame(reply="",recent=[]){
  const prior=norm(list(recent).slice(-2).join(" "));
  const leadInitiated=/\b(?:come with me|coming outside with me|outside with me|follow me|we need to talk|pulled .* aside|caught .* sleeve|stepped .* into your space|interrupted|abandoning whatever conversation)\b/.test(prior);
  const blamesUser=/\b(?:couldn'?t stand the competition|miss my company|you followed me|you came after me|you wanted my attention|jealous|trying to get my attention)\b/.test(norm(reply));
  return leadInitiated&&blamesUser;
}
function repeatedDeliveryChoreography(reply="",recent=[]){
  const family=(v)=>{
    const t=norm(v); const hits=[];
    if(/\b(?:voice|tone) (?:drop|drops|dropped|dropping|lower|lowers|lowered|lowering)\b/.test(t))hits.push("lowered_delivery");
    if(/\b(?:gaze|eyes) (?:stayed|staying|held|holding|locked|fixed)\b/.test(t))hits.push("fixed_gaze");
    if(/\b(?:easy|steady|smooth) (?:cadence|rhythm|drawl|tone)\b/.test(t))hits.push("performed_cadence");
    if(/\b(?:stepped|moved) (?:directly )?(?:closer|into .* path)\b/.test(t))hits.push("proximity_move");
    return hits;
  };
  const now=family(reply);
  if(!now.length)return false;
  const old=list(recent).slice(-5).flatMap(family);
  return now.some((x)=>old.filter((y)=>y===x).length>=1);
}

export function characterFingerprintPayoffIssuesV35313({
  reply="",latestUserMessage="",recentCharacterReplies=[],character={},relationshipState={},
  intelligenceState={},persistentCast=[],isRegeneration=false,rejectedResponses=[]
}={}){
  const issues=[];
  const behavior=intelligenceState?.human_behavior_state||{};
  const emotion=intelligenceState?.relationship_emotion_core||{};
  const charged=isCharged(latestUserMessage)||isCharged(list(recentCharacterReplies).slice(-2).join(" "));
  const conflict=isConflict(latestUserMessage)||isConflict(list(recentCharacterReplies).slice(-2).join(" "));
  if(charged&&logisticsDeflation(reply))issues.push("charged_scene_logistics_deflation");
  // Regression: Theo crossed a party because another guy bothered him, then Velvet
  // deflated the payoff into "fresh drink", crowd gossip and invented NPC lore.
  // Once a charged approach has begun, preserve its causal target until the lead
  // actually addresses/complicates it. Do not manufacture a replacement problem.
  if(chargedApproachPending(recentCharacterReplies)){
    const rt=norm(reply);
    const topicSwap=/\b(?:fresh drink|refill|people (?:are )?staring|people downstairs|what people (?:are )?calling|rumou?r|gossip|sophomore|economics|three separate conversations)\b/.test(rt);
    if(topicSwap&&!arrivalPayoffSignal(reply))issues.push("charged_approach_topic_swap");
  }
  if(directClarityDemand(latestUserMessage)&&evasiveAfterClarity(reply))issues.push("direct_clarity_demand_evaded");
  if(directClarityDemand(latestUserMessage)&&initiatedChargedBeat(recentCharacterReplies)&&!resolutionVector(reply)&&words(reply).length<34)issues.push("initiated_confrontation_without_intent_payoff");
  if(repeatedDeliveryChoreography(reply,recentCharacterReplies))issues.push("repeated_delivery_choreography");
  if(initiativeReversalBlame(reply,recentCharacterReplies))issues.push("initiative_reversal_blame");
  if(genericJealousy(reply)&&(Number(emotion?.jealousy)||0)>=20)issues.push("generic_jealousy_interrogation");
  if(conflict&&list(recentCharacterReplies).slice(-5).filter(isConflict).length>=3&&!resolutionVector(reply))issues.push("conflict_loop_without_development");
  if(tensionAccumulated(recentCharacterReplies,emotion,relationshipState)&&!payoffSignal(reply)&&words(reply).length>22)issues.push("earned_scene_payoff_stalled");
  if(chargedApproachPending(recentCharacterReplies)&&!arrivalPayoffSignal(reply))issues.push("charged_arrival_payoff_evaded");
  if(npcDeflectionAfterApproach(reply,recentCharacterReplies,persistentCast))issues.push("charged_beat_deflected_to_npc");
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
