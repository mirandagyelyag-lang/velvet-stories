// Velvet Stories 3.53.70
// User Gravity Firewall: leaving the scene is not an invisible FOLLOW command.

const clean=(v="",n=12000)=>String(v??"").replace(/\r/g,"").trim().slice(0,n);
const norm=(v="")=>clean(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[’‘]/g,"'");

function userLeaves(v=""){
  const t=norm(v);
  return /\b(?:i leave|i left|i walk outside|i walked outside|i go outside|i went outside|i walk away|i walked away|i head out|i headed out|i quickly leave|i leave there|i go find|i'm going to find|im going to find|see ya|see you around|bye|goodbye|me voy|salgo|me fui|voy a buscar|me retiro)\b/.test(t);
}
function userNamesDestinationOrPerson(v=""){
  return /\b(?:find|look for|looking for|meet|meeting|go to|going to|head to|heading to|buscar|encontrar|ir a|voy a)\b/i.test(norm(v));
}
function explicitInvitation(v=""){
  return /\b(?:come with me|come along|walk with me|follow me|can you come|want to come|do you want to come|ven conmigo|acomp[aá]ñame|sígueme|sigueme)\b/i.test(norm(v));
}
function urgentReason(v=""){
  return /\b(?:danger|unsafe|hurt|injured|hospital|emergency|terrified|scared|bleeding|attack|following me|someone followed|peligro|emergencia|herid|hospital)\b/i.test(norm(v));
}
function followsImmediately(reply=""){
  const t=norm(reply);
  return /\b(?:follows? (?:you|after you)|followed (?:you|after you)|steps? out (?:after|behind) you|stepped out (?:after|behind) you|comes? after you|came after you|catches? up (?:to|with) you|caught up (?:to|with) you|falls? into step (?:beside|with) you|fell into step (?:beside|with) you|matches? your (?:stride|pace)|matched your (?:stride|pace)|blocks? (?:the )?(?:door|doorway|threshold|exit)|blocked (?:the )?(?:door|doorway|threshold|exit)|stops? you from leaving|stopped you from leaving|cuts? you off|cut you off|goes? outside after you|went outside after you)\b/.test(t);
}
function preventsExit(reply=""){
  const t=norm(reply);
  return /\b(?:block(?:s|ed)? (?:the )?(?:door|doorway|threshold|exit)|step(?:s|ped)? in front of (?:you|the door|the exit)|catch(?:es|caught)? (?:your )?(?:arm|wrist|hand)|stop(?:s|ped)? you from leaving|won't let you leave|wont let you leave|cut(?:s)? you off)\b/.test(t);
}
function impossibleDestinationKnowledge(reply="",latest=""){
  if(!userNamesDestinationOrPerson(latest))return false;
  const t=norm(reply);
  // High-specificity claims about where the sought person currently is.
  return /\b(?:currently|right now|she's|shes|he's|hes|they're|theyre)\s+(?:at|in|on|two|three|four|a block|down|outside|inside)\b/.test(t)
    || /\b(?:blocks? down|arguing with|waiting at|over at|in the parking lot|by the car|at the bar|at the cafe|at the cafeteria)\b/.test(t);
}

export function buildUserGravityV35370({character={},latestUserMessage=""}={}){
  return [
    "USER GRAVITY FIREWALL 3.53.70 · HARD CONTINUITY LAW:",
    "The user's movement is NOT a command for the lead to follow.",
    "If the user leaves a room, walks outside, goes to find a friend, ends the conversation, says goodbye, or redirects attention elsewhere, DEFAULT = the lead remains with their current activity, friends, NPC conversation, responsibility or plan.",
    "Following requires a concrete CURRENT-TURN reason stronger than attraction: the user explicitly invites them, an established urgent safety problem exists, the lead already independently needed the same destination, or a specific unresolved responsibility logically requires immediate contact. Jealousy, curiosity, wanting more time, romantic tension, or 'not wanting the moment to end' are NOT enough.",
    "Never block a doorway, threshold, path or exit merely to prolong romantic interaction. Never physically funnel the user back into the scene after they choose to leave.",
    "Do not repeatedly convert exits into pursuit scenes. A character who has an independent life sometimes watches the user go and continues what they were doing.",
    "If the user says they are looking for someone, the lead does NOT magically know that person's exact current location, companion, argument, car, activity or route unless that information was explicitly established in visible canon.",
    "Do not invent precise offscreen facts to justify following the user or to manufacture another conversation.",
    "When the user leaves, valid continuations include: resume the game/work/conversation; react briefly then remain; answer an NPC; make an independent choice; let the separation create a later consequence. The lead does not need to chase the user to keep the story alive.",
    "Pursuit frequency matters. Even a character who CAN pursue must not make following the user's exits a recurring romantic signature.",
    "Character="+clean(character?.name||"character",80)+". Latest user="+(clean(latestUserMessage,360)||"none")+"."
  ].join("\n");
}

export function userGravityIssuesV35370({reply="",latestUserMessage="",recentUserMessages=[]}={}){
  const issues=[];
  const leaves=userLeaves(latestUserMessage);
  const invited=explicitInvitation(latestUserMessage);
  const urgent=urgentReason([latestUserMessage,...(Array.isArray(recentUserMessages)?recentUserMessages.slice(-2):[])].join(" | "));
  if(leaves&&!invited&&!urgent&&followsImmediately(reply))issues.push("user_exit_triggered_unearned_follow");
  if(leaves&&!invited&&!urgent&&preventsExit(reply))issues.push("user_exit_physically_blocked_for_romance");
  if(leaves&&!urgent&&impossibleDestinationKnowledge(reply,latestUserMessage))issues.push("invented_offscreen_destination_knowledge");
  return [...new Set(issues)];
}
