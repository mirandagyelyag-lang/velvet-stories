import fs from "node:fs";
const checks=[]; const ok=(name,value)=>checks.push([name,Boolean(value)]);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const pub=JSON.parse(fs.readFileSync("public/velvet-version.json","utf8"));
const chat=fs.readFileSync("src/pages/Chat.jsx","utf8");

ok("version 3.49.6 descendant",pkg.version===pub.version&&/^3\.49\.(?:[6-9]|[1-9]\d+)$/.test(pkg.version));
ok("release preserves retry lineage",/Retry Pipeline Fix|Five-Fix Polish Sweep|Invisible Reliability|Mobile Experience/.test(pub.release||""));
ok("failed generation has explicit state",chat.includes("failedGenerationRef")&&chat.includes("failedGeneration"));
ok("retry has immediate in-flight lock",chat.includes("retryInFlightRef.current")&&chat.includes("if (busy || !conversationReady || retryInFlightRef.current) return"));
ok("normal retry anchors exact user turn",chat.includes("expectedUserMessageId: savedUserMessageId")&&chat.includes("mode: \"reply\""));
ok("regenerate retry preserves target",chat.includes("regenerateMessageId: targetId")&&chat.includes("source: \"regenerate\""));
ok("next-version retry preserves target",chat.includes("source: \"next-version\"")&&chat.includes("retryContext = { mode: \"regenerate\""));
ok("refine retry preserves target",chat.includes("source: \"refine\""));
ok("director rewrite retry preserves target",chat.includes("source: \"director-rewrite\""));
ok("retry routes regenerate back through regenerateCharacterReply",chat.includes("if (inferredFailure?.mode === \"regenerate\"")&&chat.includes("await regenerateCharacterReply("));
ok("retry routes normal reply through explicit expected user id",/await generateCharacterReply\(character\.id, \{ expectedUserMessageId(?:, diagnosticSource: [^}]+)? \}\)/.test(chat));
ok("retry reconciles durable messages first",chat.includes("const refreshed = await reloadConversationMessages(character.id)")&&chat.includes("const alreadyFinished"));
ok("already-finished turn does not duplicate",chat.includes("if (!alreadyFinished) {")&&/await generateCharacterReply\(character\.id, \{ expectedUserMessageId(?:, diagnosticSource: [^}]+)? \}\)/.test(chat));
ok("retry button shows progress",chat.includes('retryingGeneration ? "Retrying…" : "Retry"')&&chat.includes('LoaderCircle className="spin"'));
ok("retry sets sending lock synchronously",chat.includes("setRetryingGeneration(true)")&&chat.includes("setSending(true)"));
ok("successful retry clears remembered failure",chat.includes("clearGenerationFailure();")&&chat.includes("setRetryingGeneration(false)"));
ok("failed retry keeps same context",chat.includes("rememberGenerationFailure(error, inferredFailure || {})"));
ok("resolved reply error uses exact failed user id",chat.includes("failedTurnHasCompletedReply")&&chat.includes("failedGeneration.expectedUserMessageId"));
ok("regenerate error is not hidden just because old reply exists",chat.includes('failedGeneration?.mode === "regenerate"')&&chat.includes("resolvedGenerationError"));
ok("v3.49.5 remains regression",(pkg.scripts?.["stability:lab"]||"").includes("verify:v3495"));
ok("v3.49.6 stays in lab",(pkg.scripts?.["stability:lab"]||"").includes("npm run verify:v3496"));

let failed=0; for(const [name,value] of checks){console.log(`${value?"PASS":"FAIL"} ${name}`);if(!value)failed++;}
console.log(`\n${checks.length-failed}/${checks.length} v3.49.6 retry-pipeline checks passed.`); if(failed)process.exit(1);
