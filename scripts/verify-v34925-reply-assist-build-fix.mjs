import fs from 'node:fs';
const chat=fs.readFileSync('src/pages/Chat.jsx','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const checks=[
 ['v3.49.25 lineage retained', /^3\.49\.(?:2[5-9]|[3-9][0-9])$/.test(pkg.version)],
 ['reply assist portal closes before portal target', /replyAssistOpen\s*&&\s*createPortal\(\([\s\S]*?<\/div>\s*\n\s*\),\s*document\.body\)\}/.test(chat)],
 ['broken comma-inside-JSX portal form absent', !/<\/div>,\s*document\.body\s*\n\s*\)\}/.test(chat)],
 ['reply assist trigger preserved', chat.includes('chat__reply-assist-trigger')],
 ['reply assist inserts suggestion', chat.includes('useReplyAssistOption')],
];
let n=0; for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`); if(ok)n++;}
console.log(`\n${n}/${checks.length} passed`); if(n!==checks.length) process.exit(1);
