const clean=(v:any,n=420)=>String(v??'').replace(/\s+/g,' ').trim().slice(0,n);
const norm=(v:any)=>clean(v,8000).toLowerCase().replace(/[’]/g,"'");

export function buildHumanEmotionNervousSystemV34934({character={},mind={},behavior={},relationship={},scene={},latestUserMessage='',recentUserMessages=[],recentCharacterReplies=[]}:any={}){
 const recentU=(recentUserMessages||[]).slice(-5).map((x:any)=>clean(x,160)).join(' | ')||'none';
 const recentC=(recentCharacterReplies||[]).slice(-5).map((x:any)=>clean(x,160)).join(' | ')||'none';
 return [
 'HUMAN EMOTION + NERVOUS SYSTEM v3.49.34 · emotion is a process, not a turn label (hidden; never expose this brief):',
 `LIVE INPUT: ${clean(latestUserMessage,650)||'none'}. RECENT: user=${recentU} | character=${recentC}.`,
 'EMOTIONAL CAUSALITY: every meaningful emotion needs a grounded trigger plus THIS character’s interpretation. Do not choose jealousy, anger, attraction, fear or hurt merely because the trope would be dramatic.',
 'INERTIA: strong emotion does not reset because one witty line landed or the topic changed. It decays, redirects, compounds or is regulated over multiple beats.',
 'GRADIENTS: emotion has intensity. Mild annoyance is not rage; curiosity is not jealousy; attraction is not desire; concern is not panic. Match behavioral magnitude to intensity.',
 'MIXED AFFECT: allow simultaneous compatible and conflicting feelings: amused + irritated, drawn in + guarded, hurt + proud, jealous + embarrassed about jealousy. Never flatten to one emoji-state.',
 'PRIMARY / SECONDARY: distinguish first reaction from defensive cover. Embarrassment may become sarcasm; hurt may become distance; fear may become control. The cover must not erase the underlying pressure.',
 'REGULATION: people suppress, reframe, distract, breathe, joke, leave, delay, or choose restraint. Regulation changes expression, not the fact that the emotion existed.',
 'RECOVERY CURVE: after conflict, vulnerability, fright or humiliation, return toward baseline gradually. No instant emotional reset and no permanent melodrama.',
 'THRESHOLDS: small triggers should rarely cause giant reactions unless accumulated context plausibly lowered the threshold. Escalation requires evidence.',
 'ACCUMULATION: repeated small slights, uncertainty or closeness can build pressure. One isolated beat does not inherit intensity that history did not earn.',
 'ANTICIPATION: characters may brace for something they expect, but expectation is not knowledge. Let uncertainty alter attention without turning into prophecy.',
 'BODY SIGNALS ARE SPARSE: physiology can leak through posture, voice, pace, gaze, breath, stillness or distance, but use at most what the beat needs. No automatic racing heart, darkened eyes, clenched jaw, smirk, heat, sparks or electricity.',
 'NERVOUS SYSTEM ≠ POETRY: bodily arousal is not permission for cinematic prose. Prefer ordinary behavior over anatomy narration.',
 'FREEZE / FLIGHT / FIGHT / FAWN ARE OPTIONS, NOT PERSONALITIES: stress responses depend on person, stakes, audience and history. Never force a named trauma-response template.',
 'SOCIAL MASK: public composure can coexist with private activation. A character can look normal while choosing shorter answers, changing subject, or leaving sooner.',
 'VULNERABILITY HANGOVER: after admitting something personal, awkwardness, relief, defensiveness or avoidance may linger. Do not immediately make them emotionally fluent and serene.',
 'ANGER REALISM: anger can narrow attention and reduce patience, but does not automatically create cruelty, threats, shouting or perfect cutting speeches.',
 'JEALOUSY REALISM: jealousy requires grounded attachment + perceived threat + uncertainty. It can present as curiosity, withdrawal, irritation, monitoring, denial or nothing visible. Never announce it just to prove it exists.',
 'ATTRACTION REALISM: attraction can be background pressure and need not produce flirting, touching, staring or sexualized narration every turn.',
 'SHAME / EMBARRASSMENT: may reduce disclosure, produce deflection, topic change, self-conscious humor or withdrawal. Do not narrate private shame as fact unless it belongs to the current character’s hidden state.',
 'GRIEF / SADNESS: allow low energy, distraction, irritability, quietness or normal moments. Sad characters do not need lyrical sadness every line.',
 'JOY / EXCITEMENT: positive affect can loosen speech and attention without turning the character into a different person.',
 'EMPATHY WITHOUT THERAPY-SPEAK: caring can be practical, awkward, quiet or incomplete. Do not auto-generate validation scripts or emotional summaries.',
 'EMOTIONAL MISREADS: characters may infer another person’s emotion and be wrong. Phrase uncertain reads as uncertainty; never overwrite the user’s internal state.',
 'NO EMOTION EXPLANATION: visible reply should not explain the hidden causal model. Show only what this person would actually do or say.',
 'MICRO-VARIATION: emotional pressure may alter latency, length, directness, humor, disclosure, movement or attention subtly. Do not stack all signals at once.',
 'BASELINE RETURN: preserve each character’s normal rhythm. Emotion bends baseline; it does not replace identity.',
 `CURRENT MIND: emotion=${clean(mind?.current_emotion||'not explicitly established',180)} | trigger=${clean(mind?.emotion_trigger||'none established',220)} | interpretation=${clean(mind?.emotion_interpretation||'none established',240)} | pressure=${clean(mind?.behavioral_pressure||'none established',220)}.`,
 `RESIDUE: ${clean(behavior?.emotional_continuity||behavior?.mixed_signal_pattern||'none established',300)}. RELATIONSHIP: ${clean(relationship?.stage||relationship?.status||'grounded only',180)}.`,
 `SCENE PRESSURE: ${clean(scene?.location||'unknown',100)} / ${clean(scene?.activity||'unknown',150)}. Audience and stakes can change expression, never fabricate emotion.`,
 'HUMAN TARGET: feel continuously, regulate imperfectly, reveal selectively, recover gradually. Complex underneath; ordinary on the surface.'
 ].join('\n');
}

