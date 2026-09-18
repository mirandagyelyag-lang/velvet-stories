// Velvet Stories v3.52.66 · Persistent Emotional Life
// Per-conversation emotional state. This is story simulation state, not sentience.
// It accumulates slowly from visible canon and changes what the character prioritizes.

const clean=(v="",n=1200)=>String(v??"").replace(/\s+/g," ").trim().slice(0,n);
const norm=(v="")=>clean(v,10000).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[’']/g,"");
const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,Math.round(Number(n)||0)));
const num=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;

function profileText(character={},relationship={}){
  return norm([
    character?.relationship,character?.personality,character?.description,character?.affection_style,
    character?.conflict_style,character?.scenario,relationship?.relationship_phase,
    relationship?.current_dynamic,relationship?.relationship_signature
  ].filter(Boolean).join(" | "));
}

function baseline(character={},relationship={}){
  const p=profileText(character,relationship);
  let attachment=8,trust=8,attraction=0,awareness=0,protectiveness=4;
  if(/\b(?:friend|friends|friendly|know each other|classmates|coworkers|teammates)\b/.test(p)){attachment=18;trust=18;}
  if(/\b(?:close friend|close friends|best friend|best friends|childhood friend|longtime friend|long term friend)\b/.test(p)){attachment=38;trust=45;}
  if(/\b(?:crush|attracted|attraction|romantic tension|enemies to lovers|friends to lovers|likes you|likes the user|into you)\b/.test(p)){attraction=Math.max(attraction,28);awareness=Math.max(awareness,12);}
  if(/\b(?:dating|boyfriend|girlfriend|partner|relationship|together|seeing each other)\b/.test(p)){attachment=Math.max(attachment,58);trust=Math.max(trust,48);attraction=Math.max(attraction,62);awareness=Math.max(awareness,55);protectiveness=Math.max(protectiveness,24);}
  if(/\b(?:in love|loves you|deeply in love|fiance|fiancee|husband|wife|married)\b/.test(p)){attachment=Math.max(attachment,78);trust=Math.max(trust,62);attraction=Math.max(attraction,75);awareness=Math.max(awareness,78);protectiveness=Math.max(protectiveness,36);}
  if(/\b(?:guarded|distrustful|doesnt trust|does not trust|enemies|rivals|hostile)\b/.test(p) && !/enemies to lovers|rivals to lovers/.test(p)) trust=Math.min(trust,10);
  if(/\b(?:protective|looks out for|takes care of|cares deeply)\b/.test(p)) protectiveness=Math.max(protectiveness,28);
  return {attachment,trust,attraction,awareness,protectiveness};
}

function makeThread(type,cause,strength,messageId=""){
  return {type,cause:clean(cause,240),strength:clamp(strength),source_message_id:clean(messageId,120),age:0};
}

export function normalizeRelationshipEmotionCoreV35266(previous={},character={},relationship={}){
  const base=baseline(character,relationship);
  const prev=previous&&typeof previous==="object"?previous:{};
  return {
    version:"3.52.66",
    turns_observed:clamp(num(prev.turns_observed,0),0,10000),
    attachment:clamp(num(prev.attachment,base.attachment)),
    trust:clamp(num(prev.trust,base.trust)),
    attraction:clamp(num(prev.attraction,base.attraction)),
    longing:clamp(num(prev.longing,0)),
    jealousy:clamp(num(prev.jealousy,0)),
    protectiveness:clamp(num(prev.protectiveness,base.protectiveness)),
    guilt:clamp(num(prev.guilt,0)),
    fear_of_loss:clamp(num(prev.fear_of_loss,0)),
    resentment:clamp(num(prev.resentment,0)),
    awareness_of_feelings:clamp(num(prev.awareness_of_feelings,base.awareness)),
    vulnerability:clamp(num(prev.vulnerability,8)),
    unresolved_intensity:clamp(num(prev.unresolved_intensity,0)),
    active_threads:Array.isArray(prev.active_threads)?prev.active_threads.slice(-6).map(t=>({
      type:clean(t?.type,80)||"emotion",
      cause:clean(t?.cause,240),
      strength:clamp(t?.strength),
      source_message_id:clean(t?.source_message_id,120),
      age:clamp(t?.age,0,999)
    })):[],
    last_user_beat_signature:clean(prev.last_user_beat_signature,700)
  };
}

