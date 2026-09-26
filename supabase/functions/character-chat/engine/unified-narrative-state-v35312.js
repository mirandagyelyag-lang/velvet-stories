// Velvet Stories 3.53.12
// Unified Narrative State: one compact director that composes existing continuity,
// emotion, relationship, NPC and momentum systems instead of adding another competing style layer.

function text(value="", limit=900){
  return String(value ?? "").replace(/\s+/g," ").trim().slice(0,limit);
}
function norm(value=""){
  return text(value,4000).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();
}
function arr(value){ return Array.isArray(value) ? value : []; }
function clamp(value){
  const n=Number(value); return Number.isFinite(n) ? Math.max(0,Math.min(100,n)) : 0;
}
function words(value=""){ return norm(value).split(/\s+/).filter(Boolean); }
function isSilentContinue(value=""){
  const raw=String(value||"").trim();
  return /^[.…。]+$/u.test(raw) || raw.startsWith("[SILENT_CONTINUE") || raw.includes("Treat this as silence from the user");
}
function isReturnMainPov(value=""){
  const raw=String(value||"").trim();
  return raw.startsWith("[RETURN_MAIN_POV") || raw.includes("return main pov");
}
function isLowBandwidthUserTurn(value=""){
  const t=norm(value);
  if(!t) return false;
  if(isSilentContinue(value)||isReturnMainPov(value)) return true;
  const tokens=words(t);
  if(tokens.length>5) return false;
  return /^(?:yeah|yes|yep|yup|mhm|mm|hm|okay|ok|fine|sure|right|true|maybe|whatever|idk|i dont know|no|nah|nope|si|sí|ya|dale|bueno|bien|aj[aá]|mmm|mhm|okey|oki|como quieras|no se|nose|da igual|literal|exacto|exactamente)$/.test(t);
}
function meaningfulBeat(textValue=""){
  const t=norm(textValue);
  if(!t) return false;
  const signal=/\b(?:decid|choose|chose|chooses|invite|invited|ask|asks|asked|tell|tells|told|admit|admits|admitted|refus|declin|follow|stays?|leave|left|return|reveal|confess|promise|cancel|change|changed|call|text|message|kiss|apolog|confront|interrupt|offer|accept|reject|warn|challenge|announce|plan|book|reserve|go with|come with|ven conmigo|vamos|decid|elige|invita|pregunta|dice|cuenta|admite|rechaza|sigue|queda|vuelve|revela|promete|cancela|cambia|llama|mensaje|besa|disculpa|enfrenta|interrumpe|ofrece|acepta|advierte)\w*\b/.test(t);
  const onlyProps=/\b(?:walk|walked|open|opened|fridge|drink|glass|cup|phone|sit|sat|chair|keys|door|counter|bottle|grabbed|picked up|looked|glanced|smirk|grin|camino|camin[oó]|abri[oó]|refrigerador|bebida|vaso|telefono|tel[eé]fono|sent[oó]|silla|llaves|puerta|mostrador|botella|mir[oó]|sonri[oó])\b/.test(t) && !signal;
  return signal && !onlyProps;
}
function sceneFamily(value=""){
  const t=norm(value);
  const families=[
    ["party",/\b(?:party|house party|club|bar|dance floor|afterparty|fiesta|discoteca|bar)\b/],
    ["campus",/\b(?:campus|class|lecture|library|study|university|college|cafeteria|student union|universidad|clase|biblioteca|estudi)\b/],
    ["food",/\b(?:coffee|cafe|diner|restaurant|takeout|pizza|burger|snack|kitchen|caf[eé]|comida|restaurante|cocina)\b/],
    ["car",/\b(?:car|suv|truck|parking|drive|ride|keys|auto|coche|estacionamiento|manejar|llaves)\b/],
    ["home",/\b(?:apartment|bedroom|living room|couch|home|house|departamento|pieza|habitacion|habitaci[oó]n|casa|sof[aá])\b/],
    ["event",/\b(?:concert|wedding|gala|birthday|festival|event|concierto|boda|cumplea[nñ]os|festival|evento)\b/],
    ["trip",/\b(?:airport|hotel|road trip|lake|beach|weekend trip|flight|aeropuerto|hotel|viaje|lago|playa)\b/],
    ["work",/\b(?:office|meeting|workplace|shift|job|studio|oficina|reuni[oó]n|turno|trabajo)\b/],
  ];
  return families.find(([,re])=>re.test(t))?.[0] || "other";
}
function repeatedFamilyRecent(reply,recent=[]){
  const f=sceneFamily(reply);
  if(f==="other") return false;
  const fs=arr(recent).slice(-5).map(sceneFamily).filter(x=>x!=="other");
  return fs.filter(x=>x===f).length>=2;
}
function phraseOverlap(a="",b=""){
  const A=new Set(words(a).filter(w=>w.length>=5)), B=new Set(words(b).filter(w=>w.length>=5));
  if(!A.size||!B.size) return 0;
  let hit=0; for(const w of A) if(B.has(w)) hit++;
  return hit/Math.min(A.size,B.size);
}
function genericVoice(reply=""){
  const t=norm(reply);
  const generic=[
    "all right im listening","all right i m listening","okay im listening","okay i m listening",
    "fair enough","your choice","up to you","whatever you want","i can work with that",
    "he let the moment settle","she let the moment settle","he gave a small nod","she gave a small nod"
  ];
  return generic.some(x=>t.includes(x));
}
function axisSummary(relationshipState={}, emotionState={}, chemistry={}){
  const axes=chemistry?.axes||{};
  const read=(...vals)=>Math.max(...vals.map(clamp),0);
  return {
    attraction:read(axes.attraction,emotionState.attraction,relationshipState.attraction),
    trust:read(axes.trust,emotionState.trust,relationshipState.trust),
    attachment:read(axes.attachment,emotionState.attachment,relationshipState.attachment),
    jealousy:read(emotionState.jealousy,relationshipState.jealousy),
    resentment:read(emotionState.resentment,relationshipState.resentment),
    vulnerability:read(emotionState.vulnerability,relationshipState.vulnerability),
    commitment:read(axes.commitment,emotionState.commitment,relationshipState.commitment),
  };
}
function compactNpcState(persistentCast=[], castConnections=[]){
  const connections=arr(castConnections);
  return arr(persistentCast).slice(0,10).map(npc=>{
    const name=text(npc?.name,80); if(!name) return null;
    const links=connections.filter(c=>norm(c?.from_name)===norm(name)||norm(c?.to_name)===norm(name)).slice(0,3)
      .map(c=>text(`${c.from_name}→${c.to_name}: ${c.relationship||""}`,180));
    return {
      name,
      role:text(npc?.role,120),
      relationship:text(npc?.relationship,180),
      current_dynamic:text(npc?.current_dynamic,180),
      goal:text(npc?.goals,180),
      knowledge:text(npc?.knowledge,180),
      status:text(npc?.status||npc?.presence,100),
      links,
    };
  }).filter(Boolean);
}
function unresolvedPressure({behavior={},worldConsequences={},storyConsequences=[],unresolvedThreads=[]}={}){
  const sticky=[
    ...(arr(worldConsequences?.activeChains)),
    ...arr(storyConsequences).filter(x=>!["resolved","closed","complete","completed"].includes(norm(x?.status))),
    ...arr(unresolvedThreads),
    ...arr(behavior?.unfinished_business),
    ...arr(behavior?.commitments),
  ];
  return sticky.slice(0,8).map(x=>text(typeof x==="string"?x:JSON.stringify(x),260));
}

