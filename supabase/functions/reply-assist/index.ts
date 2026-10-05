import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const clean = (v: unknown, n = 1000) => String(v ?? "").replace(/\u0000/g, "").trim().slice(0,n);
const stripFence = (s: string) => s.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
const textOf = (data: any) => (data?.candidates?.[0]?.content?.parts || []).map((p:any)=>p?.text||"").join("").trim();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const auth = req.headers.get("Authorization") || "";
    const url = Deno.env.get("SUPABASE_URL") || "";
    const anon = Deno.env.get("SUPABASE_ANON_KEY") || "";
    if (!auth || !url || !anon) return json({ error: "Unauthorized" }, 401);
    const sb = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: { user }, error: userError } = await sb.auth.getUser();
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    const apiKey = Deno.env.get("GEMINI_API_KEY") || "";
    if (!apiKey) return json({ error: "Gemini is not configured" }, 503);
    const body = await req.json().catch(()=>({}));
    const character = body?.character && typeof body.character === "object" ? body.character : {};
    const history = Array.isArray(body?.recentMessages) ? body.recentMessages.slice(-16).map((x:any)=>({speaker:clean(x?.speaker,80),text:clean(x?.text,1200)})).filter((x:any)=>x.text) : [];
    const task = clean(body?.task, 80);
    const draft=clean(body?.userDraft,700), intent=clean(body?.intent,80)||"ideas", custom=clean(body?.customIntent,700);
    const storyPathTask = task === "story_paths";
    const prompt = storyPathTask
      ? `You are Velvet Story Paths. Read the fictional roleplay scene and suggest exactly 4 genuinely different, plausible NEXT directions. Do not write the user's actions, dialogue, feelings, decisions, or POV. Do not rewrite the last reply. Preserve continuity, locations, relationships, and established character agency. Prefer paths that emerge from what is already happening; at most one option may introduce a plausible interruption or side character. Avoid generic therapy, instant romance, forced jealousy, random accidents, and repetitive campus/library defaults. Each direction must be an INTERNAL instruction for the next CHARACTER beat, not prose addressed to the user. Return ONLY valid JSON: {"paths":[{"title":"2-5 word English title","vibe":"1-3 word label","preview":"one short English sentence describing the possibility without deciding for the user","direction":"precise internal direction for Velvet; preserve user agency"}]}. Exactly 4 paths.\nCHARACTER CONTEXT ${JSON.stringify(character).slice(0,6000)}\nRECENT CHAT ${JSON.stringify(history).slice(0,14000)}`
      : `You are Velvet Reply Companion. Help a Spanish-speaking user reply AS THEMSELVES in English in a fictional roleplay chat.

FIRST understand the latest character line and the exact scene state. Then produce exactly 4 genuinely different, READY-TO-USE reply options.

These are not one-liners or caption ideas. Each option should be a small playable response with actual substance:
- normally 2-5 sentences and about 35-95 words when MODE=ideas;
- other tone modes may be 25-80 words, but still need a complete conversational beat;
- it may combine dialogue with ONE short user-controlled visible action in *asterisks* when that makes the reply feel natural;
- it must directly answer/react to what the character just said AND add one meaningful next beat;
- make the four options use different strategies, not paraphrases: e.g. playful challenge, honest admission, guarded deflection, bold move, practical response, curiosity, warmth, boundary, depending on the scene;
- infer the USER voice from user turns only;
- preserve established facts, location, relationship stage, and who did what;
- never write the OTHER character's dialogue/actions;
- never invent backstory, prior promises, possessions, pet names, major feelings, or a relationship milestone the user did not choose;
- do not force romance, jealousy, confession, touch, or escalation unless MODE/CUSTOM/context clearly supports it;
- avoid generic filler such as "I don't know yet", "we'll see", "what do you want me to say?", or empty quips;
- if the latest beat is simple, keep the answer natural rather than artificially dramatic.

MODE=${intent}. CUSTOM=${custom||"(none)"}.

Return ONLY valid JSON with this shape:
{"understanding":{"literal_es":"...","explanation_es":"...","subtext_es":"...","english_notes":[{"phrase":"...","meaning_es":"..."}]},"options":[{"text":"complete English reply ready to paste","tone":"short Spanish label","approach_es":"what this option actually does in the scene","meaning_es":"what it communicates / why it fits"}]}.
Exactly 4 options.

CHARACTER CONTEXT ${JSON.stringify(character).slice(0,6000)}
RECENT CHAT ${JSON.stringify(history).slice(0,14000)}
USER DRAFT ${draft||"(none)"}`;

    const models = [...new Set([
      Deno.env.get("GEMINI_FALLBACK_MODEL") || "gemini-3.5-flash-lite",
      Deno.env.get("GEMINI_EMERGENCY_MODEL") || "gemini-3.1-flash-lite",
      Deno.env.get("GEMINI_MODEL") || "gemini-3.6-flash",
      Deno.env.get("GEMINI_RECOVERY_MODEL") || "gemini-3.5-flash",
    ].filter(Boolean))];
    // v3.50.12: Reply Companion and Story Paths use the same fast hedge idea as chat.
    // Do not spend 18 seconds on each model serially. First valid four-option result wins.
    const assistControllers = new Map<string, AbortController>();
    const assistErrors: string[] = [];
    const assistHedges = [0, 120, 280, 520];
    const attemptAssist = async (model: string, index: number) => {
      const wait = assistHedges[index] ?? 800;
      if (wait) await new Promise((resolve)=>setTimeout(resolve, wait));
      const ctrl = new AbortController(); assistControllers.set(model, ctrl);
      const timer=setTimeout(()=>ctrl.abort(),7500);
      try {
        const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { method:"POST", signal:ctrl.signal, headers:{"Content-Type":"application/json","x-goog-api-key":apiKey}, body:JSON.stringify({contents:[{role:"user",parts:[{text:prompt}]}],generationConfig:{maxOutputTokens:storyPathTask?1000:1300,responseMimeType:"application/json",thinkingConfig:{thinkingLevel:"LOW"}}}) });
        const data=await r.json().catch(()=>({}));
        if(!r.ok) throw new Error(clean(data?.error?.message,500)||`Gemini returned ${r.status}`);
        const parsed=JSON.parse(stripFence(textOf(data)));
        if (storyPathTask) {
          const paths=(Array.isArray(parsed?.paths)?parsed.paths:[]).map((x:any)=>({title:clean(x?.title,90),vibe:clean(x?.vibe,60),preview:clean(x?.preview,320),direction:clean(x?.direction,700)})).filter((x:any)=>x.title&&x.direction);
          const unique=[...new Map(paths.map((x:any)=>[x.direction.toLowerCase().replace(/\s+/g," "),x])).values()].slice(0,4);
          if(unique.length!==4) throw new Error("Gemini returned fewer than four usable story paths.");
          return {paths:unique, model};
        }
        const opts=(Array.isArray(parsed?.options)?parsed.options:[]).map((x:any)=>({text:clean(x?.text,1400),tone:clean(x?.tone,80),approach_es:clean(x?.approach_es,320),meaning_es:clean(x?.meaning_es,500)})).filter((x:any)=>x.text);
        const unique=[...new Map(opts.map((x:any)=>[x.text.toLowerCase().replace(/\s+/g," "),x])).values()].slice(0,4);
        if(unique.length!==4) throw new Error("Gemini returned fewer than four usable reply options.");
        return {understanding:parsed?.understanding||{},options:unique, model};
      } catch(e) { const message=e instanceof Error?e.message:String(e); assistErrors.push(message); throw e; }
      finally { clearTimeout(timer); }
    };
    try {
      const winner=await Promise.any(models.map((model,index)=>attemptAssist(model,index)));
      for(const [model,ctrl] of assistControllers.entries()) if(model!==winner.model&&!ctrl.signal.aborted) ctrl.abort();
      return json(winner);
    } catch {
      for(const ctrl of assistControllers.values()) if(!ctrl.signal.aborted) ctrl.abort();
      return json({error:assistErrors.find(Boolean)||"Velvet couldn't think of replies right now."},502);
    }
  } catch(e) { return json({ error:e instanceof Error ? e.message : String(e) }, 500); }
});