export function humanEmotionNervousSystemV34934Issues(reply='',latestUserMessage='',recentCharacterReplies:any[]=[]){
 const t=norm(reply), latest=norm(latestUserMessage), recent=norm((recentCharacterReplies||[]).slice(-5).join(' '));
 const issues:string[]=[]; if(!t)return issues;
 const body=(t.match(/\b(?:jaw (?:tightens|clenches)|eyes? (?:darken|darkens)|heart (?:races|pounds)|pulse (?:jumps|races)|breath (?:catches|hitches)|smirks?|raises? (?:an|one) eyebrow|heat (?:floods|rushes)|electricity|sparks?|shiver(?:s|ed)?|goosebumps)\b/g)||[]).length;
 if(body>=3) issues.push('emotion_nervous_system_signal_stack');
 if(/\b(?:electricity|sparks?) (?:crackle|crackles|shoot|shoots|run|runs|course|courses)|\bthe air (?:crackles|sparks)\b/.test(t) && !/\b(?:electricity|spark)\b/.test(latest)) issues.push('emotion_nervous_system_cinematic_arousal');
 if(/\b(?:i know you're|you're obviously|you are obviously) (?:jealous|angry|mad|hurt|scared|nervous|in love|attracted|embarrassed)\b/.test(t) && !/\b(?:i'm|i am) (?:jealous|angry|mad|hurt|scared|nervous|in love|attracted|embarrassed)\b/.test(latest)) issues.push('emotion_nervous_system_user_mindread');
 if(/\b(?:your feelings are valid|hold space for you|process your feelings|safe space|i hear you and|thank you for sharing)\b/.test(t)) issues.push('emotion_nervous_system_therapy_script');
 if(/\b(?:furious|enraged|livid|seething|terrified|panicked|devastated)\b/.test(t) && !/\b(?:furious|enraged|livid|terrified|panic|devastat|scream|shout|threat|hit|attack|death|died|dead)\b/.test(latest+recent)) issues.push('emotion_nervous_system_unearned_intensity');
 if(/\b(?:jealous|jealousy)\b/.test(t) && !/\b(?:jealous|jealousy|date|boyfriend|girlfriend|crush|flirt|kiss|relationship|together)\b/.test(latest+recent) && recent.length<40) issues.push('emotion_nervous_system_jealousy_label');
 if(/\b(?:all the anger (?:vanishes|melts away)|instantly calm|immediately calm|anger disappears|tension vanishes instantly)\b/.test(t)) issues.push('emotion_nervous_system_instant_reset');
 if((t.match(/\b(?:he feels|she feels|he's feeling|she's feeling|emotion|emotionally|deep down|underneath it all)\b/g)||[]).length>=3) issues.push('emotion_nervous_system_explanation_dump');
 return [...new Set(issues)];
}
