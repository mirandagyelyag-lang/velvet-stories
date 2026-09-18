// Velvet Stories v3.52.65 · Pursuit + Emotional Priority
// Creator-level invariant: when the user physically leaves the character during
// an active scene, the character follows unless the user explicitly forbids it.
// Personality controls HOW they follow, never whether the departure is ignored.

const clean=(v="",n=900)=>String(v??"").replace(/\s+/g," ").trim().slice(0,n);
const norm=(v="")=>clean(v,9000).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[’']/g,"");

function explicitNoPursuit(value=""){
  const t=norm(value);
  return /\b(?:leave me alone|stop following me|dont follow me|do not follow me|dont come after me|do not come after me|go away|stay away|back off|give me space|i need space|let me go|no me sigas|no vengas detras|no vengas detrás|dejame sola|dejame solo|déjame sola|déjame solo|vete|alejate|aléjate|dame espacio)\b/.test(t);
}

function actualDeparture(value=""){
  const raw=String(value||"");
  const t=norm(raw);
  const staged=[...raw.matchAll(/\*([^*]+)\*/gs)].map(m=>norm(m[1])).join(" ");
  const all=`${t} ${staged}`;
  return /\b(?:i storm off|i stormed off|i walk away|i walked away|i leave|i left|i walk out|i walked out|i head out|i headed out|i go home|i went home|i run off|i ran off|i turn and leave|i turned and left|i push past .* and leave|i brush past .* and leave|i get out of there|i got out of there|me voy|me fui|me largo|me largue|me largué|me alejo|me alej[eé]|salgo de ahi|salgo de aquí|me voy de ahi|me voy de aquí)\b/.test(all);
}

function activePursuit(reply=""){
  const t=norm(reply);
  return /\b(?:went after|goes after|go after|followed|follows|follow after|walked after|walks after|moved after|moves after|stepped after|steps after|jogged after|jogs after|hurried after|hurries after|caught up|catches up|matched .* pace|matches .* pace|fell into step|falls into step|came after|comes after|headed after|heads after|pushed through .* after|slipped past .* after|started after|starts after|crossed .* after|crosses .* after)\b/.test(t);
}

function staticOrRelease(reply=""){
  const t=norm(reply);
  return /\b(?:stayed where he was|stayed where she was|stayed where they were|remained where|watched .* leave|watched .* walk away|watched .* storm off|let her go|let him go|let them go|let you go|didnt follow|did not follow|made no move to follow|turned back to|went back to|returned to the party|returned to the room|returned to work|attention shifted back|picked .* drink back up|watched the empty space)\b/.test(t);
}

function npcDiversion(reply=""){
  const t=norm(reply);
  const npcInterrupt=/\b(?:someone|a guy|a girl|miller|friend|teammate|classmate|guest|student)\b.{0,120}\b(?:called|asked|stopped|flagged|needed|wanted|looking for|looked for|interrupted)\b/.test(t);
  const defers=/\b(?:not now|later|can wait|tell .* later|figure it out|handle it|deal with it|without slowing|didnt slow|did not slow|kept moving|kept walking|barely looked|brushed past)\b/.test(t);
  return npcInterrupt && !defers;
}

function pursuitFeelsMotivated(reply=""){
  const t=norm(reply);
  // Do not require an emotion label. Changed priority, urgency, an unfinished
  // argument, apology, anger, guilt, concern or refusal to let the moment die all count.
  return /\b(?:wait|hey|hold on|not done|were not done|we are not done|im not done|i am not done|dont walk away|do not walk away|you can be mad|youre mad|you are mad|i didnt mean|i did not mean|im sorry|i am sorry|i fucked up|i messed up|that was on me|i made it worse|i hurt you|i need to answer|let me answer|listen|not like this|cant leave it like this|cannot leave it like this|not letting this end like this|not now|can wait|figure it out|barely looked|without slowing|kept moving)\b/.test(t)
    || activePursuit(reply);
}

export function buildPursuitEmotionPriorityV35265({
  character={},latestUserMessage="",recentUserMessages=[],recentCharacterReplies=[]
}={}){
  const boundary=explicitNoPursuit([...(Array.isArray(recentUserMessages)?recentUserMessages.slice(-3):[]),latestUserMessage].join(" | "));
  const departed=actualDeparture(latestUserMessage);
  return [
    "PURSUIT + EMOTIONAL PRIORITY 3.52.65 · CREATOR INVARIANT (hidden):",
    `LATEST USER: ${clean(latestUserMessage,700)||"none"}. DEPARTURE=${departed?"YES":"no"}. NO-PURSUIT BOUNDARY=${boundary?"YES":"no"}.`,
    "DEFAULT PURSUIT RULE: if the user physically leaves, storms off, walks away, runs off, exits the room/party, or goes home during the live interaction, THIS CHARACTER FOLLOWS IN THE SAME TURN unless the user explicitly said not to follow, to leave them alone, go away, stay away, back off, or give them space.",
    "THIS IS CREATOR CANON, NOT A PERSONALITY GUESS. Shy, proud, cold, angry, confident, gentle, jealous, practical and guarded characters all obey the pursuit rule. Personality determines HOW: briskly, reluctantly, angrily, quietly, awkwardly, stubbornly, apologetically, etc.",
    "PURSUIT MEANS MOVEMENT. Watching the user leave, tracking them with the eyes, calling one word from the same spot, staying put, returning to friends/work, or letting an NPC interruption take over does NOT satisfy the rule.",
    "EMOTION DRIVES THE MOVEMENT: the character follows because the departure matters to them now. Let guilt, anger, concern, fear of losing the moment, attachment, jealousy, stubbornness, protectiveness, hurt, or an unfinished need to answer alter priority. Show it through action and ordinary speech; do not narrate an emotion report.",
    "NPC/OBLIGATION PRIORITY: a casual friend, party guest, classmate, teammate, event task, work detail, tailgate, phone buzz, or ordinary obligation cannot steal this beat. The character may say 'not now', delegate, ignore it, or answer in one clause while continuing to follow.",
    "BOUNDARY OVERRIDE: if the user explicitly says not to follow / leave me alone / go away / stay away / give me space, DO NOT pursue. Respect that immediately. Following does not permit grabbing, blocking exits, restraining, cornering or touching unless separately and clearly allowed by canon/user.",
    "NO GENERIC PURSUIT: do not reduce pursuit to 'Wait!' and stop. Move after the user and make one character-specific consequential choice or line.",
    `CHARACTER: ${clean(character?.name,80)} | personality=${clean(character?.personality,420)} | relationship=${clean(character?.relationship,420)}.`,
    `RECENT CHARACTER: ${clean((Array.isArray(recentCharacterReplies)?recentCharacterReplies.slice(-4):[]).join(" | "),700)||"none"}.`
  ].join("\n");
}

export function pursuitEmotionPriorityV35265Issues({
  reply="",latestUserMessage="",recentUserMessages=[]
}={}){
  const context=[...(Array.isArray(recentUserMessages)?recentUserMessages.slice(-3):[]),latestUserMessage].join(" | ");
  if(!actualDeparture(latestUserMessage)) return [];
  if(explicitNoPursuit(context)) {
    return activePursuit(reply) ? ["pursuit_boundary_violated"] : [];
  }

  const issues=[];
  if(!activePursuit(reply)) issues.push("required_pursuit_missing");
  if(staticOrRelease(reply)) issues.push("departure_passively_released");
  if(npcDiversion(reply)) issues.push("departure_priority_stolen_by_npc");
  if(activePursuit(reply) && !pursuitFeelsMotivated(reply)) issues.push("pursuit_emotion_flattened");
  return [...new Set(issues)];
}
