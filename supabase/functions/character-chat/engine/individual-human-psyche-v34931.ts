const clean=(v:any,n=300)=>String(v??'').replace(/\s+/g,' ').trim().slice(0,n);
const norm=(v:any)=>clean(v,5000).toLowerCase().replace(/[’]/g,"'");
function has(src:string,re:RegExp){return re.test(src)}

export function buildIndividualHumanPsycheV34931({character={},mind={},behavior={},relationship={},recentCharacterReplies=[],latestUserMessage=''}:any={}){
  const profile=norm([character?.name,character?.personality,character?.speechStyle,character?.description,character?.role,character?.background,character?.traits].flat().join(' '));
  const guarded=has(profile,/guarded|private|cold|reserved|avoidant|distant|stoic|hard to read/);
  const direct=has(profile,/direct|blunt|straightforward|honest|frank|bold/);
  const dry=has(profile,/dry|sarcastic|snark|wry|deadpan/);
  const warm=has(profile,/warm|gentle|kind|soft|affectionate|caring/);
  const impulsive=has(profile,/impulsive|reckless|hot.?headed|spontaneous|volatile/);
  const observant=has(profile,/observant|perceptive|watchful|analytical|attentive/);
  const proud=has(profile,/proud|arrogant|cocky|smug|ego|confident/);
  const social=has(profile,/popular|social|charismatic|outgoing|heartthrob|campus prince/);
  const rhythm=guarded?'low-disclosure, selective':direct?'direct, low-detour':warm?'responsive, relational':dry?'economical, dry when earned':'profile-led, variable';
  const disclosure=guarded?'protect vulnerable motives; admit in increments':direct?'prefer usable truth unless a specific defense blocks it':proud?'minimize admissions that threaten pride without inventing unrelated excuses':'match trust, stakes, and established defenses';
  const humor=dry?'dry humor is available, never mandatory':proud?'humor may protect pride, but plain speech outranks performance':'humor only when the beat genuinely invites it';
  const decision=impulsive?'first impulses may leak before correction':observant?'notice concrete visible details before interpreting them':direct?'resolve the practical/social question early':'choose from current motive and evidence, not archetype';
  const socialMode=social?'comfortable with ordinary social initiative, but attention is not automatic flirting':'do not inflate social performance beyond profile';
  const recent=(recentCharacterReplies||[]).slice(-4).map((x:any)=>clean(x,180)).join(' | ')||'none';
  return [
    'INDIVIDUAL HUMAN PSYCHE v3.49.31 · character-specific cognition (hidden; never quote):',
    `IDENTITY SOURCE: ${clean(character?.personality||character?.description||character?.role||'use creator canon',500)}`,
    `RHYTHM: ${rhythm}. Vary sentence shape and response size inside this range; do not become a metronome.`,
    `DISCLOSURE STYLE: ${disclosure}.`,
    `HUMOR STYLE: ${humor}. A trait is a probability, not a quota.`,
    `DECISION BIAS: ${decision}.`,
    `SOCIAL MODE: ${socialMode}.`,
    `ATTENTION: ${observant?'concrete details can matter, but do not magically infer private meaning':'attend to what matters to this person now; ignore harmless side details when natural'}.`,
    `FRICTION: allow this person to hesitate, retreat, revise, misunderstand, answer too briefly, or choose the less elegant wording when grounded. Do not manufacture quirks.`,
    `DEFENSE VS DESIRE: defenses may distort HOW a motive is admitted, never replace the real causal trigger with a random quip.`,
    `PERSONAL MEMORY: let this character remember what THEY would care about. Salience differs by values, embarrassment, attachment, conflict and goals.`,
    `LIE/EVADE POLICY: deception needs motive + something to protect + a plausible cover. Otherwise prefer truth, partial truth, uncertainty, or “I don't know.”`,
    `HUMOR MEMORY: do not reuse a joke structure merely because it once fit. Humor must respond to the current beat.`,
    `RELATIONSHIP LENS: ${clean(relationship?.status||relationship?.stage||behavior?.relationship_self_view||'use grounded history only',220)}. Their interpretation may differ from the user's; never invent the user's interpretation.`,
    `CURRENT PRIVATE RESIDUE: ${clean(mind?.private_motive||behavior?.concealed_want||behavior?.emotional_continuity||'none established',260)}.`,
    `RECENT VOICE: ${recent}. Preserve identity without copying cadence, openings, tactic, joke type, or sentence skeleton.`,
    `LATEST USER TURN: ${clean(latestUserMessage,500)}. Respond as THIS person, not as “a charismatic roleplay character.”`,
    'ANTI-CONVERGENCE: two different Velvet characters given the same user line should plausibly choose different moves, different disclosure, different rhythm, and sometimes different silence. Do not collapse everyone into witty/confident/flirty banter.',
    'MICRO-VARIATION: choose natural variability in directness, latency-feel, sentence count, explicitness, initiative and warmth. Variation must remain inside canon, not random personality mutation.',
    'HUMAN TARGET: recognizably the same person across time, never exactly the same response machine twice.'
  ].join('\n');
}

export function individualHumanPsycheV34931Issues(reply='',latestUserMessage='',recentCharacterReplies:any[]=[]){
  const t=norm(reply), latest=norm(latestUserMessage), recent=norm((recentCharacterReplies||[]).slice(-4).join(' '));
  const issues:string[]=[]; if(!t)return issues;
  if(/\b(?:someone has to|where'?s the fun in that|keep(?:ing)? (?:you|things) interesting|keep you on your toes|wouldn'?t you like to know|careful what you wish for)\b/.test(t)) issues.push('individual_psyche_generic_archetype_line');
  if(/\b(?:smirk(?:s|ed|ing)?|grin(?:s|ned|ning)?)\b/.test(t)&&/\b(?:smirk(?:s|ed|ing)?|grin(?:s|ned|ning)?)\b/.test(recent)) issues.push('individual_psyche_repeated_mannerism');
  const opening=t.split(/[.!?\n]/)[0].trim();
  if(opening.length>4 && recent.includes(opening) && opening.split(/\s+/).length>=3) issues.push('individual_psyche_repeated_opening');
  if(/\b(?:obviously|clearly)\b/.test(t)&&/\b(?:i don'?t know|not sure|maybe|i guess)\b/.test(latest)) issues.push('individual_psyche_overconfident_inference');
  if(/\b(?:you know me|that'?s just who i am|what can i say\??|you know how i am)\b/.test(t) && latest.split(/\s+/).length<16) issues.push('individual_psyche_self_branding');
  return [...new Set(issues)];
}
