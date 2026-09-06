import fs from "node:fs";

const checks=[]; const ok=(name,value)=>checks.push([name,Boolean(value)]);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const pub=JSON.parse(fs.readFileSync("public/velvet-version.json","utf8"));
const edge=fs.readFileSync("supabase/functions/character-chat/index.ts","utf8");
const characters=fs.readFileSync("src/context/CharactersContext.jsx","utf8");
const detail=fs.readFileSync("src/pages/CharacterDetail.jsx","utf8");
const chats=fs.readFileSync("src/context/ChatsContext.jsx","utf8");
const css=fs.readFileSync("src/styles/character-detail.css","utf8");

ok("version 3.49.1",pkg.version==="3.49.1"&&pub.version==="3.49.1");
ok("release names Instant Story hotfix",/Instant Story Reliability \+ Latency Hotfix/.test(pub.release||""));
ok("dedicated compact Instant Story draft",edge.includes("function compactInstantStoryDraft")&&edge.includes('personality: field("personality", 1200)'));
ok("Instant Story prompt uses compact draft",edge.includes("const safeDraft = compactInstantStoryDraft(draft)")&&edge.includes("${JSON.stringify(safeDraft)}"));
ok("production model first",edge.includes("[GEMINI_MODEL, GEMINI_FALLBACK_MODEL, GEMINI_EMERGENCY_MODEL]"));
ok("global Instant Story deadline",edge.includes("Date.now() + 10500"));
ok("per model timeout",edge.includes("Math.min(4200, remainingMs)"));
ok("backend fetch is abortable",edge.includes("signal: controller.signal"));
ok("Instant output budget reduced",edge.includes("maxOutputTokens: 420"));
ok("provider outage has local fallback",edge.includes("instantStoryFallbackOpening")&&edge.includes('source: "local_fallback"'));
ok("fallbacks do not write user POV",edge.includes("Got a minute?")&&!edge.includes("you smile back"));
ok("client uses a real AbortController",characters.includes("const controller = new AbortController()")&&characters.includes("setTimeout(() => controller.abort(), 14500)"));
ok("client calls Edge with native fetch",characters.includes("/functions/v1/character-chat")&&characters.includes("Authorization: `Bearer ${accessToken}`"));
ok("client rejects empty Instant opening",characters.includes("Velvet returned an empty Instant Story"));
ok("Instant Story surfaces failure",detail.includes("instantError")&&detail.includes("Instant Story failed:"));
ok("Instant button has button type",detail.includes('className="character-profile__instant" type="button"'));
ok("cached default persona passed into Instant Story",detail.includes("defaultPersonaId")&&detail.includes("instantStory: true"));
ok("fresh conversations are marked",chats.includes("conversationWasCreated = true"));
ok("fresh conversations skip empty message SELECT",chats.includes("if (!conversationWasCreated)")&&chats.includes("loadConversationMessages(conversation.id)"));
ok("default persona lookup becomes conditional",chats.includes("if (!options.personaId)")&&chats.includes("defaultPersonaId"));
ok("Instant error styling exists",css.includes(".character-profile__instant-error"));
ok("legacy Narrative Core verifier retained",(pkg.scripts?.["stability:lab"]||"").includes("verify:v3490"));
ok("hotfix runs first in Stability Lab",(pkg.scripts?.["stability:lab"]||"").startsWith("npm run verify:v3491"));

let failed=0;
for(const [name,value] of checks){console.log(`${value?"PASS":"FAIL"} ${name}`);if(!value)failed++;}
console.log(`\n${checks.length-failed}/${checks.length} Instant Story v3.49.1 hotfix checks passed.`);
if(failed) process.exit(1);
