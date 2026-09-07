import fs from "node:fs";

const checks=[]; const ok=(name,value)=>checks.push([name,Boolean(value)]);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const pub=JSON.parse(fs.readFileSync("public/velvet-version.json","utf8"));
const resilience=fs.readFileSync("src/utils/velvetResilience.js","utf8");
const bugReporter=fs.readFileSync("src/utils/bugReporter.js","utf8");
const ctx=fs.readFileSync("src/context/ChatsContext.jsx","utf8");
const chat=fs.readFileSync("src/pages/Chat.jsx","utf8");
const diagnostics=fs.readFileSync("src/pages/Diagnostics.jsx","utf8");
const css=fs.readFileSync("src/styles/diagnostics.css","utf8");
const edge=fs.readFileSync("supabase/functions/character-chat/index.ts","utf8");

ok("version 3.49.8 descendant",pkg.version===pub.version&&/^3\.49\.(?:8|9|[1-9]\d+)$/.test(pkg.version));
ok("release preserves invisible reliability descendant",/Invisible Reliability|Mobile Experience/.test(pub.release||""));
ok("v3.49.8 remains in stability lab",(pkg.scripts?.["stability:lab"]||"").includes("npm run verify:v3498"));
ok("v3.49.7 remains regression",(pkg.scripts?.["stability:lab"]||"").includes("npm run verify:v3497"));

ok("local trace ring exists",resilience.includes("velvet_generation_traces_v3498")&&resilience.includes("MAX_GENERATION_TRACES = 60"));
ok("trace lifecycle exported",["beginGenerationTrace","updateGenerationTrace","finishGenerationTrace","readGenerationTraces","clearGenerationTraces","summarizeGenerationTraces"].every((x)=>resilience.includes(`export function ${x}`)));
ok("trace privacy comment forbids narrative storage",resilience.includes("Never stores prompts, replies, memory text, lore text")&&resilience.includes("full account/conversation identifiers"));
ok("trace keeps only short refs",resilience.includes("function shortRef")&&resilience.includes("slice(-10)"));
ok("trace attempts are bounded",resilience.includes("MAX_TRACE_ATTEMPTS = 16")&&resilience.includes("nextAttempts.length > MAX_TRACE_ATTEMPTS"));
ok("trace classifies failure sources",["network","provider_capacity","provider_transient","timeout","auth","persistence","response_format"].every((x)=>resilience.includes(`\"${x}\"`)));

ok("client begins trace per generation",ctx.includes("beginGenerationTrace({")&&ctx.includes("diagnosticTraceRef"));
ok("client records Edge HTTP and retry",ctx.includes('phase: "edge-response"')&&ctx.includes('phase: "edge-retry"'));
ok("client records first text timing",ctx.includes('phase: "first-text"')&&ctx.includes("diagnosticFirstTokenMs"));
ok("client consumes provider diagnostic events",ctx.includes('eventData.type === "diagnostic"')&&ctx.includes("attempt: {"));
ok("client finishes success error and cancelled traces",ctx.includes('status: "success"')&&ctx.includes('status: "error"')&&ctx.includes('status: "cancelled"')&&ctx.includes("finishGenerationTrace"));
ok("generation sources distinguish workflows",["send","next-version","refine","director-rewrite","edit-user"].every((x)=>chat.includes(`\"${x}\"`)));

ok("edge streams diagnostic attempt events",edge.includes('type: "diagnostic"')&&edge.includes("onAttempt(attempt)"));
ok("failover emits launch winner and deadline",edge.includes('phase: "launch"')&&edge.includes('phase: "winner"')&&edge.includes('phase: "deadline"'));
ok("failover records provider HTTP and transient retry",edge.includes('phase: "http-error"')&&edge.includes('phase: "transient-retry"'));
ok("failover records compatibility and salvage",edge.includes('phase: "compatibility-fallback"')&&edge.includes('phase: "salvage"'));
ok("start event exposes numeric context diagnostics only",edge.includes('route: "foreground-sse"')&&edge.includes("promptChars:")&&edge.includes("responseTokenCeiling:")&&edge.includes("overallDeadlineMs:")&&edge.includes("hedgeDelaysMs:"));

ok("bug report automatically carries recent generation diagnostics",bugReporter.includes("generationDiagnostics")&&bugReporter.includes("readGenerationTraces")&&bugReporter.includes("recent: rows.slice(0, 8)"));
ok("private chat excerpt remains opt-in",bugReporter.includes("if (includePrivate && privateContext)")&&bugReporter.includes("privateChatExcerpt"));
ok("chat menu has one-tap debug report",chat.includes("copyGenerationDebugReport")&&chat.includes("Copy debug report")&&chat.includes("includePrivate: false"));
ok("Velvet Doctor has live generation diagnostics",diagnostics.includes("Live generation diagnostics")&&diagnostics.includes("Copy debug report")&&diagnostics.includes("Clear local traces"));
ok("diagnostics shows operation model timing fallback and error source",["Last operation","Last status","Last model","Median first text","Fallback / recovery","Last error source"].every((x)=>diagnostics.includes(x)));
ok("diagnostics refreshes live on trace events",diagnostics.includes("velvet:generation-diagnostics")&&diagnostics.includes("diagnosticRevision"));
ok("mobile trace list is responsive",css.includes(".v3498-trace-list")&&css.includes("@media(max-width:760px)")&&css.includes(".v3498-trace-row{grid-template-columns:1fr}"));

// Runtime smoke test for the local-only ring buffer.
const store=new Map();
globalThis.localStorage={getItem:(k)=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:(k)=>store.delete(k)};
const mod=await import(`../src/utils/velvetResilience.js?verify3498=${Date.now()}`);
const ref=mod.beginGenerationTrace({requestId:"aaaaaaaa-bbbb-cccc-dddd-eeeeeeee1234",generationId:"gen-5555559999",conversationId:"conversation-private-7777777777",operation:"reply"});
mod.updateGenerationTrace(ref,{model:"model-primary",firstTokenMs:321,context:{memoryCount:4,loreCount:2,promptChars:16000},attempt:{phase:"launch",model:"model-primary",elapsedMs:5}});
mod.updateGenerationTrace(ref,{model:"model-fallback",attempt:{phase:"winner",model:"model-fallback",elapsedMs:740}});
mod.finishGenerationTrace(ref,{status:"success",model:"model-fallback",durationMs:1420,fallbackUsed:true,recovery:"hedged-fallback"});
const rows=mod.readGenerationTraces();
ok("runtime trace stores technical fields",rows[0]?.status==="success"&&rows[0]?.firstTokenMs===321&&rows[0]?.context?.memoryCount===4&&rows[0]?.modelTrail?.length===2);
ok("runtime trace does not retain full conversation id",!JSON.stringify(rows[0]||{}).includes("conversation-private-7777777777")&&String(rows[0]?.conversationRef||"").length<=10);
ok("runtime summary counts fallback and recovery",mod.summarizeGenerationTraces(rows).fallbackCount===1&&mod.summarizeGenerationTraces(rows).recoveryCount===1);

let failed=0; for(const [name,value] of checks){console.log(`${value?"PASS":"FAIL"} ${name}`);if(!value)failed++;}
console.log(`\n${checks.length-failed}/${checks.length} v3.49.8 live diagnostics checks passed.`); if(failed)process.exit(1);
