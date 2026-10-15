import { ADJACENT_DIALOGUE_RULE, CHARACTER_INNER_THOUGHT_RULE } from "./adjacent-dialogue.js";
import { withoutRepeatedLatest, uniqueContext } from "./economical-context.js";
import { overnightLanding } from "./overnight-landing.js";
import { retryAfterMs } from "./provider-quota.js";
// Independent Groq fallback. Credentials remain on the Edge Function server.
export function buildGroqLivePrompt({
 character = {}, userIdentity = {}, transcript = [], latestUserMessage = "", scene = {},
 relationship = {}, memories = [], lore = [], recap = "", threads = [],
 direction = "", regeneration = "", rejected = [], care = "", npcCanon = "",
} = {}) {
 const clean = (v, n) => String(v ?? "").slice(0, n);
 const profileFields = ["name","role","description","personality","relationship","world","speech_style","humor_style","affection_style","emotional_defense","boundaries"];
 const profile = profileFields.map(k => k + ": " + clean(character[k], k === "boundaries" ? 700 : 350)).join("\n");
 const history = withoutRepeatedLatest(transcript.slice(-20), latestUserMessage, userIdentity.name).map((m,i,a) => clean(m.speaker,120) + (m.edited ? " [EDITED CURRENT CANON]" : "") + ": " + clean(m.content, i >= a.length-6 ? 900 : 420)).join("\n\n");
 return [
  "Write the next single in-character turn as visible prose only. No JSON, reasoning, scores or metadata. Put spoken dialogue in quotation marks. Narration addresses the user as you/your, never she/her. Third-person pronouns in dialogue about the user to an NPC are permitted.",
  "Current edited transcript and explicit user facts outrank stale summaries. Preserve location, roles, exact orders, possessions, pending topics, knowledge and relationship stage. Do not invent user speech, thoughts, feelings, consent or movement. Private narration is not audible. A short reply can be complete; avoid filler, stock gestures, interrogation and automatic flirtation.",
  ADJACENT_DIALOGUE_RULE,
  "SPACE AND TIME — HARD CONTINUITY",
  overnightLanding(transcript.filter(m=>m.speaker===userIdentity.name || /^(?:you|user)$/i.test(m.speaker || "")).map(m=>m.content), latestUserMessage)?.instruction || "Respect explicit user-authored time and elapsed duration.",
  "Track user and character separately: a user-authored relocation or time skip moves ONLY the user unless the transcript establishes joint travel OR an accepted plan to meet at the landing destination; an accepted visit may occur offscreen during an explicit time skip. A prior shared cafe scene is not proof the character is in the user's later home.",
  "No teleportation: never place the character inside the user's house, bedroom or private space without grounded invitation/access. When an accepted visit is followed by [Time skip], routine arrival happens offscreen; start inside the agreed activity instead of narrating the door or arrival. Do not invent their address knowledge, a gift, a package, an open window, stairs, decor or permission to enter to bridge missing geography. If apart, continue the character's own grounded activity or an established communication channel; do not force an in-person encounter.",
  "TIME SKIP LANDING \u2014 ALL CHARACTERS: A bare [Time skip] skips the intervening logistics and lands inside the next mutually agreed scene, with its ordinary activity already underway. Infer that destination and activity from the latest accepted plan in the transcript (including short acceptances such as Sure / See ya). If studying together at home was agreed, begin already inside that established home with the notes/books out and the character working on the project; do not stop at knocking, entering, arriving, unpacking, travel, or another goodbye. Prior agreement supplies permission for this transition and routine arrival may occur offscreen. This does not invent access where no invitation/agreement exists, user dialogue, feelings, consent, a new relationship milestone, or completion of an unresolved decision. If no next scene was agreed, advance time within the established location and circumstances without inventing a destination or reunion. An explicit user-specified landing time/place/activity overrides the inferred plan. Preserve pending commitments, boundaries and emotional continuity; do not invent elapsed months or a changed dynamic for a bare skip.",
  "A bare time skip advances time; do not replay the prior completed exchange. If the amount is unspecified, use relative time without inventing a clock hour or day. Explicit Friday, tonight and scheduled commitments remain binding. New plans do not retroactively erase earlier plans; acknowledge any change and its reason.",
  "Saved scene state describes the previous beat. The newest explicit user location/time/action overrides it. User presence and character presence are separate facts, not one location field.",
  "OBJECT STATE: preserve the specific item and condition from the latest user correction. Iced coffee stays cold: no steam or hot mug. An exchanged number is completed; do not repeatedly return paper to a cup or fabricate props to redo it.",
  "SOCIAL WORLD — CHARACTER-SPECIFIC",
  clean(character.emotional_dna?.social_world_style,1500),
  "The character has independent plans and relationships. Show grounded social attention when the setting permits it, without forcing an interruption on every turn or private/emergency scene. New unnamed NPCs may participate naturally; never invent proper names or shared history.",
  "CHARACTER\n" + profile,
  "USER PERSONA\n" + clean(JSON.stringify(userIdentity),1300),
  "CHARACTER ENGINE\n" + clean(character.emotional_dna?.creator_approved_engine,1100),
  "PERSONAL EMOTIONAL CARE\n" + clean(character.emotional_dna?.support_style,1800) + "\n" + clean(care,3000),
  "AUTHORIZED NPC CANON\n" + clean(npcCanon,1000),
  "SCENE\n" + clean(JSON.stringify(scene),1300),
  "RELATIONSHIP\n" + clean(JSON.stringify(relationship),700),
  "RECAP (subordinate to corrected live turns)\n" + clean(recap,900),
  "MEMORIES\n" + uniqueContext(memories).slice(0,5).map(m=>clean(m.content,220)).join("\n"),
  "LORE\n" + uniqueContext(lore).slice(0,3).map(m=>clean(m.content,220)).join("\n"),
  "OPEN THREADS\n" + clean(JSON.stringify(threads),800),
  "CREATOR DIRECTION\n" + clean(direction,1600),
  "MODE\n" + clean(regeneration,1100),
  "REJECTED NON-CANON REPLIES\n" + uniqueContext(rejected).slice(-2).map(r=>clean(r,450)).join("\n"),
  "CURRENT TRANSCRIPT\n" + history,
  "LATEST USER TURN (answer this conversational job first)\n" + clean(latestUserMessage,3000),
  "FINAL WRITING DIRECTION (style only; transcript facts remain authoritative)\n" + CHARACTER_INNER_THOUGHT_RULE,
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
    lastError = response.status===429 ? "Groq is rate-limited. Retry in " + Math.ceil(retryAfterMs(response.headers,data)/1000) + " seconds." : response.status===401||response.status===403 ? "Groq API key is invalid or lacks access" : "Groq returned HTTP "+response.status;
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
