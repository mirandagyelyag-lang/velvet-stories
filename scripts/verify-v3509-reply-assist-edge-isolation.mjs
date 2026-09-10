import fs from 'node:fs';
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const chat=fs.readFileSync('src/pages/Chat.jsx','utf8');
const edge=fs.readFileSync('supabase/functions/reply-assist/index.ts','utf8');
const version=JSON.parse(fs.readFileSync('public/velvet-version.json','utf8'));
const checks=[
 ['version is 3.50.9+ descendant',/^3\.50\.(?:9|[1-9]\d+)$/.test(pkg.version)],
 ['PWA metadata matches package',version.version===pkg.version],
 ['Reply Assist invokes isolated edge',chat.includes('supabase.functions.invoke("reply-assist"')],
 ['Reply Assist no longer invokes character-chat action',!chat.includes('action: "reply_assist"')],
 ['isolated edge authenticates user',edge.includes('sb.auth.getUser()')],
 ['isolated edge has CORS OPTIONS',edge.includes('req.method === "OPTIONS"')],
 ['isolated edge has model failover',edge.includes('GEMINI_FALLBACK_MODEL')&&edge.includes('GEMINI_RECOVERY_MODEL')],
 ['isolated edge requires four options',edge.includes('unique.length===4')||edge.includes('unique.length!==4')],
 ['Generate more remains',chat.includes('Generate more')],
 ['selection still clears assistant',chat.includes('clearReplyAssist();')&&chat.includes('setReplyAssistOpen(false);')],
];
let fail=0; checks.forEach(([n,ok],i)=>{console.log(`${ok?'PASS':'FAIL'} ${i+1}: ${n}`);if(!ok)fail++}); console.log(`\nv3.50.9 reply assist edge isolation: ${checks.length-fail}/${checks.length} PASS`); process.exit(fail?1:0);
