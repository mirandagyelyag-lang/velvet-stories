// Independent Groq fallback. Credentials remain on the Edge Function server.
export function buildGroqLivePrompt({
 character = {}, userIdentity = {}, transcript = [], latestUserMessage = "", scene = {},
 relationship = {}, memories = [], lore = [], recap = "", threads = [],
 direction = "", regeneration = "", rejected = [], care = "", npcCanon = "",
} = {}) {
 const clean = (v, n) => String(v ?? "").slice(0, n);
 const profileFields = ["name","role","description","personality","relationship","world","speech_style","humor_style","affection_style","emotional_defense","boundaries"];
 const profile = profileFields.map(k => k + ": " + clean(character[k], k === "boundaries" ? 700 : 350)).join("\n");
 const history = transcript.slice(-20).map((m,i,a) => clean(m.speaker,120) + (m.edited ? " [EDITED CURRENT CANON]" : "") + ": " + clean(m.content, i >= a.length-6 ? 900 : 420)).join("\n\n");
 return [
  "Write the next single in-character turn as visible prose only. No JSON, reasoning, scores or metadata. Put spoken dialogue in quotation marks. Narration addresses the user as you/your, never she/her. Third-person pronouns in dialogue about the user to an NPC are permitted.",
  "Current edited transcript and explicit user facts outrank stale summaries. Preserve location, roles, exact orders, possessions, pending topics, knowledge and relationship stage. Do not invent user speech, thoughts, feelings, consent or movement. Private narration is not audible. A short reply can be complete; avoid filler, stock gestures, interrogation and automatic flirtation.",
  "CHARACTER\n" + profile,
  "USER PERSONA\n" + clean(JSON.stringify(userIdentity),1300),
  "CHARACTER ENGINE\n" + clean(character.emotional_dna?.creator_approved_engine,1100),
  "PERSONAL EMOTIONAL CARE\n" + clean(character.emotional_dna?.support_style,1800) + "\n" + clean(care,3000),
  "AUTHORIZED NPC CANON\n" + clean(npcCanon,1000),
  "SCENE\n" + clean(JSON.stringify(scene),1300),
  "RELATIONSHIP\n" + clean(JSON.stringify(relationship),700),
  "RECAP (subordinate to corrected live turns)\n" + clean(recap,900),
  "MEMORIES\n" + memories.slice(0,5).map(m=>clean(m.content,220)).join("\n"),
  "LORE\n" + lore.slice(0,3).map(m=>clean(m.content,220)).join("\n"),
  "OPEN THREADS\n" + clean(JSON.stringify(threads),800),
  "CREATOR DIRECTION\n" + clean(direction,1600),
  "MODE\n" + clean(regeneration,1100),
  "REJECTED NON-CANON REPLIES\n" + rejected.slice(-2).map(r=>clean(r,450)).join("\n"),
  "CURRENT TRANSCRIPT\n" + history,
  "LATEST USER TURN (answer this conversational job first)\n" + clean(latestUserMessage,3000),
 ].join("\n\n");
}

export async function callGroqProse({
 apiKey = "", model = "openai/gpt-oss-120b", fallbackModel = "openai/gpt-oss-20b",
 systemInstruction = "", prompt = "", maxOutputTokens = 1000, isCancelled = async()=>false,
 fetchImpl = fetch, timeoutMs = 16000,
} = {}) {
 if (!apiKey) throw new Error("Groq fallback is not configured");
 if (await isCancelled()) throw new DOMException("Generation cancelled","AbortError");
 // Fail rather than silently amputating the scene to fit a provider budget.
 if (String(prompt).length + String(systemInstruction).length > 30000) throw new Error("Groq fallback context exceeds its compact budget");
 const models = [...new Set([model,fallbackModel].filter(Boolean))];
 const deadline = Date.now() + timeoutMs;
 let lastError = "Groq could not produce a reply";
 for (const candidate of models) {
  if (await isCancelled()) throw new DOMException("Generation cancelled","AbortError");
  const remaining = deadline - Date.now();
  if (remaining < 800) break;
  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(),remaining);
  try {
   const body = {
    model:candidate, stream:false,
    messages:[{role:"system",content:systemInstruction || "Write one grounded character roleplay turn. Return only visible prose."},{role:"user",content:prompt}],
    max_completion_tokens:Math.max(128,Math.min(2000,Number(maxOutputTokens)||1000)),
    ...(candidate.startsWith("openai/gpt-oss-") ? {reasoning_effort:"low"} : {}),
   };
   const response = await fetchImpl("https://api.groq.com/openai/v1/chat/completions",{
    method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+apiKey},
    signal:controller.signal,body:JSON.stringify(body),
   });
   const data = await response.json().catch(()=>({}));
   if (await isCancelled()) throw new DOMException("Generation cancelled","AbortError");
   if (!response.ok) {
    // Do not log provider payloads or credentials.
    lastError = response.status===429 ? "Groq quota is exhausted right now" : response.status===401||response.status===403 ? "Groq API key is invalid or lacks access" : "Groq returned HTTP "+response.status;
    if ([429,404,500,502,503,504].includes(response.status)) continue;
    throw new Error(lastError);
   }
   const choice=data?.choices?.[0];
   const reply=String(choice?.message?.content||"").trim();
   if (!reply || choice?.finish_reason==="length") {
    lastError=!reply ? "Groq returned an empty reply" : "Groq reply was truncated";
    continue;
   }
   return {reply,model:"groq/"+candidate,finishReason:String(choice?.finish_reason||"stop"),
    promptTokens:Number(data?.usage?.prompt_tokens||0),outputTokens:Number(data?.usage?.completion_tokens||0)};
  } finally {clearTimeout(timer);}
 }
 throw new Error(lastError);
}
