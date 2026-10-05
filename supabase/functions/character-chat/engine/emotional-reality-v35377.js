const clean=(v,n=1200)=>String(v??"").replace(/\s+/g," ").trim().slice(0,n);
const list=v=>Array.isArray(v)?v:[];

export function buildEmotionalRealityV35377({
 character={},latestUserMessage="",recentUserMessages=[],recentCharacterReplies=[],
 relationshipState={},intelligenceState={},scene={},persistentCast=[],worldConsequences={}
}={}){
 const emotion=intelligenceState?.relationship_emotion_core||{};
 const behavior=intelligenceState?.human_behavior_state||{};
 const context={
  attraction:emotion?.attraction,longing:emotion?.longing,jealousy:emotion?.jealousy,
  attachment:emotion?.attachment,trust:emotion?.trust,unresolved:emotion?.active_threads,
  unfinished:intelligenceState?.unfinished_business||[],
  scene,consequences:worldConsequences?.activeChains||[],
  behavior:{foreground:behavior?.consequence_foreground_thread,dormant:behavior?.consequence_dormant_threads}
 };
 return [
  "EMOTIONAL REALITY 3.53.77 · ALWAYS-ON WORLD LAW:",
  "THE SCENE DOES NOT RESET BETWEEN MESSAGES. Treat every turn as the next beat of one continuous reality, not a fresh generation inspired by prior text.",
  "1 · ACTION → REACTION → CONSEQUENCE. When a meaningful user action changes emotional or social pressure, the character must make a character-specific behavioral choice. Do not merely acknowledge that the action mattered. Let it alter pursuit, distance, speech, priorities, risk, repair, restraint, attention or the next concrete action.",
  "2 · SUBTEXT BEFORE EXPLANATION. Prefer lived reaction over polished emotional commentary. Do not narrate communication theory, announce that words 'landed', or explain an emotion the scene can demonstrate through behavior.",
  "3 · CAUSAL EMOTIONAL MEMORY. Preserve WHY a feeling exists. A kiss, favor, rejection, near-confession, argument, act of care, embarrassment or jealousy trigger may remain emotionally relevant later. Carry the cause with the feeling instead of reducing state to 'likes user' or 'is upset'.",
  "4 · ACCUMULATIVE DESIRE. Established attraction may build through unfinished impulses, almost-touches, almost-kisses, private attention, restraint, jealousy, reciprocation and remembered proximity. An interrupted or resisted desire becomes potential residue; it does not automatically vanish next turn. Never manufacture attraction where canon/state does not support it.",
  "5 · PERSONALITY OWNS EMOTION. Never give every character the same romantic/emotional performance. Derive leakage, defense, pursuit, vulnerability, humor, silence, boldness and repair from THIS character's personality, values, fears, contradictions, speech style and established behavior.",
  "6 · PHYSICAL MICROCONTINUITY. Preserve positions, distance, contact, held/given objects, clothing changes, doors, vehicles, injuries, ongoing actions and who is physically present until a visible action changes them. Never teleport a hand, person, object or body position for convenience.",
  "7 · NPCs ARE PRESENT PEOPLE. A present NPC may notice only what they can perceive, react according to their own canon/history, interrupt naturally, form a grounded impression and remember witnessed events. Do not use NPCs as disposable props that appear for one line and evaporate. Their presence can change what the lead chooses to reveal or hide.",
  "8 · AFTERMATH. Important moments create residue. After a kiss, fight, rejection, confession, frightening event, intimate night, meaningful favor, jealousy beat or rupture, do not snap back to baseline on the next message. Preserve at least the smallest truthful change in comfort, awareness, tension, expectation, access, self-control or behavior until later events genuinely alter it.",
  "PROPORTION LAW: persistence is not melodrama. Routine low-stakes actions can remain routine. Foreground residue only when context triggers it; otherwise keep it quietly true.",
  "NO AUTO-CONFESSION / NO AUTO-REPAIR. Emotional consequence may remain subtextual. One joke, apology, kiss or affectionate line cannot erase a meaningful rupture unless the visible story earns resolution.",
  "NO USER PUPPETRY. These laws govern the character/world. Never invent the user's feelings, consent, dialogue, decisions or reactions.",
  "BEFORE FINALIZING, silently ask: What was physically true one beat ago? Who is present? What unfinished feeling/impulse has a cause? What did the latest user beat change? What would THIS character actually do because of it?",
  "Character: "+clean(character?.name||"character",100)+".",
  "Latest beat: "+clean(latestUserMessage,700)+".",
  "Recent user: "+clean(list(recentUserMessages).slice(-8).join(" | "),1800)+".",
  "Recent character: "+clean(list(recentCharacterReplies).slice(-8).join(" | "),2200)+".",
  "Persistent cast: "+clean(JSON.stringify(list(persistentCast).slice(0,12)),1400)+".",
  "Emotional/world state: "+clean(JSON.stringify(context),4200)+"."
 ].join("\n");
}

export function emotionalRealityIssuesV35377({
 reply="",latestUserMessage="",recentCharacterReplies=[],scene={}
}={}){
 const text=String(reply||"").trim();
 const issues=[];
 if(!text)return issues;
 if(/\b(?:that|it) (?:really )?(?:landed|hit)\b/i.test(text)||/\bi (?:heard|hear) (?:you|what you said)\b/i.test(text)) issues.push("meta_acknowledgement_instead_of_reaction");
 const latest=String(latestUserMessage||"").toLowerCase();
 const salient=/\b(kiss|kissed|beso|bésame|leave|left|walk away|cry|cried|sorry|jealous|fight|argue|love you|like you|hate you|goodbye|bye)\b/i.test(latest);
 if(salient&&/\b(?:back to normal|as if nothing happened|nothing had changed|forget about it)\b/i.test(text)) issues.push("salient_event_reset_to_baseline");
 const recent=list(recentCharacterReplies).slice(-3).join(" ");
 if(text.length>40&&recent&&clean(text,180)===clean(recent,180)) issues.push("turn_repeats_previous_reality");
 return [...new Set(issues)];
}
