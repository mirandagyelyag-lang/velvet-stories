const norm=(v:any)=>String(v??'').replace(/[’]/g,"'").replace(/\s+/g,' ').trim().toLowerCase();
const spoken=(v:any)=>{const s=String(v??''); const q=[...s.matchAll(/["“]([^"”]+)["”]/g)].map(m=>m[1]); return norm(q.length?q.join(' '):s)};
export function buildNaturalDialogueResetV34940({latestUserMessage='',recentCharacterReplies=[],character={}}:any={}){
 return [
 'NATURAL DIALOGUE RESET v3.49.40 · ANTI-AUTHORED-BANTER (highest-priority style gate):',
 'STOP WRITING A CHARACTER PERFORMANCE. Write what this person would actually say in this exact second.',
 'PLAIN FIRST: if an ordinary direct sentence works, use it. Cleverness, swagger, sarcasm and literary polish are optional and usually unnecessary.',
 'NO PRESTIGE-TV BANTER: reject aphorisms, mock diagnoses, cute labels, quotable zingers, challenge-lines, “I’ll give you that”, “you know that?”, and dialogue written to sound impressive.',
 'NO AUTHOR NARRATION: never explain that an expression is practiced, unbothered, guarded, unreadable, controlled, a mask, or that silence is deliberately allowed to hang. Show only a concrete action when one is needed.',
 'NO CHOREOGRAPHED COOLNESS: slow breaths, leaning back, casual steps closer, entering personal space, eyebrow/smirk/grin choreography and “easy/unbothered” posture are not default personality signals.',
 'NO USER-AS-TYPE: do not call the user relentless, persistent, trouble, dangerous, impossible, fragile, stubborn, etc. merely to create chemistry or banter.',
 'NO CALLBACK FOR CALLBACK SAKE: old joke words and motifs are NOT continuity. “constitution”, “perimeter”, “survivors”, “pulse”, etc. may not recur unless the current literal topic requires them.',
 'DIALOGUE SHOULD SURVIVE THE TEXT-MESSAGE TEST: remove narration and ask whether a real person could casually send/say the line without sounding scripted. If not, rewrite simpler.',
 'ONE BEAT MAX: default to one conversational move. Do not stack observation + attitude + body move + witty line + hook.',
 'PERSONALITY THROUGH CHOICE: personality decides what they answer, omit, admit or avoid. It does not require decorative attitude markers.',
 `CHARACTER: ${String(character?.name||'').slice(0,80)}. LIVE USER: ${String(latestUserMessage||'').slice(0,700)}. RECENT CHARACTER: ${(recentCharacterReplies||[]).slice(-6).join(' | ').slice(0,1500)}.`
 ].join('\n');
}
export function naturalDialogueResetV34940Issues(reply:any,latest:any='',recent:any[]=[]){
 const t=norm(reply), s=spoken(reply), issues:string[]=[];
 if(!t) return issues;
 if(/\bfragile constitution\b|\bperimeter check\b|\bchecking for (?:survivors?|pulse|a pulse)\b/.test(s)) issues.push('natural_dialogue_dead_callback');
 if(/\byou(?:'re| are) (?:relentless|persistent),?\b|\bi(?:'ll| will) give you that\b|\bmost people would have\b|\byou know that\??$/.test(s)) issues.push('natural_dialogue_authored_banter');
 if(/\b(?:practiced|carefully maintained|well-practiced)\b.{0,45}\b(?:mask|expression|look|facade)\b|\b(?:unbothered|unreadable|guarded) mask\b/.test(t)) issues.push('natural_dialogue_author_interpretation');
 if(/\blet(?:ting|s)? (?:the )?silence hang\b|\brather than rushing to fill (?:it|the silence)\b/.test(t)) issues.push('natural_dialogue_meta_silence');
 if(/\b(?:takes?|took) (?:a )?(?:slow|measured) breath\b|\blean(?:s|ed|ing)? back slightly\b/.test(t)) issues.push('natural_dialogue_choreographed_coolness');
 if(/\b(?:takes?|took) (?:a )?(?:casual )?step closer\b|\b(?:lean(?:s|ed|ing)?|step(?:s|ped|ping)?)\b.{0,35}\bpersonal space\b/.test(t)) issues.push('natural_dialogue_unearned_proximity');
 const recentText=(recent||[]).slice(-5).map(norm).join(' ');
 for(const motif of ['constitution','perimeter','survivors','pulse']) if(s.includes(motif)&&recentText.includes(motif)&&!norm(latest).includes(motif)){issues.push('natural_dialogue_callback_loop');break;}
 return [...new Set(issues)];
}
