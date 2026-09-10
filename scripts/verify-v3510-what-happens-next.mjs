import fs from "node:fs";
import assert from "node:assert/strict";
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const chat=fs.readFileSync("src/pages/Chat.jsx","utf8");
const edge=fs.readFileSync("supabase/functions/reply-assist/index.ts","utf8");
const checks=[
 ["version 3.50.10+ descendant",()=>assert.match(pkg.version,/^3\.50\.(?:1[0-9]|[2-9][0-9])$/)],
 ["Guide the story removed from chat UI",()=>assert.ok(!chat.includes("<h2>Guide the story</h2>"))],
 ["old Direct trigger removed",()=>assert.ok(!chat.includes("<span>Direct</span>"))],
 ["What happens next trigger exists",()=>assert.ok(chat.includes('aria-label="What happens next?"'))],
 ["story paths use isolated reply-assist edge",()=>assert.ok(chat.includes('task: "story_paths"')&&chat.includes('supabase.functions.invoke("reply-assist"'))],
 ["story paths never auto-send",()=>assert.ok(chat.includes('setDirectorNote(direction)')&&!chat.includes('chooseStoryPath(path) {\n    handleSubmit'))],
 ["choice queues next beat internally",()=>assert.ok(chat.includes('showActionNotice("Story path queued ✓")'))],
 ["edge protects user agency",()=>assert.ok(edge.includes("Do not write the user's actions, dialogue, feelings, decisions, or POV"))],
 ["edge requires four story paths",()=>assert.ok(edge.includes('if(unique.length===4) return json({paths:unique, model})'))],
 ["different paths action exists",()=>assert.ok(chat.includes("Different paths"))],
];
let pass=0; for(const [name,fn] of checks){try{fn();pass++;console.log(`PASS ${pass}: ${name}`)}catch(e){console.error(`FAIL ${name}`);throw e}}
console.log(`\nv3.50.10 What Happens Next: ${pass}/${checks.length} PASS`);
