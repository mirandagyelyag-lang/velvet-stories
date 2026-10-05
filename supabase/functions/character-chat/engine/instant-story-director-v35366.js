// Velvet Stories 3.53.66
// Instant Story Director: nine coordinated safeguards for story variety, autonomy,
// epistemic limits, relationship dimensionality and persistent consequences.

const clean=(v="",n=1600)=>String(v??"").replace(/\s+/g," ").trim().slice(0,n);
const norm=(v="")=>clean(v,12000).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();
const list=v=>Array.isArray(v)?v:[];
const words=v=>norm(v).split(/\s+/).filter(Boolean);

function skeleton(v=""){
  const t=norm(v);
  const tags=[];
  const families=[
    ["party",/\b(?:party|club|bar|dance|afterparty|fiesta)\b/],
    ["campus",/\b(?:campus|class|lecture|library|university|college|cafeteria)\b/],
    ["reality",/\b(?:reality show|production|producer|camera|challenge|pairing|contestant|audience)\b/],
    ["car",/\b(?:car|drive|parking|ride|keys|garage|race|track)\b/],
    ["home",/\b(?:home|house|apartment|bedroom|living room|kitchen)\b/],
    ["event",/\b(?:concert|gala|wedding|festival|event|birthday)\b/],
    ["trip",/\b(?:airport|hotel|trip|beach|lake|flight)\b/],
    ["work",/\b(?:work|office|meeting|shift|job|studio)\b/],
  ];
  for(const [id,re] of families) if(re.test(t))tags.push(id);
  if(/\b(?:jealous|another guy|another girl|boyfriend|girlfriend|flirt|competition)\b/.test(t))tags.push("jealousy_triangle");
  if(/\b(?:interrupt|cut in|come with me|we re leaving|pulled .* away|stepped between)\b/.test(t))tags.push("interruption_extraction");
  if(/\b(?:approached|crossed the room|walked over|came over|headed toward)\b/.test(t))tags.push("approach_user");
  if(/\b(?:drink|coffee|refill|food|order|snack)\b/.test(t))tags.push("food_drink");
  if(/\b(?:challenge|bet|race|competition|compete|team)\b/.test(t))tags.push("competition");
  return [...new Set(tags)];
}
function jaccard(a=[],b=[]){
  const A=new Set(a),B=new Set(b); if(!A.size||!B.size)return 0;
  let h=0; for(const x of A)if(B.has(x))h++;
  return h/(A.size+B.size-h);
}
function patternRepeat(opening="",recent=[]){
  const s=skeleton(opening); if(s.length<2)return false;
  return list(recent).slice(-8).some(r=>jaccard(s,skeleton(r))>=0.6);
}
function omniscientLanguage(v=""){
  return /\b(?:he knew you|she knew you|they knew you|knew exactly what you|could tell you wanted|could tell you felt|knew you wanted|knew you liked|knew you hated|knew you were jealous|obviously you wanted|clearly you wanted|he somehow knew|she somehow knew)\b/i.test(String(v||""));
}
function beliefAsFact(v=""){
  return /\b(?:he knew for a fact|she knew for a fact|there was no doubt you|it was obvious you were|he was certain you|she was certain you)\b/i.test(String(v||""));
}
function npcOnlyJealousyProp(v=""){
  const t=norm(v);
  const npc=/\b(?:another guy|another girl|a guy|a girl|one of his friends|one of her friends|contestant|stranger)\b/.test(t);
  const onlyFunction=/\b(?:make .* jealous|jealous|competition|rival|interrupt|stepped between|pulled you away|claim)\b/.test(t);
  const autonomous=/\b(?:wanted|needed|planned|trying to|decided|asked .* because|working on|competing for|talking about|their own|his own|her own)\b/.test(t);
  return npc&&onlyFunction&&!autonomous;
}
function passiveWorldCollapse(v=""){
  const t=norm(v);
  return /\b(?:everyone (?:went )?quiet|all eyes (?:turned|went) to you|everyone turned to you|the whole room watched you|everyone waited for you)\b/.test(t);
}
function consequenceReset(v=""){
  return /\b(?:as if nothing happened|everything was back to normal|none of it mattered anymore|the tension was gone|all was forgotten)\b/i.test(String(v||""));
}

