// Velvet Stories 3.53.71
// Anti-vague-answer gate. Characters answer ordinary concrete questions with an
// actual position instead of the recurring "I don't know yet" escape hatch.

const clean=(v="",n=12000)=>String(v??"").replace(/\r/g,"").trim().slice(0,n);
const norm=(v="")=>clean(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[’‘]/g,"'").replace(/\s+/g," ");

function ordinaryConcreteQuestion(v=""){
  const t=norm(v).replace(/\*[^*]*\*/g," ");
  if(!/\?/.test(String(v||"")))return false;
  return /\b(?:how long|how much|how many|when|where|what time|which|are you|do you|did you|will you|would you|can you|who|why)\b/.test(t);
}
function unknowableQuestion(v=""){
  const t=norm(v);
  return /\b(?:future|forever|ever going to|what will happen|how will .* end|when will .* die|exactly what .* thinking|what am i thinking|lottery|winning numbers)\b/.test(t);
}
function vagueNonAnswer(reply=""){
  const t=norm(reply);
  return /(?:^|[.!?]\s*|["“]\s*)(?:i (?:do not|don't|dont) know(?: yet)?|not sure(?: yet)?|i'm not sure(?: yet)?|im not sure(?: yet)?|we'll see|we will see|depends|maybe|who knows|haven't decided|have not decided)(?:[.!?”"]|$)/.test(t)
    || /\b(?:i (?:do not|don't|dont) know yet|not sure yet|we'll see|who knows)\b/.test(t);
}
function hasConcreteEstimate(reply=""){
  const t=norm(reply);
  return /\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|few|couple|hour|hours|minute|minutes|until|after|before|tonight|tomorrow|later|around|about|probably|plan to|planning to|i'm staying|im staying|i'm leaving|im leaving)\b/.test(t);
}

export function buildDecisiveAnswerV35371({character={},latestUserMessage=""}={}){
  return [
    "DECISIVE ANSWER LAW 3.53.71 · HARD:",
    "Do NOT use 'I don't know yet', 'I don't know', 'not sure yet', 'we'll see', 'depends', 'maybe', 'who knows', or equivalent as a generic answer to an ordinary concrete user question.",
    "If the user asks how long, when, where, what time, which option, whether the character is staying/leaving, or another answerable practical question, COMMIT to a plausible answer from current context.",
    "Exact certainty is not required. Give a bounded estimate or current intention: 'Probably another hour.' 'Until Ethan's game is over.' 'I'm leaving after this round.' 'Ten minutes, tops.'",
    "Uncertainty must contain information. If the character genuinely cannot know, say what they DO know, what they currently intend, or what the uncertainty depends on. Never make uncertainty the entire beat.",
    "Do not hide behind vagueness to seem mysterious, masculine, emotionally guarded, cool, or slow-burn. Mystery is not refusing ordinary information.",
    "When the user asks a direct question, ANSWER BEFORE flourish, teasing, body language, subtext or a counter-question.",
    "Character="+clean(character?.name||"character",80)+". User asked="+(clean(latestUserMessage,300)||"none")+"."
  ].join("\n");
}

export function decisiveAnswerIssuesV35371({reply="",latestUserMessage=""}={}){
  const issues=[];
  if(ordinaryConcreteQuestion(latestUserMessage)&&!unknowableQuestion(latestUserMessage)&&vagueNonAnswer(reply)&&!hasConcreteEstimate(reply)){
    issues.push("generic_i_dont_know_yet_nonanswer");
  }
  return issues;
}
