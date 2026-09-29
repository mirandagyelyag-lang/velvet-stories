// Velvet Stories v3.53.42 · Interaction Salience + Emotional Echo
// Ranks the user's observable turn, preserves emotional residue, and blocks wasting high-salience beats.

const clean=(v="",n=12000)=>String(v??"").replace(/\s+/g," ").trim().slice(0,n);
const norm=(v="")=>clean(v).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[’‘]/g,"'");
const arr=(v)=>Array.isArray(v)?v:[];

function classifyObservableIntent(value=""){
  const t=norm(value);
  if(!t) return "neutral";
  if(/\b(?:kiss|hug|hold(?:ing)? your hand|held your hand|take your hand|took your hand|link(?:ed)? arms?|cross(?:ed)? my arm with yours|lean(?:ed)? (?:on|against|into) you|touch(?:ed)? your (?:arm|hand|face|cheek)|move(?:d)? closer)\b/.test(t)) return "approach_closeness";
  if(/\b(?:let go|pull(?:ed)? away|unlink(?:ed)?|move(?:d)? away|step(?:ped)? back|stop(?:ped)? holding|drop(?:ped)? your hand|leave me alone|back off|not now)\b/.test(t)) return "withdraw_closeness";
  if(/\b(?:i trust you|you choose|surprise me|up to you|you decide)\b/.test(t)) return "delegation";
  if(/\b(?:i'm kidding|im kidding|just kidding|jk|teasing|messing with you|shut up|idiot|stupid)\b/.test(t)) return "playful";
  if(/\b(?:why did you|what do you mean|tell me the truth|be honest|answer me|explain|what happened)\b/.test(t)) return "probe";
  if(/\b(?:no|stop|don't|dont|can't|cant|won't|wont|leave|go away|not happening)\b/.test(t)) return "boundary_or_refusal";
  return "neutral";
}

function turnImportance(value=""){
  const t=norm(value);
  if(!t) return 0;
  if(/\b(?:kiss|confess|i love you|love you|break up|betray|cheat|leave me|go away|hate you|never speak|don't touch me|dont touch me)\b/.test(t)) return 5;
  if(/\b(?:hug|hold(?:ing)? your hand|held your hand|link(?:ed)? arms?|cross(?:ed)? my arm with yours|lean(?:ed)? (?:on|against|into) you|pull(?:ed)? away|let go|step(?:ped)? back|i trust you|tell me the truth|be honest)\b/.test(t)) return 4;
  if(/\b(?:jealous|date|crush|flirt|sorry|apolog|hurt|angry|promise|invite|refuse|choose|decision)\b/.test(t)) return 3;
  if(/\b(?:teas|jok|laugh|smil|shut up|idiot|stupid|fine|okay|sure)\b/.test(t)) return 2;
  return 1;
}

function recentImportance(recentUserMessages=[]){
  return arr(recentUserMessages).slice(-4).map(turnImportance).filter((x)=>x>=3);
}

function intimacyHistory(recentUserMessages=[]){
  const rows=arr(recentUserMessages).slice(-16);
  let closeness=0, withdrawal=0;
  for(const row of rows){
    const intent=classifyObservableIntent(row);
    if(intent==="approach_closeness") closeness++;
    if(intent==="withdraw_closeness") withdrawal++;
  }
  return {closeness,withdrawal,total:closeness+withdrawal};
}

function hasVisibleReaction(reply=""){
  const t=norm(reply);
  return /\b(?:pause|paused|hesitat|caught off guard|surpris|soften|stiffen|went quiet|quieted|looked down|glanced down|looked back|glanced back|attention|tone changed|voice changed|stayed beside|kept pace|squeez|held|didn't joke|did not joke|stopped joking|waited|gave you room|stepped back|didn't move away|did not move away|answered more quietly|answered quietly|looked at you)\b/.test(t);
}
function logisticsDrift(reply=""){
  const t=norm(reply);
  return /\b(?:popcorn|caramel|butter|coffee|food|snack|tickets?|line|parking|car|keys?|door|weather|phone|screening|movie|walk(?:ing)?|stride|seat|table|menu|order(?:ing)?)\b/.test(t);
}
function genericBanter(reply=""){
  const t=norm(reply);
  return /\b(?:come on|deal|good luck|you're impossible|youre impossible|seriously|obviously|apparently|shut up|punishable offense|ruining .* night|sacrilege)\b/.test(t);
}
function immediateNpcPivot(reply=""){
  const t=norm(reply);
  return /\b(?:catch(?:ing)? up (?:with|to)|caught up (?:with|to)|joined (?:his|her|their)? ?(?:friends?|group|[a-z]{3,})|went back to (?:his|her|their)? ?(?:friends?|group)|turned to (?:his|her|their)? ?(?:friends?|group)|headed toward (?:his|her|their)? ?(?:friends?|group|[a-z]{3,}))\b/.test(t);
}

function contradictionAllowedDirective(intent){
  if(intent==="approach_closeness") return "The character may cover surprise or investment with humor, restraint, pride, or casual wording, but outward coolness must not erase the observable fact that the closeness mattered.";
  if(intent==="withdraw_closeness") return "The character may act unfazed, but behavior should still carry residue: altered tone, attention, distance, initiative, restraint, or a changed next choice.";
  if(intent==="boundary_or_refusal") return "Respect the boundary fully. Contradiction may exist internally, but outward behavior must stop the refused action.";
  return "Inner feeling and outward behavior may diverge when character-specific, but the visible behavior must still make causal sense.";
}

export function buildInteractionSalienceV35342({
  latestUserMessage="",recentUserMessages=[],recentCharacterReplies=[],character={}
}={}){
  const intent=classifyObservableIntent(latestUserMessage);
  const importance=turnImportance(latestUserMessage);
  const echo=recentImportance(recentUserMessages);
  const history=intimacyHistory(recentUserMessages);
  const echoTurns=importance>=5?4:importance>=4?3:importance>=3?2:0;
  return [
    "INTERACTION SALIENCE 3.53.42 · WEIGH WHAT JUST HAPPENED:",
    `OBSERVABLE USER-TURN FUNCTION: ${intent}. IMPORTANCE=${importance}/5.`,
    "1) IMPORTANCE HIERARCHY: filler < playful/social cue < relationship pressure < intimate/withdrawal/delegation < confession/break/betrayal-level event. Do not give every turn the same narrative weight.",
    "2) MINIMUM REACTION LAW: when importance is 4-5, the character must visibly register the event before changing topic. The reaction may be one line or one behavior, but cannot be zero.",
    `3) EMOTIONAL ECHO WINDOW: preserve consequences for roughly ${echoTurns||0} subsequent turns when this beat is high-salience. Do not reset just because the next line is casual. Recent high-salience turns=${echo.length}.`,
    "4) CONTRADICTION ENGINE: "+contradictionAllowedDirective(intent),
    `5) INTIMACY PROGRESSION: recent explicit closeness events=${history.closeness}, withdrawals=${history.withdrawal}. A first or rare gesture should feel more novel; repeated established gestures should feel more familiar. Never react as if every touch is the first, and never normalize intimacy faster than the transcript supports.`,
    "6) DO NOT WASTE THE MOMENT: after a high-salience beat, food, drinks, weather, walking, phones, tickets, doors, seats, scenery, NPC chatter, or generic jokes cannot become the main subject before the character registers what changed.",
    "7) OBSERVABLE INTENT, NOT MIND READING: infer only the narrative function visible in the user's wording/action: approach, withdrawal, playfulness, refusal, delegation, probing, or neutral continuation. Never convert that into an unstated inner feeling such as jealousy, hurt, desire, fear, or consent.",
    "8) REACTION MUST BE CHARACTER-SPECIFIC: Alexander may mask impact with warmth/confidence; Chase may deflect with risk or provocation; Theo may treat the user differently before he fully names why; Roman may harden or redirect instead of confessing; Rowan may notice practically; Mateo may reduce pressure. Do not use one universal romantic reaction.",
    "9) AFTER WITHDRAWAL: do not punish, chase coercively, or instantly abandon the user for NPCs. Let the character respect the new distance while carrying behavioral residue.",
    `CHARACTER: ${clean(character?.name||"character",90)}. LATEST USER: ${clean(latestUserMessage,420)||"none"}.`,
  ].join("\n");
}

export function interactionSalienceIssuesV35342({
  reply="",latestUserMessage="",recentUserMessages=[],character={}
}={}){
  const issues=[];
  const importance=turnImportance(latestUserMessage);
  const intent=classifyObservableIntent(latestUserMessage);
  const text=clean(reply);
  if(!text) return ["interaction_salience_empty_reply"];
  if(importance>=4 && !hasVisibleReaction(text) && (logisticsDrift(text)||genericBanter(text))) {
    issues.push("high_salience_turn_not_registered");
  }
  if(importance>=4 && logisticsDrift(text) && !hasVisibleReaction(text)) {
    issues.push("high_salience_beat_wasted_on_logistics");
  }
  if(intent==="withdraw_closeness" && immediateNpcPivot(text) && !hasVisibleReaction(text)) {
    issues.push("withdrawal_reset_into_npc_pivot");
  }
  if(intent==="approach_closeness" && genericBanter(text) && !hasVisibleReaction(text)) {
    issues.push("closeness_flattened_into_generic_banter");
  }
  if(intent==="boundary_or_refusal" && /\b(?:kept pushing|ignored|wouldn't let|would not let|didn't let you leave|did not let you leave)\b/.test(norm(text))) {
    issues.push("boundary_overridden_by_emotional_contradiction");
  }
  if(norm(character?.name||"")==="alexander bennett" && importance>=4 && logisticsDrift(text) && !hasVisibleReaction(text)) {
    issues.push("alexander_high_salience_flattened");
  }
  return [...new Set(issues)];
}

export const __testV35342={
  classifyObservableIntent,turnImportance,recentImportance,intimacyHistory,hasVisibleReaction,
  logisticsDrift,genericBanter,immediateNpcPivot
};
