// Velvet Stories 3.53.67
// Global Speaker Ownership Firewall.

const clean=(v="",n=12000)=>String(v??"").replace(/\r/g,"").trim().slice(0,n);
const norm=(v="")=>clean(v).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();
const list=v=>Array.isArray(v)?v:[];

function leadParts(character={}){
  const full=clean(character?.name,100);
  const bits=full.split(/\s+/).filter(Boolean);
  return {full,first:bits[0]||"",last:bits.length>1?bits[bits.length-1]:""};
}
function quoteSegments(v=""){
  return [...String(v||"").matchAll(/[“"]([^”"]+)[”"]/g)].map(m=>({text:m[1],index:m.index||0}));
}
function esc(s=""){return String(s).replace(/[.*+?^()|[\]\\]/g,"\\$&");}
// A call to the lead's name belongs to a supporting person when the scene
// already establishes one. Do not misclassify an NPC's call as lead dialogue.
function establishedNpcCall(raw,index,text,character={}){
  const p=leadParts(character), before=raw.slice(0,index);
  const vocative=[p.first,p.last,p.full].filter(Boolean).some(name=>new RegExp("^\\s*(?:hey\\s+)?"+esc(name)+"(?:[!?,.]|$)","i").test(text));
  if(!vocative)return false;
  const close=before.slice(-140);
  const attributedToLead=new RegExp("(?:"+esc(p.first)+"|he|she|they)\\s+(?:said|asked|shouted|called|muttered|replied)(?:\\s+to\\s+you)?[,.:]?\\s*$","i").test(close);
  return !attributedToLead && /\b(?:a|the|his|her|their|another)\s+(?:girl|guy|woman|man|friend|student|teammate|roommate|bartender|classmate)\b/i.test(before);
}
function selfAddressByName(reply="",character={}){
  const p=leadParts(character); if(!p.full)return false;
  return quoteSegments(reply).some(({text,index})=>{
    if(establishedNpcCall(String(reply),index,text,character))return false;
    const voc=(name)=>name&&new RegExp("(?:^|[.!?]\\s+|[,;:]\\s*)"+esc(name)+"(?:[,.!?]|$)","i").test(text);
    return voc(p.full)||voc(p.last)||(/^\s*(?:hey\s+)?/i.test(text)&&voc(p.first));
  });
}
function colonSpeakerHijack(reply="",character={}){
  const p=leadParts(character);
  const allowed=new Set([norm(p.full),norm(p.first),norm(p.last)].filter(Boolean));
  return String(reply||"").split(/\n/).some(line=>{
    const m=line.match(/^\s*([A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+)?)\s*:\s*[“"]?/);
    return Boolean(m&&!allowed.has(norm(m[1])));
  });
}
function introducedNpcBefore(raw="",idx=0){
  const before=raw.slice(Math.max(0,idx-280),idx);
  return /\b(?:his|her|their|one of the|another|a|the)\s+(?:friend|friends|teammate|roommate|contestant|producer|host|girl|guy|boy|woman|man|student|player|bartender|classmate)\s+(?:said|asked|called|shouted|muttered|told|replied|answered|laughed|cut in|called out)\b/i.test(before)
    || /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s+(?:said|asked|called|shouted|muttered|replied|answered|laughed|cut in|called out)\b/.test(before);
}
function npcLookingLineInsideLeadChannel(reply="",character={}){
  const p=leadParts(character); if(!p.last)return false;
  const raw=String(reply||"");
  return quoteSegments(raw).some(({text,index})=>{
    const callsLead=new RegExp("\\b"+esc(p.last)+"\\b[,.!?]?\\s*$","i").test(text.trim());
    return callsLead&&!introducedNpcBefore(raw,index);
  });
}
function unexplainedPerspectiveSwitch(reply="",character={}){
  const p=leadParts(character), raw=String(reply||"");
  const names=[norm(p.first),norm(p.last)].filter(Boolean);
  if(!names.length)return false;
  return quoteSegments(raw).some(({text,index})=>{
    if(establishedNpcCall(raw,index,text,character))return false;
    const t=norm(text);
    const refers=names.some(n=>new RegExp("\\b"+esc(n)+"\\b").test(t));
    return refers&&!introducedNpcBefore(raw,index);
  });
}
function ambiguousNpcDialogue(reply="",character={}){
  const raw=String(reply||""), quotes=quoteSegments(raw);
  if(quotes.length<2)return false;
  for(let i=1;i<quotes.length;i++){
    const start=quotes[i-1].index+quotes[i-1].text.length+2;
    const between=raw.slice(start,quotes[i].index);
    const explicit=/\b(?:he|she|they|friend|teammate|roommate|contestant|producer|host|girl|guy|boy|woman|man|student|player|bartender|classmate|[A-Z][a-z]+)\s+(?:said|asked|replied|answered|called|shouted|muttered|added|cut in|called out)\b/.test(between);
    const p=leadParts(character);
    const leadNames=[p.first,p.last,p.full,...(p.full === "Alexander Bennett" ? ["Alex"] : [])].filter(Boolean);
    const callsLead=leadNames.some(name=>new RegExp("^"+esc(name)+"[,.!?]", "i").test(quotes[i].text.trim()));
    const npcAtDoor=/\b(?:a|the|his|her|their|another)\s+(?:friend|student|woman|man|teammate|roommate)\s+(?:leaned|appeared|came|stepped)\b[^“"]{0,90}\b(?:doorway|door|inside|through)\b/i.test(between);
    const leadTurn=leadNames.some(name=>new RegExp("\\b"+esc(name)+"\\s+(?:turned|looked|spoke)\\s+(?:back )?to you\\b", "i").test(between));
    const npcLeft=/\b(?:friend|student|woman|man|teammate|roommate)\s+(?:disappeared|left|went back)\b/i.test(between);
    if((npcAtDoor&&callsLead)||(npcLeft&&leadTurn))continue;
    // Narration length alone cannot establish a speaker change.
    // Only flag a newly introduced supporting speaker without attribution.
    if(!explicit&&/\b(?:a|the|another|his|her|their)\s+(?:girl|guy|woman|man|friend|student|teammate|roommate|bartender|classmate)\b/i.test(between))return true;
  }
  return false;
}

export function buildSpeakerOwnershipV35367({character={},persistentCast=[]}={}){
  const p=leadParts(character);
  const cast=list(persistentCast).map(x=>clean(x?.name,80)).filter(Boolean).slice(0,15);
  return [
    "SPEAKER OWNERSHIP FIREWALL 3.53.67 · GLOBAL:",
    "REPLY CHANNEL OWNER="+(p.full||"lead character")+".",
    "0) USER/LEAD ATTRIBUTION: never let the lead claim I said/I told you about a line authored by the user. Even a verbatim quote must retain its original speaker. A continuation keeps prior role ownership.",
    "1) The reply is authored from/about the lead, but NPCs may speak. Never silently replace the lead with an NPC speaker.",
    "2) Every quoted line needs an identifiable speaker. If an NPC speaks, anchor that NPC immediately before or with the quote.",
    "3) SELF-ADDRESS IMPOSSIBILITY: the lead cannot address themselves by their own first name or surname as a vocative. A line ending in the lead's surname is probably NPC dialogue and must be attributed or rewritten.",
    "4) When dialogue changes lead → NPC or NPC → lead, anchor the new speaker once. Pronouns are allowed only when the antecedent is unmistakable.",
    "5) If the user leaves or ends the exchange, the lead may let them go, react, resume their activity, or talk with NPCs. Never answer the goodbye with an unattributed NPC line.",
    "6) NPCs may initiate and continue their own conversations, but their words remain explicitly theirs.",
    "7) Do not output another character's Name: label inside this lead response.",
    "8) PRE-SEND AUDIT: for every quote ask internally who physically said it. If the answer is not immediate from the text, anchor it.",
    "AUTHORIZED NPCS="+(cast.join(" | ")||"none supplied; generic descriptors allowed")
  ].join("\n");
}
export function speakerOwnershipIssuesV35367(reply="",character={}){
  const issues=[];
  if(selfAddressByName(reply,character))issues.push("lead_self_address_by_own_name");
  if(colonSpeakerHijack(reply,character))issues.push("npc_speaker_label_hijack");
  if(npcLookingLineInsideLeadChannel(reply,character))issues.push("unattributed_npc_dialogue_in_lead_channel");
  if(unexplainedPerspectiveSwitch(reply,character))issues.push("dialogue_speaker_perspective_switch");
  if(ambiguousNpcDialogue(reply,character))issues.push("ambiguous_multi_speaker_dialogue");
  return [...new Set(issues)];
}
export const __testV35367={selfAddressByName,colonSpeakerHijack,npcLookingLineInsideLeadChannel,unexplainedPerspectiveSwitch,ambiguousNpcDialogue};

