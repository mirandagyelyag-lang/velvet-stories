
// A planned morning is a future commitment, not authorization to skip sleep.
export function pendingRestTransition(userTurns = [], latestUserMessage = '') {
  const turns = userTurns.map(String);
  if (turns.at(-1) !== latestUserMessage) turns.push(String(latestUserMessage));
  const rest = /\b(?:let['’]?s|let us|we should|we can|i want to|i need to)\s+(?:go to\s+)?(?:sleep|bed|rest)\b|\b(?:vamos a dormir|durmamos|me voy a dormir|quiero dormir)\b/i;
  const resume = /\b(?:good morning|next morning|following morning|i wake|i woke|we wake|we woke|time\s*skip|skip ahead|fast forward|let['’]?s (?:keep|continue|resume|start) (?:working|studying)|back to (?:work|the paper))\b|\b(?:buenos d[ií]as|a la ma[nñ]ana siguiente|me despierto|despertamos|sigamos trabajando)\b/i;
  let state = null;
  let userHosting = false;
  for (const turn of turns) {
    if (/\b(?:(?:do you (?:want to|wanna)|would you like to|you can|want to) stay (?:for the night|overnight|over|here)|(?:come|stay) (?:at|to) my (?:place|house|home|apartment))\b/i.test(turn)) userHosting = true;
    if (/\b(?:let[\'’]?s go to|i (?:arrive|arrived) at|we (?:arrive|arrived) at) your (?:place|house|home|apartment)\b/i.test(turn)) userHosting = false;
    if (rest.test(turn) && !/\b(?:let['’]?s not|do not|don['’]?t|no quiero)\s+(?:go to\s+)?(?:sleep|bed|rest|dormir)\b/i.test(turn)) {
      state = { active: true };
    } else if (state && resume.test(turn)) {
      state = { active: false };
    }
  }
  return state ? { ...state, userHosting } : null;
}
// Creator preference: an ambiguous night-work jump does not automatically mean sunrise.
export function overnightLanding(userTurns = [], latestUserMessage = '') {
  const turns=[...userTurns.map(String)];
  if(turns.at(-1)!==latestUserMessage) turns.push(String(latestUserMessage));
  const restState = pendingRestTransition(turns, latestUserMessage);
  if (restState && !restState.active) return null;
  if (restState?.active) return { timeLabel: 'current scene, preparing to rest', instruction: (restState.userHosting ? "HOST/GUEST ROLE LOCK: The USER invited the CHARACTER to stay overnight. Keep the user as host and the character as guest; familiarity with where things are does not transfer home ownership. The guest may put away their own books and use explicitly offered sleeping arrangements for themselves. Do not prepare the host a guest bed, offer the host household supplies as the owner, or invent where bedding, closets, switches, lamps or spare rooms are. A previously mentioned guest bed does not establish a pull-out closet bed, its mechanism or who owns the home. Do not turn the invitation into a house tour or housekeeping scene. Preserve the established private home and interpersonal roles. " : "") + "PENDING REST TRANSITION — ALL CHARACTERS: The user explicitly chose sleep/rest. Continue that decision NOW in the established place. Work or study is paused, even if the notes, research outline or unfinished task remain visible. Plans to work in the morning are FUTURE commitments, not a time skip. A short acceptance, permission to use familiar belongings, or goodnight continues the rest transition; it does not reopen the assignment. Respond to the latest message with this character's own natural words and actions. Do not ask which section to tackle or resume academic discussion. Do not call the current work last night's work, announce a new day, narrate the user falling asleep, move the user, invent a guest room or decide sleeping arrangements. Only a later explicit user wake-up, morning, time skip or request to resume releases this pause. Keep direct narration addressed to you/your, including the final sentence: watches you, never watches her. The character may put their own materials away or respond to established sleeping arrangements without inventing user actions." };
  const skip=/\b(?:time\s*skip|skip ahead|fast forward)\b|salto (?:de tiempo|temporal)/i;
  const overnight=/\ball night\b|\bthrough the night\b|toda la noche/i;
  let index=-1;
  for(let i=0;i<turns.length;i++) if(skip.test(turns[i])) index=i;
  if(index<0 || !overnight.test(turns[index])) return null;
  const suffix=turns.slice(index).join('\n');
  // Explicit user-authored landing or a later clock outranks the ambiguous default.
  if(/\b(?:until|till|by|at) (?:the )?(?:dawn|sunrise|morning)\b|\b(?:next|following) (?:morning|day)\b|hasta (?:el )?amanecer|a la ma[nñ]ana siguiente/i.test(suffix)) return null;
  if(/\b(?:\d+|one|two|three|four|five|six|seven|eight|several) (?:minutes?|hours?|days?) later\b/i.test(suffix)) return null;
  if(/\b\d{1,2}:\d{2}\b|\b\d{1,2}\s*(?:a\.?m\.?|p\.?m\.?)\b/i.test(turns.join('\n'))) return null;
  return {
    timeLabel:'late night / early hours, approximately 2–3 a.m.',
    instruction:'OVERNIGHT LANDING — ALL CHARACTERS: The user skipped through late-night work without authorizing dawn. Keep it nighttime / the early hours, approximately 2–3 a.m. as the creator-preferred ambiguous landing, rather than jumping automatically to sunrise, six in the morning, breakfast, lectures or campus opening. Keep the agreed place and task. Do not invent a morning appointment or declare the whole task completed. If asked the time, give a brief approximate late-night answer (e.g. "It is after two"), without inventing exact minutes. A prior model-generated morning/six-o-clock line is not user authorization and must not override this user-directed landing. A later explicit user time, dawn instruction or elapsed duration always wins; never rewind a user-established clock.',
  };
}
export function overnightLandingIssues(reply, landing) {
  if(!landing) return [];
  const text=String(reply);
  const daylight=/\b(?:sunrise|dawn|daylight|morning (?:light|sun)|light of morning|sun (?:is )?(?:rising|up))\b|\b(?:barely|already|about|around|almost|past|it's|it is)\s+(?:six|seven|eight|6|7|8)(?:\b|:)|\b(?:6|7|8)(?::\d\d)?\s*a\.?m\.?\b/i;
  return daylight.test(text)?['overnight_landing_clock_conflict']:[];
}
