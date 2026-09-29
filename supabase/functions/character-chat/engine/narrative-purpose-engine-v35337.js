// Velvet Stories v3.53.37 · Narrative Purpose Engine
// Purpose before prose: prioritize threads, time payoffs, define the scene objective,
// separate character want from scene need, and prevent structural story echoes.

const clean=(v="",n=12000)=>String(v??"").replace(/\s+/g," ").trim().slice(0,n);
const norm=(v="")=>clean(v).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[’‘]/g,"'");
const arr=(v)=>Array.isArray(v)?v:[];
const words=(v="")=>norm(v).split(/\s+/).filter(Boolean);

function meaningfulChange(v=""){
  const t=norm(v);
  return /\b(?:decid|chose|choose|chooses|refus|reveal|admit|confess|confront|invite|cancel|promise|apolog|change(?:s|d)? the plan|instead|sets? a boundary|turns? .* down|joins? the conversation|takes? responsibility|asks? .* (?:why|whether|about|what happened)|tells? .* (?:that|about)|creates? a consequence|leaves?|returns?|calls?|texts?|shows? up|commits?|withdraws?|accepts?|rejects?)\w*\b/.test(t);
}

function threadKind(thread){
  const t=norm(typeof thread==="string"?thread:JSON.stringify(thread||{}));
  if(/\b(?:promise|promised|owe|owed|said i would|commitment|deadline|appointment|reservation|plan)\b/.test(t)) return "promise_or_plan";
  if(/\b(?:secret|lied|lie|hidden|doesn'?t know|does not know|truth|confession)\b/.test(t)) return "secret_or_information";
  if(/\b(?:fight|argument|conflict|hurt|betray|resent|angry|repair|apology|boundary|refus)\b/.test(t)) return "active_conflict";
  if(/\b(?:kiss|date|jealous|crush|romantic|attraction|relationship|feelings|ex|rival)\b/.test(t)) return "relationship_pressure";
  if(/\b(?:friend|brother|sister|roommate|family|npc|marcus|jules|juliette)\b/.test(t)) return "important_person";
  return "detail";
}

function basePriority(kind){
  return ({
    active_conflict:6,
    promise_or_plan:5,
    secret_or_information:5,
    relationship_pressure:4,
    important_person:3,
    detail:1,
  })[kind]||1;
}

function threadLabel(thread){
  if(typeof thread==="string") return clean(thread,260);
  const obj=thread||{};
  return clean(obj.title||obj.label||obj.summary||obj.description||obj.effect||obj.cause||JSON.stringify(obj),260);
}

function threadStatus(thread){
  if(typeof thread==="string") return "active";
  return norm(thread?.status||"active");
}

function threadScore(thread){
  const kind=threadKind(thread);
  let score=basePriority(kind);
  const status=threadStatus(thread);
  const raw=norm(typeof thread==="string"?thread:JSON.stringify(thread||{}));
  if(/\b(?:urgent|due|today|tonight|now|deadline|waiting|promised)\b/.test(raw)) score+=2;
  if(/\b(?:resolved|closed|complete|completed|cancelled|canceled)\b/.test(status)) score-=10;
  const weight=Number(thread?.weight||thread?.priority||0);
  if(Number.isFinite(weight)) score+=Math.max(0,Math.min(3,weight));
  return score;
}

function tokenSet(v=""){
  return new Set(words(v).filter((w)=>w.length>=5 && !/^(?:about|there|their|which|would|could|should|because|character|status|active|thread|unresolved|scene|story)$/.test(w)));
}

function overlap(a="",b=""){
  const A=tokenSet(a),B=tokenSet(b);
  if(!A.size||!B.size) return 0;
  let hit=0;
  for(const w of A) if(B.has(w)) hit++;
  return hit/Math.min(A.size,B.size);
}

function mentionsThread(text="",thread){
  return overlap(text,threadLabel(thread))>=0.18;
}

function recentMentionDistance(thread,recentCharacterReplies=[]){
  const recent=arr(recentCharacterReplies).slice(-6);
  for(let i=recent.length-1,d=0;i>=0;i--,d++){
    if(mentionsThread(recent[i],thread)) return d;
  }
  return 99;
}

function prioritizeThreads(unresolvedThreads=[],recentCharacterReplies=[]){
  return arr(unresolvedThreads)
    .map((thread,index)=>{
      const kind=threadKind(thread);
      const distance=recentMentionDistance(thread,recentCharacterReplies);
      let score=threadScore(thread);
      // Payoffs need breathing room. A thread just foregrounded should not instantly
      // boomerang unless it is urgent; dormant important threads become more eligible.
      if(distance===0) score-=4;
      else if(distance===1) score-=2;
      else if(distance>=3 && score>=4) score+=1;
      return {index,kind,score,distance,label:threadLabel(thread),thread};
    })
    .filter((x)=>x.score>0)
    .sort((a,b)=>b.score-a.score || b.distance-a.distance);
}

function sceneObjective(scene={},latestUserMessage="",recentCharacterReplies=[]){
  const explicit=clean(
    scene?.objective||scene?.goal||scene?.pending||scene?.purpose||scene?.active_problem||scene?.scene_objective||"",
    320
  );
  if(explicit) return explicit;
  const recent=norm(arr(recentCharacterReplies).slice(-3).join(" | "));
  const user=norm(latestUserMessage);
  if(/\b(?:argue|fight|angry|hurt|apolog|sorry|leave me|go away|boundary)\b/.test(recent+" "+user)) return "change the live conflict state through repair, refusal, consequence, or a clearer boundary";
  if(/\b(?:jealous|flirt|date|kiss|crush|attention|rival)\b/.test(recent+" "+user)) return "make the current relationship pressure produce one observable choice or consequence";
  if(/\b(?:plan|going to|lets go|let's go|come with|follow|appointment|deadline|promised)\b/.test(recent+" "+user)) return "complete, alter, or meaningfully complicate the active plan";
  return "change one social, emotional, or practical state without inventing the user's agency";
}

function characterWant(character={},mind={}){
  return clean(
    mind?.current_goal||mind?.active_goal||mind?.private_intention||mind?.goal||
    character?.goal||character?.goals||character?.motivation||character?.drive||"",
    320
  ) || "act according to the character's established priorities and personality";
}

function skeleton(v=""){
  const t=norm(v);
  if(/\b(?:spots?|sees?|notices?) (?:you|her|him).*\b(?:crosses?|walks?|comes?|heads?) (?:over|toward|towards)\b/.test(t)) return "spot_and_cross_over";
  if(/\b(?:keys?|car|drive|ride|parking).*\b(?:come on|lets go|let's go|follow me|come with me)\b/.test(t)) return "transit_invitation";
  if(/\b(?:phone|cup|coffee|door|bag|keys?|bottle)\b/.test(t) && /\b(?:grin|smirk|joke|tease|quip|shrug|glance)\b/.test(t)) return "prop_plus_banter";
  if((String(v||"").match(/\?/g)||[]).length>=2 && !meaningfulChange(v)) return "question_loop";
  if(/\b(?:just then|suddenly|someone|friend|roommate|classmate).*\b(?:walked over|called|texted|interrupted|appeared)\b/.test(t)) return "npc_interruption";
  if(/\b(?:admit|reveal|confess|tell(?:s|ing)? .* that)\b/.test(t)) return "reveal";
  if(/\b(?:refus|confront|challenge|argue|sets? a boundary|walks? away)\b/.test(t)) return "confront_or_refuse";
  if(/\b(?:help|fix|bring|pick up|take care|handle|cover for|drive|pay|book|cancel)\b/.test(t) && meaningfulChange(v)) return "practical_action";
  if(meaningfulChange(v)) return "decision_or_change";
  return "low_signal";
}

function repeatedSkeleton(reply="",recentCharacterReplies=[]){
  const current=skeleton(reply);
  if(current==="low_signal") return false;
  const recent=arr(recentCharacterReplies).slice(-5).map(skeleton);
  return recent.filter((x)=>x===current).length>=2;
}

function callbackQualityBad(reply="",unresolvedThreads=[]){
  const t=norm(reply);
  const callback=/\b(?:remember when|remember that|you remember|as you remember|back when|like before|again,? like last time)\b/.test(t);
  if(!callback) return false;
  const touches=arr(unresolvedThreads).some((thread)=>mentionsThread(reply,thread));
  return !touches || !meaningfulChange(reply);
}

function lowPurposeReply(reply=""){
  const t=norm(reply);
  if(!t) return true;
  const filler=/\b(?:kept walking|kept driving|kept going|looked over|glanced over|gave a small nod|gave a short nod|smiled|grinned|shrugged|said nothing|let the silence|waited|watched)\b/.test(t);
  return filler && !meaningfulChange(reply);
}

function purposeFor({scene={},latestUserMessage="",unresolvedThreads=[],recentCharacterReplies=[],character={},mind={}}={}){
  const ranked=prioritizeThreads(unresolvedThreads,recentCharacterReplies);
  const objective=sceneObjective(scene,latestUserMessage,recentCharacterReplies);
  const want=characterWant(character,mind);
  const top=ranked[0];
  if(top && top.score>=6 && top.distance>=2) return `advance or pay off the high-priority thread "${top.label}" while serving the current scene objective`;
  if(top && top.score>=4 && top.distance>=3) return `let the dormant thread "${top.label}" affect a present choice without hijacking the scene`;
  return `serve the scene objective: ${objective}, through a choice consistent with the character's want: ${want}`;
}

export function deriveNarrativePurposeStateV35337({
  character={},mind={},scene={},latestUserMessage="",recentCharacterReplies=[],unresolvedThreads=[]
}={}){
  const ranked=prioritizeThreads(unresolvedThreads,recentCharacterReplies);
  return {
    purpose:purposeFor({character,mind,scene,latestUserMessage,recentCharacterReplies,unresolvedThreads}),
    sceneObjective:sceneObjective(scene,latestUserMessage,recentCharacterReplies),
    characterWant:characterWant(character,mind),
    topThreads:ranked.slice(0,4),
    recentSkeletons:arr(recentCharacterReplies).slice(-5).map(skeleton),
  };
}

export function buildNarrativePurposeEngineV35337({
  character={},mind={},scene={},latestUserMessage="",recentCharacterReplies=[],unresolvedThreads=[]
}={}){
  const state=deriveNarrativePurposeStateV35337({
    character,mind,scene,latestUserMessage,recentCharacterReplies,unresolvedThreads
  });
  const threadSummary=state.topThreads.length
    ? state.topThreads.map((x)=>`[${x.kind}|priority=${x.score}|last_seen=${x.distance>=99?"not_recent":x.distance+" turns ago"}] ${x.label}`).join(" || ")
    : "none";
  return [
    "NARRATIVE PURPOSE ENGINE 3.53.37 · PURPOSE BEFORE PROSE:",
    `WHY THIS TURN EXISTS: ${state.purpose}.`,
    `SCENE OBJECTIVE: ${state.sceneObjective}.`,
    `CHARACTER WANT: ${state.characterWant}.`,
    "CHARACTER WANT != SCENE WANT. The character may resist what the scene needs. Use that friction productively: the character can avoid, refuse, delay, choose badly, protect pride, or pursue a competing goal, but the turn must still alter the live situation.",
    "THREAD PRIORITY: conflicts, promises/plans and secrets outrank decorative details. Relationship pressure and important people matter when causally live. Do not resurrect resolved threads.",
    `PRIORITIZED THREADS: ${threadSummary}.`,
    "PAYOFF TIMING: do not boomerang the same thread every turn. A thread just foregrounded should breathe unless urgent. Dormant high-priority threads may return after several beats when the current scene gives them a natural entry point.",
    "CALLBACK QUALITY: never use 'remember when...' as a decorative nostalgia sticker. A callback must change a present decision, access, trust, plan, expectation, consequence, or relationship dynamic.",
    "SCENE OBJECTIVE: each scene should accomplish one small job. Once that job is achieved, resolve/transition naturally rather than adding dialogue because the characters can still talk.",
    "NARRATIVE ECHO FIREWALL: do not repeat the same structural skeleton with different nouns. Especially avoid repeated spot-user -> cross-room -> quip -> invitation, keys/car -> move elsewhere, prop+banter, repeated question loops, and convenient NPC interruptions.",
    `RECENT SKELETONS: ${state.recentSkeletons.join(" -> ")||"none"}.`,
    "TURN PURPOSE TEST: before finalizing, silently complete 'This turn exists to ____.' If the answer is only 'keep talking', 'maintain the vibe', 'show chemistry', 'move them somewhere', or 'fill the beat', rewrite. Name a concrete change instead.",
    "ONE PURPOSE IS ENOUGH. Do not cram thread payoff + revelation + new NPC + location change + romance escalation into one short reply. Pick the most earned purpose and execute it clearly.",
  ].join("\n");
}

export function narrativePurposeIssuesV35337({
  reply="",recentCharacterReplies=[],unresolvedThreads=[]
}={}){
  const issues=[];
  const text=String(reply||"").trim();
  if(!text) return ["narrative_purpose_empty_reply"];
  if(repeatedSkeleton(text,recentCharacterReplies)) issues.push("narrative_skeleton_echo");
  if(callbackQualityBad(text,unresolvedThreads)) issues.push("decorative_callback_without_payoff");
  if(lowPurposeReply(text)) issues.push("turn_without_clear_purpose");
  return [...new Set(issues)];
}

export const __testV35337={
  threadKind,threadScore,prioritizeThreads,sceneObjective,characterWant,skeleton,repeatedSkeleton,callbackQualityBad,purposeFor
};
