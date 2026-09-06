export type ScenePhase337 = "arrival" | "settle" | "develop" | "change" | "land" | "close";

export type SceneIntelligenceDynamicWorld = {
  purpose: string;
  purposeStatus: "active" | "fulfilled" | "abandoned" | "unclear";
  phase: ScenePhase337;
  location: string;
  activity: string;
  reentryDetected: boolean;
  reentryPolicy: string;
  meaningfulSilenceAllowed: boolean;
  closureAllowed: boolean;
  closureDue: boolean;
  closureReasons: string[];
  stagnationScore: number;
  stagnationNatural: boolean;
  progressionNeed: "none" | "small" | "clear";
  environmentPolicy: string;
  initiativePolicy: string;
  timePolicy: string;
  noProtagonistOrbitPolicy: string;
  worldCollisionEligible: boolean;
  worldCollisionPolicy: string;
  locationIdentityPolicy: string;
  sceneMemory: { objects: string[]; spatial: string[]; unfinished: string[] };
  instruction: string;
};

type Args = {
  latestUserMessage?: string;
  recentMessages?: Array<Record<string, any>>;
  sceneState?: Record<string, any>;
  intelligenceState?: Record<string, any>;
  character?: Record<string, any>;
  socialGravity?: Record<string, any>;
  agency?: Record<string, any>;
  intent?: Record<string, any>;
  scenePhysics?: Record<string, any>;
  embodied?: Record<string, any>;
};

const norm = (v: unknown) => String(v ?? "").toLowerCase().replace(/[’]/g,"'").replace(/\s+/g," ").trim();
const clean = (v: unknown, n=260) => String(v ?? "").replace(/\s+/g," ").trim().slice(0,n);
const uniq = <T,>(xs:T[]) => [...new Set(xs.filter(Boolean))];