export function buildUnifiedNarrativeStateV35312({
  character={}, latestUserMessage="", recentUserMessages=[], recentCharacterReplies=[],
  relationshipState={}, intelligenceState={}, chemistry={}, worldConsequences={},
  storyConsequences=[], unresolvedThreads=[], persistentCast=[], castConnections=[],
  scene={}, opening=false
}={}){
  const behavior=intelligenceState?.human_behavior_state||{};
  const emotionState=intelligenceState?.relationship_emotion_core||{};
  const axes=axisSummary(relationshipState,emotionState,chemistry);
  const npcState=compactNpcState(persistentCast,castConnections);
  const pressure=unresolvedPressure({behavior,worldConsequences,storyConsequences,unresolvedThreads});
  const lowBandwidth=isLowBandwidthUserTurn(latestUserMessage);
  const silent=isSilentContinue(latestUserMessage);
  const returning=isReturnMainPov(latestUserMessage);
  const recentFamilies=arr(recentCharacterReplies).slice(-5).map(sceneFamily);
  const sceneSig=text(behavior?.scene_signature||behavior?.scene_variety_avoid||scene?.location||scene?.activity||"",260);
  const voiceDNA=[
    character?.personality, character?.speech_style, character?.voice_vocabulary,
    character?.humor_style, character?.conflict_style, character?.affection_style,
    character?.verbal_tells, character?.voice_avoidances
  ].map(x=>text(x,260)).filter(Boolean).join(" | ");
  return [
    "UNIFIED NARRATIVE STATE 3.53.12 · FINAL COMPOSITION LAYER (hidden):",
    `MODE=${opening?"opening":"live"}; LOW_BANDWIDTH_USER=${lowBandwidth}; SILENT_CONTINUE=${silent}; RETURN_MAIN_POV=${returning}.`,
    `RELATIONSHIP AXES (character-side only): attraction ${axes.attraction}, trust ${axes.trust}, attachment ${axes.attachment}, jealousy ${axes.jealousy}, resentment ${axes.resentment}, vulnerability ${axes.vulnerability}, commitment ${axes.commitment}.`,
    `UNRESOLVED PRESSURE: ${pressure.length?pressure.join(" || "):"none explicitly stored"}.`,
    `NPC STATE: ${npcState.length?text(JSON.stringify(npcState),1800):"no authorized recurring NPC state supplied"}.`,
    `RECENT SCENE FAMILIES: ${recentFamilies.join(" → ")||"none"}. CURRENT SCENE SIGNATURE: ${sceneSig||"none"}.`,
    `CHARACTER VOICE DNA: ${text(voiceDNA,1500)||text(character?.name,100)||"character profile"}.`,
    "1) CONSEQUENCES SURVIVE SCENE CHANGES. A new room, day or activity does not clear hurt, jealousy, promises, refusals, attraction, awkwardness, repair debt, plans or knowledge. Carry the strongest unresolved pressure behaviorally until canon resolves or redirects it.",
    "2) NO PERSONALITY RESET. Write the decision, attention, disclosure level and wording this specific character would choose. Do not fall back to generic agreeable lines, therapist language, polished banter, or a neutral assistant voice.",
    "3) NPCs HAVE STATE. Authorized NPCs keep their own goals, loyalties, knowledge, irritation, attraction, availability and relationships. Do not flatten them into props for the lead. Never invent a new proper-name NPC.",
    "4) RELATIONSHIP IS MULTI-AXIS. Attraction, trust, jealousy, resentment, comfort/vulnerability and commitment can move independently. One intense beat cannot magically raise them all. Preserve asymmetry and repair debt.",
    "5) REPEAT MEANING, NOT STRUCTURE. Do not recycle the same scene family, jealousy choreography, kitchen/food beat, car-key beat, hallway intercept, generic party triangle, or identical emotional beat merely with different nouns.",
    "6) INSTANT STORY MEMORY. Openings should rotate slices of the character's life and social ecosystem. A preferred atmosphere may recur, but not the same narrative skeleton twice in a short window.",
    "7) INTENSITY IS EARNED. Escalate at most one relational layer per meaningful beat unless explicit canon already establishes more. Strong chemistry may change priority or restraint without forcing confession, exclusivity or physical contact.",
    silent
      ? "8) DOT CONTINUATION: the user intentionally handed momentum to the character. Make ONE concrete character-owned choice that changes the social/emotional/practical state. Do not answer with waiting, watching, another prop action, or a question that hands initiative back."
      : "8) CHARACTER INITIATIVE: when the user has not explicitly taken control, let the character carry their share of momentum through one concrete choice, invitation, refusal, disclosure, pursuit, redirect or decision.",
    lowBandwidth
      ? "9) LOW-BANDWIDTH USER TURN: treat the tiny reply as permission to react and continue, not as a request for the user to invent the next beat. Infer only conversational stance that is safely visible; never invent emotion, motive or consent."
      : "9) USER AGENCY: respond to what the user actually authored. Never fill in their feelings, movement, choice, consent, routine or private motive.",
    "10) PRE-SEND AUDIT: before finalizing, silently ask: Did something change? Did I preserve unresolved consequences? Is this unmistakably this character? Did I repeat a recent scene skeleton? Did I invent an NPC or user action? Did I skip relationship stages? If 2+ answers are bad, rewrite before sending.",
    "PERSISTENCE: human_behavior_update.narrative_state_snapshot may compactly record unresolved consequence, current character-side relationship pressure, active NPC pressure, recent_scene_family and next_character_intent. It may summarize only visible/canonical facts and must never invent the user's feelings or future action.",
  ].join("\n");
}

