// Velvet Stories v3.53.22 · Emotional Aftercare
import { deriveEmotionalSupportPriorityV35321 } from "./emotional-support-priority-v35321.js";

const clean=(v="",n=6000)=>String(v??"").replace(/\s+/g," ").trim().slice(0,n);
const norm=(v="")=>clean(v).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[’']/g,"");

const RECOVERY=/\b(?:im okay now|i am okay now|im fine now|i am fine now|feeling better|i feel better|better now|ya estoy bien|estoy mejor|me siento mejor|ya me siento mejor|se me paso|se me pasó|estoy tranquila|estoy tranquilo)\b/;
const DELIBERATE_REDIRECT=/\b(?:anyway i want to|anyway lets|anyway let s|can we talk about|lets talk about|let s talk about|change the subject|quiero hablar de|hablemos de|cambiemos de tema|mejor hablemos de|ya pero ahora)\b/;
const LOW_STAKES=/\b(?:boring day|long day|tired from class|tired from work|dia fome|día fome|dia aburrido|día aburrido|estoy cansada|estoy cansado|que lata|fome no mas|fome nomas)\b/;

function priorMessages(latest="",recent=[]){
  const items=(Array.isArray(recent)?recent:[]).map(v=>String(v||"").trim()).filter(Boolean);
  if(items.length&&norm(items[items.length-1])===norm(latest))items.pop();
  return items.slice(-5);
}
function aftercareWindow(character={}){
  const core=norm(character?.emotional_dna?.core_fantasy||"");
  if(core==="refuge")return 4;
  if(core==="electric_unpredictability")return 2;
  return 3;
}
function characterRecoveryStyle(character={}){
  const core=norm(character?.emotional_dna?.core_fantasy||"");
  const styles={
    refuge:"Keep warmth available longer than the others. Do not rush the user back into plot; ordinary comfort and silence are valid.",
    misunderstood_longing:"Stay attentive without making a performance of concern. Let normal conversation return gently while quietly tracking whether the user is actually okay.",
    electric_unpredictability:"Humor may return sooner, but only as a soft bridge after genuine care. Never use a joke to erase what just happened.",
    forbidden_access:"Reduce outside noise and remain practically reliable. The return to normal should feel protective, not possessive.",
    being_seen:"Notice whether the user's claimed recovery matches their behavior, but never tell them what they feel or force an explanation.",
    devotion_in_action:"Keep showing up through one concrete, respectful action. Normality returns through reliability rather than a speech.",
    silent_intensity:"Do less, stay longer. Do not reopen the wound with questions; let presence and small decisions carry the aftercare.",
    danger_adrenaline_love:"Keep the energy calm and grounded. Do not manufacture danger or revenge as a response to the user's pain."
  };
  return styles[core]||"Ease back toward normal story mode without acting as though the distress vanished instantly.";
}

export function deriveEmotionalAftercareV35322({latestUserMessage="",recentUserMessages=[],character={}}={}){
  const current=deriveEmotionalSupportPriorityV35321(latestUserMessage,recentUserMessages);
  const latest=norm(latestUserMessage);
  if(current.safety||current.level>=2){
    return {active:true,stage:"acute",turnsSinceDistress:0,sourceLevel:current.level,reason:"current_distress"};
  }
  if(RECOVERY.test(latest)||DELIBERATE_REDIRECT.test(latest)){
    return {active:false,stage:"released",turnsSinceDistress:null,sourceLevel:0,reason:"user_released"};
  }
  if(LOW_STAKES.test(latest)&&current.level<=1){
    return {active:false,stage:"normal",turnsSinceDistress:null,sourceLevel:0,reason:"low_stakes_not_crisis"};
  }

  const prior=priorMessages(latestUserMessage,recentUserMessages);
  const window=aftercareWindow(character);
  for(let i=prior.length-1;i>=0;i--){
    const distance=prior.length-i;
    if(distance>window)break;
    const slice=prior.slice(0,i+1);
    const state=deriveEmotionalSupportPriorityV35321(prior[i],slice);
    if(state.safety||state.level>=2){
      const stage=distance===1?"close":distance===2?"transition":"lingering";
      return {active:true,stage,turnsSinceDistress:distance,sourceLevel:state.level,reason:"recent_distress"};
    }
  }
  return {active:false,stage:"normal",turnsSinceDistress:null,sourceLevel:0,reason:"none"};
}

export function buildEmotionalAftercareV35322({character={},latestUserMessage="",recentUserMessages=[]}={}){
  const s=deriveEmotionalAftercareV35322({character,latestUserMessage,recentUserMessages});
  if(!s.active)return [
    "EMOTIONAL AFTERCARE 3.53.22: normal mode.",
    "Calibration rule: ordinary annoyance, boredom, tiredness, or a merely bad day is not automatically a crisis. Match the user's actual intensity."
  ].join("\n");

  const stageRules={
    acute:"Stay with the emotional beat. Do not pivot away yet.",
    close:"The acute moment may have passed, but do not behave as if it never happened. Keep care visible in a small, natural way.",
    transition:"Begin returning to ordinary interaction, but preserve softness and continuity. A lighter beat is allowed if it does not erase the prior distress.",
    lingering:"Mostly normal interaction is appropriate, with quiet awareness rather than repeated checking."
  };
  return [
    "EMOTIONAL AFTERCARE 3.53.22 · ACTIVE:",
    "STAGE="+s.stage+". TURNS_SINCE_DISTRESS="+s.turnsSinceDistress+".",
    stageRules[s.stage]||stageRules.transition,
    "Do not repeatedly ask if the user is okay. Do not keep them trapped in sadness. Do not suddenly jump into jealousy, sexual escalation, a fight, or unrelated NPC comedy unless the user clearly initiates that new direction.",
    "The goal is emotional continuity, not permanent solemnity.",
    "CHARACTER RECOVERY STYLE="+characterRecoveryStyle(character),
  ].join("\n");
}

function abruptMoodWhiplash(reply=""){
  const t=norm(reply);
  return /\b(?:anyway|party|afterparty|bartender|champagne|jealous|who was that guy|who is that guy|kiss you|kissed you|flirt|hook up|fight me|lets get drunk|let s get drunk|club tonight|dance floor)\b/.test(t);
}
function continuityCare(reply=""){
  const t=norm(reply);
  return /\b(?:still here|stayed|staying|take your time|no rush|you dont have to|you do not have to|with you|not going anywhere|kept close|didnt push|did not push|let the silence|quietly|estoy aqui|estoy aquí|me quedo|sin apuro|no tienes que|te acompano|te acompaño|no insistio|no insistió|se quedo|se quedó)\b/.test(t);
}

export function emotionalAftercareIssuesV35322({reply="",latestUserMessage="",recentUserMessages=[],character={}}={}){
  const s=deriveEmotionalAftercareV35322({character,latestUserMessage,recentUserMessages});
  if(!s.active||s.stage==="acute")return [];
  const issues=[];
  if((s.stage==="close"||s.stage==="transition")&&abruptMoodWhiplash(reply)&&!continuityCare(reply)){
    issues.push("emotional_aftercare_whiplash");
  }
  return issues;
}

export const __testV35322={deriveEmotionalAftercareV35322,aftercareWindow,characterRecoveryStyle};
