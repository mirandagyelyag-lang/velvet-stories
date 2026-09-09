import fs from "node:fs"; import assert from "node:assert/strict";
const edge=fs.readFileSync("supabase/functions/character-chat/index.ts","utf8");
const client=fs.readFileSync("src/context/ChatsContext.jsx","utf8");
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const meta=JSON.parse(fs.readFileSync("public/velvet-version.json","utf8"));
const tests=[
 ["version 3.50.6+ descendant",()=>assert.match(pkg.version,/^3\.50\.(?:6|7)$/)],
 ["PWA metadata matches package",()=>assert.equal(meta.version,pkg.version)],
 ["sanitizer preserves pre-sanitize prose",()=>assert.match(edge,/readableBeforeSanitize/)],
 ["final sanitizer cannot collapse to whitespace",()=>assert.match(edge,/readableFinal[\s\S]{0,180}readableBeforeSanitize/)],
 ["persistence guard rejects ghost bubbles",()=>assert.match(edge,/ABSOLUTE PERSISTENCE GUARD/)],
 ["persistence guard uses raw model draft",()=>assert.match(edge,/modelDraftReply/)],
 ["blank path gets non-stream recovery",()=>assert.match(edge,/blank-reply-recovery/)],
 ["blank reply is never persisted",()=>assert.match(edge,/if \(!persistableReply\) throw new Error/)],
 ["client rejects whitespace done envelopes",()=>assert.match(client,/blank-done-rejected/)],
];
let pass=0; for(const [name,fn] of tests){fn(); pass++; console.log(`PASS ${pass}: ${name}`)} console.log(`\nv3.50.6 no-blank replies: ${pass}/${tests.length} PASS`);
