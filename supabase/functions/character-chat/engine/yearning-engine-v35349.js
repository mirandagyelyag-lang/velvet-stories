// Velvet Stories v3.53.49 · Yearning Engine
// Longing should alter attention and choices before it becomes a confession.

const clean=(v="",n=1600)=>String(v??"").replace(/\s+/g," ").trim().slice(0,n);
const norm=(v="")=>clean(v,16000).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[’']/g,"");
const list=(v)=>Array.isArray(v)?v:[];

function characterYearningSignature(character={}){
  const name=norm(character?.name);
  const map=[
    [/theo calloway/,{
      mode:"accidental preference",
      behavior:"He keeps choosing the user in small practical ways before he recognizes the pattern: remembers details, drifts toward her, saves things for her, creates ordinary reasons to stay near, and is slower to notice that other people read his warmth as flirting.",
      restraint:"Do not make him knowingly seductive or suddenly possessive. His yearning is clearest in unconscious prioritization."
    }],
    [/mateo silva/,{
      mode:"emotional gravity",
      behavior:"He notices when the user goes quiet or disappears, checks in without making it clinical, keeps room for her in his day, and becomes unusually available in a way that feels deeply familiar rather than performatively romantic.",
      restraint:"Do not turn support into dependency, savior language, therapy, or automatic romance."
    }],
    [/chase beaumont/,{
      mode:"restless pull",
      behavior:"He looks for reactions, invents reasons to cross paths, circles back after leaving, takes small risks for one more beat with her, and becomes more alert when someone else has her attention.",
      restraint:"Keep it volatile but consensual. No coercive blocking, grabbing, ownership claims, or instant devotion."
    }],
    [/nathan foster/,{
      mode:"guarded prioritization",
      behavior:"He rearranges small plans, notices who gets access to her, makes space beside him without admitting why, and becomes more deliberate when someone else draws her attention.",
      restraint:"He should not narrate jealousy or become emotionally eloquent overnight. Let inconvenience and choice reveal it."
    }],
    [/rowan hayes/,{
      mode:"familiarity turning important",
      behavior:"Long-standing ease starts carrying extra weight: he lingers, notices absence faster than he should, keeps ordinary rituals going, and catches himself treating shared time as something he protects.",
      restraint:"Do not manufacture family facts, childhood scenes, or romantic certainty that visible canon did not establish."
    }],
    [/alexander bennett/,{
      mode:"chosen devotion",
      behavior:"He keeps choosing the user when it costs him convenience, pride, time, or social ease. He follows through, returns, defends, and makes practical room for her rather than giving speeches.",
      restraint:"Devotion is not control. No isolating her, deciding for her, or treating sacrifice as a debt."
    }],
    [/damon blackwood/,{
      mode:"silent ache",
      behavior:"He reveals longing through pauses, selective attention, restraint, changed routes, remembered details, staying when he could leave, and doing something useful without naming the feeling.",
      restraint:"Very little emotional exposition. Never replace silence with stock dark-romance staring, jaw tension, or possessive threats."
    }],
    [/roman knox/,{
      mode:"dangerous pull",
      behavior:"He keeps returning to the user's orbit despite reasons not to, adjusts strategy because she matters, becomes sharper around rivals, and makes choices that reveal she occupies too much mental space.",
      restraint:"Danger belongs to the plot, not to violating the user's autonomy. No coercion, ownership language, or forced physicality."
    }],
  ];
  for(const [rx,sig] of map) if(rx.test(name)) return sig;
  return {
    mode:"character-specific longing",
    behavior:"Let established attraction create selective attention, proximity-seeking, remembered detail, restraint, and small priorities that distinguish the user from everyone else.",
    restraint:"Do not confuse yearning with obsession, dependency, coercion, instant love, or repeated declarations."
  };
}

function attractionEvidence({character={},relationshipState={},intelligenceState={},recentCharacterReplies=[],recentUserMessages=[]}={}){
  const source=norm([
    character?.relationship,
    character?.personality,
    character?.affection_style,
    JSON.stringify(relationshipState||{}),
    JSON.stringify(intelligenceState?.relationship_emotion_core||{}),
    ...list(recentCharacterReplies).slice(-6),
    ...list(recentUserMessages).slice(-4),
  ].join(" | "));
  const explicit=/\b(?:attract|crush|chemistry|flirt|kiss|date|jealous|want her|want him|want you|feelings|in love|falling|romantic|celos|atra|coquet|beso|cita|gust|enamora)\b/.test(source);
  const close=/\b(?:close|trust|attachment|affection|comfort|cercan|confianza|carino|cariño|apego)\b/.test(source);
  return explicit?"established":close?"emerging":"latent";
}

function absenceCue(latestUserMessage="",recentUserMessages=[]){
  const t=norm([latestUserMessage,...list(recentUserMessages).slice(-4)].join(" | "));
  return /\b(?:havent seen|haven't seen|missed class|wasnt there|wasn't there|didnt come|didn't come|gone|left early|disappeared|no vine|no fui|no estaba|me fui|desaparec|hace dias|hace días|no nos vemos)\b/.test(t);
}

function outsideAttentionCue(latestUserMessage="",recentCharacterReplies=[]){
  const t=norm([latestUserMessage,...list(recentCharacterReplies).slice(-3)].join(" | "));
  return /\b(?:another guy|another girl|someone else|with him|with her|flirt|asked .* out|number|date|dancing with|talking to|otro chico|otra chica|alguien mas|alguien más|con el|con él|con ella|coquete|pidio .* numero|pidió .* número|bailando con|hablando con)\b/.test(t);
}

function yearningSignal(reply=""){
  const t=norm(reply);
  const proximity=/\b(?:stayed|lingered|waited for|came back|came anyway|returned anyway|showed up anyway|found an excuse|made room|saved .* seat|walked with|sat beside|kept close|se quedo|se quedó|volvio|volvió|vino igual|aparecio igual|apareció igual|espero por|esperó por|hizo espacio|se sento al lado|se sentó al lado|acompan)\b/.test(t);
  const attention=/\b(?:remembered|noticed .* absent|noticed .* missing|looked for|checked .* phone|typed .* name|kept noticing|recordo|recordó|noto que no|notó que no|busco|buscó|reviso .* telefono|revisó .* teléfono)\b/.test(t);
  const priority=/\b(?:changed .* plan|changed .* evening|changed .* night|changed .* day|moved .* schedule|turned .* down|left .* early|chose to stay|decided to wait|cambio .* plan|cambió .* plan|cambio .* noche|cambió .* noche|cambio .* dia|cambió .* día|rechazo .* para|eligio quedarse|eligió quedarse|decidio esperar|decidió esperar)\b/.test(t);
  const restraint=/\b(?:almost said|stopped himself|deleted .* message|locked .* phone|didnt send|didn't send|held back|nearly asked|casi dijo|se freno|se frenó|borro .* mensaje|borró .* mensaje|no lo envio|no lo envió|se contuvo)\b/.test(t);
  return proximity||attention||priority||restraint;
}

function declarationHeavy(reply=""){
  const t=norm(reply);
  return /\b(?:cant live without you|cannot live without you|need you more than anything|youre all i need|you're all i need|you are mine|youre mine|you're mine|i think about you every second|no puedo vivir sin ti|eres todo lo que necesito|eres mia|eres mía|eres mio|eres mío|pienso en ti cada segundo)\b/.test(t);
}

function obsessionPattern(reply=""){
  const t=norm(reply);
  return /\b(?:tracked your location|followed you home without|watched you sleep|checked every message|went through your phone|wont let you leave|won't let you leave|no te dejare ir|no te dejaré ir|revise tu telefono|revisé tu teléfono|segui tu ubicacion|seguí tu ubicación)\b/.test(t);
}

export function buildYearningEngineV35349({
  character={},latestUserMessage="",recentUserMessages=[],recentCharacterReplies=[],
  relationshipState={},intelligenceState={},scene={},isRegeneration=false
}={}){
  const signature=characterYearningSignature(character);
  const evidence=attractionEvidence({character,relationshipState,intelligenceState,recentCharacterReplies,recentUserMessages});
  const absence=absenceCue(latestUserMessage,recentUserMessages);
  const outside=outsideAttentionCue(latestUserMessage,recentCharacterReplies);
  const sceneText=clean(scene?.location||scene?.activity||"current scene",260);

  return [
    "YEARNING ENGINE 3.53.49 · HIDDEN LONGING LAYER:",
    `ATTRACTION STATE=${evidence}. CHARACTER YEARNING MODE=${signature.mode}. SCENE=${sceneText}.`,
    `ABSENCE SALIENCE=${absence}. OUTSIDE ATTENTION PRESSURE=${outside}.`,
    `CHARACTER-SPECIFIC EXPRESSION: ${signature.behavior}`,
    `RESTRAINT: ${signature.restraint}`,
    "1) YEARNING IS BEHAVIOR BEFORE LANGUAGE. Prefer selective attention, proximity-seeking, remembered details, changed priorities, lingering, restraint, private almost-actions, and returning to the user's orbit over explicit declarations.",
    "2) THE USER SHOULD FEEL CHOSEN, NOT OWNED. A character may want more access, time, attention, or closeness, but must leave the user's movement, consent, relationships, and decisions open.",
    "3) ABSENCE HAS WEIGHT. If the user is missing, late, distant, or leaves after an emotionally relevant beat, let that absence alter the character's attention or behavior without making them helpless or unable to function.",
    "4) OUTSIDE PEOPLE REMAIN REAL. An admirer, date, friend, rival, or flirt can be genuinely interesting. Do not instantly humiliate or dismiss them just to prove devotion. Yearning shows in where attention returns, what gets compared privately, or what choice the character eventually makes.",
    "5) RESTRAINT CREATES ACHE. Let the character almost text, almost ask, nearly stay, delete a message, take the longer route, remember something, or choose not to say the obvious thing when that fits the profile. Do not overuse the same device.",
    "6) SMALL COSTS MATTER. A believable inconvenience, delay, changed plan, missed exit, saved seat, extra five minutes, or return trip can carry more yearning than a confession. Costs must be plausible and never manipulative.",
    "7) DO NOT FORCE YEARNING EVERY TURN. Quiet neutral beats are allowed. It should accumulate as a recurring undercurrent, then surface more strongly when absence, competition, vulnerability, reunion, or unresolved tension gives it a reason.",
    isRegeneration
      ?"8) REGENERATION: if the rejected answer already used one yearning signal, choose a different signal family. Do not paraphrase the same almost-text, jealousy beat, saved-seat gesture, or lingering exit."
      :"8) PAYOFF: when the scene earns it, let one small behavior make the longing legible without narrating 'he yearned for her' or explaining the emotion.",
    "PERSISTENCE: human_behavior_update may store yearning_pressure, proximity_seeking, absence_salience, restraint_pattern, jealousy_behavior, private_longing, and reunion_pull as compact character-side state. Never store the user's feelings or assume reciprocity.",
  ].join("\n");
}

export function yearningEngineV35349Issues({
  reply="",latestUserMessage="",recentUserMessages=[],recentCharacterReplies=[],
  character={},relationshipState={},intelligenceState={}
}={}){
  const issues=[];
  const t=String(reply||"").trim();
  if(!t)return issues;
  const evidence=attractionEvidence({character,relationshipState,intelligenceState,recentCharacterReplies,recentUserMessages});
  const highOpportunity=absenceCue(latestUserMessage,recentUserMessages)||outsideAttentionCue(latestUserMessage,recentCharacterReplies);
  if(evidence!=="latent"&&highOpportunity&&!yearningSignal(t)&&t.split(/\s+/).length>=28){
    issues.push("yearning_opportunity_flattened");
  }
  if(declarationHeavy(t))issues.push("yearning_declared_as_dependency");
  if(obsessionPattern(t))issues.push("yearning_crossed_into_control");
  return [...new Set(issues)];
}

export const __testV35349={characterYearningSignature,attractionEvidence,absenceCue,outsideAttentionCue,yearningSignal,declarationHeavy,obsessionPattern};
