import { CHARACTER_INNER_THOUGHT_RULE } from "./adjacent-dialogue.js";
const clean=(v,max=900)=>String(v??"").replace(/\s+/g," ").trim().slice(0,max);

export function buildInteriorContinuityV35375({
  character={},
  latestUserMessage="",
  recentUserMessages=[],
  recentCharacterReplies=[],
  relationshipState={},
  intelligenceState={},
  scene={},
}={}){
  const recentUser=(Array.isArray(recentUserMessages)?recentUserMessages:[]).slice(-8).map(v=>clean(v,500)).filter(Boolean).join(" | ");
  const recentCharacter=(Array.isArray(recentCharacterReplies)?recentCharacterReplies:[]).slice(-8).map(v=>clean(v,650)).filter(Boolean).join(" | ");
  const state=clean(JSON.stringify({
    relationship:relationshipState||{},
    emotion:intelligenceState?.relationship_emotion_core||{},
    unfinished:intelligenceState?.unfinished_business||[],
    scene:scene||{},
  }),3600);

  return [
    CHARACTER_INNER_THOUGHT_RULE,
    "INTERIOR CONTINUITY: carry forward only this character's grounded feelings and unfinished concerns. Private emotion can persist across scenes without becoming a confession or proof of the user's feelings. No automatic attraction, jealousy or instant love.",
    "Current character: "+clean(character?.name||"character",100)+".",
    "Latest user beat: "+clean(latestUserMessage,700)+".",
    "Recent user beats: "+(recentUser||"none")+".",
    "Recent character beats: "+(recentCharacter||"none")+".",
    "Continuity state: "+(state||"none")+".",
  ].join("\n");
}

export function interiorContinuityIssuesV35375(reply="",context={}){
  const text=clean(reply,8000);
  const issues=[];
  const latest=clean(context?.latestUserMessage||"",800).toLowerCase();
  const romanticCue=/\b(kiss|kissed|kissing|beso|bésame|kiss me|hug|hold me|cuddle|date|jealous|celos|like you|love you)\b/i.test(latest);
  const established=Boolean(context?.establishedAttraction||context?.relationshipState?.attraction||context?.relationshipState?.romantic_interest);
  if(romanticCue&&established&&text.length<90) issues.push("salient-romantic-beat-underwritten");
  if(romanticCue&&/\b(he|she) kissed you\b\.?$/i.test(text)) issues.push("romantic-action-executed-without-experience");
  return issues;
}