export function buildInstantStoryDirectorV35366({character={},recentOpenings=[],idea=""}={}){
  const recent=list(recentOpenings).slice(-8).map((x,i)=>({n:i+1,skeleton:skeleton(x),sample:clean(x,180)}));
  return [
    "INSTANT STORY DIRECTOR 3.53.66 · NINE-SYSTEM LOCK:",
    "1) STRUCTURAL MEMORY: avoid the narrative skeletons of recent openings, not merely their wording. Recent fingerprints="+clean(JSON.stringify(recent),2200)+". Change at least TWO of: setting family, social geometry, immediate goal, pressure source, who initiates, interaction target, consequence, or scene direction.",
    "2) PRIVATE GOAL: before prose, silently assign the lead one concrete scene goal that would still matter if the user were absent. The opening must reveal or advance it through behavior.",
    "3) AUTONOMOUS NPCs: every supporting person who materially affects the scene needs a local want/activity/relationship of their own. Nobody may exist solely to flirt with the user, make the lead jealous, explain the lead, praise the user, or hand over exposition.",
    "4) KNOWLEDGE BOUNDARIES: separate WORLD TRUTH from LEAD KNOWLEDGE. The lead knows only what they directly witnessed, were explicitly told, can reasonably observe now, or established canon says they know. Off-screen events are not telepathically available.",
    "5) MULTI-AXIS ATTRACTION: interest, trust, comfort, sexual tension, jealousy, attachment and awareness-of-feelings are independent. Do not raise all axes because one romantic beat occurred. A character may desire without trust, care without awareness, feel jealous without entitlement, or trust without romance.",
    "6) CONSEQUENCE PERSISTENCE: choices create residue. Do not reset awkwardness, promises, refusals, pairings, alliances, public moments or social consequences merely because the opening changed location/time. If no prior consequence is supplied, do not invent one.",
    "7) BELIEFS ARE NOT FACTS: a character may misread the user or another NPC. Keep inference linguistically marked as suspicion/assumption unless verified. Never convert 'he thinks X' into narrator truth or user canon.",
    "8) OFFSCREEN CONVERSATIONS LIVE: NPCs and the lead may continue talking, arguing, joking, planning or working when the user is silent/not addressed. The user's presence must not make the whole room rotate toward them. A dot/continuation later may continue the existing conversation without summoning the user.",
    "9) EPISODE PLAN: silently plan PRESENCE → each person's immediate WANT → what was already happening → one CHANGE this scene causes → one OPEN THREAD. Then write prose only. The user does not need to be the cause, target or solution.",
    "DIRECTOR PRIORITY: coherent independent life > character-specific choice > causal consequence > romance. Romance may emerge from those layers but cannot erase them.",
    "IDEA="+(clean(idea,500)||"none; derive from creator canon rather than a generic romance template"),
    "LEAD="+(clean(character?.name,90)||"configured character")
  ].join("\n");
}

export function instantStoryDirectorIssuesV35366(opening="",recentOpenings=[]){
  const issues=[];
  if(patternRepeat(opening,recentOpenings))issues.push("instant_story_narrative_skeleton_repeat");
  if(omniscientLanguage(opening))issues.push("instant_story_omniscient_lead_knowledge");
  if(beliefAsFact(opening))issues.push("instant_story_belief_promoted_to_fact");
  if(npcOnlyJealousyProp(opening))issues.push("instant_story_npc_exists_only_for_jealousy");
  if(passiveWorldCollapse(opening))issues.push("instant_story_world_collapses_around_user");
  if(consequenceReset(opening))issues.push("instant_story_unearned_consequence_reset");
  return [...new Set(issues)];
}

export const __testV35366={skeleton,jaccard,patternRepeat,omniscientLanguage,beliefAsFact,npcOnlyJealousyProp,passiveWorldCollapse,consequenceReset};
