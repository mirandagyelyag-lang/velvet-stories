function norm(value:unknown){return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[’']/g,"'").replace(/\s+/g," ").trim();}

export function instantStoryQualityIssues(opening:unknown,draft:Record<string,unknown>={}){
  const raw=String(opening||"");
  const t=norm(raw);
  const issues:string[]=[];
  if(/\b(?:flickering neon|neon light .{0,30} hummed|buzzing against the .{0,40} air|quiet,? humid air|unforgiving glare|rows of stale pastries)\b/.test(t)) issues.push("decorative_stock_atmosphere");
  if(/\b(?:the kind of .{0,55} (?:he|she|they) usually reserved for|expression shifted from .{0,80} to something (?:much )?softer|movements? (?:were|was) fluid and purposeful|gaze lingering .{0,30} (?:too long|for a beat too long))\b/.test(t)) issues.push("personality_explained_as_prose");
  if(/\b(?:spotting|noticed|found|saw) you (?:near|by|at|beside|across|standing|waiting|reading|looking)|\byou (?:stood|waited|walked|sat|leaned|were standing|were waiting)\b/.test(t)) issues.push("unstaged_user_placement");
  if(/\bif i (?:buy|pick|choose|get) .{0,80}\bif i (?:buy|pick|choose|get)\b|\bpoor life choices\b|\bsubsidiz(?:e|ing)\b.{0,45}\blife choices\b/.test(t)) issues.push("sitcom_choice_monologue");
  if(/\b(?:energy drinks?|beef jerky|sour gummies|spicy chips|junk food)\b/.test(t)&&/\b(?:road trip|state line|three hundred miles|aux cord|caffeine)\b/.test(t)) issues.push("generic_roadtrip_snack_scene");
  if(/\bdid you (?:actually )?(?:bring|remember|forget|finish|send|tell|ask|call|text)\b|\bare we going to\b.{0,70}\bagain\b/.test(t)) issues.push("invented_user_history_prompt");

  if(/\b(?:saved|defended|kept) (?:you |your |the )?(?:a )?seat\b|\bdrove across (?:campus|town)\b|\bwaiting (?:for you )?(?:beside|by) (?:his |her |their )?car\b|\bordered (?:an )?extra\b.{0,40}\b(?:your usual|your favorite|for you)\b|\blost bracelet\b/.test(t)) issues.push("romance_first_setup");
  if(/(?:\bwhich one\?|\byour choice[.!?]?|\bwhat do you want to do\?|\bquiet evening or the drive\b|\bstay or go\?|\bcome with me[.!?]?)(?:["”’']\s*)?$/i.test(raw.trim())) issues.push("forced_binary_choice");
  const ending=norm(raw.slice(-650));
  if(/\b(?:the others|everyone|they all) (?:left|went home|followed|headed out)\b|\b(?:the argument|the fight|the problem) (?:was|is) over\b|\bthat settled it\b/.test(ending)) issues.push("premature_resolution");

  const profile=norm(Object.values(draft||{}).join(" "));
  const npcMatches=[...raw.matchAll(/\b([A-Z][a-z]{2,})(?:'s)?\s+(?:is|was|will|would|wants?|needs?|thinks?|says?|said|asks?|asked|complains?|complained|called|texted|expects?)\b/g)].map((m)=>m[1]);
  const common=new Set(["The","He","She","They","You","His","Her","Their","Someone","Everyone"]);
  const unknownNpcNames=[...new Set(npcMatches.filter((name)=>!common.has(name)&&!profile.includes(name.toLowerCase())))];
  const socialBasis=/\b(?:friend group|group of|same group|friends|team|teammates|roommates|siblings|family|coworkers|colleagues|crew|club|social circle|popular|campus king|campus prince)\b/.test(profile);
  const genericNpcProp=/\b(?:energy drinks?|beef jerky|sour gummies|spicy chips|junk food|road trip|aux cord|snack run)\b/.test(t);
  if(unknownNpcNames.length&&(!socialBasis||genericNpcProp)) issues.push("invented_named_npc");
  if(unknownNpcNames.length>3) issues.push("npc_name_overload");

  const explicitAttraction=/\b(?:already likes|likes you|likes the user|has feelings for you|attracted to you|into you|flirts openly|never hidden how much|goes out of (?:his|her|their) way|le gustas|siente algo por ti)\b/.test(profile);
  const behavioralProof=/\b(?:saved|kept|set aside|ordered (?:an )?extra|brought|remembered|made time|changed (?:his|her|their) plan|cancelled|canceled|came back|waited|chose|picked yours|your usual|your favorite|for you|gave up|offered (?:his|her|their)|noticed before)\b/.test(t);
  const gazeOnly=/\b(?:gaze|eyes?|look|expression|grin|smile|softer)\b/.test(t)&&!behavioralProof;
  if(explicitAttraction&&gazeOnly) issues.push("attraction_without_behavioral_proof");
  return [...new Set(issues)];
}


function premiseNorm(value:unknown){return norm(value).replace(/[^a-z0-9' ]+/g," ");}

function leadHasConcreteWant(opening:unknown){
  const t=premiseNorm(opening);
  const action=/\b(?:decides?|decided|chooses?|chose|refuses?|refused|stays?|stayed|leaves?|left|invites?|invited|asks?|asked|tells?|told|admits?|admitted|cancels?|cancelled|changes?|changed|commits?|committed|keeps?|kept|drops?|dropped|interrupts?|interrupted|follows?|followed|stops?|stopped|confronts?|confronted|offers?|offered|turns? down|turned down|gives? up|gave up|walks? away|walked away|heads? for|headed for|makes? it clear|made it clear)\b/.test(t);
  const spokenIntent=/[“"][^”"]{0,140}\b(?:i want|i need|i'm staying|im staying|i'm leaving|im leaving|i came|i asked|i'm not|im not|we're going|were going|tell me|come with me|stay|don't go|dont go|not tonight)\b/i.test(String(opening||""));
  const consequence=/\b(?:instead|because|even though|rather than|cost|risk|miss|lose|give up|cancel|leave|stay|choose|pick|turn down|before|after|despite|but|so|until)\b/.test(t);
  return (action||spokenIntent)&&consequence;
}

function disposableNpcRescue(opening:unknown){
  const t=premiseNorm(opening);
  const nuisance=/\b(?:boring|tedious|drone|droning|trapped|cornered|wouldnt stop talking|won't stop talking|wont stop talking|conversation.*too long|cry for help)\b/.test(t);
  const rescue=/\b(?:escape|rescue|save you|saving you|get you out|drag you away|pull you away|stepped between|inserted himself|inserted herself|cut .* off|interrupted .* mid sentence)\b/.test(t);
  const realPressure=/\b(?:jealous|jealousy|rumor|date|dating|kiss|ex|leave with|leaving with|invited|turned .* down|chose|choice|promise|secret|admit|confess|refuse|stay|cancel|risk|consequence)\b/.test(t);
  return nuisance&&rescue&&!realPressure;
}

function hollowEscapeEnding(opening:unknown){
  const t=premiseNorm(opening);
  const escape=/\b(?:ready to escape|want to escape|lets get out of here|let's get out of here|come with me|lets go|let's go|save you from|rescue you from)\b/.test(t);
  const consequence=/\b(?:because|instead|even though|cancel|miss|lose|risk|turn down|refuse|stay|leave with|choose|chose|decision|promise|admit|reveal|jealous)\b/.test(t);
  return escape&&!consequence;
}

function genericInterchangeableLead(opening:unknown,draft:Record<string,unknown>={}){
  const t=premiseNorm(opening);
  const profile=premiseNorm(Object.values(draft||{}).join(" "));
  const generic=/\b(?:effortless grin|infuriating grin|theatrical boredom|leaning against|drifted over|seamlessly|apologies|second opinion|cry for help|ready to escape)\b/.test(t);
  const profileSignals=profile.split(/\s+/).filter((w)=>w.length>=7&&!["character","relationship","personality","description","scenario"].includes(w));
  const distinctive=profileSignals.some((w)=>t.includes(w));
  return generic&&!distinctive;
}

export function instantStoryPremiseGateIssues(opening:unknown,draft:Record<string,unknown>={}){
  const issues:string[]=[];
  const raw=String(opening||"");
  if(disposableNpcRescue(raw)) issues.push("premise_disposable_npc_rescue");
  if(hollowEscapeEnding(raw)) issues.push("premise_hollow_escape");
  if(genericInterchangeableLead(raw,draft)) issues.push("premise_interchangeable_character");
  // A missing explicit want is a repair signal, not a fatal rejection by itself.
  // Models often express intent through dialogue/action without our lexical markers.
  // Hard-reject only the concrete anti-patterns below; generation prompts still demand intent.
  return [...new Set(issues)];
}

export function instantStoryLooksComplete(opening: unknown, finishReason: unknown = "", draft:Record<string,unknown>={}) {
  const text = String(opening || "").trim();
  const words = text.split(/\s+/).filter(Boolean);
  const finish = String(finishReason || "").toUpperCase();

  if (!text || words.length < 55 || words.length > 220) return false;
  if (["MAX_TOKENS", "SAFETY", "RECITATION", "BLOCKLIST", "PROHIBITED_CONTENT", "MALFORMED_FUNCTION_CALL"].includes(finish)) return false;
  if (/[’'][A-Za-z]{0,2}$/.test(text)) return false;
  if (/[,:;\-–—]$/.test(text)) return false;
  if (!/[.!?…][\"'”’)]?$/.test(text)) return false;

  const straightQuotes = (text.match(/\"/g) || []).length;
  const openCurlyQuotes = (text.match(/“/g) || []).length;
  const closeCurlyQuotes = (text.match(/”/g) || []).length;
  if (straightQuotes % 2 !== 0 || openCurlyQuotes !== closeCurlyQuotes) return false;

  const spokenLines = [...text.matchAll(/[“"]([^”"]+)[”"]/g)].length;
  if (spokenLines < 1) return false;
  if (/\b(?:i need you for something|something changed|got a minute|didn'?t think you'?d come)\b/i.test(text)) return false;
  if (instantStoryHasTemplateLeak(text)) return false;
  if (instantStoryQualityIssues(text,draft).length) return false;
  if (instantStoryPremiseGateIssues(text,draft).length) return false;

  return true;
}

export function instantStoryHasTemplateLeak(opening: unknown) {
  const text = String(opening || "");
  const leaks = [
    /\bbetween you sits\b/i,
    /\btheir response carries\b/i,
    /\bwithout turning it into a performance\b/i,
    /\bthere is a concrete reason (?:the two of you|you both) need to\b/i,
    /\bneither a stranger nor a convenient accident\b/i,
    /\bheld back by the way .{0,80} normally protects what matters\b/i,
    /\bmake(?:s)? room for your answer instead of deciding it for you\b/i,
    /\bwhat happens next depends on what you choose to say\b/i,
    /\bthere was no invented emergency\b/i,
    /\bwithout turning (?:the problem|it) into a speech\b/i,
    /\bkept the useful option open for you\b/i,
    /\brefusal to waste it by circling the same question\b/i,
    /\bis already in the middle of (?:a )?(?:home kitchen, living room|.+\bor\b.+\bor\b.+),? occupied with something connected to\b/i,
    /\bit affects what .{1,80} notices and what (?:they|he|she) choose(?:s)? not to say\b/i,
  ];
  return leaks.some((pattern) => pattern.test(text));
}
