// Velvet Stories 3.53.69
// User-reference POV grammar: direct address is YOU; third-party reference is
// Antonia / she / her. Prevents "he looked at her" when the narration means you.

const clean=(v="",n=12000)=>String(v??"").replace(/\r/g,"").trim().slice(0,n);
const esc=s=>String(s||"").replace(/[.*+?^()|[\]\\]/g,"\\$&");

export function buildUserReferencePovV35369({userName="Antonia"}={}){
  const name=clean(userName,80)||"Antonia";
  return [
    "USER REFERENCE POV LOCK 3.53.69 · HARD GRAMMAR:",
    "The protagonist/user is "+name+".",
    "DIRECT REFERENCE TO THE USER = SECOND PERSON ONLY: you / your / yours / yourself.",
    "Examples: 'He looked at you.' 'He walked toward you.' 'His attention returned to you.' 'He handed the note to you.' NEVER 'He looked at her' when 'her' means the user.",
    "THIRD-PARTY REFERENCE ABOUT THE USER = "+name+" / she / her / hers / herself. Use this only when the lead or an NPC is speaking ABOUT the user to somebody else, introducing her, referring to her in a genuine third-person conversation, or when a quoted speaker is not addressing her.",
    "Example with NPC: He nodded toward you, then told Elliot, '"+name+" already said no. Leave her out of it.' Here 'you' is narration directed at the user; '"+name+"'/'her' are words ABOUT her to Elliot.",
    "NARRATION remains reader-facing second person whenever it points directly to the user's body, location, actions, possessions, gaze, presence, or relationship to the lead.",
    "Never alternate you ↔ she/her merely for prose variety. Pronoun variety is not a style goal.",
    "If 'her' could mean either the user or a female NPC, prefer "+name+" for third-party reference or rewrite the sentence so the referent is unmistakable.",
    "PRE-SEND CHECK: replace every she/her mentally with a named person. If it resolves to the reader in direct narration, rewrite it as you/your."
  ].join("\n");
}

export function userReferencePovIssuesV35369(reply="",userName="Antonia"){
  const issues=[];
  const raw=String(reply||"");
  const name=clean(userName,80)||"Antonia";
  // High-confidence direct-narration drift. Quotes are stripped because she/her
  // inside NPC/lead dialogue may legitimately refer to the user in third person.
  const narration=raw.replace(/[“"][^”"]*[”"]/g," ");
  const directHer=[
    /\b(?:looked|glanced|stared|gazed|smiled|grinned|nodded|turned|walked|stepped|moved|leaned|reached|gestured|pointed|spoke|said|called|shouted|whispered)\s+(?:back\s+)?(?:at|to|toward|towards|over at|beside|near)\s+her\b/i,
    /\b(?:his|the)\s+(?:eyes|gaze|attention|focus)\s+(?:returned|shifted|moved|went|settled|landed)\s+(?:back\s+)?(?:on|to|toward|towards)\s+her\b/i,
    /\b(?:held|handed|gave|offered|showed|passed|sent|tossed)\s+(?:it|the\s+\w+|a\s+\w+)\s+to\s+her\b/i,
    /\b(?:stood|sat|stayed|waited|paused)\s+(?:beside|near|next to|in front of|behind)\s+her\b/i
  ];
  if(directHer.some(re=>re.test(narration)))issues.push("direct_user_referred_to_as_her");
  // If narration already uses YOU and then switches to a bare female pronoun in
  // another direct spatial/action reference without introducing a female NPC,
  // treat it as POV drift.
  const hasYou=/\b(?:you|your)\b/i.test(narration);
  const femaleNpcIntroduced=new RegExp("\\b(?:a|the|another|his|their)\\s+(?:girl|woman|friend|teammate|roommate|contestant|classmate)\\b|\\b(?:Sienna|Maya|Sophie|Isla|Claire)\\b","i").test(raw);
  if(hasYou&&!femaleNpcIntroduced&&/\b(?:at|toward|towards|beside|near|behind|in front of)\s+her\b/i.test(narration))issues.push("you_to_her_pov_drift");
  return [...new Set(issues)];
}

export const __testV35369={userReferencePovIssuesV35369};