function recentUserAndAi(messages:Array<Record<string,any>>=[]){
  return messages.slice(-14).map(m=>({ sender:String(m?.sender||m?.role||""), text:String(m?.content||m?.text||m?.message||"") })).filter(x=>x.text.trim());
}
function explicitReentry(text=""){
  const t=norm(text);
  return /\b(?:the next day|next day|the next morning|next morning|later that day|later that week|days? later|weeks? later|three days later|a few days later|the following day|after class|after work|later that night|new scene|at the (?:party|cafe|caf[eé]|library|campus|gym|restaurant|bar|club|house|apartment|dorm|parking lot))\b/.test(t);
}
function leavingOrClosure(text=""){
  const t=norm(text);
  return /\b(?:i leave|i left|i walk away|i walked away|i go home|i went home|i stand up and leave|i grab my bag.*leave|bye|goodnight|good night|see you later|i have to go|gotta go|i'm leaving|im leaving)\b/.test(t);
}
function actionOnly(text=""){
  const raw=String(text||"").trim();
  if (!raw) return true;
  const outside=raw.replace(/\*[^*]+\*/g," ").trim();
  return !outside || /^[.]{1,2}$/.test(outside);
}
function directQuestion(text=""){
  const outside=String(text||"").replace(/\*[^*]+\*/g," ").trim();
  return /\?\s*$/.test(outside) || /^(?:why|what|when|where|who|how|are|is|do|did|can|could|would|will|have|has)\b/i.test(outside);
}
function inferPurpose(args:Args){
  const prior=(args.intelligenceState?.human_behavior_state||{}) as Record<string,any>;
  const fromIntent=clean(args.intent?.sceneObjective||prior.scene_objective||args.agency?.activeIntent||prior.active_intent,520);
  if (fromIntent && !/continue|respond|current beat|user's current/i.test(fromIntent)) return fromIntent;
  const loc=clean(args.sceneState?.location||args.scenePhysics?.location||"",120);
  const activity=clean(args.sceneState?.activity||args.intelligenceState?.scene_memory?.activity||"",180);
  if (activity) return `Continue the established scene activity: ${activity}.`;
  if (loc) return `Let the current interaction at ${loc} unfold naturally without inventing a bigger mission.`;
  return "Let the current interaction unfold naturally; do not invent a purpose just to create plot.";
}
function inferPhase(args:Args, reentry:boolean, close:boolean, stagnation:number):ScenePhase337{
  const prior=norm(args.intelligenceState?.presence_engine_state?.scene_phase||args.intelligenceState?.human_behavior_state?.scene_phase_337||"");
  if (reentry) return "arrival";
  if (close) return "close";
  if (args.embodied?.recognitionDue) return "change";
  if (stagnation>=6) return "change";
  if (["arrival","settle","develop","change","land","close"].includes(prior)) return prior as ScenePhase337;
  const count=(args.recentMessages||[]).slice(-12).length;
  if (count<=3) return "arrival";
  if (count<=6) return "settle";
  return "develop";
}
function stagnationScore(messages:Array<Record<string,any>>=[]){
  const rows=recentUserAndAi(messages).slice(-10);
  if (rows.length<6) return 0;
  let score=0;
  const generic=/\b(?:look(?:ed|ing)? (?:at|down|up)|nod(?:ded|s)?|shrug(?:ged|s)?|menu|coffee|fries|table|sat|sitting|lean(?:ed|ing)?|smile(?:d|s)?|what about you|you good|yeah|right|okay|sure)\b/i;
  const motion=/\b(?:leave|left|arrive|arrived|enter|entered|walk(?:ed|ing)?|stand(?:s|ing)? up|sit(?:s|ting)? down|pay|paid|order(?:ed|ing)?|bring(?:s|ing)?|start(?:ed|ing)?|finish(?:ed|ing)?|practice|race|class starts|drive|go home)\b/i;
  const all=rows.map(r=>r.text);
  const genericCount=all.filter(x=>generic.test(x)).length;
  const movementCount=all.filter(x=>motion.test(x)).length;
  score=Math.max(0,genericCount-movementCount);
  const repeatedTerms=["menu","table","coffee","look","nod","smile"].filter(term=>all.filter(x=>norm(x).includes(term)).length>=3).length;
  score+=repeatedTerms;
  return Math.min(10,score);
}
function naturalStillness(latest:string,args:Args){
  const t=norm(latest);
  if (actionOnly(latest) && /\b(?:look out|stare|sit quietly|stay quiet|silence|close my eyes|rest|wait|watch|listen)\b/.test(t)) return true;
  if (args.embodied?.state && args.embodied.state!=="none") return true;
  return false;
}
function collisionEligible(args:Args){
  const sg=args.socialGravity||{};
  const established=(args.intelligenceState?.unfinished_business||[]) as unknown[];
  return Boolean((sg.lifeContinuityDue||sg.manifestationDue) && (sg.relevantDomains||[]).length && established.length);
}

export function deriveSceneIntelligenceDynamicWorld(args:Args={}):SceneIntelligenceDynamicWorld {
  const latest=String(args.latestUserMessage||"");
  const reentry=explicitReentry(latest);
  const closureSignal=leavingOrClosure(latest) || Boolean(args.agency?.closureAllowed && /\b(?:close|leave|end|depart)\b/i.test(String(args.agency?.closurePolicy||"")));
  const stagnation=stagnationScore(args.recentMessages||[]);
  const stillness=naturalStillness(latest,args);
  const purpose=inferPurpose(args);
  const phase=inferPhase(args,reentry,closureSignal,stagnation);
  const closureReasons:string[]=[];
  if (leavingOrClosure(latest)) closureReasons.push("the user explicitly exits or closes the interaction");
  if (args.agency?.closureAllowed && phase==="land") closureReasons.push("the current beat can land without another hook");
  if (stagnation>=7 && !stillness) closureReasons.push("the current shape has repeated enough that a natural landing or small earned action is preferable to more filler");
  const closureAllowed=closureSignal || Boolean(args.agency?.closureAllowed) || phase==="land" || phase==="close";
  const closureDue=closureSignal || (stagnation>=8 && !directQuestion(latest));
  const previousPurpose=clean(args.intelligenceState?.human_behavior_state?.scene_purpose_337||"",520);
  const purposeStatus:SceneIntelligenceDynamicWorld["purposeStatus"] = closureDue ? "fulfilled" : previousPurpose && norm(previousPurpose)!==norm(purpose) && !reentry ? "abandoned" : purpose ? "active" : "unclear";
  const loc=clean(args.sceneState?.location||args.intelligenceState?.scene_memory?.location||"current location",160);
  const activity=clean(args.sceneState?.activity||args.intelligenceState?.scene_memory?.activity||"",220);
  const worldCollisionEligible=collisionEligible(args);
  const progressionNeed:SceneIntelligenceDynamicWorld["progressionNeed"] = stillness ? "none" : stagnation>=7 ? "clear" : stagnation>=4 ? "small" : "none";
  const objects=uniq((args.scenePhysics?.objectStates||[]).slice(0,8).map((x:any)=>clean(`${x?.object||x?.name||""}: ${x?.state||x?.location||""}`,180))).slice(0,8);
  const spatial=uniq((args.scenePhysics?.spatialRelations||[]).slice(0,8).map((x:any)=>clean(typeof x==="string"?x:JSON.stringify(x),180))).slice(0,8);
  const unfinished=uniq(((args.intelligenceState?.unfinished_business||[]) as unknown[]).map(x=>clean(x,260))).slice(-6);
  return {
    purpose,purposeStatus,phase,location:loc,activity,reentryDetected:reentry,
    reentryPolicy: reentry ? "This is a new scene boundary. Reset transient posture/prop choreography unless explicitly carried across; preserve only durable canon, relationship residue, obligations and memories." : "Stay in the current scene unless the user or a grounded event explicitly changes it.",
    meaningfulSilenceAllowed: actionOnly(latest) && !directQuestion(latest),
    closureAllowed,closureDue,closureReasons,stagnationScore:stagnation,stagnationNatural:stillness,progressionNeed,
    environmentPolicy:"Environment exists to constrain or change interaction, not to decorate silence. A waiter, tray crash, phone buzz, door opening, stranger, weather beat or ambient noise needs an established causal reason or a concrete consequence for the live interaction.",
    initiativePolicy: progressionNeed==="clear" ? "If the scene is genuinely stagnant, advance it with ONE small action licensed by the character's existing intent, current activity, real obligation or scene logistics. Do not manufacture a surprise event." : "Do not force motion. Answer, continue the activity, or remain quiet when that is the truthful beat.",
    timePolicy:"Story time is evidence-based. Message count is not elapsed time. Do not claim hours, closing time, lateness or a schedule change unless the scene/user/canon supports it.",
    noProtagonistOrbitPolicy:"The world continues around the user. Established friends, duties, classes, practices, races, social attention and NPC goals may proceed when causally relevant. They must not disappear to protect the ship, and they must not spawn randomly to entertain the user.",
    worldCollisionEligible,
    worldCollisionPolicy:worldCollisionEligible ? "A cross-domain collision is allowed only if an already-established person/obligation/thread plausibly reaches this location now. Keep it small and causal." : "Do not collide separate life domains this turn. No surprise rival, teammate, professor, call, text or obligation merely to create plot.",
    locationIdentityPolicy:`Behavior must fit ${loc}. Apply domain-scoped social gravity and role obligations only when this location plausibly activates them; public recognition is contextual, not universal.`,
    sceneMemory:{objects,spatial,unfinished},
    instruction:"SCENE INTELLIGENCE 3.37: preserve a scene purpose, let phases breathe, and make environment/action earn their existence. Current activity, physical state, location, social identity and real obligations constrain what can happen. Meaningful silence and clean closure are valid. Never extend a closing scene with a teaser hook. New scenes reset transient choreography. Stagnation is solved by one character-owned causal action or a natural landing, never by random incidents. The world is independent of the protagonist but not arbitrary.",
  };
}

export function sceneIntelligenceIssues({reply="", engine={} as Partial<SceneIntelligenceDynamicWorld>, latestUserMessage="", recentReplies=[] as string[]}={}){
  const issues:string[]=[];
  const text=String(reply||"").trim();
  const t=norm(text);
  if(!text) return issues;
  const decorative=/\b(?:a (?:waiter|server|student waiter)|the (?:waiter|server)|tray (?:crashed|clattered|dropped)|phone (?:buzzed|vibrated|rang)|door (?:opened|swung open)|someone (?:walked|burst|came) in|a stranger|someone at the next table|glasses? clattered|rain (?:tapped|drummed) against)\b/i;
  const consequence=/\b(?:order|food|bill|check|pay|couldn'?t hear|had to move|blocked|interrupted|called (?:his|her|their) name|needed him|needed her|practice|race|class|meeting|closing)\b/i;
  if(decorative.test(text) && !consequence.test(text) && !engine.worldCollisionEligible) issues.push("decorative_environment_filler");
  if(engine.closureDue && /\b(?:just as|before (?:you|she|he|they) could|suddenly|then (?:his|her|their) phone|phone buzzed|door opened|someone called out|wait)\b/i.test(t)) issues.push("forced_scene_extension");
  if(engine.reentryDetected && /\b(?:still holding|still had (?:the )?(?:menu|coffee|cup)|his hand (?:was|remained) on the table|her hand (?:was|remained) on the table|same untouched fries|the menu was still)\b/i.test(t)) issues.push("reentry_transient_state_leak");
  if(!engine.worldCollisionEligible && /\b(?:my (?:teammate|rival|coach|professor|manager|assistant) (?:called|texted|walked in|showed up)|practice got moved|race got moved|captain sent|professor needs|meeting got moved)\b/i.test(t)) issues.push("unearned_world_collision");
  if((engine.stagnationScore||0)>=7 && !engine.stagnationNatural){
    const prior=(recentReplies||[]).slice(-4).join(" ").toLowerCase();
    const repeated=["menu","coffee","fries","table","looked down","looked up","shrugged"].filter(k=>t.includes(k)&&prior.includes(k));
    if(repeated.length>=2 && !/\b(?:leave|pay|order|arrive|start|finish|go|walk|stand|class|practice|race|drive|need to)\b/i.test(t)) issues.push("scene_stagnation_loop");
  }
  if(engine.meaningfulSilenceAllowed && actionOnly(latestUserMessage) && text.split(/\s+/).length>55 && /\b(?:noticed|realized|could tell|clearly|obviously)\b/i.test(t)) issues.push("silence_overwritten");
  const wallpaper=(text.match(/\b(?:rain|music|glasses|cutlery|lights|window|room|crowd|voices|traffic|air|weather|clatter|hum|buzz)\b/gi)||[]).length;
  if(wallpaper>=4 && !consequence.test(text)) issues.push("environment_wallpaper_overload");
  return uniq(issues);
}

export function sanitizeSceneIntelligenceReply(reply="",issues:string[]=[],engine:Partial<SceneIntelligenceDynamicWorld>={}){
  let out=String(reply||"").trim();
  if(issues.includes("decorative_environment_filler")||issues.includes("environment_wallpaper_overload")){
    out=out.split(/(?<=[.!?])\s+/).filter(s=>!/\b(?:waiter|server|tray|phone buzzed|phone vibrated|door opened|stranger|next table|rain tapped|glasses? clattered)\b/i.test(s)).join(" ");
  }
  if(issues.includes("forced_scene_extension")){
    out=out.split(/(?<=[.!?])\s+/).filter(s=>!/\b(?:just as|suddenly|phone buzzed|door opened|someone called out|before you could)\b/i.test(s)).join(" ");
  }
  if(issues.includes("reentry_transient_state_leak")){
    out=out.replace(/\bstill (?:holding|had)[^.?!]*[.?!]?/gi,"").replace(/\bthe menu was still[^.?!]*[.?!]?/gi,"");
  }
  if(issues.includes("unearned_world_collision")){
    out=out.split(/(?<=[.!?])\s+/).filter(s=>!/\b(?:teammate|rival|coach|professor|manager|assistant|practice got moved|race got moved|captain sent|meeting got moved)\b/i.test(s)).join(" ");
  }
  if(issues.includes("scene_stagnation_loop") && out.split(/\s+/).length>55){
    const dialogue=out.match(/["“][^"”]{1,220}["”]/g)?.slice(0,2).join(" ")||"";
    if(dialogue) out=dialogue;
  }
  if(issues.includes("silence_overwritten") && engine.meaningfulSilenceAllowed){
    const dialogue=out.match(/["“][^"”]{1,180}["”]/)?.[0]||"";
    out=dialogue || out.split(/(?<=[.!?])\s+/).slice(0,1).join(" ");
  }
  return out.replace(/\s{2,}/g," ").replace(/\n{3,}/g,"\n\n").trim();
}
