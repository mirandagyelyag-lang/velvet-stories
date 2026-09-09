import fs from 'node:fs';
const s=fs.readFileSync(new URL('../supabase/functions/character-chat/index.ts', import.meta.url),'utf8');
const pkg=JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url),'utf8'));
const checks=[
 ['version',pkg.version==='3.50.3'],
 ['restore sanitizer original',s.includes('A validator/sanitizer is never allowed to erase a readable model turn')],
 ['save firewall',s.includes('EMPTY-REPLY FIREWALL')],
 ['restore original before save',s.includes('empty reply prevented; restoring readable original candidate')],
 ['hard empty stop',s.includes('EMPTY_REPLY_BLOCKED_BEFORE_SAVE')],
 ['nickname detector retained',s.includes('hasUnearnedNicknameAddress')],
 ['nickname address identity retained',s.includes('ADDRESS IDENTITY')],
 ['nickname no longer blocking literal',!s.includes('  "unearned_nickname_address",')],
];
let pass=0; for(const [n,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${n}`); if(ok)pass++;}
console.log(`${pass}/${checks.length} PASS`); if(pass!==checks.length)process.exit(1);
