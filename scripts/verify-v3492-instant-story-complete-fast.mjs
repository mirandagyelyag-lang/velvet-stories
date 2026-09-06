import fs from "node:fs";
import { instantStoryLooksComplete } from "../supabase/functions/character-chat/engine/instant-story-v3492.ts";

const checks=[]; const ok=(name,value)=>checks.push([name,Boolean(value)]);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const pub=JSON.parse(fs.readFileSync("public/velvet-version.json","utf8"));
const edge=fs.readFileSync("supabase/functions/character-chat/index.ts","utf8");
const characters=fs.readFileSync("src/context/CharactersContext.jsx","utf8");
const syntax=fs.readFileSync("scripts/verify-chat-syntax.mjs","utf8");

const complete=`Roman catches sight of you near the garage entrance and wipes his hands on a rag before walking over. “Good, you’re here.” He tips his head toward the car behind him. “I need another pair of eyes on something before I convince myself I’m imagining it.”`;
const cut=`“You’ve been staring at that menu for ten minutes. It’`;
const noPunctuation=`Roman catches you outside class and slows down instead of passing. He looks at you for a second, clearly deciding whether to say it. “I wanted to ask you something before everyone gets out of class and starts hovering”`;
const unbalanced=`Roman stops beside you after class, lowering his voice. “I wanted to ask you something before everyone else gets here. It’s not dramatic, I just want your actual opinion. You’ve got a minute?`;

ok("version 3.49.2",pkg.version==="3.49.2"&&pub.version==="3.49.2");
ok("release names complete Instant Story hotfix",/Instant Story Complete Output \+ Fast Hedged Generation/.test(pub.release||""));
ok("cut user report is rejected",!instantStoryLooksComplete(cut,"STOP"));
ok("MAX_TOKENS is rejected even with long text",!instantStoryLooksComplete(complete,"MAX_TOKENS"));
ok("complete STOP opening is accepted",instantStoryLooksComplete(complete,"STOP"));
ok("missing terminal punctuation rejected",!instantStoryLooksComplete(noPunctuation,"STOP"));
ok("unbalanced quotation rejected",!instantStoryLooksComplete(unbalanced,"STOP"));
ok("minimum length enforced",!instantStoryLooksComplete(`“Hey.” He looks over. “Got a minute?”`,"STOP"));
ok("finish-every-sentence prompt",edge.includes("finish every sentence and every quotation")&&edge.includes("Never stop mid-word or mid-sentence"));
ok("hedged model race",edge.includes("hedgeDelaysMs = [0, 650, 1350]")&&edge.includes("Promise.any(attempts)"));
ok("fast global deadline",edge.includes("const globalDeadlineMs = 6800"));
ok("per-attempt timeout bounded",edge.includes("const attemptTimeoutMs = 5000"));
ok("thinking-safe output budget",edge.includes("maxOutputTokens: 900"));
ok("finishReason inspected",edge.includes("const finishReason = String(candidate?.finishReason || \"\")"));
ok("incomplete output never wins",edge.includes("if (!instantStoryLooksComplete(opening, finishReason))"));
ok("late hedges are cancelled",edge.includes("let closed = false")&&edge.includes("if (closed) throw new Error")&&edge.includes("closed = true"));
ok("in-flight attempts aborted after settlement",edge.includes("controllers.forEach((controller) => controller.abort())"));
ok("complete local fallback retained",edge.includes("instantStoryFallbackOpening")&&edge.includes('source: "local_fallback"'));
ok("client timeout tightened",characters.includes("setTimeout(() => controller.abort(), 9000)"));
ok("client independently rejects cut output",characters.includes("const visiblyComplete")&&characters.includes("cut-off Instant Story"));
ok("syntax verifier includes 3.49.2 helper",syntax.includes("instant-story-v3492.ts"));
ok("3.49.1 remains in regression chain",(pkg.scripts?.["stability:lab"]||"").includes("verify:v3491"));
ok("3.49.2 runs first in Stability Lab",(pkg.scripts?.["stability:lab"]||"").startsWith("npm run verify:v3492"));

let failed=0;
for(const [name,value] of checks){console.log(`${value?"PASS":"FAIL"} ${name}`);if(!value)failed++;}
console.log(`\n${checks.length-failed}/${checks.length} Instant Story v3.49.2 complete-output checks passed.`);
if(failed) process.exit(1);
