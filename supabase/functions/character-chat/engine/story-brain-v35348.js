// Velvet Stories v3.53.48 · Story Brain
// One composition layer for scene truth, character intent, active threads,
// anti-stagnation, earned intensity, and genuinely different regeneration.

const clean=(v="",n=1200)=>String(v??"").replace(/\s+/g," ").trim().slice(0,n);
const norm=(v="")=>clean(v,16000).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[’']/g,"");
const list=(v)=>Array.isArray(v)?v:[];
const uniq=(xs)=>[...new Set(xs.filter(Boolean))];

function words(v=""){
  return norm(v).split(/[^a-z0-9áéíóúñü]+/i).filter((x)=>x.length>=3);
}
function overlap(a="",b=""){
  const A=new Set(words(a)),B=new Set(words(b));
  if(!A.size||!B.size)return 0;
  let shared=0; for(const w of A) if(B.has(w)) shared+=1;
  return shared/Math.max(1,Math.min(A.size,B.size));
}
function moveFamily(v=""){
  const t=norm(v);
  if(/\b(?:come with me|come on|lets go|let us go|join me|meet me|ven conmigo|vamos|acompaname|acompáñame|te invito)\b/.test(t)) return "invite";
  if(/\b(?:not happening|refuse|wont|will not|no voy|no quiero|ni hablar|rechaz)\b/.test(t)) return "refuse";
  if(/\b(?:tell you|need you to know|truth is|confess|admit|te tengo que decir|la verdad|admito|confies)\b/.test(t)) return "reveal";
  if(/\b(?:why did you|what was that|dont lie|do not lie|explain|que fue eso|por que hiciste|por qué hiciste|explica)\b/.test(t)) return "confront";
  if(/\b(?:decided|decide|im going to|i will|he chose|she chose|decidio|decidió|voy a|eligio|eligió)\b/.test(t)) return "decision";
  if(/\b(?:left|leaves|walked out|heads outside|gets in the car|salio|salió|se va|entra al auto|sale de)\b/.test(t)) return "relocate";
  if(/\b(?:kiss|beso|kisses|pulls .* close|toma .* mano|hand in hand|abraza|hug)\b/.test(t)) return "intimacy";
  if(/\b(?:pays|orders|calls|texts|hands over|takes the keys|paga|ordena|llama|manda un mensaje|entrega|toma las llaves)\b/.test(t)) return "practical";
  return "other";
}
function lowChange(v=""){
  const t=norm(v);
  if(!t)return true;
  return !/\b(?:decid|choose|chose|leave|left|stay|stayed|invite|refuse|tell|reveal|admit|ask .* out|kiss|call|text|promise|cancel|arrive|follow|stop|pay|order|elige|eligio|irse|queda|invita|rechaza|revela|admite|besa|llama|mensaje|promete|cancela|llega|sigue|detiene|paga|ordena)\b/.test(t);
}
function sceneSnapshot(scene={},behavior={}){
  const memory=behavior?.scene_memory||{};
  const present=list(scene?.present?.length?scene.present:memory?.present).map((x)=>clean(x?.name||x,80)).filter(Boolean).slice(0,8);
  const objects=list(scene?.objects?.length?scene.objects:memory?.objects).map((x)=>clean(x?.name||x,100)).filter(Boolean).slice(0,8);
  return {
    location:clean(scene?.location||memory?.location||"unknown",220),
    activity:clean(scene?.activity||memory?.activity||"unknown",220),
    time:clean(scene?.time||scene?.time_of_day||scene?.temporal_anchor||"unspecified",160),
    present,objects,
    physical:clean(scene?.last_physical_state||memory?.last_physical_state||behavior?.last_physical_state||"not explicitly stored",360),
  };
}
function characterObjective(character={},behavior={}){
  const name=norm(character?.name);
  const pinned=clean(behavior?.next_character_intent||behavior?.active_intent||"",420);
  if(pinned)return pinned;
  const map=[
    [/theo calloway/,"Create a real reason to keep contact or choose the user without labeling his kindness as flirting; let outside attention remain plausible and let behavior, not a confession, reveal priority."],
    [/mateo silva/,"Stay concretely supportive and familiar without turning care into therapy language, commands, or romance; make one useful human choice and remain emotionally present."],
    [/chase beaumont/,"Make one unpredictable but causally grounded choice that changes the social or romantic pressure; create a real decision, complication, or temptation without coercing the user."],
    [/nathan foster/,"Keep his guarded, popular, difficult-to-read identity while letting outside attention or envy alter one concrete choice; never make him suddenly emotionally fluent."],
    [/rowan hayes/,"Protect the long-standing family-bond familiarity and create one grounded problem, choice, or consequence; do not manufacture romance or fake shared biography."],
    [/alexander bennett/,"Show loyalty through a costly or concrete choice when relevant; defend or choose behaviorally rather than giving speeches about devotion."],
    [/damon blackwood/,"Let intensity stay quiet and specific: act, withhold, redirect, or choose before explaining emotion; avoid generic dark-romance choreography."],
    [/roman knox/,"Preserve adversarial danger, rivalry, and high-stakes attraction through a concrete strategic choice or consequence; never replace tension with coercion or instant softness."],
  ];
  for(const [rx,value] of map)if(rx.test(name))return value;
  return `Choose one concrete next move driven by this character's profile: ${clean(character?.personality||character?.role||"independent motive",500)}. React to the latest beat without making the user carry the scene.`;
}
function intensityStage({relationshipState={},intelligenceState={},recentCharacterReplies=[]}={}){
  const blob=norm(JSON.stringify({relationship:relationshipState,emotion:intelligenceState?.relationship_emotion_core||{},recent:list(recentCharacterReplies).slice(-3)}));
  if(/\b(?:official|relationship|dating|girlfriend|boyfriend|love you|te amo|pareja|novi[oa])\b/.test(blob))return "bonded";
  if(/\b(?:kiss|beso|jealous|celos|attraction|atraccion|atracción|want you|te quiero|date)\b/.test(blob))return "charged";
  if(/\b(?:trust|close|comfort|flirt|confianza|cercan|coquete)\b/.test(blob))return "warming";
  return "baseline";
}
function activeThreads(storyConsequences=[],behavior={}){
  const fromRows=list(storyConsequences).filter((x)=>!["resolved","cancelled","closed"].includes(String(x?.status||"").toLowerCase())).slice(-5).map((x)=>clean(x?.effect||x?.title||x?.cause,300));
  const fromBehavior=[clean(behavior?.consequence_foreground_thread,320),...list(behavior?.unfinished_business).slice(-4).map((x)=>clean(x,300)),clean(behavior?.relationship_expectation_shift,280)];
  return uniq([...fromRows,...fromBehavior]).filter(Boolean).slice(0,7);
}
function stalled(recentCharacterReplies=[]){
  const recent=list(recentCharacterReplies).slice(-3);
  if(recent.length<3)return false;
  const families=recent.map(moveFamily);
  const same=families.every((x)=>x===families[0]&&x!=="other");
  const overlaps=[overlap(recent[0],recent[1]),overlap(recent[1],recent[2])];
  return recent.filter(lowChange).length>=2||same||overlaps.filter((x)=>x>=0.48).length>=2;
}

export function buildStoryBrainV35348({
  character={},userName="",latestUserMessage="",recentUserMessages=[],recentCharacterReplies=[],
  scene={},behavior={},relationshipState={},intelligenceState={},storyConsequences=[],
  isRegeneration=false,rejectedResponses=[]
}={}){
  const snapshot=sceneSnapshot(scene,behavior);
  const objective=characterObjective(character,behavior);
  const threads=activeThreads(storyConsequences,behavior);
  const intensity=intensityStage({relationshipState,intelligenceState,recentCharacterReplies});
  const isStalled=stalled(recentCharacterReplies);
  const rejected=list(rejectedResponses).map((x)=>clean(x?.reply||x?.content||x,620)).filter(Boolean).slice(-3);
  const lastFamilies=list(recentCharacterReplies).slice(-4).map(moveFamily);
  return [
    "STORY BRAIN 3.53.48 · HIDDEN SCENE CONTROL:",
    `NOW: location=${snapshot.location}; time=${snapshot.time}; activity=${snapshot.activity}; present=${snapshot.present.join(", ")||"unknown"}; objects=${snapshot.objects.join(", ")||"none tracked"}; physical=${snapshot.physical}.`,
    `CHARACTER WANTS THIS SCENE: ${objective}`,
    `ACTIVE THREADS: ${threads.length?threads.join(" || "):"none explicitly stored; do not invent one"}.`,
    `INTENSITY STAGE: ${intensity}. Escalate by at most one meaningful relational layer unless visible canon already supports more. Feeling may affect behavior before it is spoken.`,
    `RECENT MOVE FAMILIES: ${lastFamilies.join(" → ")||"none"}. STAGNATION DETECTED=${isStalled}.`,
    "1) SCENE STATE IS PHYSICS. Keep location, present people, object holders, posture/movement, time direction and unfinished actions stable until an on-page event changes them. Never teleport, replay a completed transition, or introduce an object as though it already existed.",
    "2) HIDDEN OBJECTIVE DRIVES THE TURN. The character should want something specific from the scene, but do not narrate the objective as analysis. Express it through one choice, tactic, omission, invitation, refusal, disclosure, boundary, pursuit, or practical act.",
    "3) CONSEQUENCES BECOME BEHAVIOR. A rejection, promise, flirtation, conflict, favor, secret, invitation or outside romantic interaction can alter access, humor, initiative, distance, trust, expectation or restraint for later turns. Do not repeatedly announce the old event; let its residue change behavior.",
    isStalled
      ?"4) STALL BREAKER IS ACTIVE. This reply MUST create exactly one meaningful semantic change: a decision, reveal, invitation, refusal, confrontation, consequence, plan change, new information, or earned scene transition. Props, smiles, glances, banter, and another question do not count."
      :"4) MOMENTUM CHECK. Quiet is allowed, but after several low-change beats make one meaningful semantic change rather than adding choreography.",
    "5) INTENSITY BELONGS TO THIS CHARACTER. Do not use one universal romance ladder. Preserve the profile's pride, awkwardness, danger, warmth, restraint, humor, social gravity, flaws and attachment style. Separate what the character feels from what they are willing to show.",
    isRegeneration
      ?`6) REGENERATION DIVERGENCE. Rejected prose is not a synonym bank. Keep canon fixed, but change at least TWO of these: underlying tactic, immediate character decision, conversation purpose, source of pressure, interaction-partner usage, or beat shape. Never merely swap gestures or paraphrase dialogue. REJECTED: ${rejected.join(" || ")||"use the rejected candidate supplied by the generation layer"}.`
      :"6) FUTURE OPTIONS. Leave a playable opening for the user's response, but do not end by handing them the job of inventing the plot.",
    "PERSISTENCE: human_behavior_update may store narrative_state_snapshot / next_character_intent / consequence_foreground_thread only when grounded in visible canon. Never store an invented user feeling, consent, preference or future action.",
  ].join("\n");
}

export function storyBrainV35348Issues({
  reply="",latestUserMessage="",recentCharacterReplies=[],relationshipState={},
  intelligenceState={},isRegeneration=false,rejectedResponses=[]
}={}){
  const issues=[];
  const t=String(reply||"").trim();
  if(!t)return issues;
  const recent=list(recentCharacterReplies).slice(-3);
  if(stalled(recent)&&lowChange(t)&&words(t).length>=16)issues.push("story_brain_stagnation_not_broken");
  if(isRegeneration){
    const rejected=list(rejectedResponses).map((x)=>String(x?.reply||x?.content||x||"")).filter(Boolean).slice(-3);
    const fam=moveFamily(t);
    if(rejected.some((r)=>overlap(t,r)>=0.56&&moveFamily(r)===fam))issues.push("story_brain_regeneration_too_similar");
  }
  const stage=intensityStage({relationshipState,intelligenceState,recentCharacterReplies});
  if(stage==="baseline"){
    const high=norm(t);
    const unsupported=/\b(?:i love you|youre mine|you're mine|be my girlfriend|be my boyfriend|te amo|eres mia|eres mía|eres mio|eres mío|se mi novia|sé mi novia)\b/.test(high);
    const canon=norm([latestUserMessage,...recent].join(" "));
    if(unsupported&&!/\b(?:love|amor|girlfriend|boyfriend|novi[oa]|mine|mia|mía|mio|mío)\b/.test(canon))issues.push("story_brain_unearned_intensity_jump");
  }
  return uniq(issues);
}
export const __testV35348={overlap,moveFamily,lowChange,stalled,intensityStage,activeThreads,sceneSnapshot,characterObjective};