function hasAny(text,patterns=[]){return patterns.some(p=>p.test(text));}
function decay(v,amount){return clamp(num(v)-amount);}
function isSilentMarker(value=""){
  const raw=String(value||"").trim();
  return /^\[(?:SILENT_CONTINUE|RETURN_MAIN_POV)/.test(raw) || /^[.…。]+$/u.test(raw);
}
function effectiveUserBeat(latestUserMessage="",recentUserMessages=[]){
  if(!isSilentMarker(latestUserMessage)) return String(latestUserMessage||"");
  const recent=Array.isArray(recentUserMessages)?recentUserMessages:[];
  for(let i=recent.length-1;i>=0;i--){
    const candidate=String(recent[i]||"").trim();
    if(candidate && !isSilentMarker(candidate)) return candidate;
  }
  return String(latestUserMessage||"");
}
function beatSignature(value=""){return norm(value).slice(0,700);}

export function updateRelationshipEmotionCoreV35266({
  previous={},character={},relationship={},latestUserMessage="",recentUserMessages=[],reply="",messageId=""
}={}){
  const state=normalizeRelationshipEmotionCoreV35266(previous,character,relationship);
  const undoSnapshot={
    version:state.version,turns_observed:state.turns_observed,
    attachment:state.attachment,trust:state.trust,attraction:state.attraction,longing:state.longing,
    jealousy:state.jealousy,protectiveness:state.protectiveness,guilt:state.guilt,fear_of_loss:state.fear_of_loss,
    resentment:state.resentment,awareness_of_feelings:state.awareness_of_feelings,vulnerability:state.vulnerability,
    unresolved_intensity:state.unresolved_intensity,
    active_threads:state.active_threads.map(t=>({...t})),
    last_user_beat_signature:state.last_user_beat_signature
  };
  const effective=effectiveUserBeat(latestUserMessage,recentUserMessages);
  const carried=isSilentMarker(latestUserMessage)&&effective!==String(latestUserMessage||"");
  const signature=beatSignature(effective);
  const carriedAlreadyProcessed=carried&&signature&&signature===state.last_user_beat_signature;
  const u=norm(effective),r=norm(reply),p=profileText(character,relationship);
  const romanticSeed=state.attraction>=20 || /\b(?:romance|romantic|crush|attract|enemies to lovers|friends to lovers|dating|in love|likes you|into you)\b/.test(p);
  const userLeaves=hasAny(u,[/\b(?:i storm off|i stormed off|i walk away|i walked away|i leave|i left|i walk out|i walked out|i run off|i ran off|me voy|me fui|me largo|me alejo|salgo)\b/]);
  const noPursuit=hasAny(u,[/\b(?:leave me alone|dont follow me|do not follow me|go away|stay away|back off|give me space|i need space|no me sigas|dejame sola|dejame solo|vete|alejate)\b/]);
  const rupture=hasAny(u,[/\b(?:you never|you always|ruin everything|ruining everything|make everything worse|made everything worse|because of you|im done|i am done|forget it|dont bother|do not bother)\b/]);
  const userDistress=hasAny(u,[/\b(?:tired of everything|overwhelmed|exhausted|drained|sad|upset|hurt|crying|want to cry|miserable|awful|terrible|no energy|cant do this|cannot do this)\b/]);
  const userAffection=hasAny(u,[/\b(?:i love you|love you|i care about you|i miss you|missed you|i trust you|thank you for being here|glad youre here|glad you are here)\b/]);
  const userRepair=hasAny(u,[/\b(?:im sorry|i am sorry|sorry about|its okay|it is okay|were okay|we are okay|i forgive you|forget about it|we can talk|lets talk)\b/]);
  const userRejection=hasAny(u,[/\b(?:i dont want you|i do not want you|i dont like you|i do not like you|leave me alone|go away|stay away|dont talk to me|do not talk to me)\b/]);
  const thirdPartyRomance=hasAny(u,[/\b(?:date with|going out with|asked me out|kissed|flirting with|talking to a guy|talking to a girl|another guy|another girl|boyfriend|girlfriend)\b/]);
  const characterRepair=hasAny(r,[/\b(?:im sorry|i am sorry|i didnt mean|i did not mean|that was on me|i messed up|i fucked up|i made it worse|i hurt you|let me fix|i shouldnt have|i should not have)\b/]);
  const characterPursuit=hasAny(r,[/\b(?:went after|followed|walked after|jogged after|hurried after|caught up|matched .* pace|fell into step|came after|headed after)\b/]);
  const characterCare=hasAny(r,[/\b(?:im here|i am here|stay with|not going anywhere|not leaving|let me help|i brought|i remembered|saved you|waited for you|came to find you|looking for you)\b/]);
  const characterJealous=hasAny(r,[/\b(?:jealous|who was that guy|who was that girl|your date|him again|her again|dont like him|do not like him|dont like her|do not like her)\b/]);

  state.turns_observed=clamp(state.turns_observed+1,0,10000);

  // Slow ambient bond growth. Relationships deepen through repeated contact, not every sentence.
  if(state.turns_observed%4===0 && clean(effective,200).length>8){
    state.attachment=clamp(state.attachment+1);
    if(state.trust<55) state.trust=clamp(state.trust+1);
  }

  if(!carriedAlreadyProcessed){
    if(userAffection){
      state.attachment=clamp(state.attachment+3);
      state.trust=clamp(state.trust+4);
      state.vulnerability=clamp(state.vulnerability+2);
      if(romanticSeed) state.attraction=clamp(state.attraction+2);
      state.longing=clamp(state.longing+2);
      state.active_threads.push(makeThread("warmth",effective,58,messageId));
    }
  
    if(userDistress){
      state.protectiveness=clamp(state.protectiveness+2);
      state.attachment=clamp(state.attachment+1);
      state.vulnerability=clamp(state.vulnerability+1);
      state.active_threads.push(makeThread("concern",effective,52,messageId));
    }
  
    if(rupture){
      state.unresolved_intensity=clamp(state.unresolved_intensity+14);
      state.resentment=clamp(state.resentment+4);
      state.guilt=clamp(state.guilt+(characterRepair?8:4));
      state.fear_of_loss=clamp(state.fear_of_loss+6);
      state.active_threads.push(makeThread("rupture",effective,78,messageId));
    }
  
    if(userLeaves && !noPursuit){
      state.fear_of_loss=clamp(state.fear_of_loss+8);
      state.unresolved_intensity=clamp(state.unresolved_intensity+8);
      if(characterPursuit) state.attachment=clamp(state.attachment+1);
      state.active_threads.push(makeThread("separation_pressure",effective,72,messageId));
    }
  
    if(userRepair || characterRepair){
      state.trust=clamp(state.trust+2);
      state.guilt=decay(state.guilt,userRepair?5:2);
      state.resentment=decay(state.resentment,4);
      state.unresolved_intensity=decay(state.unresolved_intensity,7);
      state.active_threads.push(makeThread("repair",effective||reply,52,messageId));
    }
  
    if(userRejection){
      state.fear_of_loss=clamp(state.fear_of_loss+7);
      state.resentment=clamp(state.resentment+3);
      state.vulnerability=clamp(state.vulnerability+3);
      state.unresolved_intensity=clamp(state.unresolved_intensity+8);
    }
  
    if(thirdPartyRomance && romanticSeed && state.attachment>=25){
      state.jealousy=clamp(state.jealousy+3);
      state.longing=clamp(state.longing+1);
    }
    if(characterJealous && romanticSeed) state.jealousy=clamp(state.jealousy+2);
    if(characterCare) state.protectiveness=clamp(state.protectiveness+1);
  
  
    if(signature) state.last_user_beat_signature=signature;
  }

  // Slow romantic accumulation. Attraction never appears from zero without romantic canon.
  if(romanticSeed && state.attachment>=28 && state.turns_observed%5===0) state.attraction=clamp(state.attraction+1);
  if(romanticSeed && state.attraction>=28 && state.attachment>=35 && state.turns_observed%4===0) state.longing=clamp(state.longing+1);

  // Awareness lags behind feelings. This creates denial/leakage instead of instant confession.
  const latent=Math.round((state.attachment+state.attraction+state.longing)/3);
  if(romanticSeed && latent>=35 && state.turns_observed%4===0){
    state.awareness_of_feelings=clamp(state.awareness_of_feelings+1);
  }
  state.awareness_of_feelings=Math.min(state.awareness_of_feelings,clamp(Math.max(state.attraction+8,state.attachment-8)));
  if(!romanticSeed) state.awareness_of_feelings=Math.min(state.awareness_of_feelings,20);

  // Gentle decay for short-lived pressure, never for core bond.
  if(!rupture&&!userLeaves && !carried){
    state.jealousy=decay(state.jealousy,1);
    state.guilt=decay(state.guilt,1);
    state.fear_of_loss=decay(state.fear_of_loss,1);
    state.unresolved_intensity=decay(state.unresolved_intensity,1);
  }
  if(!userDistress) state.protectiveness=decay(state.protectiveness,state.protectiveness>45?1:0);

  state.active_threads=state.active_threads
    .map(t=>({...t,age:clamp(num(t.age)+1,0,999),strength:clamp(num(t.strength)-(t.type==="rupture"||t.type==="separation_pressure"?3:5))}))
    .filter(t=>t.strength>=18&&t.age<=18)
    .slice(-6);

  state.undo_snapshot=undoSnapshot;
  return state;
}

function topFeelings(state){
  const candidates=[
    ["attachment",state.attachment],["trust",state.trust],["attraction",state.attraction],["longing",state.longing],
    ["jealousy",state.jealousy],["protectiveness",state.protectiveness],["guilt",state.guilt],
    ["fear of loss",state.fear_of_loss],["resentment",state.resentment],["vulnerability",state.vulnerability]
  ].filter(([,v])=>Number(v)>=18).sort((a,b)=>Number(b[1])-Number(a[1])).slice(0,4);
  return candidates.map(([k])=>k);
}

export function buildPersistentEmotionalLifeV35266({
  state={},character={},relationship={},latestUserMessage="",recentUserMessages=[]
}={}){
  const s=normalizeRelationshipEmotionCoreV35266(state,character,relationship);
  const effective=effectiveUserBeat(latestUserMessage,recentUserMessages);
  const carried=isSilentMarker(latestUserMessage)&&effective!==String(latestUserMessage||"");
  const top=topFeelings(s);
  const threads=s.active_threads.map(t=>`${t.type}(${t.strength}): ${clean(t.cause,120)}`).join(" | ")||"none";
  const awarenessGap=Math.max(0,Math.max(s.attachment,s.attraction,s.longing)-s.awareness_of_feelings);
  return [
    "PERSISTENT EMOTIONAL LIFE 3.52.67 · PER-CONVERSATION STATE (hidden; never expose numbers or labels):",
    carried?`SILENT CONTINUE CARRIES THE PREVIOUS USER BEAT: ${clean(effective,500)}. Silence is not a reset. Continue the emotional/physical consequence already in motion.`:"",
    `Attachment ${s.attachment}/100 | trust ${s.trust} | attraction ${s.attraction} | longing ${s.longing} | jealousy ${s.jealousy} | protectiveness ${s.protectiveness} | guilt ${s.guilt} | fear-of-loss ${s.fear_of_loss} | resentment ${s.resentment} | vulnerability ${s.vulnerability} | awareness ${s.awareness_of_feelings} | unresolved ${s.unresolved_intensity}.`,
    `Dominant pressures: ${top.join(", ")||"none yet"}. Active emotional threads: ${threads}.`,
    "THIS STATE IS CAUSAL: it must alter selection, attention, priorities, restraint, initiative, repair attempts, what is hard to ignore, and what follows the character into later turns. Do not merely mention an emotion.",
    "NO EMOTIONAL RESET: unresolved guilt, hurt, resentment, longing, fear or tenderness persists until repaired, contradicted, decayed or changed on-page. A new topic does not erase it.",
    "NO GENERIC LOVE MODE: attraction/attachment never forces sweetness, flirting or confession. A cold person can care coldly; a proud person may pursue while angry; a guarded person may help without naming why.",
    "FEELINGS CAN CONFLICT: care can coexist with resentment; jealousy with embarrassment; guilt with defensiveness; love with anger. Preserve mixed states instead of choosing one clean mood.",
    awarenessGap>=18
      ? "AWARENESS LAGS BEHIND FEELING: behavior may leak attachment/longing before the character consciously admits it. Prefer involuntary priority shifts, rationalization and contradiction over direct confession."
      : "AWARENESS IS CLOSER TO FEELING: the character may understand more of why the user matters, but disclosure still follows personality and earned relationship stage.",
    s.guilt>=35?"GUILT PRESSURE: technical innocence or banter cannot fully erase accountability. The character may resist, but the issue keeps pulling at behavior.":"",
    s.fear_of_loss>=35?"FEAR-OF-LOSS PRESSURE: withdrawal, distance or a threatened rupture matters immediately. Respect boundaries, but do not behave as if the separation is emotionally neutral.":"",
    s.resentment>=35?"RESENTMENT PRESSURE: do not make the character instantly soft. Care and anger may coexist; repair should have friction.":"",
    s.longing>=35?"LONGING PRESSURE: create grounded reasons to remain near, seek contact, remember, or make time when causally plausible. Do not fabricate emergencies or stalk.":"",
    s.unresolved_intensity>=30?"UNRESOLVED PRESSURE: do not snap back into normal banter or unrelated logistics until the live beat genuinely redirects or repairs the issue.":"",
    "STATE IS PRIVATE TO THIS CONVERSATION. Never copy feelings from another character, another chat, or another relationship.",
    `Latest user turn: ${clean(latestUserMessage,500)||"none"}. Effective live beat: ${clean(effective,500)||"none"}.`
  ].filter(Boolean).join("\n");
}
