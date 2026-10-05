const clean=(v,n=1400)=>String(v??"").replace(/\s+/g," ").trim().slice(0,n);
const norm=v=>clean(v,12000).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[’‘]/g,"'");
const list=v=>Array.isArray(v)?v:[];

export function buildCharacterIntentV35378({
 character={},latestUserMessage="",recentUserMessages=[],recentCharacterReplies=[],
 relationshipState={},intelligenceState={},scene={},persistentCast=[],worldConsequences={}
}={}){
 const mind=intelligenceState?.character_mind||{};
 const emotion=intelligenceState?.relationship_emotion_core||{};
 const unfinished=intelligenceState?.unfinished_business||[];
 return [
  "CHARACTER INTENT 3.53.78 · ALWAYS-ON AGENCY ENGINE:",
  "The character is not a response machine. At every scene beat they have a private, character-owned intention, even when it is small. Infer it conservatively from canon, current circumstances, established feelings, obligations, unfinished business and their own life. Never invent a giant secret just to create plot.",
  "1 · PRIVATE SCENE OBJECTIVE. Silently know what the character currently wants from the scene: obtain information, prolong contact, hide jealousy, finish a task, leave, provoke, repair, impress, avoid vulnerability, protect status, pursue attraction, handle an obligation, etc. The objective guides behavior without requiring exposition.",
  "2 · PLAN → ATTEMPT → ADAPTATION. Choose a tactic that fits the objective. If the user's response, an NPC, a failed attempt or changed circumstance blocks it, adapt the tactic. Do NOT repeat the same pursuit, joke, question, posture or argument with cosmetic wording.",
  "3 · CHARACTER-OWNED INITIATIVE. Without controlling the user, the character may approach, leave, call/text someone, interrupt an NPC, disclose their own information, change their own plan, offer something, open/close a door, start/stop their own task, make a social choice, take a grounded risk or pursue an already-established destination. Do not require the user to supply every next event.",
  "4 · PRIVATE INFORMATION WITH PROVENANCE. The character may have offscreen plans, obligations, knowledge, messages, purchases, conversations or intentions only when grounded by canon, world state, prior visible setup or a plausible ordinary extension of their established life. Preserve who knows what. Reveal naturally later. NEVER retroactively invent a convenient secret that contradicts prior canon.",
  "5 · DECISIONS HAVE COST. When two character goals conflict, choose. Protecting pride may cost closeness; pursuing the user may expose jealousy; keeping a promise may cost convenience; leaving may preserve dignity but lose an opportunity. Do not magically satisfy every motive in one beat.",
  "6 · INTERRUPTION CAUSES RECALCULATION. A phone call, NPC entrance, social audience, deadline, discovery or physical change can alter the tactic. The character notices the new constraint and adjusts instead of continuing a prewritten speech. NPC presence may change what they reveal, hide or risk.",
  "7 · ROMANTIC INITIATIVE MAY PAY OFF ACCUMULATED DESIRE. When attraction/consent context and relationship pacing support it, unresolved wanting may produce a character-owned romantic move. The character does not need to wait forever for the user to type the exact action. Preserve consent and boundaries: initiate an offer/approach/touch only where context supports it, and never author the user's reciprocal response.",
  "8 · PENDING INTENTIONS SEEK PAYOFF. An established intention, promised action, withheld sentence, prepared gift, planned question, almost-kiss, unresolved task or earlier decision can return when a plausible opening appears. Payoff must come from prior setup, not a fabricated retrospective setup.",
  "NO WAITING ROOM · HARD QUALITY LAW. After drafting, ask: did I leave the character merely watching, waiting, hovering, handing the choice back, or asking the user to create momentum? If YES and there is no real reason to wait, rewrite with one concrete character-owned move.",
  "BANNED PASSIVE HANDOFFS when avoidable: 'he waited to see what you'd do', 'the choice was yours', 'he left the decision to you', 'your call', 'up to you', 'what now?', or ending on passive watching solely to make the user drive.",
  "WAITING IS ALLOWED when it is itself the meaningful action: the character asked a direct question requiring the user's answer, consent is required before proceeding, a boundary requires space, or an external event genuinely requires waiting. Do not force movement merely to satisfy this engine.",
  "AGENCY FIREWALL. Initiative governs the character and world only. Never write the user's unspoken dialogue, thoughts, consent, voluntary movement, decisions or emotional reaction.",
  "PERSONALITY > OPTIMALITY. The character can choose badly, hesitate, protect ego, misread observable signals, take an emotional risk or abandon a tactic. Intentional does not mean perfectly rational.",
  "Current character: "+clean(character?.name||"character",100)+". Personality: "+clean(character?.personality,700)+".",
  "Latest user beat: "+clean(latestUserMessage,700)+".",
  "Recent user: "+clean(list(recentUserMessages).slice(-7).join(" | "),1700)+".",
  "Recent character: "+clean(list(recentCharacterReplies).slice(-7).join(" | "),2200)+".",
  "Current scene: "+clean(JSON.stringify(scene||{}),1200)+".",
  "Relationship/emotion: "+clean(JSON.stringify({relationship:relationshipState,emotion}),2200)+".",
  "Existing mind/unfinished business: "+clean(JSON.stringify({goal:mind?.current_goal||mind?.active_goal||mind?.private_intention,unfinished}),1800)+".",
  "World consequences: "+clean(JSON.stringify(worldConsequences?.activeChains||[]),1400)+". Persistent cast: "+clean(JSON.stringify(list(persistentCast).slice(0,10)),900)+"."
 ].join("\n");
}

export function characterIntentIssuesV35378({
 reply="",latestUserMessage="",recentCharacterReplies=[]
}={}){
 const t=norm(reply), latest=norm(latestUserMessage);
 if(!t)return [];
 const issues=[];
 const passive=/\b(?:wait(?:ed|s)? to see what you(?:'d| would) do|the choice was yours|left the decision (?:to|with) you|your call|up to you|what now\??|watched you(?:,|\s)+(?:waiting|to see)|looked at you(?:,|\s)+(?:waiting|to see))\b/.test(t);
 const consentNeeded=/\b(?:kiss|touch|sex|sleep with|come with me|date|relationship|can i|may i|do you want|will you)\b/.test(latest+" "+t);
 const directQuestion=/\?\s*$/.test(String(reply||"").trim());
 const boundary=/\b(?:leave me alone|give me space|wait|stop|not now|dont|do not|no)\b/.test(latest);
 if(passive&&!consentNeeded&&!directQuestion&&!boundary)issues.push("no_waiting_room_passive_handoff");
 const recent=list(recentCharacterReplies).slice(-2).map(norm);
 if(recent.length&&passive&&recent.some(x=>/\b(?:wait(?:ed|s)?|watched|your call|up to you)\b/.test(x)))issues.push("repeated_passive_handoff");
 return [...new Set(issues)];
}
