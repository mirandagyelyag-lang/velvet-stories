// Velvet Stories v3.53.7 · Two-Level NPC Canon
// Character NPCs persist across every chat for that character.
// Conversation NPCs exist only inside the story where the creator made them.
// The model may animate approved NPCs, but it may not mint identities.

const clean=(v="",n=1200)=>String(v??"").replace(/\s+/g," ").trim().slice(0,n);
const norm=(v="")=>clean(v,12000).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[’']/g,"");
const list=(v)=>Array.isArray(v)?v:[];
const uniq=(xs)=>[...new Set(xs.map((x)=>clean(x,120)).filter(Boolean))];

export function allowedNamedPeopleV35279({
  userName="",character={},groupCharacters=[],userCreatedNpcs=[]
}={}){
  return uniq([
    clean(userName,100),
    clean(character?.name,100),
    ...list(groupCharacters).map((item)=>clean(item?.name,100)),
    ...list(userCreatedNpcs).filter((item)=>item?.is_user_created!==false).map((item)=>clean(item?.name,100)),
  ]);
}

function npcSummary(npcs=[]){
  return list(npcs)
    .filter((item)=>item?.is_user_created!==false && clean(item?.name,100))
    .slice(0,30)
    .map((item)=>[
      clean(item?.name,100),
      `scope=${item?.npc_scope==="character"?"character":"conversation"}`,
      clean(item?.role,180)?`role=${clean(item.role,180)}`:"",
      clean(item?.relationship,240)?`relationship=${clean(item.relationship,240)}`:"",
      clean(item?.personality_note,280)?`personality=${clean(item.personality_note,280)}`:"",
      clean(item?.current_dynamic,260)?`current=${clean(item.current_dynamic,260)}`:"",
      clean(item?.goals,240)?`goals=${clean(item.goals,240)}`:"",
      clean(item?.presence,80)?`presence=${clean(item.presence,80)}`:"",
    ].filter(Boolean).join(" | "))
    .join("\n");
}

export function buildChatScopedNpcCanonV35279({
  userName="",character={},groupCharacters=[],userCreatedNpcs=[],latestUserMessage=""
}={}){
  const allowed=allowedNamedPeopleV35279({userName,character,groupCharacters,userCreatedNpcs});
  const characterNpcs=list(userCreatedNpcs).filter((item)=>item?.is_user_created!==false&&item?.npc_scope==="character");
  const conversationNpcs=list(userCreatedNpcs).filter((item)=>item?.is_user_created!==false&&item?.npc_scope!=="character");
  const characterNames=characterNpcs.map((item)=>clean(item?.name,100)).filter(Boolean);
  const conversationNames=conversationNpcs.map((item)=>clean(item?.name,100)).filter(Boolean);

  return [
    "TWO-LEVEL NPC CANON 3.53.7 · CLOSED NAMED CAST (highest-priority story canon):",
    `ALLOWED NAMED PEOPLE IN THIS CONVERSATION: ${allowed.length?allowed.join(" | "):"none"}.`,
    `CHARACTER NPCs · persistent across every chat for this character: ${characterNames.length?characterNames.join(" | "):"none"}.`,
    `STORY NPCs · local to this conversation only: ${conversationNames.length?conversationNames.join(" | "):"none"}.`,
    "HARD RULE: do NOT invent, generate, assign, reveal, or reuse ANY other human/character proper name. No surprise Chloe, Madison, Tyler, ex, roommate, teammate, professor, bartender, sibling, friend, date, rival or stranger may receive a name unless that exact person was created by the user.",
    "SCOPE LAW: character-scope NPCs are canon members of this character's world and may recur naturally across this character's separate chats. Conversation-scope NPCs belong ONLY to this story and must never leak into another conversation.",
    "CHARACTER ISOLATION: a character-scope NPC belongs only to the character it was created for. Do not reuse that NPC for a different lead character unless the creator separately creates them there.",
    "ANONYMOUS PEOPLE ARE ALLOWED. When the world needs someone who is not in the approved cast, keep them descriptive and unnamed: 'a girl from his class', 'one of his teammates', 'the bartender', 'a professor', 'someone from the party'. Do not later give that anonymous person a name unless the user creates the NPC.",
    "NO NAME PROMOTION: do not turn a role label into initials, a nickname, first name, surname, pet name, handle or convenient recurring identity. A recurring anonymous role stays anonymous until user-created.",
    "OLD TEXT DOES NOT AUTHORIZE A NAME. If older generated text, compressed memory, stale cast state, consequence, rumor or hidden note contains a person-name that is not on the current allowed list, treat that name as quarantined legacy text. Do not repeat, revive, connect, remember or propagate it.",
    "USER MESSAGE DOES NOT AUTO-CREATE AN NPC. Casually mentioning an unapproved name does not add it to canon. Only the NPC editor creates named supporting characters.",
    "APPROVED NPCs MAY LIVE. The model may evolve an approved NPC's goals, availability, relationships, knowledge and consequences when visible canon earns it. It may never create a new named identity.",
    "PLACES/BRANDS ARE NOT PEOPLE. This lock applies to people/characters, not grounded place names, universities, teams, brands, songs or organizations already in canon.",
    "CAST METADATA OUTPUT: cast_updates may contain ONLY exact approved NPC names. connection_updates may reference only the user, lead/group characters, and approved NPCs.",
    (characterNames.length||conversationNames.length)
      ? `APPROVED NPC DETAILS:\n${npcSummary(userCreatedNpcs)}`
      : "APPROVED NPC DETAILS: none. Keep all supporting people anonymous.",
    `LATEST USER TURN: ${clean(latestUserMessage,600)||"none"}.`,
  ].join("\n");
}

export function filterAuthorizedCastUpdatesV35279(castUpdates=[],userCreatedNpcs=[]){
  const byName=new Map(
    list(userCreatedNpcs)
      .filter((item)=>item?.is_user_created!==false && clean(item?.name,100))
      .map((item)=>[norm(item.name),clean(item.name,100)])
  );
  return list(castUpdates)
    .filter((item)=>byName.has(norm(item?.name)))
    .map((item)=>({...item,name:byName.get(norm(item?.name))}));
}

export function filterAuthorizedConnectionUpdatesV35279(connectionUpdates=[],{
  userName="",character={},groupCharacters=[],userCreatedNpcs=[]
}={}){
  const allowed=allowedNamedPeopleV35279({userName,character,groupCharacters,userCreatedNpcs});
  const canonical=new Map(allowed.map((name)=>[norm(name),name]));
  return list(connectionUpdates)
    .filter((item)=>{
      const from=canonical.get(norm(item?.from_name));
      const to=canonical.get(norm(item?.to_name));
      return Boolean(from&&to&&norm(from)!==norm(to));
    })
    .map((item)=>({
      ...item,
      from_name:canonical.get(norm(item?.from_name)),
      to_name:canonical.get(norm(item?.to_name)),
    }));
}

export function chatScopedNpcCanonV35279Issues({
  reply="",allowedNames=[],castUpdates=[],connectionUpdates=[]
}={}){
  const issues=[];
  const allowed=new Set(list(allowedNames).map(norm).filter(Boolean));

  for(const item of list(castUpdates)){
    const name=clean(item?.name,100);
    if(name&&!allowed.has(norm(name))){
      issues.push("unapproved_named_npc_cast_update");
      break;
    }
  }
  for(const item of list(connectionUpdates)){
    const from=clean(item?.from_name,100),to=clean(item?.to_name,100);
    if((from&&!allowed.has(norm(from)))||(to&&!allowed.has(norm(to)))){
      issues.push("unapproved_named_npc_connection");
      break;
    }
  }

  const raw=String(reply||"");
  const introduced=[...raw.matchAll(/\b(?:named|called)\s+([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})?)/g)].map((m)=>m[1]);
  const speakerLabels=[...raw.matchAll(/(?:^|\n)\s*([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})?)\s*:/g)].map((m)=>m[1]);
  if([...introduced,...speakerLabels].some((name)=>!allowed.has(norm(name)))){
    issues.push("unapproved_named_npc_visible");
  }

  return [...new Set(issues)];
}
