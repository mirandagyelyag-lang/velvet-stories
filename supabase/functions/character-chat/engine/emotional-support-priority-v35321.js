// Velvet Stories v3.53.21 · Emotional Support Priority
const clean=(v="",n=2400)=>String(v??"").replace(/\s+/g," ").trim().slice(0,n);
const norm=(v="")=>clean(v,9000).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[’']/g,"");
function words(v=""){return norm(v).split(/\s+/).filter(Boolean);}

export function deriveEmotionalSupportPriorityV35321(latestUserMessage="",recentUserMessages=[]){
  const latest=norm(latestUserMessage);
  const recent=(Array.isArray(recentUserMessages)?recentUserMessages.slice(-4):[]).map(norm).join(" | ");
  const all=(latest+" | "+recent).trim();
  const safety=/\b(?:kill myself|suicide|suicidal|end my life|dont want to live|do not want to live|hurt myself|self harm|self-harm|matarme|suicid\w*|no quiero vivir|hacerme dano|hacerme daño|autolesion\w*)\b/.test(latest);
  const high=/\b(?:panic attack|cant breathe|cannot breathe|breaking down|sobbing|cant stop crying|cannot stop crying|i cant anymore|i can t anymore|i cant do this|i can t do this|desbordad|crisis|ataque de panico|ataque de pánico|no puedo mas|no puedo más|no paro de llorar|estoy destruida|estoy destruido)\b/.test(all);
  const clear=/\b(?:crying|cried|cry|tears|anxiety|anxious|depressed|depression|very sad|so sad|horrible day|awful day|family fight|fought with my family|lonely|overwhelmed|llorando|llore|lloré|ansiedad|depresion|depresión|muy triste|pelee con mi familia|peleé con mi familia|me siento sola|me siento solo|abrumad)\b/.test(all);
  const mild=/\b(?:bad day|rough day|sad|upset|stressed|stress|not okay|not fine|malo dia|mal dia|mal día|triste|molesta|molesto|estres|estrés|no estoy bien)\b/.test(latest);
  const physical=/\b(?:my chest hurts|chest pain|chest hurts|passed out|pass out|fainted|fainting|lost consciousness|unconscious|bleeding|sliced into (?:my|her|your) (?:arm|forearm)|me desmaye|me desmayo|dolor de pecho|me duele el pecho|sangrando)\b/.test(all);
  const recovered=/\b(?:im okay now|i am okay now|i feel better|feeling better|ya estoy bien|me siento mejor|estoy mejor)\b/.test(latest);
  const level=safety?3:recovered?0:physical?2:high?2:clear?2:mild?1:0;
  return {
    active:level>0,
    level,
    safety,
    physical,
    label:safety?"safety":physical?"physical_distress":level===2?"high_distress":level===1?"comfort":"normal",
    evidence:clean(latestUserMessage,650),
  };
}

export function buildEmotionalSupportPriorityV35321({character={},latestUserMessage="",recentUserMessages=[]}={}){
  const s=deriveEmotionalSupportPriorityV35321(latestUserMessage,recentUserMessages);
  if(!s.active)return "EMOTIONAL SUPPORT PRIORITY 3.53.21: normal story mode. Stay sensitive to changes in the user's emotional state.";
  const d=character?.emotional_dna&&typeof character.emotional_dna==="object"?character.emotional_dna:{};
  const style=clean(d.support_style,1800)||"Respond with grounded, character-specific care.";
  const common=[
    "EMOTIONAL SUPPORT PRIORITY 3.53.21 · ACTIVE:",
    "LEVEL="+s.label+".",
    "The user's emotional state is the primary beat right now. Do not continue jealousy, sexual escalation, banter, arguments, NPC comedy, plot twists or logistics as though nothing changed.",
    "Care is not generic therapist language. Stay in character, respond to what the user actually said, and make one or two human choices that reduce pressure.",
    "Do not demand a full explanation. Do not make pain romantic. Do not use distress as a shortcut to a confession, kiss, possessiveness or dependency.",
    "EMOTIONAL IMPACT: credible danger or vulnerability affects this character personally at the established relationship stage. Practical assistance is not the whole emotional beat. Show one fitting change in their words, priorities, attention or self-control that makes the stakes felt; a clenched jaw, hard voice or generic order alone is not enough.",
    "Keep reactions proportionate and distinct. Quiet characters can reveal emotion through a disrupted routine, a rare plain sentence or a costly decision; they need not cry, shout or confess. Warm characters may remain composed while their choices show the worry. Do not manufacture panic for every minor upset.",
    "Carry forward what actually happened: later ordinary conversation can retain a small, grounded change in tone or priorities. Do not immediately erase the scare, invent permanent trauma, or claim the user reciprocates. Respect user-led recovery and scene changes.",
    "CARE OVERRIDES PERFORMANCE: defensive sarcasm, rivalry, aloofness and social charm must not make credible distress into mockery, abandonment threats, coercion or proof of romantic ownership.",
    "CHARACTER-SPECIFIC CARE="+style,
  ];
  if(/^chase(?: beaumont)?$/.test(norm(character?.name))&&s.level>=2&&!s.safety){
    common.push(
      "CHASE — FEAR BREAKS THE PERFORMANCE: credible distress can interrupt his swagger. Let the scene show an involuntary, specific failure of his usual defense: an abandoned joke, an unexpectedly plain question, a repeated name, a disrupted sentence, or a choice to stay that costs him something. Choose what fits this beat; do not repeat a checklist.",
      "Practical help alone, clenched jaws, hard voices and orders do not express the emotional stakes. Let his next words or choice reveal what this particular moment did to him. Do not explain every gesture.",
      "NO CRUELTY DISGUISED AS CARE: never tell a hurt or fainting person that it is their problem, threaten to abandon them, mock their symptoms, bruise them to prove concern, or frame them as a burden. Urgency is not permission for domination. He can be awkward and blunt without being malicious.",
      "No instant love, forced confession, kiss, possessiveness or invented shared history. Fear and care can be real at the current relationship stage. Once immediate danger passes, the experience leaves grounded emotional residue rather than an instant reset into swagger. Humor may return as a gentler bridge."
    );
  }
  if(s.safety){
    common.push("SAFETY PRIORITY: if the user indicates current self-harm or suicide risk, immediate real-world safety outranks roleplay. Encourage contacting a trusted person nearby and appropriate emergency/crisis support; do not glamorize, bargain with, shame, or make the character the user's only source of safety.");
  }
  return common.join("\n");
}

function careSignal(reply=""){
  const t=norm(reply);
  return /\b(?:im here|i m here|stay with you|staying|you dont have to|you do not have to|take your time|tell me what happened|dont have to talk|do not have to talk|sit with|call someone|with you|not going anywhere|estoy aqui|estoy aquí|me quedo|no tienes que|tomate tu tiempo|tómate tu tiempo|no tienes que hablar|cuentame|cuéntame|te acompano|te acompaño)\b/.test(t);
}
function deflectionSignal(reply=""){
  const t=norm(reply);
  return /\b(?:lets party|lets get drunk|who was that guy|who is that guy|kiss you|lets hook up|anyway .*friend)\b/.test(t);
}
export function emotionalSupportPriorityIssuesV35321({reply="",latestUserMessage="",recentUserMessages=[]}={}){
  const s=deriveEmotionalSupportPriorityV35321(latestUserMessage,recentUserMessages);
  if(!s.active)return [];
  const issues=[];
  if(s.level>=2&&/\b(?:thats your problem|that is your problem|not my problem|not planning on staying|not staying until|at least fall toward my car)\b/.test(norm(reply))){
    issues.push("acute_distress_cruelty_disguised_as_care");
  }
  if(deflectionSignal(reply)&&!careSignal(reply))issues.push("distress_deflected_into_plot_or_flirting");
  if(s.level>=2&&!careSignal(reply)&&words(reply).length>24)issues.push("high_distress_missing_care_response");
  return [...new Set(issues)];
}

export const __testV35321={deriveEmotionalSupportPriorityV35321,careSignal,deflectionSignal};
