import fs from "node:fs";
import assert from "node:assert/strict";
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const meta=JSON.parse(fs.readFileSync("public/velvet-version.json","utf8"));
const edge=fs.readFileSync("supabase/functions/character-chat/index.ts","utf8");
const checks=[
 ["version is 3.50.11+ descendant",()=>assert.match(pkg.version,/^(?:3\.50\.(?:11|1[2-9]|[2-9][0-9])|3\.(?:5[1-9]|[6-9]\d)\.\d+)$/)],
 ["PWA metadata matches package",()=>assert.equal(meta.version,pkg.version)],
 ["latest beat dominates older callbacks",()=>assert.ok(edge.includes("The latest user beat is the immediate conversational job"))],
 ["stale topic resurrection is blocked",()=>assert.ok(edge.includes("Do not revive a stale topic from several turns ago"))],
 ["paying example protects immediate causality",()=>assert.ok(edge.includes("let’s pay")&&edge.includes("who paid last time"))],
 ["anti-performance dialogue is explicit",()=>assert.ok(edge.includes("not a writer trying to make every line quotable"))],
 ["repetitive response shape is blocked",()=>assert.ok(edge.includes("dialogue → prop gesture → polished punchline"))],
 ["visible scene ledger exists",()=>assert.ok(edge.includes("VISIBLE SCENE LEDGER"))],
 ["cart/basket object mutation is blocked",()=>assert.ok(edge.includes("A cart remains a cart; a basket remains a basket"))],
 ["fabricated personal canon is blocked",()=>assert.ok(edge.includes("NO FABRICATED PERSONAL CANON")&&edge.includes("prior payments"))],
 ["social metadata leakage is blocked",()=>assert.ok(edge.includes("Do not leak profile metadata"))],
];
let pass=0; for(const [name,fn] of checks){try{fn();pass++;console.log(`PASS ${pass}: ${name}`)}catch(e){console.error(`FAIL ${name}`);throw e}}
console.log(`\nv3.50.11 Human Turn Realism: ${pass}/${checks.length} PASS`);
