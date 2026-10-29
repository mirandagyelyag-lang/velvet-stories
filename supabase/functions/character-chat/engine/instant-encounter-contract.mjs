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
${idea ? 'The explicit USER IDEA takes priority over the optional move below; do not replace its situation.' : 'Use the following optional interaction direction if it fits the configured character.'}
MOVE ${move.id}: ${move.direction}
This is an interaction direction, not a fixed scene. Choose setting and details from the profile; never add an academic major, employment, team or remembered incident to justify it.
Start inside the live moment. Static user presence may be clear in a natural clause; do not automatically prepend “You are already…” to every scene. Location is not an action, pose, mutual attention or consent.
Before the FIRST line addressed to the user, show a credible hearing bridge: already close in a quiet shared spot, the lead approaches to speaking distance, or an explicit call/message. A remote NPC exchange needs named speakers and recipients, and must not imply the user heard or noticed it. Keep noise and barriers meaningful. Stop before any user reaction.
The lead initiates because of a personal want. Do not substitute an errand, location query, forced invitation, gaze or generic dare. Compare the last openings by what happens, not their scenery; change the causal beat, not the nouns. No automatic companion-abandonment/approach/one-liner sequence.
Use actual profile voice in the spoken words. Do not explain attraction or label every line dry, teasing or challenging. End on the live interaction without a narrator summary or a menu.`;
}
