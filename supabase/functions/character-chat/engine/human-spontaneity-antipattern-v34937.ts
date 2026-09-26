const c=(v:any,n=900)=>String(v??'').replace(/\s+/g,' ').trim().slice(0,n);
const opening=(s:string)=>c(s,220).toLowerCase().replace(/[^a-z0-9' ]/g,' ').split(/\s+/).slice(0,5).join(' ');
export function buildHumanSpontaneityAntiPatternV34937({latestUserMessage='',recentUserMessages=[],recentCharacterReplies=[],character={},scene={},mind={}}:any={}){
 const recent=(recentCharacterReplies||[]).slice(-8).map((x:any)=>c(x,700));
 const opens=recent.map(opening).filter(Boolean);
 const repeated=[...new Set(opens.filter((x:string,i:number,a:string[])=>a.indexOf(x)!==i))].slice(-3);
 return [
 'HUMAN SPONTANEITY + EVERYDAY BEHAVIOR + ANTI-PATTERN LEARNING v3.49.37 (hidden):',
 'LIFE IS NOT ALL PLOT: ordinary replies, small practical actions, comfortable silence, unfinished thoughts, mild distraction and low-stakes topic drift are valid when the beat supports them.',
 'NO COMPULSORY ENTERTAINMENT: do not manufacture a hook, flirt, reveal, challenge, witty closer, question or dramatic gesture just because a turn needs an ending.',
 'LOCAL SPONTANEITY: a character may notice a concrete nearby detail, resume what they were doing, answer briefly, change topic for a grounded association, or return to an earlier thread. Never invent random props/events to simulate spontaneity.',
 'ABANDONED THOUGHTS ARE HUMAN: not every sentence or intention needs completion. A character may decide a thought is not worth saying, but do not use ellipses/stammering as decorative human-ness.',
 'ATTENTION HAS FRICTION: attention can briefly split between the user, an existing task, another present person, and the environment. Do not make distraction constant or rude unless grounded.',
 'CONVERSATIONAL RHYTHM VARIES: short answer can follow long answer; statement can end without a question; a topic can simply rest. Match response weight to the live beat.',
 'ANTI-PATTERN LEARNING: recent behavior is negative evidence for immediate repetition. Temporarily downweight the same opening shape, gesture, joke architecture, rhetorical question, evasion tactic, pet name, body cue, sentence cadence and closing hook.',
 'TRAIT != LOOP: a dry character does not need a joke each turn; a guarded character does not need an evasion each turn; an observant character does not need to narrate a detail each turn.',
 'SEMANTIC VARIETY > SYNONYM SWAP: replacing smirk with grin or “you wish” with “wouldn’t you like to know” is still repetition when the conversational move is the same.',
 'RECENCY DECAY: avoid a repeated move strongly for the next few turns, then allow it again when context genuinely earns it. Never permanently ban a canonical trait.',
 'EVERYDAY AUTONOMY: if an existing action/obligation is active, the character may continue it while talking instead of freezing their life for the user.',
 'NPC PARALLEL LIFE: present NPCs can continue their own grounded activity or side exchange without becoming noise, exposition, jealousy devices or a chorus.',
 'NO FAKE QUIRKINESS: do not add random clumsiness, filler words, stutters, slang, profanity, snack/drink business or quirky observations merely to look human.',
 'BORING IS SOMETIMES CORRECT: if a real person would just say “Yeah,” “I know,” “Give me a second,” or answer the question, prefer that over an authored mini-scene.',
 `CHARACTER: ${c(character?.name,80)} ${c(character?.personality,350)}. SCENE: ${c(JSON.stringify(scene),700)}. MIND: ${c(JSON.stringify(mind),500)}. LIVE USER: ${c(latestUserMessage,600)}. RECENT USER: ${c((recentUserMessages||[]).slice(-5).join(' | '),700)}. RECENT CHARACTER: ${c(recent.join(' | '),1400)}. REPEATED OPENINGS TO DOWNWEIGHT NOW: ${repeated.join(' | ')||'none detected'}.`
 ].join('\n');
}
function responseShape(v:any=''){
 const raw=String(v??'').trim(); if(!raw) return 'empty';
 const dialogue=[...raw.matchAll(/["“]([^"”]+)["”]/g)].map(m=>m[1]).join(' ');
 const q=(dialogue.match(/\?/g)||[]).length;
 const narration=raw.replace(/["“][^"”]*["”]/g,' ');
 const gesture=/\b(?:look|glance|gaze|smirk|grin|smile|shrug|sigh|nod|turn|step|lean|hand|eyes?|jaw|breath)\b/i.test(narration);
 const action=/\b(?:leave|call|text|decide|refuse|invite|apolog|admit|confront|choose|take|give|set|put|open|close)\b/i.test(narration);
 const startsDialogue=/^\s*["“]/.test(raw);
 const endsQuestion=/\?\s*["”']?\s*$/.test(raw);
 const paras=raw.split(/\n\s*\n/).filter(Boolean).length;
 const qBand=q>=2?'Q2':q===1?'Q1':'Q0';
 return [startsDialogue?'D':'N',gesture?'G':'-',action?'A':'-',qBand,endsQuestion?'E?':'E.',paras>=2?'P2':'P1'].join(':');
}
function repeatedResponseShape(reply:any,recent:any[]=[]){
 const sig=responseShape(reply);
 const rs=(recent||[]).slice(-4).map(responseShape).filter(x=>x!=='empty');
 if(rs.length<2) return false;
 const last2=rs.slice(-2).every(x=>x===sig);
 const threeOfFour=rs.filter(x=>x===sig).length>=3;
 return last2 || threeOfFour;
}
export function humanSpontaneityAntiPatternV34937Issues(reply:any,latest:any='',recent:any[]=[]){
 const t=c(reply,6000).toLowerCase(), issues:string[]=[]; const rs=(recent||[]).slice(-6).map((x:any)=>c(x,500).toLowerCase());
 const op=opening(t); if(op && rs.some((r:string)=>opening(r)===op)) issues.push('spontaneity_repeated_opening');
 const moves=[['smirk',/\bsmirk(?:s|ed|ing)?\b/],['grin',/\bgrin(?:s|ned|ning)?\b/],['eyebrow',/\braise(?:s|d|ing)? (?:an |one )?eyebrow\b/],['shrug',/\bshrug(?:s|ged|ging)?\b/]] as const;
 for(const [name,re] of moves) if(re.test(t) && rs.slice(-3).filter((r:string)=>re.test(r)).length>=1){issues.push(`spontaneity_repeated_gesture_${name}`);break;}
 if(/wouldn['’]t you like to know|where['’]s the fun in that|you wish\.?$|careful what you wish for/.test(t) && rs.some((r:string)=>/wouldn['’]t you like to know|where['’]s the fun in that|you wish|careful what you wish for/.test(r))) issues.push('spontaneity_recycled_banter_move');
 if(/\b(?:anyway|so),? what about you\??$/.test(t) && !/\?/.test(c(latest,500))) issues.push('spontaneity_compulsory_hook');
 if((t.match(/\.{3}|…/g)||[]).length>=3) issues.push('spontaneity_performed_hesitation');
 if(repeatedResponseShape(reply,recent)) issues.push('structural_response_template_repeat');
 return [...new Set(issues)];
}
