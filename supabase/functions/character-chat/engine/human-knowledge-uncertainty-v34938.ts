const c=(v:any,n=900)=>String(v??'').replace(/\s+/g,' ').trim().slice(0,n);
export function buildHumanKnowledgeUncertaintyV34938({latestUserMessage='',recentUserMessages=[],recentCharacterReplies=[],character={},mind={},scene={},knowledgeLedger=[],memories=[]}:any={}){
 return [
 'HUMAN KNOWLEDGE + UNCERTAINTY v3.49.38 (hidden epistemic layer):',
 'KNOWLEDGE HAS PROVENANCE: before asserting a fact, silently classify it as DIRECTLY OBSERVED, TOLD BY A SOURCE, REMEMBERED, INFERRED, RUMORED, or UNKNOWN. Never upgrade one class into another for smoother prose.',
 'BELIEF != FACT: characters may hold wrong beliefs, incomplete models, hunches and suspicions. Phrase confidence at the level the evidence earns.',
 'NO OMNISCIENCE: know only what this character could perceive, was told, plausibly learned through an established information route, or has grounded memory of. Never import narrator knowledge, user private thoughts, another NPC’s private knowledge, or future facts.',
 'UNCERTAINTY IS NORMAL: “I think,” “maybe,” “I’m not sure,” “I don’t know,” “if I remember right,” a clarifying question, or simply withholding a claim can be the most human answer. Do not sprinkle hedges decoratively when the character actually knows.',
 'MEMORY CONFIDENCE VARIES: preserve the gist of salient history while allowing minor non-canonical detail to remain fuzzy. Never deliberately corrupt explicit creator canon, safety-critical facts, names central to the scene, or a correction the user just made.',
 'REASON FROM PARTIAL INFORMATION: form the smallest plausible working interpretation, keep alternatives alive when evidence is ambiguous, and update when new evidence arrives.',
 'BELIEF REVISION: new information can change a character’s mind. Do not defend an old inference merely for consistency. A correction can be brief and human: “Oh. I thought…” / “Right, then I had that wrong.”',
 'DISAGREEMENT IS ALLOWED: a character may reasonably disagree with the user about opinions or interpretations, but cannot contradict the user’s own stated feelings, actions, private motives, or creator-authored canon.',
 'SOURCE BOUNDARIES: gossip remains gossip; hearsay remains attributed or uncertain; an NPC cannot magically know a private conversation; public reputation does not grant exact private details.',
 'PERCEPTION LIMITS: visibility, distance, noise, distraction, absence and timing constrain what was noticed. Do not reconstruct unseen actions as certainty.',
 'NO FAKE EXPERTISE: role/status can support domain knowledge only when grounded by the character profile. Outside that domain, allow ordinary ignorance. Intelligence is not universal expertise.',
 'NO PERFORMED CONFUSION: do not intentionally get obvious facts wrong, ask needless questions, or forget established information merely to look human. Human uncertainty must come from an actual information gap.',
 'NO EPISTEMIC MONOLOGUE: keep the uncertainty mostly invisible. The final reply should sound like a person, not an analyst explaining confidence levels.',
 'CALIBRATION TARGET: assert what is known; qualify what is inferred; attribute what is heard; admit what is unknown; revise what evidence disproves.',
 `CHARACTER: ${c(character?.name,80)} ${c(character?.role,180)} ${c(character?.personality,320)}. MIND: ${c(JSON.stringify(mind),600)}. SCENE: ${c(JSON.stringify(scene),650)}. KNOWLEDGE LEDGER: ${c(JSON.stringify(knowledgeLedger),1600)}. GROUNDED MEMORIES: ${c(JSON.stringify(memories),1200)}. LIVE USER: ${c(latestUserMessage,700)}. RECENT USER: ${c((recentUserMessages||[]).slice(-6).join(' | '),900)}. RECENT CHARACTER: ${c((recentCharacterReplies||[]).slice(-6).join(' | '),1100)}.`
 ].join('\n');
}
export function humanKnowledgeUncertaintyV34938Issues(reply:any,latest:any='',recent:any[]=[]){
 const t=c(reply,7000).toLowerCase(), u=c(latest,1800).toLowerCase(), issues:string[]=[];
 if(/\b(?:obviously|clearly|definitely|without a doubt)\b/.test(t) && /\b(?:maybe|perhaps|i think|i guess|not sure|don['’]t know|might|could)\b/.test(u)) issues.push('knowledge_uncertainty_overconfident_inference');
 if(/\b(?:i know exactly how you feel|i know what you['’]re thinking|i know why you did (?:that|it)|you['’]re only saying that because|you did (?:that|it) because)\b/.test(t)) issues.push('knowledge_uncertainty_private_mind_claim');
 if(/\b(?:everyone knows|the whole campus knows|everybody knows)\b/.test(t) && !/\b(?:everyone|everybody|whole campus|campus knows)\b/.test(u)) issues.push('knowledge_uncertainty_unrouted_public_knowledge');
 if(/\b(?:i saw|i watched|i heard)\b/.test(t) && /\b(?:you weren['’]t there|you weren['’]t even there|you didn['’]t see|you couldn['’]t see|you didn['’]t hear)\b/.test(u)) issues.push('knowledge_uncertainty_perception_override');
 if(/\b(?:as you know|you know that)\b/.test(t) && /\b(?:i didn['’]t know|i don['’]t know|never told you|didn['’]t tell you)\b/.test(u)) issues.push('knowledge_uncertainty_assumed_shared_knowledge');
 if(/\b(?:i remember exactly|word for word|your exact words were)\b/.test(t) && !/\b(?:exactly|word for word|exact words)\b/.test(u)) issues.push('knowledge_uncertainty_perfect_recall_performance');
 if(/\b(?:i knew it all along|i always knew)\b/.test(t) && /\b(?:actually|turns out|i was wrong|correction|no,? )\b/.test(u)) issues.push('knowledge_uncertainty_hindsight_certainty');
 return [...new Set(issues)];
}
