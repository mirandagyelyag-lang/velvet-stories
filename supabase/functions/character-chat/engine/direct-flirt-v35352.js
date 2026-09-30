// Velvet Stories v3.53.52 · Direct Flirt
// Global rule: when the user hands the character an obvious romantic setup,
// answer the setup first. Directness beats decorative cleverness.

const clean=(v="",n=1800)=>String(v??"").replace(/\s+/g," ").trim().slice(0,n);
const norm=(v="")=>clean(v,18000).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[’']/g,"");
const list=(v)=>Array.isArray(v)?v:[];

function romanticContext({character={},relationshipState={},behavior={},recentUserMessages=[],recentCharacterReplies=[]}={}){
  const t=norm([
    character?.relationship,character?.scenario,character?.personality,
    JSON.stringify(relationshipState||{}),JSON.stringify(behavior||{}),
    ...list(recentUserMessages).slice(-4),...list(recentCharacterReplies).slice(-4)
  ].join(" | "));
  return /\b(?:flirt|flirting|romantic|attract|chemistry|crush|kiss|jealous|jealousy|date|tension|yearning|pull|preference|into you|likes you|celos|coquet|romant|atracci|beso|cita|tension|tensión|gustas|le gustas)\b/.test(t);
}

function directFlirtSetup(message=""){
  const t=norm(message).replace(/[?!.,]+$/g,"").trim();
  if(!t)return false;
  if(/^(?:like|such as|for example|which one|which ones|who|me|why me|how so|what do you mean|como que|como cual|como cuales|por ejemplo|cual|cuál|cuales|cuáles|quien|quién|yo|por que yo|por qué yo|a que te refieres|a qué te refieres)$/.test(t))return true;
  return /\b(?:give me an example|name one|say it then|then say it|dilo entonces|dime uno|dame un ejemplo)\b/.test(t);
}

function evasiveFlirt(reply=""){
  const t=norm(reply);
  const abstract=/\b(?:the ones worth|some things|some people|certain people|you know what i mean|wouldnt you like to know|that's for me to know|depends who asks|worth having|worth noticing|volumes|frequency|gravity|dangerous question|better left unsaid|ciertas personas|algunas personas|ya sabes|depende de quien pregunte|mejor no decirlo|vale la pena)\b/.test(t);
  const writerly=/\b(?:quiet intensity|the teasing edge|mockery sliding|held her gaze|slow unbothered grin|corner of his mouth|voz bajo|intensidad silenciosa|la burla desaparecio|la burla desapareció)\b/.test(t);
  return abstract||writerly;
}

function directAnswerSignal(reply=""){
  const t=norm(reply);
  return /\b(?:like you|you|because its you|because you're you|because you are you|because i wanted to see you|i was talking about you|i meant you|youre the example|you're the example|tu|tú|como tu|como tú|porque eres tu|porque eres tú|hablaba de ti|me referia a ti|me refería a ti|queria verte|quería verte)\b/.test(t);
}

function characterFlavor(character={}){
  const name=norm(character?.name);
  if(/theo calloway/.test(name))return "Theo may sound surprised by his own honesty, but once cornered by a clean setup he answers it plainly instead of hiding behind charm.";
  if(/chase beaumont/.test(name))return "Chase should be especially good at this: concise, confident, personal. He may tease after the direct answer, never instead of it.";
  if(/nathan foster/.test(name))return "Nathan can be terse or reluctant, but terse is not evasive. A blunt two-word answer fits him better than a polished metaphor.";
  if(/rowan hayes/.test(name))return "Rowan can keep familiar warmth, but if romantic tension is earned and the setup is direct, he should answer without turning it into a speech.";
  if(/alexander bennett/.test(name))return "Alexander may be warm and certain. Let sincerity land cleanly before any elaboration.";
  if(/damon blackwood/.test(name))return "Damon can answer with very few words. Silence around a direct answer is stronger than cryptic abstraction.";
  if(/roman knox/.test(name))return "Roman may resist, challenge, or sound dangerous, but when he chooses to flirt he should make the target unmistakable instead of speaking in riddles.";
  if(/mateo silva/.test(name))return "Mateo should remain context-sensitive: do not force romance into support scenes, but if romance is actually established, answer direct flirt setups naturally.";
  return "Preserve the character's voice, but never use voice as an excuse to dodge an obvious flirt setup.";
}

export function buildDirectFlirtV35352({
  character={},latestUserMessage="",recentUserMessages=[],recentCharacterReplies=[],
  relationshipState={},behavior={}
}={}){
  const romantic=romanticContext({character,relationshipState,behavior,recentUserMessages,recentCharacterReplies});
  const setup=directFlirtSetup(latestUserMessage);
  return [
    "DIRECT FLIRT 3.53.52 · GLOBAL DIALOGUE RULE:",
    `ROMANTIC CONTEXT=${romantic}. DIRECT FLIRT SETUP=${setup}.`,
    "CORE RULE: if the user gives the character an obvious opening for a personal flirt, answer the opening directly before adding wit, teasing, subtext, narration, or movement.",
    "DIRECTNESS OVERRIDES CLEVERNESS. Prefer a clear personal answer such as 'Like you.' over a metaphor, riddle, quote-like line, vague category, mysterious deflection, or pseudo-deep comeback.",
    "FLIRTING IS NOT THE SAME AS CRYPTIC INTENSITY. Romantic tension comes from making the interaction personal, specific, risky, and legible enough for the user to react to.",
    "ONE CLEAN LINE CAN BE THE WHOLE TURN. Do not pad a strong flirt with explanation, philosophy, body-language choreography, or a second line that weakens it.",
    "IF TEASING IS USED, DIRECT ANSWER FIRST. Example shape: direct answer → optional tiny tease. Never tease as a substitute for answering.",
    "DO NOT FORCE FLIRTING WHERE IT IS NOT EARNED. This rule only changes how a romantic opening is answered; it does not create attraction, consent, or reciprocity out of nowhere.",
    characterFlavor(character),
    setup&&romantic
      ?"THIS TURN HAS A HIGH-VALUE FLIRT OPENING. Take it. The first spoken idea should directly identify the user or the real answer unless canon makes that impossible."
      :"No forced flirt is required this turn. Keep this rule available for the next obvious opening."
  ].join("\n");
}

export function directFlirtV35352Issues({
  reply="",latestUserMessage="",recentUserMessages=[],recentCharacterReplies=[],
  character={},relationshipState={},behavior={}
}={}){
  const issues=[];
  const t=String(reply||"").trim();
  if(!t)return issues;
  const romantic=romanticContext({character,relationshipState,behavior,recentUserMessages,recentCharacterReplies});
  const setup=directFlirtSetup(latestUserMessage);
  if(romantic&&setup&&evasiveFlirt(t)&&!directAnswerSignal(t)){
    issues.push("direct_flirt_obvious_setup_evaded");
  }
  if(romantic&&setup&&t.split(/\s+/).length>45&&!directAnswerSignal(t)){
    issues.push("direct_flirt_buried_in_prose");
  }
  return [...new Set(issues)];
}

export const __testV35352={romanticContext,directFlirtSetup,evasiveFlirt,directAnswerSignal};
