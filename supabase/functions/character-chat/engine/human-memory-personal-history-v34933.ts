const clean=(v:any,n=360)=>String(v??'').replace(/\s+/g,' ').trim().slice(0,n);
const norm=(v:any)=>clean(v,6000).toLowerCase().replace(/[’]/g,"'");

export function buildHumanMemoryPersonalHistoryV34933({character={},mind={},behavior={},relationship={},scene={},latestUserMessage='',recentUserMessages=[],recentCharacterReplies=[],knowledgeLedger=[],memories=[]}:any={}){
  const latest=clean(latestUserMessage,650);
  const recentU=(recentUserMessages||[]).slice(-5).map((x:any)=>clean(x,180)).join(' | ')||'none';
  const recentC=(recentCharacterReplies||[]).slice(-5).map((x:any)=>clean(x,180)).join(' | ')||'none';
  const ledger=(knowledgeLedger||[]).slice(-8).map((x:any)=>clean(typeof x==='string'?x:(x?.fact||x?.content||x?.summary||''),150)).filter(Boolean).join(' | ')||'none';
  const memory=(memories||[]).slice(-8).map((x:any)=>clean(typeof x==='string'?x:(x?.content||x?.summary||x?.text||x?.title||''),150)).filter(Boolean).join(' | ')||'none';
  return [
    'HUMAN MEMORY + PERSONAL HISTORY v3.49.33 · lived history, not transcript retrieval (hidden; never quote):',
    `PRESENT FIRST: ${latest||'none'}. Memory may color this beat, but must not hijack it.`,
    `RECENT EXCHANGE: user=${recentU} | character=${recentC}. Resolve immediate continuity before reaching backward.`,
    `MEMORY OWNERSHIP: remember only what THIS character witnessed, was told, inferred, or plausibly learned. Never borrow another character's memory or the narrator's omniscience.`,
    `EPISTEMIC MEMORY: keep fact / belief / suspicion / rumor / forgotten-or-uncertain separate. A remembered suspicion does not become truth merely because time passed.`,
    `SALIENCE: prioritize emotionally important, repeated, embarrassing, conflict-linked, promise-linked, goal-linked, relationship-changing, or recently reactivated events. Let trivial wording decay.`,
    `GIST OVER TRANSCRIPT: preserve what happened and why it mattered; do not quote old dialogue verbatim unless the exact wording was explicitly established as memorable and relevant.`,
    `PERSONAL MEANING: the same event may mean something different to this character than to the user or another NPC. Memory carries THEIR interpretation, not objective omniscience.`,
    `ASSOCIATIVE RECALL: a present cue may naturally reactivate a related event, place, person, promise, embarrassment, fear, or private hope. Do not force a callback just because a match exists.`,
    `UNSPOKEN RESIDUE: unresolved events can affect distance, warmth, caution, humor, initiative, or disclosure without being named aloud.`,
    `MEMORY INHIBITION: socially awkward, painful, private, or pride-threatening memories may be avoided even when active internally. Relevance does not require exposition.`,
    `FORGETTING: minor details can be fuzzy. If exact detail is not grounded, use uncertainty or omit it rather than fabricate precision. Core canon and explicit safety/identity facts remain stable.`,
    `RECONSOLIDATION: new evidence may update what the character BELIEVES an old event meant, but never rewrite the event itself. Distinguish “I thought…” from “what happened.”`,
    `RELATIONSHIP HISTORY: current closeness, resentment, trust, awkwardness, affection, and habits should emerge from accumulated concrete interactions, not a score performing itself.`,
    `PROMISES + DEBTS + OPEN LOOPS: remember meaningful commitments, unanswered questions, ruptures, apologies, favors, secrets, invitations, and unfinished plans when relevant. Do not manufacture them.`,
    `SHARED REFERENCES: inside jokes, nicknames, routines and callbacks require actual shared provenance. Never invent a nostalgic “remember when…” to fake intimacy.`,
    `TEMPORAL HUMILITY: do not invent “last week / years ago / every time” unless timing/frequency is grounded. Prefer “before” or no timestamp when exact time is unknown.`,
    `NO MEMORY DUMP: never summarize relationship history to prove memory works. One subtle behavioral consequence beats a paragraph of recap.`,
    `NO CALLBACK COMPULSION: old material is silent unless it changes the present decision. Dead banter stays dead.`,
    `CURRENT PRIVATE RESIDUE: ${clean(mind?.private_motive||behavior?.concealed_want||behavior?.emotional_continuity||'none established',260)}.`,
    `RELATIONSHIP LENS: ${clean(relationship?.status||relationship?.stage||'grounded history only',220)}.`,
    `SCENE: ${clean(scene?.location||'unknown',120)} / ${clean(scene?.activity||'unknown',160)}. Physical context can cue memory only plausibly.`,
    `KNOWN LEDGER EXCERPT: ${ledger}. Treat source/status boundaries as binding.`,
    `MEMORY EXCERPT: ${memory}. Use only if actually attributable and relevant; absence is not permission to invent.`,
    'HUMAN TARGET: a person shaped by history, not a database reciting it. Let memory alter choices more often than dialogue.'
  ].join('\n');
}

export function humanMemoryPersonalHistoryV34933Issues(reply='',latestUserMessage='',recentCharacterReplies:any[]=[]){
  const t=norm(reply), latest=norm(latestUserMessage), recent=norm((recentCharacterReplies||[]).slice(-5).join(' '));
  const issues:string[]=[]; if(!t)return issues;
  if(/\bremember when\b/.test(t) && !/\bremember when\b/.test(latest) && recent.length<40) issues.push('human_memory_fake_shared_nostalgia');
  if(/\b(?:like you always do|you always do this|every single time|like always|as usual)\b/.test(t) && !/\b(?:always|every time|as usual)\b/.test(latest+recent)) issues.push('human_memory_unsupported_frequency');
  if(/\b(?:last week|last month|last year|two years ago|three years ago|for years|since freshman year|since high school)\b/.test(t) && !/\b(?:last week|last month|last year|years ago|for years|freshman|high school)\b/.test(latest+recent)) issues.push('human_memory_invented_timestamp');
  if(/\b(?:you said|you told me|you promised|we agreed|you swore)\b/.test(t) && recent.length<20 && !/\b(?:said|told|promised|agreed|swore)\b/.test(latest)) issues.push('human_memory_unsupported_commitment');
  if(/\b(?:i remember every word|word for word|exactly what you said)\b/.test(t) && !/\b(?:remember|exactly|word for word)\b/.test(latest)) issues.push('human_memory_transcript_perfection');
  if((t.match(/\bremember\b/g)||[]).length>=2 || (t.match(/\b(?:back then|that time|before|used to)\b/g)||[]).length>=3) issues.push('human_memory_recap_dump');
  if(/\b(?:i knew you were|i always knew you were|i knew all along)\b/.test(t) && !/\b(?:you told me|you said|i saw|i heard)\b/.test(t)) issues.push('human_memory_hindsight_omniscience');
  return [...new Set(issues)];
}
