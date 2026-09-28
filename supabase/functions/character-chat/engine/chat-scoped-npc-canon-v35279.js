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
    "ANONYMOUS PEOPLE ARE ALLOWED. When the world needs someone who is not in the approved cast, keep them descriptive and unnamed: \'a girl from his class\', \'one of his teammates\', \'the bartender\', \'a professor\', \'someone from the party\'. Do not later give that anonymous person a name unless the user creates the NPC.",
    "NO DISEMBODIED SPEAKERS: an anonymous NPC may not suddenly speak as bare he/she/they with no visible introduction or role anchor. Establish who is speaking in the same beat (for example, one of his friends at the doorway) before their dialogue. Never make the reader reverse-engineer who just spoke.",
    "NO RETROACTIVE BAPTISM: an anonymous person from an earlier turn may not acquire an approved NPC name later merely because the model decides they were that NPC. If Victoria is going to speak, identify Victoria when she enters/speaks the first time. Identity must be established forward, never patched backward.",
    "NO NAME PROMOTION: do not turn a role label into initials, a nickname, first name, surname, pet name, handle or convenient recurring identity. A recurring anonymous role stays anonymous until user-created.",
    "OLD TEXT DOES NOT AUTHORIZE A NAME. If older generated text, compressed memory, stale cast state, consequence, rumor or hidden note contains a person-name that is not on the current allowed list, treat that name as quarantined legacy text. Do not repeat, revive, connect, remember or propagate it.",
    "USER MESSAGE DOES NOT AUTO-CREATE AN NPC. Casually mentioning an unapproved name does not add it to canon. Only the NPC editor creates named supporting characters.",
    "NPC PROFILE IS AUTHOR CANON, NOT A NAME SUGGESTION. For every approved NPC, role + relationship + personality/notes define who that person is and why they exist in this character's world. Read ALL supplied fields together before using the NPC.",
    "IMMUTABLE IDENTITY LAW: never contradict, replace, swap, or improvise over an NPC's creator-authored role or relationship. If an NPC is described as a rival, sibling, coworker, future love interest, friend-of-a-friend, etc., do not relabel them as best friend, ex, roommate, sibling, teammate, stranger, or any other incompatible relationship just because the current scene needs one.",
    "NO ROLE SLOT SWAPPING: two approved NPC names are never interchangeable. Do not give NPC A the relationship, biography, narrative function, history, or social position authored for NPC B. A convenient scene role must remain anonymous unless an approved NPC's own profile actually fits it.",
    "MISSING FACTS STAY UNKNOWN. If an NPC profile does not say they are the lead's best friend, sibling, ex, roommate, teammate, coworker, or similar fixed relationship, do not manufacture that fact. Prefer neutral wording or leave the relationship unstated.",
    "NPC DEVELOPMENT MAY ADD; IT MAY NOT RETCON. Visible story events may evolve current_dynamic, goals, knowledge, feelings, availability and consequences. They may deepen a compatible relationship, but they cannot rewrite the creator-authored identity/role/relationship unless the USER explicitly changes canon in the NPC editor or directly establishes a compatible new fact in-story.",
    "KNOWLEDGE / INTRODUCTION LAW: an NPC existing in creator canon does not mean the user-character has already met them, knows their name, or knows their relationship to the lead. Do not assume acquaintance unless the profile or visible conversation establishes it. Introduce first meetings as first meetings.",
    "APPROVED NPCs MAY LIVE. Animate them as independent people inside the boundaries above; preserve their authored identity while allowing earned state to evolve.",
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
  reply="",allowedNames=[],castUpdates=[],connectionUpdates=[],recentCharacterReplies=[]
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

  // A new supporting speaker must be legible at the moment they enter. Bare
  // pronoun attribution after dialogue ("There you are," she said) creates a
  // phantom person whose identity can be rewritten on the following turn.
  const startsWithBareNpcSpeaker=/^\s*["“][^"”]{1,180}["”][,\s]*(?:he|she|they)\s+(?:said|called|asked|added|cut in|replied)\b/i.test(raw);
  const anchoredAnonymous=/\b(?:a|an|one of|the)\s+(?:girl|guy|boy|woman|man|friend|classmate|teammate|coworker|bartender|server|student|guest|host|roommate|professor|neighbor|neighbour|someone|person)\b/i.test(raw);
  const approvedNamedVisible=[...allowed].some((name)=>name&&norm(raw).includes(name));
  if(startsWithBareNpcSpeaker&&!anchoredAnonymous&&!approvedNamedVisible){
    issues.push("npc_disembodied_speaker");
  }

  // If the previous generated beat left a person anonymous, do not silently
  // identify that same pronoun-only person as a named NPC on the next turn.
  const recent=list(recentCharacterReplies).slice(-1).join(" ");
  const priorBare=/["”][,\s]*(?:he|she|they)\s+(?:said|called|asked|added|cut in|replied)\b/i.test(recent)
    && !/\b(?:a|an|one of|the)\s+(?:girl|guy|boy|woman|man|friend|classmate|teammate|coworker|bartender|server|student|guest|host|roommate|professor|neighbor|neighbour|someone|person)\b/i.test(recent);
  const namedNow=[...allowed].filter((name)=>name&&norm(raw).includes(name));
  if(priorBare&&namedNow.length&&/\b(?:he|she|they|her|him|their)\b/i.test(raw)){
    issues.push("npc_retroactive_identity_assignment");
  }

  return [...new Set(issues)];
}
