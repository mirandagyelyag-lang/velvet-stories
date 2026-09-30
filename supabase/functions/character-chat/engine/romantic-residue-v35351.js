// Velvet Stories v3.53.51 · Romantic Residue
// Five coupled systems: tension memory, reunion payoff, public/private behavior,
// near-miss continuity, and emotional escalation that does not reset.

const clean=(v="",n=1800)=>String(v??"").replace(/\s+/g," ").trim().slice(0,n);
const norm=(v="")=>clean(v,18000).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[’']/g,"");
const list=(v)=>Array.isArray(v)?v:[];

function relationshipStage({relationshipState={},behavior={},intelligenceState={}}={}){
  const blob=norm(JSON.stringify({relationshipState,behavior,intelligenceState}));
  if(/\b(?:committed|official|boyfriend|girlfriend|relationship|novi[oa]|pareja)\b/.test(blob))return 5;
  if(/\b(?:kiss|made out|beso|date|cita|recognized feelings|awareness|vulnerable trust)\b/.test(blob))return 4;
  if(/\b(?:pull|attraction|chemistry|jealous|celos|prefer|preference)\b/.test(blob))return 3;
  if(/\b(?:attention|selective attention|close|trust|cercan|confianza)\b/.test(blob))return 2;
  return 1;
}

function tensionSeed(text=""){
  const t=norm(text);
  if(/\b(?:almost kissed|nearly kissed|almost a kiss|casi beso|casi se bes|interrupted before .*kiss|interrump)\b/.test(t))return "near_kiss";
  if(/\b(?:jealous|jealousy|celos|another guy|another girl|otro chico|otra chica|someone else)\b/.test(t))return "jealous_pressure";
  if(/\b(?:almost said|nearly said|stopped himself|held back|casi dijo|se contuvo)\b/.test(t))return "unsaid_words";
  if(/\b(?:argument|fight|tension|awkward|conflict|discusion|discusión|pelea|tenso|incómodo|incomodo)\b/.test(t))return "friction";
  if(/\b(?:kiss|beso|touch|touched|hand|close enough|too close|cerca)\b/.test(t))return "physical_charge";
  return "";
}

function deriveTensionMemory({behavior={},recentUserMessages=[],recentCharacterReplies=[]}={}){
  const stored=clean(behavior?.romantic_tension_memory||behavior?.tension_memory||"",520);
  if(stored)return stored;
  const recent=[...list(recentUserMessages).slice(-5),...list(recentCharacterReplies).slice(-5)].reverse();
  for(const turn of recent){
    const seed=tensionSeed(turn);
    if(seed)return seed;
  }
  return "none";
}

function separationCue(latestUserMessage="",recentCharacterReplies=[],behavior={}){
  const t=norm([latestUserMessage,...list(recentCharacterReplies).slice(-4),behavior?.last_separation_note].join(" | "));
  return /\b(?:havent seen|haven't seen|days since|weeks since|long time|finally saw|finally see|back again|returned|came back|left early|went home|goodbye|bye|no nos vemos|hace dias|hace días|volvio|volvió|regreso|regresó|se fue|me fui|adios|adiós)\b/.test(t);
}

function publicScene(scene={}){
  const present=list(scene?.present).map(x=>clean(x?.name||x,80)).filter(Boolean);
  if(present.length>=3)return true;
  const t=norm([scene?.location,scene?.activity,...present].join(" "));
  return /\b(?:party|club|bar|class|lecture|cafeteria|restaurant|hallway|campus|group|friends|crowd|fiesta|clase|cafeteria|cafetería|restaurante|pasillo|grupo|amigos|gente)\b/.test(t);
}

function nearMissCount(behavior={}){
  const raw=Number(behavior?.near_miss_count||behavior?.romantic_near_miss_count||0);
  return Number.isFinite(raw)?Math.max(0,Math.min(raw,9)):0;
}

function residueSummary({behavior={},relationshipState={},intelligenceState={}}={}){
  return clean(
    behavior?.romantic_residue ||
    behavior?.relationship_expectation_shift ||
    behavior?.consequence_foreground_thread ||
    relationshipState?.current_dynamic ||
    intelligenceState?.relationship_emotion_core?.residue ||
    "",650
  )||"none explicitly stored";
}

function regressionLanguage(reply=""){
  const t=norm(reply);
  return /\b(?:as if nothing happened|back to normal|just friends like always|nothing had changed|same as always|forgot all about|everything felt normal again|como si nada hubiera pasado|todo volvio a la normalidad|todo volvió a la normalidad|nada habia cambiado|nada había cambiado)\b/.test(t);
}

function overExplainedResidue(reply=""){
  const t=norm(reply);
  return /\b(?:ever since .*kiss|ever since .*almost|because of what happened between us|since that moment i realized|desde ese beso|desde que casi|por lo que paso entre nosotros|por lo que pasó entre nosotros)\b/.test(t);
}

function sameNearMissLoop(recentCharacterReplies=[]){
  const recent=list(recentCharacterReplies).slice(-4).map(norm);
  const hits=recent.filter(t=>/\b(?:almost kissed|nearly kissed|almost said|stopped himself|held back|interrupted|casi beso|casi dijo|se contuvo|interrump)\b/.test(t));
  return hits.length>=2;
}

export function buildRomanticResidueV35351({
  character={},latestUserMessage="",recentUserMessages=[],recentCharacterReplies=[],
  scene={},behavior={},relationshipState={},intelligenceState={}
}={}){
  const tension=deriveTensionMemory({behavior,recentUserMessages,recentCharacterReplies});
  const reunion=separationCue(latestUserMessage,recentCharacterReplies,behavior);
  const isPublic=publicScene(scene);
  const misses=nearMissCount(behavior);
  const stage=relationshipStage({relationshipState,behavior,intelligenceState});
  const residue=residueSummary({behavior,relationshipState,intelligenceState});

  return [
    "ROMANTIC RESIDUE 3.53.51 · RELATIONSHIP CONTINUITY LAYER:",
    `TENSION MEMORY=${tension}. REUNION PAYOFF=${reunion}. SOCIAL MODE=${isPublic?"public/group":"private/low-audience"}. NEAR-MISS COUNT=${misses}. ESCALATION LEDGER=${stage}/5. PRIOR RESIDUE=${residue}.`,
    "CORE LAW: relationship progress must leave residue. A meaningful romantic or emotional beat may become quieter later, but it must not vanish or reset the characters to an earlier emotional baseline.",
    "1) TENSION MEMORY. Preserve the TYPE of unfinished tension, not its exact wording. A near-kiss may later produce extra awareness of distance; jealousy may alter attention; an interrupted admission may make certain topics harder to approach. Do not replay the original beat word-for-word.",
    reunion
      ?"2) REUNION PAYOFF IS ACTIVE. The reunion should feel microscopically different from an ordinary encounter: changed timing, attention, restraint, relief, awkwardness, priority, or one concrete choice. Do not require either person to say they missed the other."
      :"2) REUNION PAYOFF. When grounded separation exists, the next meaningful encounter should carry a small behavioral residue rather than behaving like the gap never happened.",
    isPublic
      ?"3) PUBLIC/PRIVATE CONTRAST: other people are present. Let the character manage what they reveal. Public behavior may be more casual, teasing, guarded, socially normal, competitive, or indirect than private behavior, while still leaking selective attention."
      :"3) PUBLIC/PRIVATE CONTRAST: this is private or low-audience. The character may permit a little more stillness, honesty, softness, directness, or sustained attention than they would in front of others, but only as far as the earned arc allows.",
    misses>=2
      ?"4) NEAR-MISS BRAKE IS ACTIVE. Do NOT create another almost-kiss/almost-confession/interruption as the main beat. Convert accumulated tension into a different form: a decision, honest question, invitation, boundary, meaningful touch if earned, social consequence, or deliberate retreat."
      :"4) NEAR-MISS ENGINE. A 'nearly' moment can deepen tension only when it changes future behavior. Never use interruption or hesitation as a treadmill. Every near-miss must leave a new residue or make the next choice harder/easier.",
    `5) EMOTIONAL ESCALATION LEDGER. Current floor=${stage}/5. Never write the relationship as emotionally earlier than already-earned history. New scenes may be calmer, but recognition, preference, attraction, trust, awkwardness, or knowledge already earned stays available underneath.`,
    "6) RESIDUE SHOULD BE SMALLER THAN THE EVENT. Do not summarize the relationship after every charged beat. Prefer one altered habit, one changed assumption, one extra second of attention, one avoided topic, one new comfort, one changed boundary, or one decision that would not have happened before.",
    "7) NO RETROACTIVE MUTUALITY. The character may accumulate feelings and changed behavior, but never infer that the user reciprocates unless the user visibly authored it.",
    "PERSISTENCE: human_behavior_update may store romantic_tension_memory, romantic_residue, last_separation_note, public_private_shift, near_miss_count, and escalation_floor only when the visible canon supports them. Store compact facts, not prose summaries or invented user feelings."
  ].join("\n");
}

export function romanticResidueV35351Issues({
  reply="",recentCharacterReplies=[],behavior={},relationshipState={},intelligenceState={}
}={}){
  const issues=[];
  const t=String(reply||"").trim();
  if(!t)return issues;
  const stage=relationshipStage({relationshipState,behavior,intelligenceState});
  const residue=residueSummary({behavior,relationshipState,intelligenceState});
  if(stage>=3&&residue!=="none explicitly stored"&&regressionLanguage(t))issues.push("romantic_residue_relationship_reset");
  if(overExplainedResidue(t))issues.push("romantic_residue_overexplained");
  if(sameNearMissLoop(recentCharacterReplies)&&/\b(?:almost kissed|nearly kissed|almost said|stopped himself|held back|interrupted|casi beso|casi dijo|se contuvo|interrump)\b/i.test(t)){
    issues.push("romantic_residue_near_miss_loop");
  }
  return [...new Set(issues)];
}

export const __testV35351={
  relationshipStage,tensionSeed,deriveTensionMemory,separationCue,publicScene,nearMissCount,
  regressionLanguage,overExplainedResidue,sameNearMissLoop
};
