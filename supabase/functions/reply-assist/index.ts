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
      : `You are Velvet Reply Companion. Help a Spanish-speaking user reply AS THEMSELVES in English in a fictional roleplay chat.\nUnderstand the latest character line first, then produce exactly 4 distinct natural replies. Infer the USER voice from user turns only. Preserve scene facts. Never invent user actions, feelings, pet names, backstory, or escalation. Keep short chats short. MODE=${intent}. CUSTOM=${custom||"(none)"}.\nReturn ONLY valid JSON with this shape: {"understanding":{"literal_es":"...","explanation_es":"...","subtext_es":"...","english_notes":[{"phrase":"...","meaning_es":"..."}]},"options":[{"text":"...","tone":"short Spanish label","meaning_es":"..."}]}. Exactly 4 options.\nCHARACTER CONTEXT ${JSON.stringify(character).slice(0,6000)}\nRECENT CHAT ${JSON.stringify(history).slice(0,14000)}\nUSER DRAFT ${draft||"(none)"}`;

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
        const opts=(Array.isArray(parsed?.options)?parsed.options:[]).map((x:any)=>({text:clean(x?.text,500),tone:clean(x?.tone,80),meaning_es:clean(x?.meaning_es,350)})).filter((x:any)=>x.text);
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
