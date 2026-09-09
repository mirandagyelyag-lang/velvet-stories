import fs from 'node:fs';
const src=fs.readFileSync('supabase/functions/character-chat/index.ts','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const tests=[
 ['version is v3.50.1+ descendant', /^3\.50\.(?:[1-9]|[1-9]\d+)$/.test(pkg.version)],
 ['non-academic scene pool exists', src.includes('INSTANT_STORY_NON_ACADEMIC_SCENES')],
 ['academic default ban exists', src.includes('DEFAULT BAN: do NOT set this opening at a university')],
 ['student profile is not academic permission', src.includes('Character profile words like student, university, campus prince')],
 ['academic setting requires user idea', src.includes("Academic locations are allowed ONLY when the user's IDEA explicitly requests one")],
 ['scene seed is injected', src.includes("SCENE SEED\n" + "${sceneSeed}")],
 ['seed includes ordinary life variety', src.includes('late-night convenience store') && src.includes('grocery store or market') && src.includes('train station, bus stop, airport pickup')],
 ['profile-specific nonacademic seeds exist', src.includes('garage, workshop, roadside stop') && src.includes('training facility, stadium exterior')],
 ['old student fallback removed', !src.includes('spots you outside class and actually slows')],
 ['local fallback receives scene seed', src.includes('instantStoryFallbackOpening(safeDraft, cleanIdea, sceneSeed)')],
 ['generic opener traps explicitly discouraged', src.includes('notebook-drop and coffee-table openings')],
];
let pass=0;
for(const [name,ok] of tests){console.log(`${ok?'PASS':'FAIL'} · ${name}`); if(ok) pass++;}
console.log(`\\n${pass}/${tests.length} PASS`);
if(pass!==tests.length) process.exit(1);
