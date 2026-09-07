import fs from "node:fs";
import { derivePerformanceMobileV348 } from "../supabase/functions/character-chat/engine/performance-mobile-v348.ts";
import { deriveGenerationOrchestratorV346 } from "../supabase/functions/character-chat/engine/generation-orchestrator-v346.ts";
import { deriveProseIntelligenceV345, proseIntelligenceV345Issues, sanitizeProseIntelligenceV345Reply } from "../supabase/functions/character-chat/engine/prose-intelligence-v345.ts";

const checks=[]; const ok=(name,value)=>checks.push([name,Boolean(value)]);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const pub=JSON.parse(fs.readFileSync("public/velvet-version.json","utf8"));
const chat=fs.readFileSync("src/pages/Chat.jsx","utf8");
const ctx=fs.readFileSync("src/context/ChatsContext.jsx","utf8");
const edge=fs.readFileSync("supabase/functions/character-chat/index.ts","utf8");
const prose=fs.readFileSync("supabase/functions/character-chat/engine/prose-intelligence-v345.ts","utf8");
const css=fs.readFileSync("src/styles/velvet-v3497-five-fix-polish.css","utf8");
const main=fs.readFileSync("src/main.jsx","utf8");

ok("v3.49.7 lineage preserved",pkg.version===pub.version&&/^3\.49\.(?:[7-9]|[1-9]\d+)$/.test(pkg.version));
ok("release preserves five-fix descendant",/Five-Fix Polish Sweep|Invisible Reliability|Mobile Experience/.test(pub.release||""));

// 1 · speed + reliability
const microPerf=derivePerformanceMobileV348({orchestrator:{mode:"micro"},recentMessageCount:8,memoryRetrievalCount:2});
const standardPerf=derivePerformanceMobileV348({orchestrator:{mode:"standard"},recentMessageCount:16,memoryRetrievalCount:4});
ok("micro uses four hedged lanes",Array.isArray(microPerf.hedgeDelaysMs)&&microPerf.hedgeDelaysMs.length===4&&microPerf.hedgeDelaysMs[1]<=300);
ok("micro deadline tightened safely",microPerf.overallDeadlineMs===11500&&microPerf.cancellationPollMs===280);
ok("standard deadline is bounded",standardPerf.overallDeadlineMs===14800);
const microOrch=deriveGenerationOrchestratorV346({latestUserMessage:"yeah okay",recentMessages:[]});
ok("micro context budget reduced",microOrch.mode==="micro"&&microOrch.contextBudgetChars===12000&&microOrch.responseTokenCeiling===680);
ok("edge allows sub-11s micro deadline",edge.includes("Math.max(9000")&&edge.includes("cancellationPollMs || 280"));
ok("client stream stall recovery is 30s",ctx.includes("30000")&&ctx.includes("await wait(260)"));

// 2 · versions/regenerate
ok("version operations have stale-run sequence",chat.includes("versionOperationSeqRef")&&chat.includes("versionOperationSeqRef.current !== variantOp"));
ok("version rows dedupe normalized whitespace",chat.includes('content.replace(/\\s+/g, " ").trim()'));
ok("version loading state recovers after fetch error",chat.includes("[chatMessage.id]: { ...(current[chatMessage.id] || {}), loading: false }"));
ok("stop invalidates in-flight version operation",chat.includes("versionOperationSeqRef.current += 1")&&chat.includes("variantGenerationLockRef.current = false"));

// 3 · STOP / . / .. / ...
ok("single dot is consumed as STOP command",chat.includes('if (cleanMessage === ".")')&&chat.includes("if (busy) handleStop();"));
ok("double dot returns main POV",chat.includes('compactDots === ".."')&&chat.includes("RETURN_MAIN_POV_MESSAGE"));
ok("triple dot is silent continuation",chat.includes("compactDots.length >= 3")&&chat.includes("SILENT_CONTINUE_MESSAGE"));
ok("STOP arms primary POV return",chat.includes("returnMainPovAfterStopRef.current = true")&&chat.includes("Return narrative focus to"));
ok("STOP clears retry and action locks",chat.includes("retryInFlightRef.current = false")&&chat.includes("setRetryingGeneration(false)")&&chat.includes("setActionLoading(false)"));

// 4 · mobile UI
ok("v3497 mobile css is imported",main.includes("velvet-v3497-five-fix-polish.css"));
ok("mobile bubbles are narrower",css.includes("max-width: min(84vw")&&css.includes("max-width: min(78vw"));
ok("mobile composer keeps 44px touch controls",css.includes("width: 44px")&&css.includes("height: 44px"));
ok("version controls are pill-compact",css.includes("chat-message__version-nav.is-multiple")&&css.includes("border-radius: 999px"));
ok("error card is compact",css.includes("chat__send-error")&&css.includes("font-size: .64rem"));

// 5 · voice / prose quality
const microEngine=deriveProseIntelligenceV345({latestUserMessage:"Gosh! Stop, at least I'm trying!",recentCharacterReplies:[],writingStyleDirector:{},turnTaking:{},sceneDirector:{},characterIntent:{gestureBudget:1},character:{}});
ok("micro prose target tightened",microEngine.mode==="micro"&&microEngine.targetWords[0]===4&&microEngine.targetWords[1]===55&&microEngine.dialogueRatioTarget==="70-100%");
ok("micro prompt is dialogue-first",String(microEngine.instruction).includes("dialogue first")&&microEngine.gestureBudget<=1);
const sample='Roman shifts the work light slightly to get a better look at the manifold, his expression remaining neutral. "Just hold it steady. That’s all I asked."';
const issues=proseIntelligenceV345Issues({reply:sample,engine:microEngine,recentCharacterReplies:['Roman keeps his back turned while he reaches for the wrench. "Right there."']});
ok("micro cinematic lead is detected",issues.includes("micro_narration_lead_v3497"));
ok("repeated named-action opening is detected",issues.includes("repeated_named_action_opening_v3497"));
const cleaned=sanitizeProseIntelligenceV345Reply(sample,issues);
ok("micro cinematic lead sanitizes to dialogue",cleaned.startsWith('"Just hold it steady.'));
ok("new prose guards are wired as hard sanitizers",edge.includes("micro_narration_lead_v3497")&&edge.includes("repeated_named_action_opening_v3497"));

ok("v3.49.7 remains in stability lineage",(pkg.scripts?.["stability:lab"]||"").includes("npm run verify:v3497"));
ok("v3.49.6 remains regression",(pkg.scripts?.["stability:lab"]||"").includes("npm run verify:v3496"));

let failed=0; for(const [name,value] of checks){console.log(`${value?"PASS":"FAIL"} ${name}`);if(!value)failed++;}
console.log(`\n${checks.length-failed}/${checks.length} v3.49.7 five-fix polish checks passed.`); if(failed)process.exit(1);
