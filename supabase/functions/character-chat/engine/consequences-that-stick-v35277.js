// Velvet Stories v3.52.77 · Consequences That Stick
// Durable choices remain true without being foregrounded every turn.
// Information travels through witnesses/sources, and emotional meaning may arrive late.

const clean=(v="",n=1400)=>String(v??"").replace(/\s+/g," ").trim().slice(0,n);
const norm=(v="")=>clean(v,18000).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[’']/g,"");
const list=(v)=>Array.isArray(v)?v:[];
const uniq=(xs)=>[...new Set(xs.filter(Boolean))];

function words(value=""){
  return norm(value).split(/\s+/).filter((x)=>x.length>=4);
}

function overlapScore(a="",b=""){
  const A=new Set(words(a)),B=new Set(words(b));
  if(!A.size||!B.size)return 0;
  let n=0; for(const x of A) if(B.has(x)) n+=1;
  return n/Math.max(1,Math.min(A.size,B.size));
}

function compactChain(row={}){
  return {
    title:clean(row?.title,160),
    cause:clean(row?.cause,360),
    effect:clean(row?.effect,420),
    weight:Math.max(1,Math.min(5,Number(row?.weight)||2)),
    participants:list(row?.participants).map((x)=>clean(x,90)).filter(Boolean).slice(0,6),
    permanence:clean(row?.permanence,80),
    decay:clean(row?.decay,260),
  };
}

function classifyChains(activeChains=[],context=""){
  const rows=list(activeChains).map(compactChain).filter((x)=>x.title&&(x.cause||x.effect));
  const current=[],sleeping=[];
  for(const row of rows){
    const blob=[row.title,row.cause,row.effect,...row.participants].join(" ");
    const score=overlapScore(blob,context);
    if(score>=0.16 || row.weight>=5) current.push(row);
    else sleeping.push(row);
  }
  return {current:current.slice(0,4),sleeping:sleeping.slice(0,8)};
}

function immediateRomanceEvent(reply=""){
  const t=norm(reply);
  return /\b(?:kissed|kiss(?:es|ing)?|made out|making out|hooked up|hooking up|slept with|went home with|flirted with|flirting with|asked .* out|went on a date|date with)\b/.test(t);
}

function instantMoralCorrection(reply=""){
  const t=norm(reply);
  return /\b(?:immediately regretted|regretted it immediately|instant regret|knew it was a mistake the second|the moment .* happened .* mistake|all (?:he|she|they) could think about was you|couldnt stop thinking about you|could not stop thinking about you|she wasnt you|she was not you|he wasnt you|he was not you|nobody compares to you|no one compares to you|it meant nothing|meant absolutely nothing)\b/.test(t);
}

function explicitRegretSetup(latestUserMessage="",recentCharacterReplies=[]){
  const t=norm([latestUserMessage,...list(recentCharacterReplies).slice(-4)].join(" | "));
  return /\b(?:regret|guilty|guilt|mistake|shouldnt have|should not have|wish i hadnt|wish i had not|felt wrong|couldnt go through with|could not go through with)\b/.test(t);
}

function broadKnowledgeClaim(reply=""){
  const t=norm(reply);
  return /\b(?:everyone knew|everybody knew|the whole group knew|the whole campus knew|word was everywhere|everyone had heard|everybody had heard|all of them knew)\b/.test(t);
}

function publicKnowledgeSupport(world={}){
  const institutional=list(world?.institutionalMemory);
  const rumors=list(world?.rumorBeliefs);
  return institutional.length>0 || rumors.some((x)=>/public|everyone|campus|team|group|school|party/i.test(String(x?.source||"")));
}

function resolvedLanguage(reply=""){
  return /\b(?:everything was back to normal|as if nothing happened|none of it mattered anymore|all forgiven|completely forgotten|water under the bridge|no hard feelings anymore)\b/i.test(String(reply||""));
}

function visibleDurableEvent(reply=""){
  const t=norm(reply);
  if(/\b(?:kissed|made out|hooked up|slept with|went home with|asked .* out|went on a date)\b/.test(t)) return "romantic";
  if(/\b(?:promised|swore to|gave .* word|i promise)\b/.test(t)) return "promise";
  if(/\b(?:lied to|lied about|kept .* secret|hid .* from)\b/.test(t)) return "secret";
  if(/\b(?:punched|hit|shoved|fight broke out|got into a fight)\b/.test(t)) return "conflict";
  if(/\b(?:broke up|ended things|we re done|were done)\b/.test(t)) return "relationship";
  return "";
}

export function buildConsequencesThatStickV35277({
  character={},userName="",latestUserMessage="",recentUserMessages=[],recentCharacterReplies=[],
  scene={},behavior={},worldConsequences={},longStoryMemory={}
}={}){
  const context=[
    latestUserMessage,
    ...list(recentUserMessages).slice(-5),
    ...list(recentCharacterReplies).slice(-5),
    clean(scene?.location,180),
    ...list(scene?.present).slice(0,8),
  ].join(" | ");
  const {current,sleeping}=classifyChains(worldConsequences?.activeChains,context);
  const rumors=list(worldConsequences?.rumorBeliefs).slice(0,8);
  const perspectives=longStoryMemory?.perspectiveMemory||{};
  const priorForeground=clean(behavior?.consequence_foreground_thread,520);
  const priorDormant=clean(behavior?.consequence_dormant_threads,900);
  const priorInfo=clean(behavior?.information_asymmetry_note,700);

  return [
    "CONSEQUENCES THAT STICK 3.52.77 · CREATOR RULE (hidden):",
    "CHOICES LEAVE RESIDUE. A meaningful action does not vanish because the next scene is fun, romantic, ordinary, or somewhere else. Preserve practical, social, emotional and relational effects until something actually changes them.",
    "DORMANCY ≠ RESOLUTION. An active consequence may disappear from screen for many turns. Do not mention it every scene. Keep it true in the background and foreground it only when a real trigger makes it relevant: a participant returns, someone learns it, a promise comes due, a related topic appears, a relationship choice collides with it, or enough grounded time changes its pressure.",
    "DELAYED CONSEQUENCES ARE PREFERRED OVER INSTANT MORALIZATION. A character can make a messy, selfish, romantic, sexual, social or impulsive choice and simply experience that moment. Do not force immediate guilt, regret, apology, redemption or a user-centered comparison to prove the central relationship matters.",
    "NO ROMANCE SAFETY NET: if the character kisses/dates/hooks up/flirts with someone else while non-exclusive, do NOT automatically append 'it meant nothing', 'she wasn't you', 'nobody compares', or instant regret. The outside interaction can be genuinely enjoyable or meaningful. Complication may emerge later.",
    "FEELING LATE IS HUMAN. Regret, jealousy, conflict, longing, embarrassment or changed meaning may appear hours/scenes later when a trigger exists. The later feeling must grow from remembered events + current context, not retroactively rewrite what the character felt in the original moment.",
    "RELATIONSHIPS WITH NPCs ACCUMULATE HISTORY. A kiss, date, argument, favor, secret, rejection, promise or betrayal can alter future access, comfort, expectation or awkwardness with that named person. Do not reduce recurring people back to strangers.",
    "INFORMATION IS UNEVEN. Only people who witnessed an event, were told, inferred it from evidence, or received it through an established information route may know it. A secret can remain secret. A rumor remains rumor. The user does NOT automatically know events that happened while absent.",
    "KNOWLEDGE PROPAGATION IS AN EVENT. When someone tells another person, record/reflect that route. Do not teleport knowledge across the cast. 'Marcus saw it' does not mean Jules knows it unless Marcus/Jules/the group actually transmit it.",
    "DISCOVERY CAN BE DELAYED. The user may learn something ten scenes later through a witness, changed behavior, a returning NPC, a direct admission or a grounded rumor. Do not reveal everything immediately for dramatic neatness.",
    "REPAIR REQUIRES EVIDENCE. One apology, joke, kiss or affectionate sentence does not automatically restore trust, comfort, reputation or a damaged relationship. Resolution must match the weight of the consequence and what the affected person actually does afterward.",
    "DO NOT PUNISH EVERY CHOICE. Persistence is not constant drama. Some consequences are mild: awkwardness, a changed expectation, an open invitation, someone remembering a rejection, a friend knowing something. Preserve proportion.",
    "RECORD DURABLE EVENTS: when THIS visible reply creates a meaningful romantic/social choice, promise, reveal, conflict, betrayal, practical damage or relationship shift, continuity_update.world_consequence should record the smallest truthful durable effect. Do not invent future fallout; record only what is now true.",
    "RECORD WHO KNOWS: continuity_update.knowledge_updates should name only actual witnesses/recipients/inferers and the source. connection_updates should change a named relationship only when the visible beat materially changes it.",
    "DO NOT RESOLVE WHAT YOU JUST CREATED unless the same visible event genuinely completes/resolves it. New consequence + instant resolution is usually a reset disguised as drama.",
    `CURRENT RELEVANT ACTIVE CONSEQUENCES: ${clean(JSON.stringify(current),1800)||"none"}.`,
    `SLEEPING BUT STILL ACTIVE CONSEQUENCES: ${clean(JSON.stringify(sleeping),2200)||"none"}.`,
    `RUMOR/SUSPICION LEDGER: ${clean(JSON.stringify(rumors),1000)||"none"}.`,
    `PERSPECTIVE MEMORY: objective=${clean(JSON.stringify(perspectives?.objective||[]),700)} | characterKnown=${clean(JSON.stringify(perspectives?.characterKnown||[]),700)} | publicKnown=${clean(JSON.stringify(perspectives?.publicKnown||[]),600)}.`,
    `PREVIOUS CONSEQUENCE FOREGROUND: ${priorForeground||"none"}. DORMANT SUMMARY: ${priorDormant||"none"}. INFO ASYMMETRY: ${priorInfo||"none"}.`,
    `CHARACTER=${clean(character?.name,100)}. USER=${clean(userName,100)}. CURRENT SCENE=${clean(scene?.location||scene?.activity||"unknown",320)}.`,
    "PERSISTENCE OUTPUT: human_behavior_update may compactly update consequence_foreground_thread, consequence_dormant_threads, consequence_last_trigger and information_asymmetry_note, but only from stored/visible facts. These fields summarize; story_consequences + knowledge ledger remain the factual source of truth.",
  ].join("\n");
}

export function consequencesThatStickV35277Issues({
  reply="",latestUserMessage="",recentCharacterReplies=[],worldConsequences={}
}={}){
  const issues=[];
  if(!String(reply||"").trim()) return issues;

  if(immediateRomanceEvent(reply) && instantMoralCorrection(reply) && !explicitRegretSetup(latestUserMessage,recentCharacterReplies)){
    issues.push("instant_regret_romance_safety_net");
  }

  if(broadKnowledgeClaim(reply) && !publicKnowledgeSupport(worldConsequences)){
    issues.push("knowledge_propagated_without_route");
  }

  if(list(worldConsequences?.activeChains).length && resolvedLanguage(reply)){
    issues.push("active_consequence_prematurely_reset");
  }

  const event=visibleDurableEvent(reply);
  if(event && /\b(?:and that was that|nothing changed|it was forgotten|never came up again|no one cared|nobody cared)\b/i.test(String(reply||""))){
    issues.push("durable_event_immediately_erased");
  }

  return uniq(issues);
}

export function inferStickyVisibleConsequenceV35277({
  reply="",characterName="",scene={}
}={}){
  const raw=String(reply||"").trim();
  const kind=visibleDurableEvent(raw);
  if(!kind) return null;

  const titles={
    romantic:"Visible romantic choice",
    promise:"Promise made",
    secret:"Secret/lie created",
    conflict:"Physical/social conflict",
    relationship:"Relationship status shift",
  };
  const weights={romantic:3,promise:3,secret:3,conflict:3,relationship:4};
  const participants=uniq([clean(characterName,100)]).slice(0,6);

  return {
    record:true,
    title:titles[kind]||"Durable visible event",
    cause:clean(raw,420),
    effect:`A visible ${kind} event occurred and remains part of continuity until later scenes establish its actual social/emotional effect or resolution.`,
    weight:weights[kind]||2,
    participants,
    status:"active",
  };
}
