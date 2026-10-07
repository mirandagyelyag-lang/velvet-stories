const norm=(v:any)=>String(v??'').replace(/[’]/g,"'").replace(/[“”]/g,'"').replace(/\s+/g,' ').trim().toLowerCase();
const spoken=(v:any)=>{const raw=String(v??''); const q=[...raw.matchAll(/["“]([^"”]+)["”]/g)].map(m=>m[1]); return norm(q.length?q.join(' '):raw)};
const narrative=(v:any)=>norm(String(v??'').replace(/["“][^"”]+["”]/g,' '));

export function buildPlainSpeechFirstV34941({latestUserMessage='',recentCharacterReplies=[],character={}}:any={}){
 return [
  'PLAIN SPEECH FIRST v3.49.41 · GENERATION ARCHITECTURE (OVERRIDES STYLE PERFORMANCE):',
  'Do the following privately before writing the visible reply. Never expose these stages.',
  'STAGE 1 — SEMANTIC NAKED ANSWER: decide the literal human job of this turn in plain factual language. Example: “He came over because he wanted a drink.” No personality, banter, metaphor, attitude or prose.',
  'STAGE 2 — DISCLOSURE: decide what this specific character would actually admit, omit, soften or leave unsaid. Defense may reduce disclosure; it may NOT replace the real cause with a clever fake reason.',
  'STAGE 3 — SPEAK: convert only that disclosed meaning into the shortest natural line this person would say. Personality may alter rhythm/word choice lightly. It may never add a punchline merely to prove personality.',
  'DEFAULT VISIBLE FORM = DIALOGUE ONLY. Begin from ZERO physical movement. Add narration only when a concrete action changes scene state, fulfills an action, or is necessary to understand the reply.',
  'ZERO-MOVEMENT RULE: gaze, nod, breath, lean, shrug, smirk, grin, eyebrow, jaw, posture, stepping closer, silence choreography and “unbothered/dry/indifferent” performance are NOT free decoration.',
  'ANTI-QUIP RULE: do not turn a simple answer into two clipped pseudo-clever fragments, an either/or flourish, a “take your pick” closer, a dismissive filing metaphor, a smug generalization about people, or a sentence whose main purpose is sounding quotable.',
  'CAUSAL FIDELITY: when the user asks why/what/who/how, preserve the real causal answer. A sarcastic character can answer tersely; sarcasm cannot substitute for information.',
  'DELETE THE WRITER: no “dry slide of his gaze”, “slow unbothered nod”, “practiced mask”, “casual indifference”, or narration that labels how cool/guarded the character appears.',
  'ORDINARY IS A SUCCESS STATE. “Wanted a drink.” / “I don’t know.” / “Because I felt like it.” / “No.” can be better characterization than a polished line.',
  'FINAL PRIVATE CHECK: if the reply sounds written to make the character look cool, witty, dangerous, detached, flirty or quotable, strip it back one more time.',
  `CHARACTER: ${String(character?.name||'').slice(0,80)}. LIVE USER: ${String(latestUserMessage||'').slice(0,700)}. RECENT: ${(recentCharacterReplies||[]).slice(-5).join(' | ').slice(0,1200)}.`
 ].join('\n');
}

export function plainSpeechFirstV34941Issues(reply:any, latest:any='', recent:any[]=[]){
 const t=norm(reply), s=spoken(reply), n=narrative(reply), issues:string[]=[];
 if(!t) return issues;
 // Production failures from the user's real test session.
 if(/self-preservation\.?\s*(?:or|\/).*survival instinct|survival instinct\.?\s*take your pick|take your pick\.?$/.test(s)) issues.push('plain_speech_performed_pseudo_choice');
 if(/file it under\b|unsolicited advice\b.{0,45}\bsomeone cares\b/.test(s)) issues.push('plain_speech_writerly_dismissal');
 if(/\bsee\?\s*people (?:manage|do|get|cope)\b|\bpeople manage just fine without\b/.test(s)) issues.push('plain_speech_smug_generalization');
 if(/\bslow,? unbothered (?:nod|look|glance|gaze)\b|\bdry,? (?:indifferent|unbothered) (?:slide|sweep) of (?:his|her|their) gaze\b|\b(?:dry|indifferent) slide of (?:his|her|their) gaze\b/.test(n)) issues.push('plain_speech_performed_narration');
 // Structural forms, not just exact phrases.
 if(/\b(?:self-preservation|survival instinct|professional curiosity|occupational hazard)\b/.test(s) && /\b(?:take your pick|call it|pick one|your choice)\b/.test(s)) issues.push('plain_speech_performed_pseudo_choice');
 if(/\bfile (?:it|that) under\b|\badd (?:it|that) to the list\b/.test(s)) issues.push('plain_speech_writerly_dismissal');
 if(/\b(?:everyone|people|most people)\b.{0,70}\b(?:just fine|without instructions|figure it out|manage)\b/.test(s) && !norm(latest).match(/everyone|people|most people/)) issues.push('plain_speech_smug_generalization');
 if(/\b(?:slow|lazy|unbothered|indifferent|casual|dry)\b.{0,35}\b(?:nod|gaze|glance|look|shrug|breath|posture)\b/.test(n)) issues.push('plain_speech_performed_narration');
 // v3.54.23: Reject narrated emotional choreography that explains a simple
 // conversational shift instead of letting the line carry it.
 if(/\b(?:voice|tone)\b.{0,45}\b(?:dropp(?:ing|ed)|soften(?:ing|ed)|settl(?:ing|ed)|slid(?:ing)?|shifting?)\b.{0,55}\b(?:quiet|conversational|low|measured|easy|rhythm|cadence)\b/.test(n)) issues.push('plain_speech_performed_narration');
 if(/\b(?:shoulders?|posture|stance|expression|features?)\b.{0,55}\b(?:los(?:ing|t)|dropp(?:ing|ed)|soften(?:ing|ed)|slipp(?:ing|ed)|relax(?:ing|ed)|eas(?:ing|ed))\b.{0,55}\b(?:defensive|rigid|guarded|tension|weight|set|composure)\b/.test(n)) issues.push('plain_speech_performed_narration');
 if(/\b(?:defensive|guarded|confident|careful|quiet|conversational)\b.{0,35}\b(?:rhythm|cadence|posture|weight|set|composure)\b/.test(n)) issues.push('plain_speech_performed_narration');
 // A compact aphoristic two-fragment construction is suspicious when capped by a flourish.
 const clauses=s.split(/[.!?]+/).map(x=>x.trim()).filter(Boolean);
 if(clauses.length>=2 && clauses.length<=3 && s.split(/\s+/).length<=18 && /\b(?:take your pick|your choice|obviously|apparently|simple as that)\b/.test(s)) issues.push('plain_speech_quotable_construction');
 // Recent repetition of detached/cool framing is a structural loop.
 const r=(recent||[]).slice(-5).map(norm).join(' ');
 if(/\b(?:unbothered|indifferent|dry)\b/.test(n) && /\b(?:unbothered|indifferent|dry)\b/.test(r)) issues.push('plain_speech_detachment_performance_loop');
 return [...new Set(issues)];
}
