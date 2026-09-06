import fs from "node:fs";
const checks=[]; const ok=(name,value)=>checks.push([name,Boolean(value)]);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const pub=JSON.parse(fs.readFileSync("public/velvet-version.json","utf8"));
const chat=fs.readFileSync("src/pages/Chat.jsx","utf8");
const ctx=fs.readFileSync("src/context/ChatsContext.jsx","utf8");
const edge=fs.readFileSync("supabase/functions/character-chat/index.ts","utf8");
const css=fs.readFileSync("src/styles/velvet-v3495-chat-recovery-clean-ui.css","utf8");
const main=fs.readFileSync("src/main.jsx","utf8");

ok("version 3.49.5",pkg.version==="3.49.5"&&pub.version==="3.49.5");
ok("release names clean chat recovery",/Chat Recovery \+ Clean Chat UI/.test(pub.release||""));
ok("client turn recovery is anchored to expected user message",ctx.includes("findPersistedReplyForThisTurn")&&ctx.includes("expectedUserMessageId")&&ctx.includes("rows.slice(expectedIndex + 1)"));
ok("late stream error cannot invalidate finalMessage",ctx.includes("if (streamError && !finalMessage)"));
ok("stream errors try persisted recovery first",ctx.includes('recoverPersistedReplyForThisTurn("stream-error-recovery")'));
ok("SSE close tries persisted recovery",ctx.includes('recoverPersistedReplyForThisTurn("sse-close-recovery")'));
ok("catch has final persisted-reply safety net",ctx.includes('recoverPersistedReplyForThisTurn("post-error-recovery")'));
ok("server records committed reply authority",edge.includes("let committedReplyMessage")&&edge.includes("committedReplyMessage = savedMessage"));
ok("post-reply enrichment failure returns done",edge.includes("post-reply enrichment degraded; preserving committed reply")&&edge.includes('type: "done"')&&edge.includes("enrichmentDegraded: true"));
ok("hedge deadline always settles",edge.includes("if (!settled) {")&&edge.includes("transient winner flag must never leave resultPromise hanging"));
ok("UI suppresses resolved generation errors",chat.includes("currentTurnHasCompletedReply")&&chat.includes("visibleSendError"));
ok("generation-error classifier is scoped",chat.includes("isReplyGenerationErrorMessage"));
ok("single response no longer renders 1/1 controls",chat.includes("hasMultipleVersions")&&chat.includes("chat-message__version-arrow--new")&&chat.includes("<RefreshCw size={14}"));
ok("multi-version navigation remains",chat.includes("chat-message__version-count")&&chat.includes("Previous response")&&chat.includes("Next response"));
ok("message tap actions remain available",chat.includes("onClick={handleMessageTap}")&&chat.includes("onOpenActions(message)"));
ok("Studio remains reachable from menu",chat.includes("Velvet Experience")&&chat.includes("setExperienceOpen(true)"));
ok("mobile duplicate Studio composer button hidden",css.includes("chat__experience-trigger")&&css.includes("display: none !important"));
ok("mobile permanent ellipsis chrome hidden",css.includes("chat-message__actions--inline")&&css.includes("display: none !important"));
ok("mobile composer is compact",css.includes("min-height: 58px !important")&&css.includes("height: 42px !important"));
ok("error card is compact",css.includes("width: min(520px")&&css.includes("min-height: 34px"));
ok("new CSS imported last",main.trim().endsWith('import "./styles/velvet-v3495-chat-recovery-clean-ui.css";'));
ok("v3.49.4 remains regression",(pkg.scripts?.["stability:lab"]||"").includes("verify:v3494"));
ok("v3.49.5 runs first in lab",(pkg.scripts?.["stability:lab"]||"").startsWith("npm run verify:v3495"));

let failed=0; for(const [name,value] of checks){console.log(`${value?"PASS":"FAIL"} ${name}`);if(!value)failed++;}
console.log(`\n${checks.length-failed}/${checks.length} v3.49.5 chat-recovery/UI checks passed.`); if(failed)process.exit(1);
