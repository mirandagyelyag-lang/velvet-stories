const raw=(v)=>String(v??"").trim();
const norm=(v)=>raw(v).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[’']/g,"'").replace(/[^a-z0-9?!.\s-]/g," ").replace(/\s+/g," ").trim();
const words=(v)=>norm(v).split(/\s+/).filter(Boolean);
const dialogue=(v)=>{const s=raw(v);const quoted=[...s.matchAll(/["“]([^"”]{1,500})["”]/g)].map(m=>m[1]);return quoted.length?quoted.join(" "):s.replace(/\*[^*]*\*/gs," ").trim();};

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
    /\b(?:call|text|invite|leave|stay|stop|start|arrive|park|drive|turn|take|give|hand|show|open|close|unlock|pay|order|book|cancel)\w*\b/,
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
  const clean=raw(latest).replace(/\*[^*]*\*/gs," ").replace(/\s+/g," ").trim();
  const n=norm(clean);
  if(!clean||!(/\?/.test(clean)||/^(?:so\s+)?(?:are|is|was|were|do|does|did|have|has|can|could|would|will|why|what|how|when|where|who|which)\b/.test(n)))return null;
  const binary=/^(?:so\s+)?(?:are|is|was|were|do|does|did|have|has|can|could|would|will)\b/.test(n)||/\b(?:admitting|admit|saying|mean)\b.*\?/.test(n);
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
  const overlap=info.terms.filter(t=>r.includes(t)).length;
  if(overlap>=1)return true;
  if(/\b(?:because|the reason|what i mean|what i meant|i mean|i meant)\b/.test(first)&&!/^and technically\b/.test(first))return true;
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
      ? `- CONVERSATIONAL ANSWER GATE: the user asked a real question: "${raw(latestUserMessage).slice(0,260)}". ${name} must answer that question in the FIRST spoken clause or sentence. After the answer, personality/banter may color it. Never dodge by inventing a new accusation, changing the premise, or answering a different question.`
      : "- If the user asks a direct question, answer its actual meaning before any flourish.",
    "- QUESTION PRESERVATION: yes/no/admission questions may be answered directly, indirectly-but-clearly, or with a character-specific admission/denial. They may not be replaced by a clever tangent.",
    "- PROGRESSION RULE: after 1-2 playful exchanges, change at least one thing that matters: information, plan, emotional exposure, relationship pressure, proximity with cause, responsibility, choice, or concrete scene state.",
    "- REPETITION WATCH: avoid recycling 'fair enough', 'challenge accepted', 'technically', 'point to you', 'promise or threat', repeated low/smooth voice descriptions, repeated smirks/grins, or structurally identical comeback endings.",
    "- CHASE-SPECIFIC NOTE: confidence and flirtation should show through what he risks, notices, chooses, admits, or does. He does not need a comeback every turn to remain Chase.",
  ].join("\n");
}

export function banterAnswerGateIssuesV35383({reply="",latestUserMessage="",recentCharacterReplies=[]}={}){
  const issues=[];
  const recent=(Array.isArray(recentCharacterReplies)?recentCharacterReplies:[]).slice(-4);
  const saturated=recent.slice(-2).filter(isBanterHeavy).length>=2||recent.filter(isBanterHeavy).length>=3;
  if(saturated&&isBanterHeavy(reply))issues.push("banter_saturation_loop");
  const q=directQuestionInfo(latestUserMessage);
  if(q&&!answersDirectQuestion(reply,latestUserMessage))issues.push("conversational_answer_gate_miss");
  const recentTechnically=recent.slice(-4).filter(x=>/\btechnically\b/i.test(dialogue(x))).length;
  if(recentTechnically>=1&&/\btechnically\b/i.test(dialogue(reply)))issues.push("repeated_technically_banter");
  const style=[...recent.slice(-3),reply].map(x=>norm(x));
  const voiceDrop=style.filter(x=>/\b(?:voice|cadence)\b.{0,35}\b(?:drop|lower|low|quiet|smooth)\w*\b/.test(x)).length;
  if(voiceDrop>=3)issues.push("repeated_voice_drop_mannerism");
  return issues;
}

export const V35383_TESTS={
  isBanterHeavy,
  answersDirectQuestion,
};
