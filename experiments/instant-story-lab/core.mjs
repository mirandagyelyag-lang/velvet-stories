export const MODELS = ["gemini-3.1-flash-lite", "gemini-3.5-flash-lite", "gemini-3.5-flash"];
export const CASES = {
  party: "An ongoing university party. Chase is enjoying the social attention. A small interruption changes his exchange with the user.",
  campus_event: "A campus event is being set up. Chase is socially involved and starts an exchange with the user for his own immediate reason.",
  group_outing: "Friends are organizing an outing. Chase participates and also seeks an exchange with the user; the plans remain open."
};
export function buildPacket(profile, reference, caseId) {
  if (!CASES[caseId]) throw new Error("Unknown case");
  return {
    systemInstruction: {parts: [{text: "Write a playable fictional scene. You author Chase and the world, never the user's actions, gaze, feelings, history, location or dialogue. Chase can address the user without placing them. Keep speaker attribution clear. Use plain spoken English and short concrete narration. Output JSON with a single string field opening."}]},
    contents: [{role: "user", parts: [{text: `Chase enjoys being wanted and is drawn to the user without settled feelings. His sarcasm is direct, personal and impulsive. An emotional shift should emerge from the exchange, not a narrated claim of chemistry.
Use this approved sample's rhythm without copying the event or catchphrases:
${reference}
New situation: ${CASES[caseId]}
Canon: ${JSON.stringify({name:profile.name,role:profile.role,world:profile.world,relationship:profile.relationship,boundaries:profile.boundaries})}
Write 90-160 words, mostly short spoken lines, sparse action. No scenery paragraph, fatigue/food plot, disposable admirer, body-language montage or final explanation. The user has not acted. End with an unresolved live moment.` }]}],
    generationConfig: {responseMimeType: "application/json", maxOutputTokens: 1600, temperature: 0.85}
  };
}
export function screenOpening(opening) {
  const text=String(opening||"").replace(/[’]/g, "'").trim(), issues=[];
  if(!text) issues.push("empty");
  if(text.split(/\s+/).length>200) issues.push("over_200_words");
  if(!/[.!?…][\"'”’)]?$/.test(text)) issues.push("possibly_incomplete");
  if(/\b(?:when you|you (?:turned|arrived|walked|stepped|sat|stood|look(?:ed)?|glared|were|are|weren[’\']t|missed|spent)|your (?:gaze|eyes?|shoulder|hand|movement)|don['’]t look at me like that|stop staring|you['’]re (?:jealous|disappointed)|you missed|you spent|is the silence a protest)\b/i.test(text)) issues.push("possible_invented_user_state");
  if(/\b(?:exhausting|monotonous|lukewarm|fluorescent|jaw tightened|caught your gaze)\b/i.test(text)) issues.push("rejected_style_pattern");
  if (/\byou\'re quiet\b/i.test(text) && !issues.includes("possible_invented_user_state")) issues.push("possible_invented_user_state");
  return issues;
}
