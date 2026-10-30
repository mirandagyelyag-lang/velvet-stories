const moves = [
  {id:'new_offer', pattern:/\b(?:offer|wager|bet|propos|apuesta|propon)\w*/i, direction:'An optional new offer with something the lead personally risks. Nobody has accepted yet; no prior wager, debt or obligation.'},
  {id:'changed_mind', pattern:/\b(?:changed? (?:his|her) mind|decid|instead|cambi[oó]|decid[ií])\w*/i, direction:'A visible change in the lead’s own immediate plan, with a concrete personal reason. It changes no user plan.'},
  {id:'owned_opinion', pattern:/\b(?:admit|confess|opinion|honest|admitir|opini[oó]n)\w*/i, direction:'A specific opinion or small admission the lead chooses to own, creating an interaction without inventing shared history or settled love.'},
  {id:'social_counteroffer', pattern:/\b(?:counteroffer|refus|declin|rechaz|neg[oó])\w*/i, direction:'The lead makes a personal counteroffer or refusal within a live social exchange. Any supporting person keeps agency; the user is not recruited as an escape route.'},
  {id:'present_choice', pattern:/\b(?:choos|chose|choice|elige|eligi[oó])\w*/i, direction:'The lead acts on a present personal preference and exposes a small social risk. It must do more than handle a prop or stare at the user.'},
];

export function selectInstantMove(variationKey='', recentOpenings=[]) {
  const recent=recentOpenings.slice(-2).join(' ');
  const available=moves.filter(move=>!move.pattern.test(recent));
  const pool=available.length?available:moves;
  let hash=2166136261;
  for(const c of String(variationKey))hash=Math.imul(hash^c.charCodeAt(0),16777619)>>>0;
  return pool[hash%pool.length];
}

export function buildInstantEncounterContract({variationKey='',recentOpenings=[],idea=''}={}) {
  const move=selectInstantMove(variationKey,recentOpenings);
  return `FRESH ENCOUNTER CONTRACT — applies to primary generation and every repair/provider.
${idea ? 'The explicit USER IDEA takes priority over the optional move below; do not replace its situation.' : 'Give the opening a visible personal intention using the following interaction direction, adapted to the configured character. The intention must appear through what the lead actually says or chooses, not as an explanation of the story.'}
MOVE ${move.id}: ${move.direction}
This is an interaction direction, not a fixed scene. Choose setting and details from the profile; never add an academic major, employment, team or remembered incident to justify it.
Start inside the live moment. Static user presence may be clear in a natural clause; do not open with the stock prefix “You are already…”. Establish static presence naturally through the situated scene; do not remove the location information. Location is not an action, pose, mutual attention or consent.
Before the FIRST line addressed to the user, show a credible hearing bridge: already close in a quiet shared spot, the lead approaches to speaking distance, or an explicit call/message. A remote NPC exchange needs named speakers and recipients, and must not imply the user heard or noticed it. Keep noise and barriers meaningful. Stop before any user reaction.
The lead initiates because of a personal want. Do not substitute an errand, location query, forced invitation, gaze or generic dare. Compare the last openings by what happens, not their scenery; change the causal beat, not the nouns. No automatic companion-abandonment/approach/one-liner sequence.
A jab about the user standing around or arguing is not a personal intention. The lead must also risk, offer, reveal, refuse or change something of his own. Never invent a user habit to make the joke work. Use actual profile voice in the spoken words. Do not explain attraction or label every line dry, teasing or challenging. End on the live interaction without a narrator summary or a menu.`;
}

export function buildChaseOpeningBrief(character={},idea='',recentOpenings=[],encounter='',repair=null) {
  const fields=['name','role','description','personality','relationship','world','coreMotivation','core_motivation','speechStyle','speech_style','humorStyle','humor_style','voiceAvoidances','voice_avoidances','boundaries'];
  const profile=Object.fromEntries(fields.filter(key=>character[key]).map(key=>[key,String(character[key]).slice(0,1400)]));
  return `Write one fresh playable opening for Chase Beaumont. 65–115 words. Finished prose only; quoted dialogue and named speakers. Sparse third-person narration; address the reader as you.
Chase is socially assured, impulsive, receptive to attention and personally provocative. Attraction is unresolved. He initiates a specific interaction because HE wants something now. His words should expose his own preference, vanity, risk or unexpected change of mind. A generic jab about the user is insufficient. Let an NPC answer or pursue their own purpose if one is present; NPCs are optional.
Establish the user's static location and a credible speaking distance naturally, without narrating their arrival, pose, attention, reactions, thoughts or acceptance. Do not begin with “You are already”. No remote quiet dialogue. Nobody has to notice or answer him.
Only PROFILE and IDEA establish biography and prior events. Invent present character/world actions, not past user bets, favors or secrets. Do not assign Chase an academic major, job, office shift or faculty task. No institutional errand, event-rescue mission, escape-from-boring-people plot or forced outing. An invitation is optional and remains unanswered.
Keep the scene personal and concrete. No formal monologue, elaborate prop business, repeated dry-tone labels, narrator explanation of chemistry or final gaze awaiting approval. End at an interaction the reader can redirect.
${encounter}
PROFILE: ${JSON.stringify(profile)}
IDEA: ${idea||'No extra premise.'}
RECENT OPENINGS TO DIFFER FROM IN ACTION AND DIALOGUE: ${JSON.stringify(recentOpenings.slice(-3).map(x=>String(x).slice(0,1000)))}
${repair?`EDITOR: revise the actual draft below. Preserve only supported facts. Replace an invented duty or forced outing entirely; changing its props is insufficient. The lead needs a personal want in the prose. DRAFT: ${String(repair.opening||'').slice(0,2400)}\nFAILURES: ${JSON.stringify(repair.rejectionReasons||[])}`:''}`;
}

export function chaseInstitutionalDutyIssues(opening='',character={},idea='') {
  if(!/^chase(?:\s+beaumont)?$/i.test(String(character.name||'')))return [];
  const task=/\b(?:proofing faculty|faculty citation indexes|clerical shift|records office shift|proofread(?:ing)? (?:the )?faculty)\b/i;
  const canon=[idea,character.description,character.role,character.habits].filter(Boolean).join(' ');
  return task.test(opening)&&!task.test(canon)?['chase_invented_institutional_duty']:[];
}
