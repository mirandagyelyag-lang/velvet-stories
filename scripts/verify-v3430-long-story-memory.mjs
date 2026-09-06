import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveLongStoryMemoryV343, selectLongStoryMemories, longStoryMemoryV343Issues, sanitizeLongStoryMemoryV343Reply, automaticMemoryGroundingIssues } from '../supabase/functions/character-chat/engine/long-story-memory-v343.ts';
import { compileStoryContract } from '../supabase/functions/character-chat/engine/story-contract.ts';

const here=path.dirname(fileURLToPath(import.meta.url)); const root=path.resolve(here,'..'); const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const pkg=JSON.parse(read('package.json')); const meta=JSON.parse(read('public/velvet-version.json')); const edge=read('supabase/functions/character-chat/index.ts'); const contract=read('supabase/functions/character-chat/engine/story-contract.ts'); const syntax=read('scripts/verify-chat-syntax.mjs');
let pass=0,total=0; function check(name,fn){total++;try{fn();pass++;console.log(`✅ ${name}`)}catch(e){console.error(`❌ ${name}: ${e.message}`);process.exitCode=1;}}

check('version 3.43.0+ descendant',()=>assert.ok(/^3\.43\./.test(pkg.version)||/^3\.(?:44|4[5-9]|[5-9]\d)\./.test(pkg.version)));
check('Long-Story Memory release preserved in descendant',()=>assert.match(`${meta.release} ${contract} ${edge}`,/Long-Story Memory|Canon Compression/i));
check('stability lab retains v3430',()=>assert.match(pkg.scripts['stability:lab'],/verify:v3430/));
check('memory engine imported by story contract',()=>assert.match(contract,/deriveLongStoryMemoryV343/));
check('memory validator imported by edge',()=>assert.match(edge,/longStoryMemoryV343Issues/));
check('automatic memory write gate imported',()=>assert.match(edge,/automaticMemoryGroundingIssues/));
check('memory selector replaces naive selector',()=>assert.match(edge,/selectLongStoryMemories\(loaded\.memories/));
check('story contract exposes v343 memory',()=>assert.match(contract,/longStoryMemoryV343:/));
check('compact contract exposes v343 memory',()=>assert.match(contract,/longStoryMemory343:/));
check('chat syntax includes v343 engine',()=>assert.match(syntax,/long-story-memory-v343\.ts/));
check('system prompt carries v3.43',()=>assert.match(edge,/v3\.43 LONG-STORY MEMORY \+ CANON COMPRESSION/));
check('main prompt carries v3.43',()=>assert.match(edge,/LONG-STORY MEMORY \+ CANON COMPRESSION 3\.43/));
check('false memory hard issue wired',()=>assert.match(edge,/"false_memory_claim"/));
check('resolved thread hard issue wired',()=>assert.match(edge,/"resolved_thread_reactivated"/));
check('perspective hard issue wired',()=>assert.match(edge,/"perspective_memory_leak"/));
check('memory conflict hard issue wired',()=>assert.match(edge,/"memory_conflict_overclaim"/));
check('no new database migration required',()=>assert.match(read('README-v3.43.0.txt'),/No new database migration is required/));

const memories=[
 {id:'c1',content:'Roman is an underground racer and this identity is established canon.',category:'world',importance:5,is_canon:true,source:'manual',created_at:'2024-01-01T00:00:00Z',updated_at:'2024-01-01T00:00:00Z'},
 {id:'b1',content:'Antonia told Roman not to follow her when she asks for space.',category:'boundary',importance:5,source:'automatic',created_at:'2025-01-01T00:00:00Z',updated_at:'2025-01-01T00:00:00Z'},
 {id:'r1',content:'Roman apologized after their serious argument and trust improved slowly afterward.',category:'relationship',importance:4,source:'automatic',created_at:'2025-04-01T00:00:00Z',updated_at:'2025-04-01T00:00:00Z'},
 {id:'t1',content:'Roman drank iced coffee at a small table.',category:'event',importance:1,source:'automatic',created_at:'2024-01-01T00:00:00Z',updated_at:'2024-01-01T00:00:00Z'},
 {id:'x1',content:'Roman needs to repair the damaged race car before the rematch.',category:'event',importance:3,source:'automatic',created_at:'2026-09-05T00:00:00Z',updated_at:'2026-09-05T00:00:00Z'},
];
const context={recentText:'Roman is at the garage checking the race car before the rematch.',characterName:'Roman',userName:'Antonia'};
const selected=selectLongStoryMemories(memories,context);
check('immutable canon survives selection despite age',()=>assert.ok(selected.some(m=>m.id==='c1')));
check('boundary survives selection despite age',()=>assert.ok(selected.some(m=>m.id==='b1')));
check('current relevant racing memory selected',()=>assert.ok(selected.some(m=>m.id==='x1')));
check('selector caps memory payload',()=>assert.ok(selected.length<=16));
check('relevance beats old low-value trivia',()=>assert.ok(selected.findIndex(m=>m.id==='x1') < Math.max(0,selected.findIndex(m=>m.id==='t1')) || !selected.some(m=>m.id==='t1')));

const engine=deriveLongStoryMemoryV343({
 character:{name:'Roman'},userName:'Antonia',latestUserMessage:'We should talk about the race car.',memories,
 recentMessages:[{sender:'user',content:'We should talk about the race car.'},{sender:'character',content:'It still needs work.'}],
 storyRecap:'Roman and Antonia repaired trust after an earlier argument.',
 storyMilestones:[{title:'First honest apology',summary:'Roman apologized without deflecting.'}],
 storyArcs:[{title:'Racing rematch',status:'active',participants:['Roman']},{title:'Freshman orientation',status:'resolved',participants:['Roman']}],
 storyPlans:[{title:'Repair the damaged car',status:'active',participants:['Roman']}],
 storyConflicts:[{title:'Old conflict with Leo',status:'resolved',participants:['Roman','Leo']}],
 storyConsequences:[{title:'Car damage',cause:'race crash',effect:'car needs repair',status:'active',participants:['Roman']}],
 knowledgeLedger:[
  {character_name:'Roman',knowledge:'Leo changed garages.',status:'known',secret:false},
  {character_name:'Jules',knowledge:'Roman secretly entered the illegal race.',status:'known',secret:true},
  {character_name:'Campus',knowledge:'Roman is known around campus.',status:'public',secret:false},
 ],
 persistentCast:[{name:'Leo'}],castConnections:[{from_name:'Roman',to_name:'Leo',relationship:'rivals'}],
 unresolvedThreads:[{title:'Finish conversation about the damaged car'}],
});
check('engine has immutable canon layer',()=>assert.ok(engine.immutableCanon.some(x=>/underground racer/i.test(x))));
check('engine has long-term history layer',()=>assert.ok(engine.longTermHistory.some(x=>/argument/i.test(x))));
check('active threads remain active',()=>assert.ok(engine.activeThreads.some(x=>x.label==='Racing rematch')));
check('resolved threads stay separate',()=>assert.ok(engine.resolvedThreads.includes('Freshman orientation')&&engine.resolvedThreads.includes('Old conflict with Leo')));
check('relationship texture preserves milestone meaning',()=>assert.ok(engine.relationshipTexture.some(x=>/apolog/i.test(x))));
check('entity memory keeps recurring relationship',()=>assert.ok(engine.entityMemory.some(x=>x.name==='Leo'&&x.relationships.some(r=>/rivals/i.test(r)))));
check('character knowledge scoped correctly',()=>assert.ok(engine.perspectiveMemory.characterKnown.some(x=>/changed garages/i.test(x))));
check('secret other-character knowledge not promoted to character known',()=>assert.ok(!engine.perspectiveMemory.characterKnown.some(x=>/illegal race/i.test(x))));
check('public knowledge stays separate',()=>assert.ok(engine.perspectiveMemory.publicKnown.some(x=>/known around campus/i.test(x))));
check('private/scoped knowledge retained as inaccessible context',()=>assert.ok(engine.perspectiveMemory.privateOrScoped.some(x=>/illegal race/i.test(x))));
check('retrieval set bounded',()=>assert.ok(engine.retrievalSet.length<=12));
check('compression plan bounded',()=>assert.ok(engine.compressionPlan.length<=12));
check('canon compresses to historical fact not fading uncertainty',()=>assert.ok(engine.compressionPlan.some(x=>/underground racer/i.test(x.content)&&x.to==='historical_fact')));
check('old low-value trivia becomes garbage candidate',()=>assert.ok(engine.garbageCandidates.some(x=>/iced coffee/i.test(x))));
check('false-memory anchor includes durable history',()=>assert.ok(engine.falseMemoryAnchors.some(x=>/underground racer/i.test(x))));
check('dormant unresolved thread retained',()=>assert.ok(engine.dormantThreads.some(x=>/damaged car/i.test(x))));

let issues=longStoryMemoryV343Issues({reply:'Remember when we got married in Vegas? You were terrified.',engine,latestUserMessage:'Do you remember anything funny?'});
check('invented past event detected',()=>assert.ok(issues.includes('false_memory_claim')));
issues=longStoryMemoryV343Issues({reply:'Remember when we had that serious argument? I apologized badly at first.',engine,latestUserMessage:'Do you remember that fight?'});
check('grounded remembered event allowed',()=>assert.ok(!issues.includes('false_memory_claim')));
issues=longStoryMemoryV343Issues({reply:'Freshman orientation is still active. We still need to go tomorrow.',engine,latestUserMessage:'What do we have tomorrow?'});
check('resolved thread reactivation detected',()=>assert.ok(issues.includes('resolved_thread_reactivated')));
issues=longStoryMemoryV343Issues({reply:'Everyone knew Roman secretly entered the illegal race.',engine,latestUserMessage:'Did anyone know?'});
check('private knowledge universalization detected',()=>assert.ok(issues.includes('perspective_memory_leak')));

const sanitized=sanitizeLongStoryMemoryV343Reply('Remember when we got married in Vegas? You were terrified. “Anyway.”',['false_memory_claim'],engine);
check('false-memory sanitizer removes unsupported recollection',()=>assert.ok(!/married in vegas/i.test(sanitized)));
check('false-memory sanitizer preserves safe remainder',()=>assert.match(sanitized,/Anyway/));

check('automatic memory gate blocks invented major history',()=>assert.deepEqual(automaticMemoryGroundingIssues({content:'Their first wedding in Paris permanently changed the relationship.',sourceUser:'I smile.',sourceReply:'He smiled back.',existingAnchors:[]}),['ungrounded_automatic_memory']));
check('automatic memory gate allows grounded visible event',()=>assert.equal(automaticMemoryGroundingIssues({content:'Roman promised to repair the damaged car.',sourceUser:'Will you fix the damaged car?',sourceReply:'“Yeah. I promise I’ll repair it.”',existingAnchors:[]}).length,0));
check('manual memory bypasses automatic grounding gate',()=>assert.equal(automaticMemoryGroundingIssues({content:'Their wedding in Paris is canon.',source:'manual'}).length,0));

const many=Array.from({length:120},(_,i)=>({id:`m${i}`,content:i===77?'Roman promised Jules he would protect the old garage.':`Minor cafeteria detail number ${i} about a chair and coffee.`,category:i===77?'promise':'event',importance:i===77?5:1,source:'automatic',created_at:'2024-01-01T00:00:00Z'}));
const manySelected=selectLongStoryMemories(many,{recentText:'Jules asks Roman about the old garage promise.',characterName:'Roman',userName:'Antonia'});
check('stress selection remains bounded with 120 memories',()=>assert.ok(manySelected.length<=16));
check('stress selection preserves critical memory beyond position 70',()=>assert.ok(manySelected.some(m=>m.id==='m77')));

const contractCompiled=compileStoryContract({character:{name:'Roman',role:'underground racer'},userName:'Antonia',latestUserMessage:'*I think he is ridiculous, then I pick up my bag.*',turnIntent:{medium:'in_person'},recentMessages:[{sender:'user',content:'*I think he is ridiculous, then I pick up my bag.*'}],memories,storyArcs:[{title:'Racing rematch',status:'active'}],storyConflicts:[],storyPlans:[],storyConsequences:[],storyMilestones:[],storyBible:[],knowledgeLedger:[],persistentCast:[],castConnections:[]});
check('compiled contract contains v343 memory engine',()=>assert.ok(contractCompiled.longStoryMemoryV343));
check('private user commentary does not enter recent memory context',()=>assert.ok(!contractCompiled.longStoryMemoryV343.recentContext.some(x=>/ridiculous/i.test(x))));
check('visible action remains in recent memory context',()=>assert.ok(contractCompiled.longStoryMemoryV343.recentContext.some(x=>/pick up my bag/i.test(x))));

console.log(`\n${pass}/${total} Long-Story Memory 3.43 checks passed.`); if(pass!==total)process.exitCode=1;
