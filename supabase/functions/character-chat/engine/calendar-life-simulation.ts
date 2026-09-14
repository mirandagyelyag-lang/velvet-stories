export type CalendarLifeSimulation = {
  storyClock: {
    raw: string;
    date: string;
    time: string;
    weekday: string;
    daypart: string;
    season: string;
    confidence: "low"|"medium"|"high";
  };
  temporalAnchors: string[];
  upcomingEvents: Array<{ title:string; storyTime:string; participants:string[]; status:string; dueState:string; details:string }>;
  recurringRoutines: string[];
  lifeDomains: string[];
  availability: { state:"available"|"occupied"|"unknown"; reason:string; policy:string };
  activePlans: string[];
  activeTransitThread: { active:boolean; anchor:string; destination:string; policy:string };
  dueCommitments: string[];
  scheduleConflicts: string[];
  travelConstraints: string[];
  elapsedContinuity: { recent:string; policy:string };
  sceneDuration: { expected:string; policy:string };
  calendarPolicy: string;
  recurringRoutinePolicy: string;
  availabilityPolicy: string;
  planCommitmentPolicy: string;
  travelPolicy: string;
  offscreenLifePolicy: string;
  temporalLanguagePolicy: string;
  instruction: string;
};

type Args = {
  character?: Record<string,any>;
  latestUserMessage?: string;
  recentMessages?: Array<Record<string,any>>;
  sceneState?: Record<string,any>;
  calendarEvents?: Array<Record<string,any>>;
  storyPlans?: Array<Record<string,any>>;
  intelligenceState?: Record<string,any>;
  persistentCast?: Array<Record<string,any>>;
};

type IssueArgs = {
  reply?: string;
  latestUserMessage?: string;
  recentCharacterReplies?: string[];
  engine?: Partial<CalendarLifeSimulation>;
};

