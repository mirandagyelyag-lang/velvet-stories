// Velvet Stories v3.49.50 · Meaningful Turn Gate
// Structural guard against empty narrative placeholders. This intentionally does
// not blacklist one phrase; it asks whether the turn contains a character-owned
// response, decision, purposeful action, social consequence, or grounded silence.

const clean = (v='') => String(v||'').replace(/\s+/g,' ').trim();
const norm = (v='') => clean(v).toLowerCase().replace(/[“”]/g,'"').replace(/[’]/g,"'");

export function buildMeaningfulTurnGateV34950({ latestUserMessage='', character={} }={}) {
  return `MEANINGFUL TURN GATE 3.49.50 · SOMETHING MUST HAPPEN\n- Before returning visible prose, identify the character-owned conversational or narrative move in this turn.\n- A turn passes only if it contains at least ONE grounded move: a specific reply to the live thread, a decision, a purposeful action, a question the character actually chooses to ask, a social consequence, or meaningful silence whose reason/consequence is visible from established context.\n- Time passing, atmosphere, looking/breathing/pausing alone, or generic acknowledgement are NOT moves. Do not use them as escape hatches when uncertain.\n- A short user action such as a sigh does not require a speech, but the next beat must still respond to the live situation. It may let the joke die, change subject naturally, act on an existing intention, or use consequential silence.\n- Do not invent a new event merely to satisfy this gate. Prefer the smallest grounded move already available in context.\n- Preserve v3.49.43 target awareness, v3.49.44 spoken naturalness, and v3.49.46 role ownership.\nLatest user beat: ${clean(latestUserMessage).slice(0,240)}\nCharacter: ${clean(character?.name||'the character').slice(0,80)}`;
}

function hasDialogue(text='') {
  return /["“][^"”]{2,}["”]/.test(text) || /(?:^|\n)\s*[-–—]\s*\S/.test(text);
}
function hasPurposefulAction(text='') {
  const t=norm(text);
  // Concrete verbs that alter location/object/social state. Pure micro-gestures are
  // deliberately absent because a glance/breath/pause alone is not progress.
  return /\b(?:says?|asks?|answers?|tells?|replies?|calls?|texts?|hands?|gives?|takes?|puts?|sets?|opens?|closes?|leaves?|walks?|moves?|sits?|stands?|reaches?|picks?|offers?|refuses?|agrees?|decides?|turns?\s+(?:away|back)|heads?|returns?|joins?|orders?|pours?|drinks?|takes?\s+out)\b/.test(t);
}
function isTemporalAtmosphereOnly(text='') {
  const t=norm(text).replace(/[.!?]+$/,'');
  const stripped=t
    .replace(/\b(?:a|another|one|the|for|just|brief|briefly|long|small|short|quiet|silent|awkward|moment|second|seconds|beat|pause|silence|while)\b/g,' ')
    .replace(/\b(?:passes?|follows?|settles?|stretches?|hangs?|lingers?|falls?|goes? by|ticks? by)\b/g,' ')
    .replace(/\s+/g,' ').trim();
  return stripped.length === 0;
}
function isDecorativeStillnessOnly(text='') {
  const t=norm(text);
  const words=t.split(/\s+/).filter(Boolean);
  if (words.length > 18) return false;
  if (hasDialogue(text) || hasPurposefulAction(text)) return false;
  // Low-information prose made only of waiting, silence, gaze, breath, posture or time.
  const content=t
    .replace(/[^a-z' ]/g,' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter(w=>!new Set(['a','an','the','his','her','their','he','she','they','you','your','for','of','in','on','at','to','and','but','then','just','still','there','between','them','moment','beat','pause','silence','second','while','passes','pass','passed','follows','followed','settles','settled','hangs','hung','lingers','lingered','waits','waited','waiting','looks','looked','looking','gaze','eyes','breath','breathes','breathed','breathing','sighs','sighed','sigh','shrugs','shrugged','shrug','shifts','shifted','shift','leans','leaned','lean','quiet','quietly','silent','brief','briefly']).has(w));
  return content.length <= 1;
}

export function meaningfulTurnGateV34950Issues(reply='', latestUserMessage='', recentCharacterReplies=[]) {
  const text=clean(reply);
  if (!text) return [];
  const issues=[];
  if (isTemporalAtmosphereOnly(text) || isDecorativeStillnessOnly(text)) issues.push('meaningful_turn_no_move');
  const recent=(recentCharacterReplies||[]).slice(-3).map(norm);
  if (issues.length && recent.some(r=>r===norm(text))) issues.push('meaningful_turn_stalled_regeneration');
  return [...new Set(issues)];
}
