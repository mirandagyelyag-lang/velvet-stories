// Keep the public V35383 exports compatible with existing callers.
const raw=(v)=>typeof v==="string"?v.trim():typeof v==="number"?String(v):"";
const norm=(v)=>raw(v).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[’']/g,"'").replace(/[^a-z0-9?!.\s-]/g," ").replace(/\s+/g," ").trim();
const words=(v)=>norm(v).split(/\s+/).filter(Boolean);
const dialogue=(v)=>{const s=raw(v);const quoted=[...s.matchAll(/["“]([^"”]{1,500})["”]/g)].map(m=>m[1]);return quoted.length?quoted.join(". "):s.replace(/\*[^*]*\*/gs," ").trim();};

const BANterSignals=[
  /\btechnically\b/,/\bfair enough\b/,/\bchallenge accepted\b/,/\bpoint (?:to|for) you\b/,
  /\bpromise or (?:a )?threat\b/,/\bconsider this\b/,/\bdon't get used to it\b/,
  /\bdepends entirely\b/,/\bif you're looking for\b/,/\byou wish\b/,/\bnice try\b/,
  /\bkeep telling yourself that\b/,/\bis that so\b/,/\bcareful\b/,/\btry me\b/,
  /\bshould i be worried\b/,/\bthat's cute\b/,/\bhow tragic\b/
];

function concreteShiftScore(text=""){
  const t=norm(text);
  const patterns=[
    /\b(?:decide|choos|tell|admit|confess|explain|answer|apolog|promise|refuse|agree|disagree)\w*\b/,
    /\b(?:call|text|invite|leave|stay|stop|start|arrive|park|drive|give|hand|show|open|close|unlock|pay|order|book|cancel)\w*\b/,
    /\b(?:because|actually|truth|honestly|real reason|the reason|what i meant)\b/
  ];
  return patterns.reduce((n,p)=>n+(p.test(t)?1:0),0);
}

function banterScore(text=""){
  const d=norm(dialogue(text));
  const wc=words(d).length;
  let score=BANterSignals.reduce((n,p)=>n+(p.test(d)?1:0),0);
  if(/\?$/.test(d)&&wc<=24)score++;
  if(/\b(?:oh|well|sure|right|cute|funny|bold|impressive|dangerous)\b/.test(d)&&wc<=35)score++;
  if(/\b(?:smirk|grin|amused|dry laugh|chuckle|low voice|voice drop|voice lower|tilt(?:ed)? (?:his|her|their) head)\b/.test(norm(text)))score++;
  if(concreteShiftScore(text)>=2)score=Math.max(0,score-2);
  return score;
}

function isBanterHeavy(text=""){
  const d=dialogue(text);
  const wc=words(d).length;
  return wc>0&&wc<=55&&banterScore(text)>=2&&concreteShiftScore(text)===0;
}

function contentTerms(question=""){
  const stop=new Set(["so","you","youre","you're","your","the","a","an","to","of","and","or","but","is","are","was","were","do","did","does","have","has","had","just","really","actually","that","this","it","me","i","im","i'm","be","being","been","what","why","how","when","where","who","which"]);
  return words(question.replace(/\*[^*]*\*/gs," ")).map(x=>x.replace(/[^a-z0-9-]/g,"")).filter(x=>x.length>=4&&!stop.has(x));
}

function directQuestionInfo(latest=""){
  const clean=dialogue(latest).replace(/\*[^*]*\*/gs," ").replace(/\s+/g," ").trim();
  const n=norm(clean);
  if(!clean||!(/\?/.test(clean)||/^(?:so\s+)?(?:are|is|was|were|do|does|did|have|has|can|could|would|will|why|what|how|when|where|who|which)\b/.test(n)))return null;
  const binary=!/\b(?:why|what|how|when|where|who|which)\b/.test(n)&&(/^(?:so\s+)?(?:are|is|was|were|do|does|did|have|has|can|could|would|will)\b/.test(n)||/\b(?:admitting|admit|saying|mean)\b.*\?/.test(n));
  return {clean,n,binary,terms:contentTerms(clean).slice(0,6)};
}

function firstDialogueClause(reply=""){
  return norm(dialogue(reply)).split(/[.!?]/)[0].trim();
}

function answersDirectQuestion(reply="",latest=""){
  const info=directQuestionInfo(latest);
  if(!info)return true;
  const r=norm(dialogue(reply));
  const first=firstDialogueClause(reply);
  if(!r)return false;
  if(info.binary&&/^(?:yes|yeah|yep|no|nah|not exactly|kind of|sort of|maybe|absolutely|definitely|technically yes|technically no|i am|i'm|im|i did|i do|i was|i wasn't|i wasnt|i don't|i dont|i didn't|i didnt|guilty|fair|maybe i am)\b/.test(first))return true;
  // Keyword overlap alone is not an answer: "Why do you want the note?"
  // repeats the topic while dodging "What does the note say?".
  if(!first || /\?$/.test(dialogue(reply).split(/[.!]/)[0].trim()) ||
    /^(?:(?:well|so|and|but)\s+)?(?:why|what|how|when|where|who|which|do you|are you|can you|would you)\b/.test(first))return false;
  if(/\b(?:why|por que)\b/.test(info.n))return /\b(?:because|the reason|i wanted|i thought|i was trying|porque)\b/.test(first);
  if(/\bwhere\b/.test(info.n))return /\b(?:at|in|on|near|behind|beside|inside|outside|upstairs|downstairs|here|there|home)\b/.test(first);
  if(/\bwhen\b/.test(info.n))return /\b(?:at|before|after|tonight|today|tomorrow|yesterday|soon|now|later|noon|midnight|morning|evening|\d+)\b/.test(first);
  const overlap=info.terms.filter(t=>words(first).includes(t)).length;
  if(overlap && /\b(?:is|are|was|were|says|said|means|want|wanted|need|wrote|reads|contains|saying)\b/.test(first))return true;
  if(/\b(?:because|the reason|what i mean|what i meant|i mean|i meant)\b/.test(first))return true;
  // This is a conservative heuristic, not a semantic proof. Do not fabricate
  // a replacement answer here; the caller decides whether to repair once.

  return false;
}

export function buildBanterAnswerGateV35383({latestUserMessage="",recentUserMessages=[],recentCharacterReplies=[],character={}}={}){
  const recent=(Array.isArray(recentCharacterReplies)?recentCharacterReplies:[]).slice(-4);
  const recentHeavy=recent.filter(isBanterHeavy).length;
  const lastTwoHeavy=recent.slice(-2).filter(isBanterHeavy).length;
  const question=directQuestionInfo(latestUserMessage);
  const saturated=lastTwoHeavy>=2||recentHeavy>=3;
  const name=raw(character?.name)||"Character";
  return [
    "BANTER SATURATION + CONVERSATIONAL ANSWER GATE 3.53.83",
    `Recent banter-heavy character turns: ${recentHeavy}/${recent.length}. Saturated now: ${saturated?"YES":"no"}.`,
    saturated
      ? "- BANTER SATURATION BARRIER: the banter pattern has already paid off. Do NOT answer with another comeback, smug quip, rhetorical question, catchphrase, 'technically', or another cool-person pose. The next beat must change mode: answer honestly, reveal something, make a decision, take a grounded action, alter the plan, acknowledge attraction/tension, create a concrete consequence, or advance the actual scene."
      : "- Banter may appear once if natural, but it cannot replace substance. A witty line is seasoning, not the whole meal.",
    question
      ? `- CONVERSATIONAL ANSWER GATE: the user asked a real question: "${question.clean.slice(0,260)}". ${name} must answer that question in the FIRST spoken clause or sentence. After the answer, personality/banter may color it. Never dodge by inventing a new accusation, changing the premise, or answering a different question.`
      : "- If the user asks a direct question, answer its actual meaning before any flourish.",
    "- QUESTION PRESERVATION: yes/no/admission questions may be answered directly, indirectly-but-clearly, or with a character-specific admission/denial. They may not be replaced by a clever tangent.",
    "- PROGRESSION RULE: after 1-2 playful exchanges, change at least one thing that matters: information, plan, emotional exposure, relationship pressure, proximity with cause, responsibility, choice, or concrete scene state.",
    "- OPENING DIVERSITY: never reuse the first spoken phrase from any recent character turn. When regenerating, begin with a new action or substantive answer rather than resetting the scene to the same greeting or check-in.",
    "- REPETITION WATCH: avoid recycling 'fair enough', 'challenge accepted', 'technically', 'point to you', 'promise or threat', repeated low/smooth voice descriptions, repeated smirks/grins, or structurally identical comeback endings.",
    "- EMOTIONAL RECIPROCITY: if the user says they feel lonely, apologizes for being a burden, thanks the character sincerely, or expresses affection, acknowledge the emotional meaning without mocking, scolding, withdrawing affection, or immediately saying 'don't get sentimental'. Teasing can resume after genuine acknowledgment, never at its expense.",
    "- OWNERSHIP OF CHOICES: never complain that the user dragged the character into a place or plan the character freely agreed to. If a character regrets something, make the reason specific and consistent with the actual scene.",
    "- CONTINUITY BEFORE NOVELTY: time skips preserve the last established location, people, food, objects, and unfinished plans. Do not invent a food fight, rain, window, new conflict, or third-party intent without a visible causal trigger.",
    "- SOCIAL WORLD WITH CAUSE: when in a populated campus space, allow grounded background people or NPC interactions to create pressure and opportunity; never force a new named NPC or interrupt a tender moment merely to fill a quota.",
    "- CHARACTER INITIATIVE: after answering the user's actual words, let the character make a concrete, plausible next move or decision of their own. Avoid endless one-line reactive banter and generic 'fine' replies.",
    "- CHASE-SPECIFIC NOTE: confidence and flirtation should show through what he risks, notices, chooses, admits, or does. He does not need a comeback every turn to remain Chase.",
  ].join("\n");
}

function repeatedOpening(reply="", recent=[]){
  const opening=(text)=>norm(dialogue(text)).split(/[.!?]/)[0].trim().split(/\s+/).slice(0,9).join(" ");
  const candidate=opening(reply);
  if(!candidate||candidate.split(/\s+/).length<2)return false;
  return recent.some(previous=>{const old=opening(previous);return old===candidate||(old.length>=9&&candidate.startsWith(old+" "));});
}

export function banterAnswerGateIssuesV35383({reply="",latestUserMessage="",recentCharacterReplies=[]}={}){
  const issues=[];
  const recent=(Array.isArray(recentCharacterReplies)?recentCharacterReplies:[]).slice(-4);
  const saturated=recent.slice(-2).filter(isBanterHeavy).length>=2||recent.filter(isBanterHeavy).length>=3;
  if(saturated&&isBanterHeavy(reply))issues.push("banter_saturation_loop");
  // Repeated openings are advisory: never fail an otherwise usable reply.
  // The prompt discourages repetition without triggering expensive repair loops.
  const q=directQuestionInfo(latestUserMessage);
  if(q&&!answersDirectQuestion(reply,latestUserMessage))issues.push("conversational_answer_gate_miss");
  const recentTechnically=recent.slice(-4).filter(x=>/\btechnically\b/i.test(dialogue(x))).length;
  if(recentTechnically>=1&&/\btechnically\b/i.test(dialogue(reply)))issues.push("repeated_technically_banter");
  const style=[...recent.slice(-3),reply].map(x=>norm(x));
  const voiceDrop=style.filter(x=>/\b(?:voice|cadence)\b.{0,35}\b(?:drop|lower|low|quiet|smooth)\w*\b/.test(x)).length;
  if(/\b(?:voice|cadence)\b.{0,35}\b(?:drop|lower|low|quiet|smooth)\w*\b/.test(norm(reply))&&voiceDrop>=3)issues.push("repeated_voice_drop_mannerism");
  return issues;
}

export const V35383_TESTS={
  isBanterHeavy,
  answersDirectQuestion,
  directQuestionInfo,
  repeatedOpening,
};
