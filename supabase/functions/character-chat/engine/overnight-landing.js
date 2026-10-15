// Creator preference: an ambiguous night-work jump does not automatically mean sunrise.
export function overnightLanding(userTurns = [], latestUserMessage = '') {
  const turns=[...userTurns.map(String)];
  if(turns.at(-1)!==latestUserMessage) turns.push(String(latestUserMessage));
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
