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

  const profile=norm(Object.values(draft||{}).join(" "));
  const npcMatches=[...raw.matchAll(/\b([A-Z][a-z]{2,})(?:'s)?\s+(?:is|was|will|would|wants?|needs?|thinks?|says?|said|asks?|asked|complains?|complained|called|texted|expects?)\b/g)].map((m)=>m[1]);
  const common=new Set(["The","He","She","They","You","His","Her","Their","Someone","Everyone"]);
  if(npcMatches.some((name)=>!common.has(name)&&!profile.includes(name.toLowerCase()))) issues.push("invented_named_npc");

  const explicitAttraction=/\b(?:already likes|likes you|likes the user|has feelings for you|attracted to you|into you|flirts openly|never hidden how much|goes out of (?:his|her|their) way|le gustas|siente algo por ti)\b/.test(profile);
  const behavioralProof=/\b(?:saved|kept|set aside|ordered (?:an )?extra|brought|remembered|made time|changed (?:his|her|their) plan|cancelled|canceled|came back|waited|chose|picked yours|your usual|your favorite|for you|gave up|offered (?:his|her|their)|noticed before)\b/.test(t);
  const gazeOnly=/\b(?:gaze|eyes?|look|expression|grin|smile|softer)\b/.test(t)&&!behavioralProof;
  if(explicitAttraction&&gazeOnly) issues.push("attraction_without_behavioral_proof");
  return [...new Set(issues)];
}

export function instantStoryLooksComplete(opening: unknown, finishReason: unknown = "", draft:Record<string,unknown>={}) {
  const text = String(opening || "").trim();
  const words = text.split(/\s+/).filter(Boolean);
  const finish = String(finishReason || "").toUpperCase();

  if (!text || words.length < 130 || words.length > 280) return false;
  if (["MAX_TOKENS", "SAFETY", "RECITATION", "BLOCKLIST", "PROHIBITED_CONTENT", "MALFORMED_FUNCTION_CALL"].includes(finish)) return false;
  if (/[’'][A-Za-z]{0,2}$/.test(text)) return false;
  if (/[,:;\-–—]$/.test(text)) return false;
  if (!/[.!?…][\"'”’)]?$/.test(text)) return false;

  const straightQuotes = (text.match(/\"/g) || []).length;
  const openCurlyQuotes = (text.match(/“/g) || []).length;
  const closeCurlyQuotes = (text.match(/”/g) || []).length;
  if (straightQuotes % 2 !== 0 || openCurlyQuotes !== closeCurlyQuotes) return false;

  const spokenLines = [...text.matchAll(/[“"]([^”"]+)[”"]/g)].length;
  if (spokenLines < 2) return false;
  if (/\b(?:i need you for something|something changed|got a minute|didn'?t think you'?d come)\b/i.test(text)) return false;
  if (instantStoryHasTemplateLeak(text)) return false;
  if (instantStoryQualityIssues(text,draft).length) return false;

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
