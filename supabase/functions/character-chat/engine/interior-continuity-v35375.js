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
    "INTERIOR CONTINUITY 3.53.75 · ALWAYS ON:",
    "The character has an inner life that persists from beat to beat. Feelings, attraction, irritation, jealousy, tenderness, curiosity, fear, anticipation, embarrassment, relief, desire and unresolved thoughts do not vanish when the visible action changes.",
    "Before writing the next beat, silently recover what this character has been feeling toward the user and about the immediate situation. Carry forward only emotions supported by canon, recent behavior, relationship state or clear subtext. Never invent instant love.",
    "EVERY meaningful moment must be experienced, not merely executed. Show the character-specific human consequence of what just happened: what lands, what changes internally, what they notice, what impulse appears, what they suppress, and/or what leaks into behavior.",
    "Do not turn this into constant explicit thought narration. Interior life may surface through attention, timing, breath, restraint, touch, posture, interrupted speech, a choice, a mistake, sensory focus, changed distance, or a brief free-indirect thought. Choose the expression that fits THIS character.",
    "ROMANTIC / INTIMATE SALIENCE: when attraction is established and the user initiates or permits a meaningful romantic beat, treat the fact that it came from THEM as emotionally significant. Connect BEFORE (existing want/tension), DURING (physical and sensory experience plus changing self-control), and AFTER (residue/consequence).",
    "For kisses and other consensual affectionate contact, do not reduce the beat to 'he kissed you' / 'she kissed you'. When the moment is narratively important, render specific progression: approach or split-second reaction, first contact, character-specific touch/restraint, sensory impression, how the contact changes, and the immediate aftermath. Use only as much detail as the scene earns.",
    "A guarded character does not become emotionally empty. They may hide, joke, deflect or regain composure AFTER the reader can feel that the moment affected them. Defense changes expression, not existence of feeling.",
    "A confident/flirtatious character still has stakes when the person they genuinely want reciprocates. Familiar skill must not erase personal impact.",
    "This law applies beyond romance: favors, arguments, rejection, praise, jealousy, care, danger, embarrassment, reunions, departures, apologies, gifts, ordinary tenderness, social slights, victories and losses should retain emotional cause-and-effect when salient.",
    "PROPORTIONALITY: ordinary low-stakes actions stay light. Do not inflate every glance, drink, doorway or routine task into a revelation. Spend interior detail where the beat changes pressure, relationship, desire, understanding, vulnerability, conflict or choice.",
    "NO REPETITIVE TELLS: do not default every turn to tightened jaw, clenched hands, breath catching, pulse racing, darkened gaze, smirk, throat working or generic heat. Vary embodiment and let personality determine what leaks.",
    "NO USER MIND-READING: describe only the character's experience and observable user actions. Never decide what the user feels, wants, enjoys or thinks unless they stated it.",
    "NO AUTO-CONFESSION: strong interior impact does not require verbal confession, relationship escalation or loss of slow burn. The reader may know more than the character is willing to say.",
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
