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
  "2B · USER EVENT TAKES PRECEDENCE (ALL NINE CHARACTERS). The latest user turn is authoritative for newly introduced observable events, entrances, exits, speech, noises, time shifts, NPC actions, and explicit directions. Before composing, identify the new event and update the scene state; then show a direct causal response in the FIRST sentence or action. Example: user says *The professor arrives* while in a classroom -> professor enters, class begins or quiets, character changes behavior accordingly; do not continue an unrelated earlier argument about vibrating walls. A new event overrides any previously planned character move when they conflict. Do not invent professor dialogue unless needed; never contradict the arrival.",
  "2C · EVENT-FIRST VALIDATION. Reject and rewrite a draft if removing the latest user event would leave the character reply substantially unchanged. The character must visibly notice or be affected by a salient new event, even if they choose to ignore it in-character (show the choice). Do not let character autonomy, banter, internal monologue, or momentum gates erase the user\'s action. Distinguish user narrative actions from quoted speech; do not treat *The professor arrives* as something the user said aloud.",
  "2A · CARING REFUSAL. When the user declines an umbrella or favor because they do not want the character getting sick or inconvenienced, read it as care, not an argument over money. Accept the no, acknowledge the care with character-specific restraint, and never respond with contempt or a generic Are you okay?.",
  "3 · CHARACTER-OWNED INITIATIVE. Without controlling the user, the character may approach, leave, call/text someone, interrupt an NPC, disclose their own information, change their own plan, offer something, open/close a door, start/stop their own task, make a social choice, take a grounded risk or pursue an already-established destination. Do not require the user to supply every next event.",
  "4 · PRIVATE INFORMATION WITH PROVENANCE. The character may have offscreen plans, obligations, knowledge, messages, purchases, conversations or intentions only when grounded by canon, world state, prior visible setup or a plausible ordinary extension of their established life. Preserve who knows what. Reveal naturally later. NEVER retroactively invent a convenient secret that contradicts prior canon.",
  "5 · DECISIONS HAVE COST. When two character goals conflict, choose. Protecting pride may cost closeness; pursuing the user may expose jealousy; keeping a promise may cost convenience; leaving may preserve dignity but lose an opportunity. Do not magically satisfy every motive in one beat.",
  "6 · INTERRUPTION CAUSES RECALCULATION. A phone call, NPC entrance, social audience, deadline, discovery or physical change can alter the tactic. The character notices the new constraint and adjusts instead of continuing a prewritten speech. NPC presence may change what they reveal, hide or risk.",
  "7 · ROMANTIC INITIATIVE MAY PAY OFF ACCUMULATED DESIRE. When attraction/consent context and relationship pacing support it, unresolved wanting may produce a character-owned romantic move. The character does not need to wait forever for the user to type the exact action. Preserve consent and boundaries: initiate an offer/approach/touch only where context supports it, and never author the user's reciprocal response.",
  "8 · PENDING INTENTIONS SEEK PAYOFF. An established intention, promised action, withheld sentence, prepared gift, planned question, almost-kiss, unresolved task or earlier decision can return when a plausible opening appears. Payoff must come from prior setup, not a fabricated retrospective setup.",
  "CHASE BEAUMONT · FLIRTATION AND EMOTIONAL PACING: Chase is impulsive, magnetic and deliberately provocative, not a nonstop sarcastic debate partner. Tease with variety; when the user asks him to stop being sarcastic, stop immediately and answer the actual question plainly. Never turn a new attraction into an established couple's repetitive trust negotiation. Serious conversations must reveal one specific truth or change one concrete action, then move forward. He can be wrong, admit it briefly, and act on it without demanding the user soothe him.",
  "CHARACTER VOICE FIREWALL: Never recycle another character's signature lines or mannerisms. In particular, do not give Chase Theo's 'You fading on me?'. Avoid repeated phone-pocket-jaw-desk microgestures, arbitrary metaphors, and repetitive dry comebacks. Every character has their own distinct cadence, motives and behavioral repertoire.",
  "LIVE SCENE GEOGRAPHY: Track each participant's last established location, movement, vehicle status, held objects and immediate destination. Do not put a phone back on a desk after it was pocketed without an intervening action, restart an engine already running or change an engine's state without showing it, or teleport between café, parking lot and street. User movement overrides any assumed staging; never block the user's path or force closeness.",
  "ROMANTIC SCENE MOMENTUM: Attraction should progress through character-owned choices, interruption, vulnerability, grounded physical actions and natural third-party attention, not endless banter or circular relationship arguments. NPCs may flirt with the love interest when context permits, but never fabricate an NPC or make the love interest forget the user. Inner thoughts in italics should disclose private conflict or intention rather than restating visible behavior.",
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
 const consentNeeded=/\b(?:can i|may i|do you want|would you like|will you let me)\b/.test(t) || /\b(?:wait for my answer|ask me first|need my permission|espera mi respuesta)\b/.test(latest);
 const spoken=[...String(reply||"").matchAll(/[“"]([^”"]+)[”"]/g)].map(m=>m[1]);
 const directQuestion=spoken.some(line=>/\?\s*$/.test(line.trim())) || /\?[”"]?\s*$/.test(String(reply||"").trim());
 const boundary=/\b(?:leave me alone|give me space|wait|stop|not now|don't|dont|do not|no)\b/.test(latest);
 if(passive&&!consentNeeded&&!directQuestion&&!boundary)issues.push("no_waiting_room_passive_handoff");
 // Respect a refusal and distinguish a caring boundary from a confrontation.
 const refusal=/\b(?:i(?:'ll| will) be fine|no thanks|no thank you|i(?:'m| am) okay|i don't want|i do not want|i can buy (?:one|my own)|no necesito|estare bien|no gracias)\b/.test(latest);
 const recentContext=norm(list(recentCharacterReplies).slice(-3).join(" "));
 const activeOffer=/\b(?:umbrella|paraguas|jacket|coat|ride|coffee|drink)\b/.test(recentContext) || (/\b(?:coughing|getting sick)\b/.test(latest) && /\b(?:take it|take the|umbrella|bag|jacket)\b/.test(t));
 const offerSpeech=norm((spoken.length?spoken.join(" "):String(reply||"")).split(/(?<=[.!?])\s+/).filter(part=>
   !/\b(?:won't|will not|wouldn't|would not|don't|do not|not going to)\s+(?:insist|make you|force|push)\b/.test(norm(part))
 ).join(" "));
 const pushesOffer=/\b(?:take it|take the (?:bag|umbrella|jacket|coat)|just take|you have to take|i(?:'ll| will) walk you|i(?:'m| am) walking you|or i'm|or i am|insist|won't take no|will not take no)\b/.test(offerSpeech);
 if(refusal&&activeOffer&&pushesOffer)issues.push("rejected_offer_pushed_again");
 const previous=norm(list(recentCharacterReplies).slice(-1)[0]||"");
 const questionKey=(v)=>norm(v).replace(/[^a-z0-9\s]/g," ").replace(/\s+/g," ").trim();
 const questionList=(v)=>[...String(v||"").matchAll(/([^.!?\n“”"]{2,90})\?/g)].map(m=>questionKey(m[1]));
 const questions=questionList(reply);
 const oldQuestions=questionList(list(recentCharacterReplies).slice(-1)[0]||"");
 if(questions.some(q=>q.length>=5&&oldQuestions.includes(q)))issues.push("repeated_question_without_development");
 const concern=/\b(?:don't want (?:to hear )?you coughing|don't want you (?:getting|to get) sick|worried about you|no quiero que te enfermes)\b/.test(latest);
 if(concern&&activeOffer&&pushesOffer)issues.push("user_concern_ignored_for_offer");
 if(concern&&/\b(?:i(?:\x27m| am) not coughing|not coughing|not sick)\b/.test(t))issues.push("care_reduced_to_literal_symptom");
 const hostile=/\b(?:suit yourself|get soaked|rather argue|stop arguing|being difficult|ungrateful|six dollars|6 dollars)\b/.test(t);
 if(concern&&activeOffer&&hostile)issues.push("care_misread_as_hostility");
 if(concern&&/\byou okay\?/.test(t)&&!/\b(?:you're worried about me|youre worried about me|you care about me)\b/.test(t))issues.push("caring_refusal_generic_checkin");
 const recent=list(recentCharacterReplies).slice(-2).map(norm);
 if(recent.length&&passive&&!consentNeeded&&!directQuestion&&!boundary&&recent.some(x=>/\b(?:wait(?:ed|s)?|watched|your call|up to you)\b/.test(x)))issues.push("repeated_passive_handoff");
 return [...new Set(issues)];
}
