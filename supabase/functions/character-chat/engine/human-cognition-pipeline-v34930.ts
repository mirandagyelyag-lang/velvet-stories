const clean = (v:any, n=280) => String(v ?? '').replace(/\s+/g,' ').trim().slice(0,n);
const norm = (v:any) => clean(v,4000).toLowerCase().replace(/[’]/g,"'");

export function buildHumanCognitionBriefV34930({ latestUserMessage='', recentUserMessages=[], recentCharacterReplies=[], character={}, mind={}, behavior={}, scene={}, relationship={} }:any={}) {
  const latest=clean(latestUserMessage,700);
  const prior=clean((recentCharacterReplies||[]).at(-1),420);
  const previousUser=clean((recentUserMessages||[]).at(-2),320);
  const directQuestion=/\b(?:why|what|who|where|when|how|did|do|are|were|is|was|can|could|would|will)\b[^.!]*\??$/i.test(latest);
  const topicShift=/\b(?:anyway|anyways|moving on|whatever,? so|back to|so,? why|so,? what)\b/i.test(latest);
  const uncertainty=/\b(?:maybe|i guess|i think|not sure|don't know|dont know|probably|apparently)\b/i.test(latest);
  const shortTurn=latest.split(/\s+/).filter(Boolean).length <= 12;
  return [
    'HUMAN COGNITION PIPELINE v3.49.30 · deterministic pre-speech brief (NOT visible prose):',
    `PERCEIVE: latest visible turn = ${latest || 'none'}`,
    `INTERPRET: ${directQuestion?'direct question deserves semantic resolution; ':''}${topicShift?'explicit topic shift; retire prior banter unless causally needed; ':''}${uncertainty?'user expressed uncertainty; do not upgrade it to fact; ':''}${shortTurn?'small turn; small answer is allowed.':'match response weight to the beat.'}`,
    `PRIVATE STATE: carry only grounded character-side residue. motive=${clean(mind?.private_motive || mind?.private_intention || behavior?.concealed_want || behavior?.immediate_want || 'unknown',220)}; residue=${clean(behavior?.emotional_continuity || mind?.emotional_causality || 'unknown',220)}; inhibition=${clean(behavior?.resistance || behavior?.admission_stage || 'unknown',180)}.`,
    `BELIEF STATUS: distinguish known/suspected/unknown. Never treat the user's private state as known. relationship=${clean(relationship?.status || relationship?.stage || 'use canon only',160)}.`,
    `DECIDE BEFORE SPEAKING: choose ONE primary move: answer / partial-answer / clarify / acknowledge / resist / ask / continue-action / meaningful-silence. Do not choose “perform personality.”`,
    `DISCLOSURE: reveal no more than this character would plausibly admit now; concealed motives may shape wording without being confessed.`,
    `MOMENTUM: previous user=${previousUser||'none'} | previous character=${prior||'none'}. Do not resurrect dead wording just because it is available.`,
    `WORLD/BODY: location=${clean(scene?.location || 'unknown',120)}; activity=${clean(scene?.activity || 'unknown',160)}. Preserve position, possessions, medium, and who can perceive what.`,
    `SPEAK: ordinary, character-specific, imperfect when natural. Complexity stays underneath; visible language may be simple.`,
    `HUMANITY CHECK: could a real person say this spontaneously here, or does it sound written to entertain an audience? If the latter, simplify.`
  ].join('\n');
}

export function humanCognitionV34930Issues(reply='', latestUserMessage='', recentCharacterReplies:any[]=[]){
  const t=norm(reply), latest=norm(latestUserMessage);
  const issues:string[]=[];
  if(!t) return issues;
  const words=t.split(/\s+/).filter(Boolean);
  const stockGesture=(t.match(/\b(?:smirk(?:s|ed|ing)?|jaw (?:tightens?|clenches?|ticks?)|raises? (?:an |one )?eyebrow|eyes? darken|leans? (?:closer|in)|breath catches|fingers? (?:curl|tighten)|gaze (?:darkens?|drops?|lingers?))\b/g)||[]).length;
  if(stockGesture>=2) issues.push('human_cognition_stock_body_language');
  if(/\b(?:electricity|electric|spark(?:s|ed)? between|tension crackl|air (?:shifts|changes)|charged air|magnetic pull)\b/.test(t) && !/\b(?:kiss|date|flirt|attract|crush|love|romantic|sexual)\b/.test(latest)) issues.push('human_cognition_auto_flirtification');
  if(words.length>85 && latest.split(/\s+/).filter(Boolean).length<14) issues.push('human_cognition_response_weight');
  if(/\b(?:and what about you|how about you|what do you think|right\?|don't you think\?|wouldn't you agree\?)\s*$/.test(t) && !latest.includes('?')) issues.push('human_cognition_compulsory_hook');
  if(/\b(?:i know you(?:'re| are)|you clearly|you obviously|deep down you|i can tell you(?:'re| are))\b/.test(t) && !/\b(?:you said|you told|you just said)\b/.test(t)) issues.push('human_cognition_mindread');
  const recent=norm((recentCharacterReplies||[]).slice(-3).join(' '));
  const maneuvers=[['curious',/\b(?:curious|wanted to see|wanted to know|wondered)\b/],['deflect',/\b(?:does it matter|do i need a reason|why do you care)\b/],['quip',/\b(?:someone has to|where's the fun|careful what you wish|keep you on your toes)\b/]] as const;
  for(const [,p] of maneuvers){ if(p.test(t) && (recent.match(p)||[]).length>=2) issues.push('human_cognition_semantic_repetition'); }
  return [...new Set(issues)];
}
