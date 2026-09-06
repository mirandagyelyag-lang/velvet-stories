const tx=(v:unknown)=>String(v??"").trim();
const low=(v:unknown)=>tx(v).toLowerCase();
const words=(v:unknown)=>tx(v).split(/\s+/).filter(Boolean).length;
const sentences=(v:unknown)=>tx(v).split(/(?<=[.!?])\s+|\n+/).map(s=>s.trim()).filter(Boolean);

const AI_STOCK=[
  /the air between (?:us|them)/i,/something in (?:my|his|her) chest/i,/a beat of silence stretched/i,
  /the impulse to .* was automatic/i,/a reflex (?:i|he|she)'?d spent/i,/half a lifetime/i,
  /fingers? curl(?:ed|ing)/i,/jaw tighten(?:ed|ing)/i,/breath (?:caught|hitched)/i,
  /shifted (?:my|his|her) weight/i,/a flicker of something/i,/for a moment,? (?:i|he|she) just/i,
  /the corner of (?:my|his|her) mouth/i,/before (?:i|he|she) could stop (?:myself|himself|herself)/i
];
const GESTURES=[/jaw/i,/fingers?/i,/hand through .*hair/i,/looked away/i,/glanced/i,/gaze/i,/shifted .*weight/i,/breath/i,/shoulders?/i,/leaned/i,/smirk/i];
const EXPLAIN_AFTER_SHOW=[/because deep down/i,/what (?:i|he|she) really meant/i,/the truth was/i,/it was (?:my|his|her) way of/i,/unable to admit/i,/even if (?:i|he|she) wouldn't say it/i];

export function deriveProseIntelligenceV345(input:Record<string,unknown>={}){
  const user=tx(input.latestUserMessage);
  const recent=(Array.isArray(input.recentCharacterReplies)?input.recentCharacterReplies:[]).map(tx).filter(Boolean).slice(-8);
  const style=(input.writingStyleDirector||{}) as Record<string,unknown>;
  const turn=(input.turnTaking||{}) as Record<string,unknown>;
  const director=(input.sceneDirector||{}) as Record<string,unknown>;
  const intent=(input.characterIntent||{}) as Record<string,unknown>;
  const char=(input.character||{}) as Record<string,unknown>;
  const userWords=words(user);
  const dialogueForward=low(style.dialogueMode).includes("dialogue") || userWords<16 || low(turn.responseShape).includes("short");
  const group=Number(director.maxActiveSpeakers||0)>2;
  const reflective=/\b(why|feel|remember|thinking|thought|tell me|what happened)\b/i.test(user) && userWords>8;
  const mode=group?"group":userWords<=5?"micro":reflective?"reflective":dialogueForward?"dialogue":"balanced";
  const targets:Record<string,[number,number]>={micro:[5,65],dialogue:[20,130],balanced:[35,190],reflective:[50,240],group:[35,210]};
  const dialogueRatio:Record<string,string>={micro:"60-100%",dialogue:"55-85%",balanced:"35-70%",reflective:"25-60%",group:"45-75%"};
  const narrationBudget=mode==="micro"?1:mode==="dialogue"?2:mode==="group"?3:4;
  const interiorityBudget=mode==="reflective"?2:mode==="balanced"?1:0;
  const gestureBudget=Math.max(0,Math.min(2,Number(intent.gestureBudget??1)));
  const openings=recent.map(r=>low(sentences(r)[0]||"").replace(/[^a-z0-9' ]/g,"").split(/\s+/).slice(0,5).join(" ")).filter(Boolean);
  const counts=new Map<string,number>(); openings.forEach(o=>counts.set(o,(counts.get(o)||0)+1));
  const stale=[...counts.entries()].filter(([,n])=>n>=2).map(([s])=>s).slice(0,5);
  const voice=tx(char.dialogue_style||char.voice||char.personality||"");
  return {
    mode,targetWords:targets[mode],dialogueRatioTarget:dialogueRatio[mode],narrationBeatBudget:narrationBudget,
    interiorityBudget,gestureBudget,sentenceTexture:tx(style.sentenceTexture)||"vary sentence length; favor spoken rhythm over polished symmetry",
    voiceAnchor:voice,staleOpeningSignatures:stale,
    prohibitedCadence:["cinematic body-language stacks","explain subtext after already showing it","therapist summary","decorative gaze/jaw/finger choreography","three polished paragraphs when one line would do"],
    instruction:`Write for the beat, not for a prose quota. Mode=${mode}. Target roughly ${targets[mode][0]}-${targets[mode][1]} words when the user's requested length permits. Dialogue may stand alone. Silence and a plain answer are valid. Do not explain subtext after showing it.`
  };
}

export function proseIntelligenceV345Issues(input:Record<string,unknown>={}){
  const reply=tx(input.reply); if(!reply) return [];
  const engine=(input.engine||{}) as Record<string,unknown>;
  const issues:string[]=[]; const wc=words(reply); const [min,max]=Array.isArray(engine.targetWords)?engine.targetWords as number[]:[0,220];
  const stock=AI_STOCK.filter(r=>r.test(reply)).length;
  const gestureCount=GESTURES.filter(r=>r.test(reply)).length;
  if(max && wc>Math.max(max*1.7,max+90)) issues.push("adaptive_prose_overwritten");
  if(stock>=2 || (stock>=1 && wc<90)) issues.push("ai_prose_stack_v345");
  const quoted=(reply.match(/[“"][^”"]+[”"]/g)||[]).join(" ");
  if((engine.mode==="dialogue"||engine.mode==="micro") && wc>80 && words(quoted)<Math.max(4,wc*.12)) issues.push("narration_swallowed_dialogue_v345");
  if(EXPLAIN_AFTER_SHOW.some(r=>r.test(reply))) issues.push("subtext_explained_after_showing_v345");
  const stale=Array.isArray(engine.staleOpeningSignatures)?engine.staleOpeningSignatures.map(low):[];
  const opening=low(sentences(reply)[0]||"").replace(/[^a-z0-9' ]/g,"").split(/\s+/).slice(0,5).join(" ");
  if(opening && stale.some((s:string)=>s && (opening.startsWith(s)||s.startsWith(opening)))) issues.push("repeated_prose_structure_v345");
  if(gestureCount>Math.max(2,Number(engine.gestureBudget??1)+1)) issues.push("gesture_choreography_overbudget_v345");
  return [...new Set(issues)];
}

export function sanitizeProseIntelligenceV345Reply(reply:string, issues:string[]=[]){
  let out=tx(reply); if(!out) return out;
  if(issues.includes("ai_prose_stack_v345")||issues.includes("gesture_choreography_overbudget_v345")){
    const kept=sentences(out).filter(s=>!AI_STOCK.some(r=>r.test(s)) && !(GESTURES.filter(r=>r.test(s)).length>=2));
    if(kept.length) out=kept.join(" ");
  }
  if(issues.includes("subtext_explained_after_showing_v345")){
    const kept=sentences(out).filter(s=>!EXPLAIN_AFTER_SHOW.some(r=>r.test(s))); if(kept.length) out=kept.join(" ");
  }
  return out.trim();
}
