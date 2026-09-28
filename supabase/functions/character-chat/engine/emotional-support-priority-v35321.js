// Velvet Stories v3.53.21 · Emotional Support Priority
const clean=(v="",n=2400)=>String(v??"").replace(/\s+/g," ").trim().slice(0,n);
const norm=(v="")=>clean(v,9000).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[’']/g,"");
function words(v=""){return norm(v).split(/\s+/).filter(Boolean);}

export function deriveEmotionalSupportPriorityV35321(latestUserMessage="",recentUserMessages=[]){
  const latest=norm(latestUserMessage);
  const recent=(Array.isArray(recentUserMessages)?recentUserMessages.slice(-4):[]).map(norm).join(" | ");
  const all=(latest+" | "+recent).trim();
  const safety=/\b(?:kill myself|suicide|suicidal|end my life|dont want to live|do not want to live|hurt myself|self harm|self-harm|matarme|suicid|no quiero vivir|hacerme dano|hacerme daño|autolesion)\b/.test(latest);
  const high=/\b(?:panic attack|cant breathe|cannot breathe|breaking down|sobbing|cant stop crying|cannot stop crying|i cant anymore|i can t anymore|i cant do this|i can t do this|desbordad|crisis|ataque de panico|ataque de pánico|no puedo mas|no puedo más|no paro de llorar|estoy destruida|estoy destruido)\b/.test(all);
  const clear=/\b(?:crying|cried|cry|tears|anxiety|anxious|depressed|depression|very sad|so sad|horrible day|awful day|family fight|fought with my family|lonely|overwhelmed|llorando|llore|lloré|ansiedad|depresion|depresión|muy triste|pelee con mi familia|peleé con mi familia|me siento sola|me siento solo|abrumad)\b/.test(all);
  const mild=/\b(?:bad day|rough day|sad|upset|stressed|stress|not okay|not fine|malo dia|mal dia|mal día|triste|molesta|molesto|estres|estrés|no estoy bien)\b/.test(latest);
  const level=safety?3:high?2:clear?2:mild?1:0;
  return {
    active:level>0,
    level,
    safety,
    label:safety?"safety":level===2?"high_distress":level===1?"comfort":"normal",
    evidence:clean(latestUserMessage,650),
  };
}

export function buildEmotionalSupportPriorityV35321({character={},latestUserMessage="",recentUserMessages=[]}={}){
  const s=deriveEmotionalSupportPriorityV35321(latestUserMessage,recentUserMessages);
  if(!s.active)return "EMOTIONAL SUPPORT PRIORITY 3.53.21: normal story mode. Stay sensitive to changes in the user's emotional state.";
  const d=character?.emotional_dna&&typeof character.emotional_dna==="object"?character.emotional_dna:{};
  const style=clean(d.support_style,850)||"Respond with grounded, character-specific care.";
  const common=[
    "EMOTIONAL SUPPORT PRIORITY 3.53.21 · ACTIVE:",
    "LEVEL="+s.label+".",
    "The user's emotional state is the primary beat right now. Do not continue jealousy, sexual escalation, banter, arguments, NPC comedy, plot twists or logistics as though nothing changed.",
    "Care is not generic therapist language. Stay in character, respond to what the user actually said, and make one or two human choices that reduce pressure.",
    "Do not demand a full explanation. Do not make pain romantic. Do not use distress as a shortcut to a confession, kiss, possessiveness or dependency.",
    "CHARACTER-SPECIFIC CARE="+style,
  ];
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
  return /\b(?:anyway|speaking of|party|bartender|champagne|who was that guy|who is that guy|jealous|kissed|kiss you|flirt|afterparty|game|bet|anyway nate|anyway .*friend)\b/.test(t);
}
export function emotionalSupportPriorityIssuesV35321({reply="",latestUserMessage="",recentUserMessages=[]}={}){
  const s=deriveEmotionalSupportPriorityV35321(latestUserMessage,recentUserMessages);
  if(!s.active)return [];
  const issues=[];
  if(deflectionSignal(reply)&&!careSignal(reply))issues.push("distress_deflected_into_plot_or_flirting");
  if(s.level>=2&&!careSignal(reply)&&words(reply).length>24)issues.push("high_distress_missing_care_response");
  return [...new Set(issues)];
}

export const __testV35321={deriveEmotionalSupportPriorityV35321,careSignal,deflectionSignal};