export function unifiedNarrativeStateIssuesV35312({
  reply="", latestUserMessage="", recentUserMessages=[], recentCharacterReplies=[],
  character={}, worldConsequences={}, opening=false
}={}){
  const issues=[];
  const t=String(reply||"").trim();
  if(!t) return ["unified_state_empty_reply"];
  const low=isLowBandwidthUserTurn(latestUserMessage);
  const silent=isSilentContinue(latestUserMessage);
  if((silent||low) && !meaningfulBeat(t) && words(t).length>=18) issues.push(silent?"dot_continuation_no_state_change":"low_bandwidth_stalled");
  if(genericVoice(t) && text(character?.personality||character?.speech_style||character?.voice_vocabulary).length>20) issues.push("character_voice_reset_generic");
  if(repeatedFamilyRecent(t,recentCharacterReplies) && !opening) issues.push("recent_scene_skeleton_repeated");
  const recent=arr(recentCharacterReplies).slice(-4);
  if(recent.some(r=>phraseOverlap(t,r)>=0.58)) issues.push("structural_reply_repetition");
  const active=arr(worldConsequences?.activeChains);
  if(active.length && /\b(?:back to normal|as if nothing happened|everything was normal|nothing had happened|como si nada|todo volvio a la normalidad|todo volvió a la normalidad)\b/i.test(t)) issues.push("consequence_reset_without_resolution");
  return [...new Set(issues)];
}

export function instantStoryStateFamilyIssuesV35312(opening="", recentOpenings=[]){
  const issues=[];
  const f=sceneFamily(opening);
  const recent=arr(recentOpenings).slice(-6);
  const recentFamilies=recent.map(sceneFamily);
  if(f!=="other" && recentFamilies.filter(x=>x===f).length>=2) issues.push("instant_story_scene_family_overused");
  if(recent.some(r=>phraseOverlap(opening,r)>=0.42)) issues.push("instant_story_structure_echo");
  return issues;
}

export const __testV35312 = { isSilentContinue, isLowBandwidthUserTurn, meaningfulBeat, sceneFamily, repeatedFamilyRecent, phraseOverlap, genericVoice };
