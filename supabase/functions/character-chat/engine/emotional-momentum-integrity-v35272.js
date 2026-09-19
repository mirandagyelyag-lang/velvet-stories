// Velvet Stories v3.52.72 · Emotional Momentum Integrity
// Protects the FIRST draft from emotionally canceling or mechanically repeating
// the character's immediately established stance.

const clean=(v="",n=1200)=>String(v??"").replace(/\s+/g," ").trim().slice(0,n);
const norm=(v="")=>clean(v,12000).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[’']/g,"");

function isSilentMarker(value=""){
  const raw=String(value||"").trim();
  return /^\[(?:SILENT_CONTINUE|RETURN_MAIN_POV)/.test(raw) || /^[.…。]+$/u.test(raw);
}

function latestMeaningfulUserBeat(latestUserMessage="",recentUserMessages=[]){
  if(!isSilentMarker(latestUserMessage)) return String(latestUserMessage||"");
  const recent=Array.isArray(recentUserMessages)?recentUserMessages:[];
  for(let i=recent.length-1;i>=0;i--){
    const candidate=String(recent[i]||"").trim();
    if(candidate && !isSilentMarker(candidate)) return candidate;
  }
  return String(latestUserMessage||"");
}

function exactBoundary(value=""){
  const t=norm(value);
  if(/\b(?:leave me alone|go away|stay away|dont talk to me|do not talk to me|leave|vete|dejame sola|dejame solo|no me hables|alejate)\b/.test(t)) return "disengage";
  if(/\b(?:stop following me|dont follow me|do not follow me|dont come after me|do not come after me|no me sigas|no vengas detras|no vengas detrás)\b/.test(t)) return "stop_following";
  if(/\b(?:give me space|i need space|back off|dame espacio)\b/.test(t)) return "space";
  return "none";
}

function hasChargedStance(value=""){
  const t=norm(value);
  return /\b(?:im not going anywhere|i am not going anywhere|im not leaving|i am not leaving|not leaving it like this|not letting this go|it matters|because its you|because it is you|i care|i dont like watching you|i do not like watching you|were not done|we are not done|im not done|i am not done|not like this)\b/.test(t);
}

function hasVulnerableAdmission(value=""){
  const t=norm(value);
  return /\b(?:it matters|because its you|because it is you|i care|i dont like watching you|i do not like watching you|jealous|i didnt mean|i did not mean|im sorry|i am sorry|i fucked up|i messed up|i made it worse|i hurt you|i dont want to lose|i do not want to lose)\b/.test(t);
}

function usedMotifs(recentCharacterReplies=[]){
  const joined=norm((Array.isArray(recentCharacterReplies)?recentCharacterReplies.slice(-4):[]).join(" | "));
  const motifs=[];
  if(/\bhands? (?:shoved|slid|stayed|remaining|remained).*pockets?\b|\bhands? in (?:his|her|their) pockets?\b/.test(joined)) motifs.push("hands-in-pockets");
  if(/\bjaw (?:tightened|tightening|set|clenched)\b/.test(joined)) motifs.push("jaw-tightening");
  if(/\bgaze (?:dropped|fell|lowered)|\blooked (?:down|away)\b/.test(joined)) motifs.push("gaze-drop/look-away");
  if(/\b(?:few|couple of|one|half) (?:paces?|steps?) (?:back|behind)\b|\bkept pace\b|\bmatched (?:her|his|their|your) (?:pace|stride)\b/.test(joined)) motifs.push("following-distance/pace");
  if(/\b(?:arms crossed|crossed .* arms|folded .* arms)\b/.test(joined)) motifs.push("crossed-arms");
  return motifs;
}

function passiveChoiceHandoff(value=""){
  const t=norm(value);
  return /\b(?:tell me to go and ill go|tell me to go and i will go|if you want me to go ill go|if you want me to go i will go|go back inside if you want|whatever you want me to do|just tell me what you want me to do|you decide if i stay|you decide if i go)\b/.test(t);
}

function emotionalRetreat(value=""){
  const t=norm(value);
  return /\b(?:turned and left|walked away|went back inside|returned to the party|left her alone|left him alone|left you alone|gave up and left|went back to his friends|went back to her friends)\b/.test(t);
}

export function buildEmotionalMomentumIntegrityV35272({
  character={},latestUserMessage="",recentUserMessages=[],recentCharacterReplies=[]
}={}){
  const recent=Array.isArray(recentCharacterReplies)?recentCharacterReplies.slice(-4):[];
  const recentText=recent.join(" | ");
  const effective=latestMeaningfulUserBeat(latestUserMessage,recentUserMessages);
  const boundary=exactBoundary(effective);
  const stance=hasChargedStance(recentText);
  const vulnerable=hasVulnerableAdmission(recentText);
  const motifs=usedMotifs(recent);

  return [
    "EMOTIONAL MOMENTUM INTEGRITY 3.52.72 · FIRST-DRAFT RULE (hidden):",
    `LATEST USER: ${clean(latestUserMessage,650)||"none"}. EFFECTIVE BEAT: ${clean(effective,650)||"none"}. BOUNDARY=${boundary}. PRIOR CHARGED STANCE=${stance?"YES":"no"}. RECENT VULNERABILITY=${vulnerable?"YES":"no"}.`,
    "DO NOT RESET THE EMOTIONAL POSITION BETWEEN ADJACENT TURNS. If the character just admitted that something matters, refused to leave, showed jealousy, guilt, hurt, attachment or unfinished need, the next reply must grow from that position unless the user clearly changes the situation.",
    "NO SELF-CANCELLATION: after a line equivalent to 'I'm not going anywhere', 'it matters', 'because it's you', or 'I'm not letting this go', do not immediately undercut it with 'tell me to go and I'll go', 'go back inside if you want', or another passive handoff. A change of mind needs a visible reason.",
    `BOUNDARY PRECISION: ${boundary==="stop_following"?"the user said STOP FOLLOWING. Stop the physical pursuit immediately, but do not invent a stronger 'leave forever / emotionally disengage' boundary. The character may stay where they are, speak from there, or remain emotionally invested without advancing.":boundary==="space"?"the user asked for SPACE. Increase physical distance and pressure less, but do not erase established feeling unless they also asked the character to leave/disengage.":boundary==="disengage"?"the user explicitly asked for disengagement. Respect it; do not pursue or keep pressing the conversation.":"respect any literal boundary the user gives, but do not invent one they did not give."}`,
    "SPACE IS NOT EMOTIONAL AMNESIA. When the character gives physical room, preserve the unresolved feeling through one specific choice, line, refusal, admission, restraint or consequence. Do not convert charged conflict into polite customer-service availability.",
    "HUMOR CAN DEFEND, NOT ERASE. Sarcasm or teasing after vulnerability may be a shield, but the emotional stake must still be detectable in what the character does next. Do not use one joke to reset the scene to normal banter.",
    "SILENT CONTINUE MUST CHANGE THE BEAT. If the user yields the turn, do not repeat the same 'kept pace / stayed a few steps back / hands in pockets / watched quietly' geometry. Advance one decision, disclosure, resistance, consequence or meaningful silence with changed behavior.",
    `RECENT LOW-SIGNAL MOTIFS ALREADY USED: ${motifs.length?motifs.join(", "):"none detected"}. Avoid immediately recycling these unless the repetition itself is dramatically meaningful.`,
    "DO NOT HAND THE SCENE BACK TO THE USER JUST TO AVOID COMMITMENT. In charged moments, the character should make one character-specific choice instead of asking the user to decide whether they stay, go, speak, or care.",
    `CHARACTER: ${clean(character?.name,90)} | personality=${clean(character?.personality,460)} | conflict=${clean(character?.conflict_style,320)} | affection=${clean(character?.affection_style,320)}.`,
    `RECENT CHARACTER REPLIES: ${clean(recentText,1200)||"none"}.`
  ].join("\n");
}

export function emotionalMomentumIntegrityV35272Issues({
  reply="",latestUserMessage="",recentUserMessages=[],recentCharacterReplies=[]
}={}){
  const issues=[];
  const recent=Array.isArray(recentCharacterReplies)?recentCharacterReplies.slice(-4):[];
  const recentText=recent.join(" | ");
  const effective=latestMeaningfulUserBeat(latestUserMessage,recentUserMessages);
  const boundary=exactBoundary(effective);
  const t=norm(reply);

  if(hasChargedStance(recentText) && boundary!=="disengage" && passiveChoiceHandoff(reply)){
    issues.push("emotional_stance_self_cancelled");
  }

  if(boundary==="stop_following" && emotionalRetreat(reply)){
    issues.push("stop_following_overread_as_full_disengagement");
  }

  const motifs=usedMotifs(recent);
  if(motifs.includes("hands-in-pockets") && /\bhands? (?:shoved|slid|stayed|remaining|remained).*pockets?\b|\bhands? in (?:his|her|their) pockets?\b/.test(t)){
    issues.push("repeated_hands_in_pockets");
  }
  if(motifs.includes("jaw-tightening") && /\bjaw (?:tightened|tightening|set|clenched)\b/.test(t)){
    issues.push("repeated_jaw_tightening");
  }
  if(motifs.includes("following-distance/pace") && /\b(?:few|couple of|one|half) (?:paces?|steps?) (?:back|behind)\b|\bkept pace\b|\bmatched (?:her|his|their|your) (?:pace|stride)\b/.test(t)){
    issues.push("repeated_following_geometry");
  }

  if(isSilentMarker(latestUserMessage) && recent.length){
    const sterile=/\b(?:stayed|kept|remained|followed|walked)\b/.test(t)
      && /\b(?:pace|stride|steps?|paces?|behind|pockets?|quiet|silence|said nothing|didnt say anything|did not say anything)\b/.test(t)
      && !/["“][^"”]{3,}|\b(?:stopped|turned|blocked himself|decided|admitted|said|asked|refused|swore|laughed|snapped|called out)\b/.test(t);
    if(sterile) issues.push("silent_continue_repeats_static_geometry");
  }

  if(hasVulnerableAdmission(recentText)
    && /\b(?:yeah .*you caught me|permission slip|whatever|sure|fine)\b/.test(t)
    && !/\b(?:but|still|doesnt change|does not change|matter|care|stay|not going|not leaving|looked back|didnt move|did not move)\b/.test(t)){
    issues.push("defensive_humor_erased_emotional_stake");
  }

  return [...new Set(issues)];
}
