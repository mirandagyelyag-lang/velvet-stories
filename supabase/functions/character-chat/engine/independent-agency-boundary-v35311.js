// Velvet Stories v3.53.11 · Independent Agency + Explicit Boundary Gate

const clean=(v="",n=12000)=>String(v??"").replace(/\s+/g," ").trim().slice(0,n);
const norm=(v="")=>clean(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[’‘]/g,"'");

function userExplicitlySendsCharacterAway(value=""){
  const t=norm(value);
  return /\b(?:you guys go|you all go|you go without me|go without me|just go|no,? you go|no,? go|please go|go on without me|go ahead without me|go with them|go with the others|you should go|ustedes vayan|vayan sin mi|vayan nomas|vayan no mas|anda nomas|anda no mas|vete nomas|vete no mas|solo vete|me quedo,? ustedes vayan)\b/.test(t);
}

function userDeclinesSharedPlan(value=""){
  const t=norm(value);
  return /\b(?:i'll stay|ill stay|i am staying|i'm staying|im staying|i cant go|i can't go|not going|i wont go|i won't go|you guys go|go without me|i have to finish|i need to finish|i havent finished|i haven't finished|me quedo|no voy|no puedo ir|tengo que terminar)\b/.test(t);
}

function userAskedForHelp(value=""){
  const t=norm(value);
  return /\b(?:help me|can you help|could you help|will you help|stay with me|can you stay|could you stay|don't go|dont go|do not go|please stay|necesito ayuda|ayudame|ayúdame|puedes ayudar|quedate|quédate|no te vayas)\b/.test(t);
}

function seriousReason(value=""){
  const t=norm(value);
  return /\b(?:danger|unsafe|hurt|injured|hospital|sick|panic|panicking|crying|cried|emergency|terrified|scared|suicid|overdose|dangerous|accident|bleeding|desmayo|herid|peligro|emergencia)\b/.test(t);
}

function recentOwnPlan(recentCharacterReplies=[]){
  const recent=norm((Array.isArray(recentCharacterReplies)?recentCharacterReplies.slice(-3):[]).join(" | "));
  return /\b(?:change of plan|we're going|were going|we are going|we're grabbing|were grabbing|i'm going|im going|i am going|i'm driving|im driving|i am driving|leave right now|we leave|lets go|let's go|pack it up|bonfire|party|lake|movie|dinner|practice|meeting|work|class)\b/.test(recent);
}

function replyCancelsOwnPlanForUser(reply=""){
  const t=norm(reply);
  const cancel=/\b(?:forget (?:the|that)|never mind (?:the|that)|screw (?:the|that)|skip (?:the|that)|i'm staying|im staying|i am staying|i'll stay|ill stay|not going anywhere|i'll be right here|ill be right here|i'm not leaving|im not leaving)\b/.test(t);
  const service=/\b(?:i'll help|ill help|i can help|let me help|help you|i'll do it with you|ill do it with you|knock out .* for you|finish .* with you|stay and help)\b/.test(t);
  return cancel || (service && /\b(?:instead|forget|stay|not leaving|right here)\b/.test(t));
}

function replyIgnoresDismissal(reply=""){
  const t=norm(reply);
  return /\b(?:i'll be right here|ill be right here|i'm staying|im staying|i am staying|not going anywhere|i'm not going|im not going|i'm not leaving|im not leaving|stayed put|stays put|remained there|didn't move|did not move|wait here with you|stay here with you|stayed against the edge|stays against the edge)\b/.test(t);
}

function extractCompanionName(value=""){
  const m=String(value||"").match(/\b(?:with|con)\s+([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚáéíóúÑñ'’-]{2,})(?:\b|$)/);
  return m?.[1] || "";
}

function neutralCompanionJealousized(reply="", latestUserMessage=""){
  const name=extractCompanionName(latestUserMessage);
  if(!name) return false;
  const latest=norm(latestUserMessage);
  if(/\b(?:date|dating|boyfriend|girlfriend|crush|hook up|kiss|romantic|guy i like|girl i like|cita|novio|novia|me gusta)\b/.test(latest)) return false;
  const r=norm(reply), n=norm(name);
  const suspicious=[
    "right "+n+" sure",
    "right "+n,
    n+" sure",
    "of course "+n,
    n+" of course",
    "yeah right "+n,
    n+" yeah right"
  ].some((phrase)=>r.includes(phrase));
  const jealousy=/\b(?:jealous|jealousy|competition|rival|rather be with|picked .* over me|choose .* over me)\b/.test(r);
  return suspicious || jealousy;
}

function repeatedPlanProp(reply="", recentCharacterReplies=[]){
  const rows=[...(Array.isArray(recentCharacterReplies)?recentCharacterReplies.slice(-2):[]),reply].map(norm);
  const props=["keys","phone","backpack","door","coffee"];
  return props.some((prop)=>rows.filter((row)=>(" "+row+" ").includes(" "+prop+" ")).length>=3);
}

export function buildIndependentAgencyBoundaryV35311({
  latestUserMessage="",recentUserMessages=[],recentCharacterReplies=[],character={}
}={}){
  return [
    "INDEPENDENT AGENCY + EXPLICIT BOUNDARY 3.53.11 · HARD TURN LAW:",
    "Caring about the user does not erase the character's friends, plans, deadlines, interests, pride or independent evening.",
    "If the user explicitly says 'you guys go', 'go without me', 'just go', 'you should go', or equivalent, treat it literally. Do not stay anyway, hover nearby, wait at the desk, or reinterpret the dismissal as a request for devotion.",
    "If the user declines a shared plan, the character may keep their own plan. Attraction can color the goodbye, but it does not automatically cancel their night.",
    "Do not convert every ordinary user problem into a service opportunity. If the user did not ask for help, a project/deadline/task is not a reason to instantly abandon the character's established plan and rescue them.",
    "A direct request to leave or go overrides pursuit because the user is explicitly dismissing the character, not silently walking away.",
    "Mentioning a friend or NPC is neutral unless canon creates a romantic reason for jealousy. Do not answer 'Right. Jules. Sure' merely because the user names someone else.",
    "Independent agency is continuity: if the character wanted the bonfire, party, practice, work, friends or another plan one turn ago, keep that desire alive unless something genuinely important changes it.",
    "Do not prove attachment through compulsory availability. Sometimes the caring response is a normal goodbye and then the character actually goes.",
    "Repeated props do not create continuity. Keys, phone, backpack, doors and coffee should not become a mechanical reaction loop.",
    "Character: "+clean(character?.name||"character",90)+". Latest user: "+(clean(latestUserMessage,420)||"none")+"."
  ].join("\n");
}

export function independentAgencyBoundaryV35311Issues({
  reply="",latestUserMessage="",recentUserMessages=[],recentCharacterReplies=[]
}={}){
  const text=clean(reply);
  if(!text) return [];
  const issues=[];
  const sentAway=userExplicitlySendsCharacterAway(latestUserMessage);
  const declined=userDeclinesSharedPlan(latestUserMessage);
  const hasPlan=recentOwnPlan(recentCharacterReplies);
  const askedHelp=userAskedForHelp(latestUserMessage);
  const serious=seriousReason([latestUserMessage,...(Array.isArray(recentUserMessages)?recentUserMessages.slice(-3):[])].join(" | "));

  if(sentAway && replyIgnoresDismissal(text)) issues.push("explicit_go_boundary_ignored");
  if(declined && hasPlan && !askedHelp && !serious && replyCancelsOwnPlanForUser(text)) {
    issues.push("self_owned_plan_abandoned_for_user");
  }
  if(declined && !askedHelp && !serious && /\b(?:i'll help|ill help|i can help|let me help|help you|stay and help)\b/.test(norm(text)) && replyCancelsOwnPlanForUser(text)) {
    issues.push("unsolicited_rescue_reprioritization");
  }
  if(neutralCompanionJealousized(text,latestUserMessage)) issues.push("neutral_npc_mention_jealousized");
  if(repeatedPlanProp(text,recentCharacterReplies)) issues.push("repeated_plan_prop_loop");

  return [...new Set(issues)];
}
