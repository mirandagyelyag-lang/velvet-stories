// Velvet Stories v3.53.10 · Semantic Story Momentum
// Shared hard gate for Instant Story + live chat.
// Motion, props and banter are blocking. Momentum means the situation changes.

const clean=(v="",n=16000)=>String(v??"").replace(/\s+/g," ").trim().slice(0,n);
const norm=(v="")=>clean(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[’‘]/g,"'");

function profileText(character={}){
  return norm([
    character?.name, character?.role, character?.description, character?.personality,
    character?.relationship, character?.world, character?.scenario,
    character?.habits, character?.preferences, character?.notes,
    character?.firstMessage, character?.first_message,
  ].filter(Boolean).join(" | "));
}

function dialogueOnly(value=""){
  return [...String(value||"").matchAll(/[“"]([^”"]+)[”"]/g)].map((m)=>m[1]).join(" ");
}

function hasMeaningfulStateChange(value=""){
  const t=norm(value);
  return /\b(?:decid(?:e|es|ed|ing)|refus(?:e|es|ed|ing)|admit(?:s|ted|ting)?|reveal(?:s|ed|ing)?|confess(?:es|ed|ing)?|confront(?:s|ed|ing)?|challenge(?:s|d|ing)?|invite(?:s|d|ing)?|cancel(?:s|led|ing)?|choose|chooses|chose|choosing|commit(?:s|ted|ting)?|promise(?:s|d|ing)?|apolog(?:y|ize|izes|ized|izing)|asks? (?:him|her|them|you) (?:about|whether|why|what happened)|tell(?:s|ing)? (?:him|her|them|you) (?:that|about)|changes? the plan|changed the plan|new plan|instead we|instead im|instead i m|not going to|im going to|i m going to|i wont|i won't|i will|ill\b|i'll\b)\b/.test(t);
}

function blockingActionCount(value=""){
  const t=norm(value);
  const patterns=[
    /\b(?:look(?:s|ed|ing)?|glanc(?:e|es|ed|ing)|grin(?:s|ned|ning)?|smil(?:e|es|ed|ing)|shrug(?:s|ged|ging)?|sigh(?:s|ed|ing)?)\b/g,
    /\b(?:open(?:s|ed|ing)?|clos(?:e|es|ed|ing)|hold(?:s|ing)? (?:the )?door|pocket(?:s|ed|ing)?|pull(?:s|ed|ing)? out (?:his|her|their) phone|check(?:s|ed|ing)? (?:his|her|their) phone)\b/g,
    /\b(?:walk(?:s|ed|ing)?|stand(?:s|ing)?|stood|sit(?:s|ting)?|sat|turn(?:s|ed|ing)?|step(?:s|ped|ping)?|head(?:s|ed|ing)?|move(?:s|d|ing)?)\b/g,
    /\b(?:keys?|phone|door|bag|backpack|cup|coffee|drink|bottle)\b/g,
  ];
  return patterns.reduce((sum,p)=>sum+((t.match(p)||[]).length),0);
}

function explicitUserMovementAssumption(reply="", latestUserMessage=""){
  const raw=String(reply||"");
  const latest=norm(latestUserMessage);
  const declarative=[...raw.matchAll(/\byou(?:'re| are)\s+(walking|coming|going|sitting|staying|riding|joining|following|waiting|getting in|getting into|taking|bringing)\b/gi)];
  if(!declarative.length) return false;
  return declarative.some((m)=>{
    const at=m.index??0;
    const start=Math.max(raw.lastIndexOf(".",at),raw.lastIndexOf("!",at),raw.lastIndexOf("?",at))+1;
    const ends=[raw.indexOf(".",at),raw.indexOf("!",at),raw.indexOf("?",at)].filter((x)=>x>=0);
    const end=ends.length?Math.min(...ends):raw.length;
    const sentence=raw.slice(start,end+1);
    if(sentence.includes("?")) return false;
    const verb=norm(m[1]).replace(/ing$/,"");
    return !latest.includes(verb);
  });
}

function unsupportedUserPreference(reply="", latestUserMessage="", recentUserMessages=[], character={}){
  const t=norm(reply);
  const evidence=norm([
    latestUserMessage,
    ...(Array.isArray(recentUserMessages)?recentUserMessages.slice(-8):[]),
    profileText(character),
  ].join(" | "));
  if(/\byour (?:usual|favorite|favourite)\b/.test(t) && !/\b(?:my usual|my favorite|my favourite|usual|favorite|favourite)\b/.test(evidence)) return true;

  const drinkMatch=t.match(/\byou (?:get|want|take|always get|usually get)\s+(?:the |a |an )?(mocha|latte|americano|cappuccino|macchiato|frappuccino|espresso|cold brew|iced coffee|tea)\b/);
  if(drinkMatch && !evidence.includes(drinkMatch[1])) return true;

  const preferenceClaim=t.match(/\byou (?:like|love|hate|prefer|always order|usually order)\s+([^.!?]{2,70})/);
  if(preferenceClaim){
    const meaningful=norm(preferenceClaim[1]).split(/\s+/).filter((w)=>w.length>=4).slice(0,4);
    if(meaningful.length && !meaningful.some((w)=>evidence.includes(w))) return true;
  }
  return false;
}

function campusCoffeeStudyFallback(reply="", opening=false){
  if(!opening) return false;
  const t=norm(reply);
  const campus=/\b(?:campus|quad|student union|lecture|class|study hours?|study session|library|dorm|professor|freshmen|freshman)\b/.test(t);
  const coffee=/\b(?:coffee|iced coffee|mocha|latte|americano|cafe|café|snack|takeout|food court|cafeteria)\b/.test(t);
  const logistics=/\b(?:drive|driving|keys?|line|order|ordering|grab|grabbing|pack it up|pick up|walking)\b/.test(t);
  return campus && coffee && logistics && !hasMeaningfulStateChange(t);
}

function prematureSceneEscape(reply="", latestUserMessage="", recentCharacterReplies=[]){
  const t=norm(reply);
  const context=norm([...(Array.isArray(recentCharacterReplies)?recentCharacterReplies.slice(-3):[]),latestUserMessage].join(" | "));
  const escape=/\b(?:my car(?:'s| is)? (?:out back|outside)|car(?:'s| is)? (?:out back|outside)|side exit|front exit|back exit|lets get out of here|let's get out of here|come on lets go|come on let's go|anywhere else|leave this place|heading toward (?:the )?(?:side|front|back)? ?exit|headed toward (?:the )?(?:side|front|back)? ?exit|turned toward (?:the )?(?:side|front|back)? ?exit|headed for (?:the )?(?:side|front|back)? ?exit)\b/.test(t);
  if(!escape) return false;
  const liveSocial=/\b(?:guy|girl|friend|someone|somebody|him|her|jealous|flirt|talking to|beside you|next to you|interrupted|competition|attention|mock sympathy|tragic)\b/.test(t+" "+context);
  const earnedReason=/\b(?:fire|danger|unsafe|closing|closed|kicked out|asked (?:us|them|you) to leave|police|emergency|ambulance|evacuat|appointment|reservation|late for|miss the train|miss the bus|flight)\b/.test(t+" "+context);
  return liveSocial&&!earnedReason;
}

function blockingBanterStall(reply=""){
  const t=norm(reply);
  const words=t.split(/\s+/).filter(Boolean).length;
  if(!words || words>120) return false;
  const blocking=blockingActionCount(reply);
  const spoken=norm(dialogueOnly(reply));
  const banter=spoken && /\b(?:come on|keep that energy|deal|seriously|before the line|freshmen|freshman|stupid|obviously|apparently|good luck|dont start|don't start|youre impossible|you're impossible)\b/.test(spoken);
  const questionOnly=spoken && /\?$/.test(spoken.trim()) && !hasMeaningfulStateChange(spoken);
  return blocking>=2 && !hasMeaningfulStateChange(reply) && Boolean(banter||questionOnly||words<=55);
}

function missedCommunicationNoDevelopment(reply="",latestUserMessage=""){
  const user=norm(latestUserMessage);
  if(!/\b(?:zoning out|zoned out|wasn'?t listening|was not listening|didn'?t (?:hear|notice|catch)|did not (?:hear|notice|catch)|wasn'?t paying attention|was not paying attention|didn'?t understand|did not understand)\b/.test(user)) return false;
  const t=norm(reply);
  if(!t) return false;
  // Positive contract: a missed-communication revelation must cause a new beat,
  // not merely sarcasm/acknowledgement. Require evidence that the character
  // recalculates, investigates, repeats/abandons the missed premise, or changes
  // what they do next.
  const development=/\b(?:did you hear|want me to repeat|i said|never mind|forget it|scratch that|actually|instead|wait|hold on|are you okay|were you okay|what had your attention|what were you thinking|what happened|everything okay|you good|repeat|repeats?|abandons?|drops? (?:the )?(?:bet|joke|challenge|offer|idea)|changes? (?:his|her|their|the) (?:tone|approach|plan)|stops? teasing|lets? (?:the )?(?:bet|joke|challenge) go|gives? (?:you|her|him|them) (?:a )?moment)\b/.test(t);
  if(development) return false;
  const words=t.split(/\s+/).filter(Boolean).length;
  const sarcasm=/\b(?:brilliant|captivating|impressive|tragic|cute|adorable|empty room|good to know|noted|figures|of course|wow|rude|psychological warfare|masterpiece)\b/.test(t);
  const onlySpeech=words<=55 && !/\b(?:asks?|checks?|repeats?|changes?|stops?|drops?|abandons?|waits?|offers?|decides?|moves? closer|sits? beside|turns? down|lowers?)\b/.test(t);
  return sarcasm||onlySpeech;
}

function missedCommunicationCarryOn(reply="",latestUserMessage="",recentCharacterReplies=[]){
  const user=norm(latestUserMessage);
  if(!/\b(?:zoning out|zoned out|wasn'?t listening|was not listening|didn'?t (?:hear|notice|catch)|did not (?:hear|notice|catch)|wasn'?t paying attention|was not paying attention|didn'?t understand|did not understand)\b/.test(user)) return false;
  const t=norm(reply);
  const prior=norm((recentCharacterReplies||[]).slice(-1)[0]||"");
  const priorProposal=/\b(?:coffee|deal|double or nothing|bet|come with me|lets go|let's go|want to|how about|we should|ill buy|i'll buy|you buy|youre buying|you're buying)\b/.test(prior);
  const carries=/\b(?:coffee(?:'s| is)? on me|you(?:'re| are) (?:buying|carrying|paying)|deal|double or nothing|next round|lets go|let's go|come on|then we|so we)\b/.test(t);
  const recalculates=/\b(?:did you hear|want me to repeat|i said|never mind|forget it|scratch that|actually|instead|wait|hold on|were you okay|are you okay|what had your attention|what were you thinking about)\b/.test(t);
  return priorProposal&&carries&&!recalculates;
}

function inventedUserVisibleReaction(reply="",latestUserMessage=""){
  const t=norm(reply), u=norm(latestUserMessage);
  const claims=/\byour (?:blank|confused|dazed|startled|annoyed|amused|embarrassed|flushed|red|pale|wide-eyed|wide eyed|vacant|distant) (?:expression|face|look|stare|eyes?)\b/.test(t)
    || /\byou (?:looked|seemed|appeared) (?:blank|confused|dazed|startled|annoyed|amused|embarrassed|flushed|pale|distant)\b/.test(t);
  if(!claims) return false;
  return !/\b(?:i (?:look|looked|stare|stared|smile|smiled|grin|grinned)|my (?:face|expression|look|eyes))\b/.test(u);
}

function echoQuipStall(reply="",latestUserMessage=""){
  const user=norm(latestUserMessage);
  const text=norm(reply);
  if(!user||!text) return false;
  const words=text.split(/\s+/).filter(Boolean).length;
  if(words>95||hasMeaningfulStateChange(reply)) return false;
  const userContent=user.split(/[^a-z0-9']+/).filter(w=>w.length>=4&&!["that","this","with","have","were","was","just","really","didnt","don't","your","youre"].includes(w));
  const replyContent=text.split(/[^a-z0-9']+/).filter(w=>w.length>=4);
  const overlap=[...new Set(userContent)].filter(w=>replyContent.includes(w)).length;
  const echoRatio=userContent.length?overlap/Math.min(userContent.length,6):0;
  const quip=/\b(?:impressive|tragic|cute|adorable|seriously|apparently|good to know|noted|of course|figures|wow|brutal|rude|psychological warfare|masterpiece|counting ceiling tiles)\b/.test(text);
  const reactionOnly=/\b(?:said|replied|asked|tone|smirk|grin|laugh|mock|teas|jok)\b/.test(text)&&!hasMeaningfulStateChange(text);
  return echoRatio>=0.34 && words<=70 && (quip||reactionOnly);
}

function isAcceptanceHandoff(latestUserMessage=""){
  const raw=String(latestUserMessage||"").trim();
  const t=norm(raw);
  if(!t) return false;
  const compact=t.replace(/[.!?]+$/g,"").trim();
  const explicitAgreement=/^(?:ok|okay|yes|yeah|yep|sure|fine|alright|all right|deal|lets go|let's go|im coming|i'm coming|ill come|i'll come|im in|i'm in|i will|ill do it|i'll do it)$/i.test(compact);
  const followAction=/^\*[^*]{0,120}\b(?:follow|followed|come with|go with|walk with|leave with|head with|join|joined|get in|got in|climb in|climbed in)\b[^*]{0,120}\*\s*[.!?]*$/i.test(raw);
  const spokenFollow=/\b(?:i(?:'m| am)? coming with you|i(?:'ll| will) come with you|i(?:'ll| will) go with you|i follow you|i followed you|lets go|let's go)\b/i.test(raw);
  return explicitAgreement||followAction||spokenFollow;
}

function acceptanceFollowThroughStall(reply="",latestUserMessage=""){
  if(!isAcceptanceHandoff(latestUserMessage)) return false;
  const t=norm(reply);
  if(!t) return false;
  if(hasMeaningfulStateChange(reply)) return false;
  const words=t.split(/\s+/).filter(Boolean).length;
  const mereConfirmation=/\b(?:good|okay|ok|come on|then lets go|then let's go|before (?:he|she|they) sees|wasn'?t listening|not listening|anyway|told you|knew you would|knew you'?d)\b/.test(t);
  const blocking=blockingActionCount(reply);
  return words<=110 && (mereConfirmation||blocking>=1);
}

function convenientPlotTrigger(reply="", recentCharacterReplies=[]){
  const t=norm(reply);
  const recent=norm((Array.isArray(recentCharacterReplies)?recentCharacterReplies.slice(-6):[]).join(" | "));
  const miracle=/\b(?:someone (?:tossed|threw|handed|offered)|an? (?:invitation|ticket|set of keys|opportunity) (?:appeared|landed|showed up)|perfect timing|just then|right then|suddenly someone|a message came in|the phone buzzed with|someone called with)\b/.test(t);
  const triggerNouns=(t.match(/\b(?:keys?|tickets?|invite|invitation|reservation|ride|car|party|afterparty|table|booking|event|passes)\b/g)||[]);
  if(!miracle || !triggerNouns.length) return false;
  return !triggerNouns.some((noun)=>recent.includes(noun.replace(/s$/,"")));
}
function repeatedMannerism(reply="", recentCharacterReplies=[]){
  const t=norm(reply);
  const current=/\b(?:grin|grinned|grinning|smile|smiled|smiling)\b/.test(t);
  if(!current) return false;
  const recent=(Array.isArray(recentCharacterReplies)?recentCharacterReplies.slice(-3):[]).map(norm);
  return recent.filter((r)=>/\b(?:grin|grinned|grinning|smile|smiled|smiling)\b/.test(r)).length>=2;
}

export function buildSemanticStoryMomentumV35310({
  latestUserMessage="",recentUserMessages=[],recentCharacterReplies=[],character={}
}={}){
  return [
    "SEMANTIC STORY MOMENTUM 3.53.10 · FINAL MEANING GATE:",
    "A turn changes the story only when the SOCIAL, EMOTIONAL or PRACTICAL situation changes. Body movement and prop handling are blocking, not momentum.",
    "DO NOT count walking, standing, sitting, opening/holding a door, grabbing keys, checking a phone, drinking, looking back, smiling/grinning, driving logistics, ordering food/coffee, or moving objects as the turn's main development.",
    "The character may initiate strongly, but initiative means choosing, revealing, refusing, inviting, confronting, pursuing for a reason, changing a plan for a meaningful reason, asking the question that matters, acting on jealousy/care/pride, or creating a consequence.",
    "SCENE DEEPENING BEFORE SCENE SWITCHING: when a live social or emotional beat already exists, exploit that beat in the CURRENT location before proposing an exit, car ride, diner run, walk elsewhere, private room, or new destination. Momentum usually means changing the relationship or social balance, not changing the scenery.",
    "A strong micro-action can be the development when it has interpersonal meaning: stealing the user's drink after interrupting a rival, taking the rival's place, answering for them, joining the conversation, making the rival leave, changing who has access/attention, or asking a pointed question that exposes the character's motive. Props are allowed when they ALTER the social beat instead of merely decorating movement.",
    "Do not explain a charged action immediately after performing it. Prefer subtext over labels such as 'I'm rescuing you', 'I'm jealous', 'anywhere else is better', or narration that translates the character's behavior for the reader. Let the choice + line carry the meaning.",
    "LOCATION CHANGE IS EXPENSIVE: only leave the current setting when there is an earned practical deadline, danger, established destination, explicit user choice, or a scene objective that truly requires another place. Never use a car/exit as the default reward for successfully creating tension.",
    "LIVING SCENE ENGINE: especially for openings and fresh beats, prefer entering a situation that already has its own life before the user becomes the center of it. The character may already be dealing with a small problem, activity, commitment, NPC, accident, responsibility, consequence, plan or conflict. The user intersects with that living situation; they do not need to be the reason it exists.",
    "PLAYABLE, NOT DECORATIVE: an external situation must give the user multiple natural ways to participate, refuse, help, tease, interfere, observe, side with someone else, or make it worse. Do not merely mention a quirky prop/problem and then collapse back into generic flirting.",
    "VARIETY FIREWALL: do not repeatedly build scenes from the same skeleton of character spots user across a room -> abandons conversation -> crosses over -> focuses entirely on user. Rotate who is already present, what the character is doing, whether the user notices them first, whether an NPC is involved, and whether the beat is practical, social, accidental, relational, competitive or quietly intimate.",
    "NO SAVIOR ASSUMPTION: never decide the user is bored, trapped, uncomfortable, lonely, overwhelmed, needs rescuing, needs an escape, or wants to leave unless the user/canon established it. Avoid 'I'm rescuing you', 'saving you', 'you looked like you needed an escape', and equivalent savior framing.",
    "CHARACTER HAS A LIFE: attraction is stronger when shown through choices inside an existing life, not when the character's entire world freezes upon seeing the user. They may finish what they were doing, involve the user, need the user's help, keep an NPC interaction alive, or let the existing situation develop.",
    "Do not force a mystery hook merely to manufacture momentum: avoid empty 'I need to ask you something', 'I heard something about you', unexplained ominous invitations, or secrets with no grounded situation behind them. The scene itself should contain usable material.",
    "Never decide the user's next movement with declarations such as 'You're walking with me' or 'You're coming with me.' The character may say 'Come with me', start their own action, insist verbally, or leave space for the user to choose.",
    "Never manufacture intimacy through invented preferences: no 'your usual', 'your favorite', specific drink/order/habit, nickname or routine unless visible canon established it.",
    "CAMPUS/COFFEE/STUDY is not banned, but it cannot be the story engine. Coffee, food, class gaps, student-union lines and study logistics are background unless something meaningful happens through them.",
    "BANTER IS NOT MOMENTUM. A joke attached to door-opening, key-handling, walking or ordering is still a stalled turn if the relationship/problem/plan is unchanged.",
    "NO ECHO + QUIP + STOP: never merely restate the user's information in witty wording and end the turn. Treat what the user said as NEW INFORMATION. Let it change the character's interpretation, tactic, attention, decision, behavior, or the live social situation. The response may still be funny, but the joke cannot be the whole payload.",
    "MISSED-COMMUNICATION RESET: if the user says they were zoning out, were not listening, did not hear/catch/notice/understand, or were not paying attention, then any proposal, bet, invitation, instruction or conversational premise delivered during that missed beat is NOT mutually established. The character must recalculate from that fact. They may repeat it, abandon it, change tactic, check what happened, or react according to personality, but must NOT carry on as though the user heard or accepted it.",
    "MISSED-COMMUNICATION POSITIVE REQUIREMENT: sarcasm, teasing, acknowledgement, or one clever line is NEVER a complete response to this revelation. After any personality-colored reaction, the character must create one grounded new beat: investigate why attention was gone, repeat or deliberately drop what was missed, alter their approach, notice a canon-supported concern, or make another consequential character-owned choice. Do not end immediately after the joke.",
    "VISIBLE USER STATE IS USER-OWNED: do not invent a blank/confused/dazed/amused/embarrassed expression, stare, blush, smile, or other visible reaction for the user unless their message or canon explicitly supplied it.",
    "REACTION MUST HAVE A SECOND LAYER: after acknowledging a user revelation, add grounded content that belongs to THIS character: what they infer, what they now notice, what they choose to do differently, a consequential question, a changed plan, or a concrete interpersonal move. Do not narrate the user's feelings for them.",
    "ACCEPTANCE HANDOFF: when the user says yes/okay/let's go, follows, joins, gets in, or otherwise accepts the character's proposal, DO NOT spend the next turn confirming the same proposal. The acceptance closes that beat. Immediately create the NEXT earned story beat.",
    "After an acceptance handoff, physical transit may continue, but movement alone is never enough. Add one grounded development owned by the character/world: a destination choice already compatible with canon, a meaningful question, a reveal, a refusal, a changed plan, a social consequence, a new obligation, or action driven by jealousy/care/pride. Do not fabricate user choices or miraculous interruptions.",
    "Before finalizing, ask silently: if I remove the walking, grin, keys, door, phone and food/drink props, did anything meaningful remain? If not, rewrite the beat.",
    "Latest user: "+(clean(latestUserMessage,320)||"none")+". Recent character pattern: "+(clean((recentCharacterReplies||[]).slice(-3).join(" | "),650)||"none")+".",
    "Character: "+clean(character?.name||"character",90)+".",
  ].join("\n");
}

export function semanticStoryMomentumIssues({
  reply="",latestUserMessage="",recentUserMessages=[],recentCharacterReplies=[],character={},opening=false
}={}){
  const text=clean(reply);
  if(!text) return [];
  const issues=[];
  if(explicitUserMovementAssumption(text,latestUserMessage)) issues.push("semantic_user_movement_assumed");
  if(unsupportedUserPreference(text,latestUserMessage,recentUserMessages,character)) issues.push("semantic_invented_user_preference");
  if(campusCoffeeStudyFallback(text,opening)) issues.push("semantic_campus_coffee_study_fallback");
  if(blockingBanterStall(text)) issues.push("semantic_blocking_banter_stall");
  if(echoQuipStall(text,latestUserMessage)) issues.push("semantic_echo_quip_stall");
  if(missedCommunicationNoDevelopment(text,latestUserMessage)) issues.push("semantic_missed_communication_no_development");
  if(missedCommunicationCarryOn(text,latestUserMessage,recentCharacterReplies)) issues.push("semantic_missed_communication_carry_on");
  if(inventedUserVisibleReaction(text,latestUserMessage)) issues.push("semantic_invented_user_visible_reaction");
  if(prematureSceneEscape(text,latestUserMessage,recentCharacterReplies)) issues.push("semantic_premature_scene_escape");
  if(acceptanceFollowThroughStall(text,latestUserMessage)) issues.push("semantic_acceptance_without_progression");
  if(repeatedMannerism(text,recentCharacterReplies)) issues.push("semantic_repeated_grin_mannerism");
  if(convenientPlotTrigger(text,recentCharacterReplies)) issues.push("semantic_convenient_plot_trigger");
  return [...new Set(issues)];
}