const text=(v:any)=>String(v??"").replace(/\s+/g," ").trim();
const norm=(v:any)=>text(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[’']/g,"'").replace(/\s+/g," ").trim();
const list=(v:any)=>Array.isArray(v)?v:[];
const uniq=(xs:string[])=>[...new Set(xs.map(text).filter(Boolean))];

const DAYPARTS:[RegExp,string][]=[
  [/\b(?:early morning|dawn|sunrise|morning|mañana)\b/i,"morning"],
  [/\b(?:noon|midday|lunch(?:time)?|mediodia)\b/i,"midday"],
  [/\b(?:afternoon|tarde)\b/i,"afternoon"],
  [/\b(?:evening|dinner(?:time)?|atardecer)\b/i,"evening"],
  [/\b(?:night|late night|midnight|noche|madrugada)\b/i,"night"],
];
const WEEKDAYS=["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
const MONTHS=["january","february","march","april","may","june","july","august","september","october","november","december"];

function extractTimeAnchor(value:string){
  const v=text(value); if(!v) return "";
  const patterns=[
    /\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b[^.!?]{0,40}/i,
    /\b(?:today|tonight|tomorrow|yesterday|this morning|this afternoon|this evening|last night|next week|last week|this weekend|next weekend)\b[^.!?]{0,45}/i,
    /\b(?:at\s+)?(?:[01]?\d|2[0-3])(?::[0-5]\d)?\s*(?:a\.?m\.?|p\.?m\.?)\b[^.!?]{0,28}/i,
    /\b(?:at\s+)?(?:1[0-2]|[1-9])(?::[0-5]\d)?\s*(?:am|pm)\b[^.!?]{0,28}/i,
    /\b(?:in|after|for)\s+(?:a|an|one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+(?:minute|minutes|hour|hours|day|days|week|weeks)\b[^.!?]{0,35}/i,
  ];
  for(const p of patterns){ const m=v.match(p); if(m?.[0]) return text(m[0]); }
  for(const [p,label] of DAYPARTS){ if(p.test(v)) return label; }
  return "";
}

function inferClock(scene:Record<string,any>={}, messages:Array<Record<string,any>>=[]){
  const raw=text(scene.time_label||scene.time||scene.story_time||"");
  const recent=list(messages).slice(-24).map((m:any)=>text(m?.content||m?.text||"")).filter(Boolean);
  const combined=[raw,...recent.slice().reverse()].join(" | ");
  const lower=norm(combined);
  const weekday=WEEKDAYS.find((d)=>new RegExp(`\\b${d}\\b`,`i`).test(combined))||"";
  const month=MONTHS.find((m)=>new RegExp(`\\b${m}\\b`,`i`).test(combined))||"";
  const dateMatch=combined.match(/\b(?:20\d{2}[-\/]\d{1,2}[-\/]\d{1,2}|\d{1,2}[-\/]\d{1,2}[-\/]20\d{2}|(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:,\s*20\d{2})?)\b/i);
  const timeMatch=combined.match(/\b(?:1[0-2]|[1-9])(?::[0-5]\d)?\s*(?:a\.?m\.?|p\.?m\.?)\b|\b(?:[01]?\d|2[0-3]):[0-5]\d\b/i);
  let daypart=""; for(const [p,label] of DAYPARTS){ if(p.test(combined)){daypart=label;break;} }
  let season="";
  if(/\b(?:summer|verano)\b/i.test(combined)) season="summer";
  else if(/\b(?:winter|invierno)\b/i.test(combined)) season="winter";
  else if(/\b(?:spring|primavera)\b/i.test(combined)) season="spring";
  else if(/\b(?:autumn|fall|otoño|otono)\b/i.test(combined)) season="autumn";
  const confidence=(raw||dateMatch||timeMatch)?"high":(weekday||daypart||month)?"medium":"low";
  return { raw:raw||extractTimeAnchor(recent.slice().reverse().find((x)=>extractTimeAnchor(x))||"")||"unknown", date:text(dateMatch?.[0]||""), time:text(timeMatch?.[0]||""), weekday, daypart, season, confidence } as CalendarLifeSimulation["storyClock"];
}

function participants(v:any){return list(v).map(text).filter(Boolean).slice(0,12);}
function eventDueState(storyTime:string, clock:CalendarLifeSimulation["storyClock"]){
  const s=norm(storyTime); if(!s) return "unscheduled";
  const now=norm([clock.raw,clock.weekday,clock.daypart,clock.date,clock.time].filter(Boolean).join(" "));
  if(now && (s.includes(now)||now.includes(s))) return "due/now";
  if(/\b(?:today|tonight|this afternoon|this evening|this morning)\b/.test(s)) return "due/today";
  if(/\b(?:tomorrow|next|upcoming|later)\b/.test(s)) return "upcoming";
  if(/\b(?:yesterday|last night|last week|ago)\b/.test(s)) return "past";
  return "scheduled";
}
function normalizeEvent(e:Record<string,any>={}, clock:CalendarLifeSimulation["storyClock"]){
  const storyTime=text(e.story_time||e.storyTime||e.time||e.when||"");
  return { title:text(e.title||e.activity||e.name||"Untitled commitment"), storyTime, participants:participants(e.participants), status:text(e.status||"active"), dueState:eventDueState(storyTime,clock), details:text(e.details||e.activity||e.description||"") };
}

function routineAnchors(character:Record<string,any>={}, intelligence:Record<string,any>={}){
  const blobs=[
    character.routine,character.schedule,character.availability,character.world,character.scenario,character.role,
    intelligence?.human_behavior_state?.routine_schedule_anchor,intelligence?.human_behavior_state?.availability_window,
    intelligence?.human_behavior_state?.outside_obligation,intelligence?.human_behavior_state?.autonomy_agenda,
  ].map(text).filter(Boolean);
  return uniq(blobs.flatMap((blob)=>blob.split(/[\n;|]+/).map(text).filter((x)=>/class|school|university|college|work|shift|practice|train|race|meeting|family|gym|study|lecture|seminar|lab|game|match|event|travel|flight|drive|routine|schedule|saturday|sunday|monday|tuesday|wednesday|thursday|friday/i.test(x)))).slice(0,8);
}
function lifeDomains(character:Record<string,any>={}){
  const blob=norm([character.role,character.world,character.scenario,character.personality,character.core_motivation].join(" | "));
  const out:string[]=[];
  if(/university|college|campus|student|class/.test(blob)) out.push("university/classes");
  if(/race|racing|driver|garage|car/.test(blob)) out.push("racing/automotive");
  if(/athlete|team|practice|sport|football|soccer|polo|basketball|hockey|tennis/.test(blob)) out.push("sport/training");
  if(/business|company|board|heir|billion|million|ceo|family empire/.test(blob)) out.push("business/status/family obligations");
  if(/work|job|shift|intern/.test(blob)) out.push("work");
  if(/friend|social|party|popular|heartthrob/.test(blob)) out.push("social life");
  return uniq(out).slice(0,6);
}

function planRows(plans:Array<Record<string,any>>=[]){
  return list(plans).filter((p:any)=>!/^cancel/i.test(text(p.status))).map((p:any)=>{
    const title=text(p.title||p.activity||p.plan||p.summary||"");
    const when=text(p.story_time||p.when||p.time||"");
    const status=text(p.status||"active");
    return [title,when,status].filter(Boolean).join(" · ");
  }).filter(Boolean).slice(0,10);
}

function detectConflicts(events:Array<ReturnType<typeof normalizeEvent>>){
  const conflicts:string[]=[];
  for(let i=0;i<events.length;i++) for(let j=i+1;j<events.length;j++){
    const a=events[i],b=events[j]; if(!a.storyTime||!b.storyTime) continue;
    if(norm(a.storyTime)===norm(b.storyTime) && a.title!==b.title){
      const shared=a.participants.filter((p)=>b.participants.some((q)=>norm(q)===norm(p)));
      if(shared.length) conflicts.push(`${shared.join(", ")}: ${a.title} conflicts with ${b.title} at ${a.storyTime}`);
    }
  }
  return uniq(conflicts).slice(0,6);
}

function inferSceneDuration(scene:Record<string,any>={}){
  const blob=norm([scene.activity,scene.location,scene.scene_purpose,scene.purpose].join(" | "));
  if(/class|lecture|seminar|practice|training|game|match|race/.test(blob)) return "bounded activity; do not stretch indefinitely or end instantly without a cue";
  if(/breakfast|lunch|dinner|cafe|coffee|restaurant|meal/.test(blob)) return "ordinary meal/café duration; message count is not a clock";
  if(/party|event|concert|club/.test(blob)) return "long social window; compress routine stretches only with an explicit transition";
  if(/drive|car|travel|airport|station/.test(blob)) return "travel scene; preserve departure, transit and arrival order";
  return "unknown/organic; infer duration only from explicit story evidence";
}

function temporalAnchors(args:Args){
  const rows=[text(args.sceneState?.time_label),text(args.sceneState?.story_time),text(args.intelligenceState?.elapsed_since_previous)];
  for(const m of list(args.recentMessages).slice(-30)){
    const a=extractTimeAnchor(text((m as any)?.content||(m as any)?.text||"")); if(a) rows.push(a);
  }
  for(const e of list(args.calendarEvents).slice(0,16)) rows.push(text((e as any)?.story_time));
  for(const p of list(args.storyPlans).slice(0,12)) rows.push(text((p as any)?.story_time||(p as any)?.when));
  return uniq(rows).slice(0,14);
}

function inferActiveTransit(messages:Array<Record<string,any>>=[]){
  const recent=list(messages).slice(-16).map((m:any)=>text(m?.content||m?.text||"")).filter(Boolean);
  const transitions=/\b(?:we arrived|when we arrived|pulled up at|reached the|got to the|back at the cabin|arrived at the cabin|trip was over|drive was over|cancel(?:led)? the trip|not going anymore)\b/i;
  const plan=/\b(?:road trip|drive back|driving back|back to the car|get back to the car|hit the highway|on the highway|riding shotgun|ride shotgun|you'?re driving|you are driving|cabin)\b/i;
  let anchor="";
  for(let i=recent.length-1;i>=0;i--){
    if(transitions.test(recent[i])) return {active:false,anchor:"",destination:"",policy:"No unresolved transit plan detected."};
    if(plan.test(recent[i])) { anchor=recent[i]; break; }
  }
  const destination=/\bcabin\b/i.test(anchor)?"cabin":/\b(?:car|shotgun|driv|highway|road trip)\b/i.test(anchor)?"car/highway destination":"";
  return anchor
    ? {active:true,anchor:text(anchor).slice(0,360),destination,policy:"This spoken travel plan is live canon. Keep departure, vehicle roles, companions and destination coherent until arrival, cancellation, rescheduling, or an explicit user-authored transition."}
    : {active:false,anchor:"",destination:"",policy:"No unresolved transit plan detected."};
}

export function deriveCalendarLifeSimulation(args:Args={}):CalendarLifeSimulation{
  const clock=inferClock(args.sceneState||{},args.recentMessages||[]);
  const events=list(args.calendarEvents).filter((e:any)=>!/^cancel/i.test(text(e?.status))).map((e:any)=>normalizeEvent(e,clock)).slice(0,14);
  const routines=routineAnchors(args.character||{},args.intelligenceState||{});
  const plans=planRows(args.storyPlans||[]);
  const dueCommitments=uniq([
    ...events.filter((e)=>/due|today|now/.test(e.dueState)).map((e)=>`${e.title}${e.storyTime?` · ${e.storyTime}`:""}`),
    ...plans.filter((p)=>/today|tonight|now|this afternoon|this evening/i.test(p)),
  ]).slice(0,8);
  const occupied=[...events.filter((e)=>/due\/now/.test(e.dueState)).map((e)=>e.title),...routines.filter((r)=>/in class|at work|practice now|training now|race now/i.test(r))];
  const availability:CalendarLifeSimulation["availability"] = occupied.length
    ? {state:"occupied",reason:`Current commitment: ${occupied[0]}`,policy:"Being occupied is not rejection. Respect the commitment instead of making the character magically free."}
    : {state:"unknown",reason:"No exact current availability is canonically established.",policy:"Unknown means unknown. Do not invent a free calendar or a conflict; use broad life anchors only."};
  return {
    storyClock:clock,
    temporalAnchors:temporalAnchors(args),
    upcomingEvents:events,
    recurringRoutines:routines,
    lifeDomains:lifeDomains(args.character||{}),
    availability,
    activePlans:plans,
    activeTransitThread:inferActiveTransit(args.recentMessages||[]),
    dueCommitments,
    scheduleConflicts:detectConflicts(events),
    travelConstraints:uniq([text(args.sceneState?.location)?`Current location: ${text(args.sceneState?.location)}`:"","Location changes require a narrated departure/transit/arrival bridge unless a scene transition explicitly compresses travel."]).filter(Boolean).slice(0,5),
    elapsedContinuity:{recent:text(args.intelligenceState?.elapsed_since_previous||"unspecified"),policy:"Turn count is not elapsed time. Advance minutes/hours/days only from explicit user narration, calendar anchors, scene transitions, or a grounded compression marker."},
    sceneDuration:{expected:inferSceneDuration(args.sceneState||{}),policy:"A scene may breathe, compress routine action, or close. Do not make a lunch last for hours because many messages were exchanged, and do not teleport to night because the conversation slowed."},
    calendarPolicy:"Treat calendar facts and explicit plans as hard story canon until completed, cancelled, rescheduled or contradicted by a newer explicit correction. Preserve day/time relations across scenes.",
    recurringRoutinePolicy:"Recurring routines are broad availability patterns, not permission to invent exact appointments. A profile saying 'trains evenings' does NOT license 'practice at 6:15 today' unless established.",
    availabilityPolicy:"Characters have schedules and can be busy. They may decline, leave, be late, or suggest another time when grounded. Do not use fake busyness to manufacture rejection or drama.",
    planCommitmentPolicy:"A visible agreement to meet/call/go somewhere becomes an active plan. Remember it at the relevant story time. Missing, cancelling or rescheduling it needs an on-page cause and can create consequences.",
    travelPolicy:"Respect geography and travel order. Compress travel only across an explicit scene transition; never make a character occupy two places at once.",
    offscreenLifePolicy:"Between scenes, ordinary established routines may progress. Do not complete major relationship milestones or invent major life events off-screen. Off-screen time can create plausible fatigue, schedule pressure or routine consequences only when grounded.",
    temporalLanguagePolicy:"Words such as yesterday, tomorrow, tonight, last week, three hours later, again this Friday, and at 7 PM are factual claims. Use them only when supported by the temporal anchors/calendar or by the user's latest explicit transition.",
    instruction:"CALENDAR + LIFE SIMULATION 3.40: story time is a persistent world state, not prose decoration. Track the story clock conservatively, preserve explicit plans, recurring routines, obligations and availability, and let commitments compete naturally. Message count never equals elapsed time. Never invent precise schedules from broad identity. Respect weekday/daypart and travel constraints when they are established. A character can be unavailable, late, leave for a real obligation, miss something and face a consequence, or reschedule. Plans remain live until completed/cancelled/rescheduled. Advance off-screen life only through established routines/arcs. Use temporal language as canon claims, not vibes. If time is unknown, keep it unknown instead of fabricating precision.",
  };
}

function hasSupport(needle:string, engine:Partial<CalendarLifeSimulation>={}, latest=""){
  const n=norm(needle); if(!n) return false;
  const hay=norm([latest,...list(engine.temporalAnchors),...list(engine.upcomingEvents).flatMap((e:any)=>[e?.title,e?.storyTime,e?.details]),...list(engine.activePlans),...list(engine.recurringRoutines)].join(" | "));
  if(!hay) return false;
  return hay.includes(n) || n.includes(hay);
}
function userTransition(latest:string){return /\b(?:later|after(?:ward|wards)?|the next day|next morning|that night|hours? later|days? later|weeks? later|tomorrow|the following|time skip|fast forward|when we arrived|when i got|when we got|i leave|i left|we leave|we left)\b/i.test(latest);}

export function calendarLifeSimulationIssues(args:IssueArgs={}):string[]{
  const reply=text(args.reply), engine=args.engine||{}, latest=text(args.latestUserMessage); if(!reply) return [];
  const issues:string[]=[];
  const precise=[...reply.matchAll(/\b(?:at\s+)?((?:1[0-2]|[1-9])(?::[0-5]\d)?\s*(?:a\.?m\.?|p\.?m\.?)|(?:[01]?\d|2[0-3]):[0-5]\d|at\s+(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve))\b/gi)].map((m)=>text(m[1]));
  if(precise.some((t)=>!hasSupport(t,engine,latest))) issues.push("invented_precise_schedule");

  const relativeClaims=[...reply.matchAll(/\b(yesterday|tomorrow|tonight|last night|last week|next week|this friday|this saturday|this sunday|three hours later|two hours later|an hour later|hours later|days later|weeks later)\b/gi)].map((m)=>text(m[1]));
  if(relativeClaims.some((t)=>!hasSupport(t,engine,latest) && !userTransition(latest))) issues.push("unsupported_temporal_language");

  if(/^\s*(?:(?:a|an|one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+)?(?:minutes?|hours?|days?|weeks?)\s+later\b/i.test(reply) && !userTransition(latest)) issues.push("time_jump_without_transition");
  if(/\b(?:later that night|by midnight|the next morning|the following day)\b/i.test(reply) && !userTransition(latest) && !list(engine.temporalAnchors).some((x)=>/night|midnight|next morning|following day/i.test(String(x)))) issues.push("time_jump_without_transition");

  const due=list(engine.dueCommitments).map(text).filter(Boolean);
  if(due.length && /\b(?:nothing planned|no plans|free all day|completely free|nowhere to be|nothing going on)\b/i.test(reply)) issues.push("due_commitment_erased");

  if(list(engine.scheduleConflicts).length && /\b(?:i can do both|i'll be at both|no conflict|same time is fine)\b/i.test(reply)) issues.push("schedule_collision_ignored");

  if(/\b(?:teleported|instantly arrived|seconds later[^.!?]{0,35}(?:campus|downtown|garage|track|airport|home)|five minutes later[^.!?]{0,35}(?:across town|another city|airport|track|campus))\b/i.test(reply)) issues.push("travel_time_broken");

  const routines=list(engine.recurringRoutines).map(text).filter(Boolean);
  if(routines.length && /\b(?:every\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+at\s+\d|always\s+at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i.test(reply)) {
    const exact=reply.match(/\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)?[^.!?]{0,20}\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/i)?.[0]||"";
    if(exact && !hasSupport(exact,engine,latest)) issues.push("routine_overprecision");
  }

  if(/\b(?:we've been here for hours|we have been here for hours|it's been hours)\b/i.test(reply) && !hasSupport("hours",engine,latest) && !/hours?/i.test(latest)) issues.push("message_count_used_as_clock");

  if(engine.activeTransitThread?.active&&!userTransition(latest)){
    const r=norm(reply);
    const plan=norm(`${engine.activeTransitThread.anchor} ${engine.activeTransitThread.destination}`);
    const roadPlan=/\b(?:road trip|highway|cabin|car|driv|shotgun)\b/.test(plan);
    const unrelatedCampusDetours=[/\bquad\b/,/\bdorm(?:s|itory)?\b/,/\bcafeteria\b/,/\bgrab(?:bing)? lunch\b/,/\bdorm committee\b/].filter((p)=>p.test(r)).length;
    const preservesTransit=/\b(?:car|drive|driving|highway|road|cabin|shotgun|parking lot|gas station|checkout|others|group)\b/.test(r);
    if(roadPlan&&unrelatedCampusDetours>=1&&!preservesTransit) issues.push("active_transit_plan_abandoned");
  }

  return uniq(issues);
}

export function sanitizeCalendarLifeSimulationReply(reply:string, issues:string[], engine:Partial<CalendarLifeSimulation>={}):string{
  let out=text(reply);
  if(!out) return out;
  const has=(x:string)=>issues.includes(x);
  if(has("invented_precise_schedule")||has("routine_overprecision")){
    out=out.replace(/\b(?:at\s+)?(?:1[0-2]|[1-9])(?::[0-5]\d)?\s*(?:a\.?m\.?|p\.?m\.?)\b/gi,"later")
      .replace(/\b(?:at\s+)?(?:[01]?\d|2[0-3]):[0-5]\d\b/gi,"later");
  }
  if(has("unsupported_temporal_language")||has("time_jump_without_transition")){
    out=out.replace(/^\s*(?:(?:a|an|one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+)?(?:minutes?|hours?|days?|weeks?)\s+later[,.:;-]?\s*/i,"")
      .replace(/\b(?:later that night|by midnight|the next morning|the following day)[,.:;-]?\s*/gi,"");
  }
  if(has("due_commitment_erased")){
    out=out.replace(/\b(?:nothing planned|no plans|free all day|completely free|nowhere to be|nothing going on)\b/gi,"not sure how much time I have");
  }
  if(has("schedule_collision_ignored")){
    out=out.replace(/\b(?:i can do both|i'll be at both|no conflict|same time is fine)\b/gi,"I need to sort that conflict out");
  }
  if(has("message_count_used_as_clock")) out=out.replace(/\b(?:we've been here for hours|we have been here for hours|it's been hours)\b/gi,"we've been here a while");
  if(has("travel_time_broken")) out=out.replace(/\b(?:instantly arrived|teleported)\b/gi,"arrived");
  return text(out);
}
