import fs from 'node:fs';
import assert from 'node:assert/strict';
import { deriveSceneIntelligenceDynamicWorld, sceneIntelligenceIssues, sanitizeSceneIntelligenceReply } from '../supabase/functions/character-chat/engine/scene-intelligence-dynamic-world.ts';

const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const meta=JSON.parse(fs.readFileSync(new URL('../public/velvet-version.json',import.meta.url),'utf8'));
const contract=fs.readFileSync(new URL('../supabase/functions/character-chat/engine/story-contract.ts',import.meta.url),'utf8');
const edge=fs.readFileSync(new URL('../supabase/functions/character-chat/index.ts',import.meta.url),'utf8');
let pass=0;
const ok=(name,fn)=>{ try{ fn(); console.log('PASS',name); pass++; }catch(e){ console.error('FAIL',name,'\n ',e.message); process.exitCode=1; } };

ok('version 3.37.0',()=>assert.equal(pkg.version,'3.37.0'));
ok('release metadata',()=>assert.equal(meta.release,'Scene Intelligence + Dynamic World'));
ok('v3370 first stability gate',()=>assert.match(pkg.scripts['stability:lab'],/^npm run verify:v3370/));
ok('engine imported by story contract',()=>assert.match(contract,/deriveSceneIntelligenceDynamicWorld/));
ok('validator imported by edge',()=>assert.match(edge,/sceneIntelligenceIssues, sanitizeSceneIntelligenceReply/));
ok('system instruction carries v3.37',()=>assert.match(edge,/v3\.37 SCENE INTELLIGENCE \+ DYNAMIC WORLD/));
ok('compact contract exposes scene intelligence',()=>assert.match(contract,/sceneIntelligence: contract\.sceneIntelligenceDynamicWorld/));
ok('persistent scene fields registered',()=>assert.match(edge,/scene_purpose_337[\s\S]{0,900}last_world_collision_337/));
ok('quality schema includes scene intelligence booleans',()=>assert.match(edge,/scene_intelligence_ok[\s\S]{0,600}story_time_ok/));

const base={
 latestUserMessage:'Hmm, right',
 recentMessages:[
  {sender:'character',content:'I looked at the menu.'},{sender:'user',content:'Okay.'},
  {sender:'character',content:'I looked down at the menu again.'},{sender:'user',content:'Sure.'},
  {sender:'character',content:'I moved the coffee on the table.'},{sender:'user',content:'Right.'},
  {sender:'character',content:'I looked at the fries.'},{sender:'user',content:'Hmm.'},
 ],
 sceneState:{location:'campus cafe',activity:'having lunch'},
 intelligenceState:{human_behavior_state:{scene_objective:'have lunch and talk honestly'},unfinished_business:['why Alex called her']},
 agency:{activeIntent:'have lunch and talk honestly',closureAllowed:false},
 intent:{sceneObjective:'have lunch and talk honestly'},
 scenePhysics:{objectStates:[{object:'fries',state:'on table'}],spatialRelations:['Alex across table from user']},
 socialGravity:{relevantDomains:['campus'],manifestationDue:false,lifeContinuityDue:false},
 embodied:{state:'none',recognitionDue:false},
};
const e=deriveSceneIntelligenceDynamicWorld(base);
ok('scene purpose persists',()=>assert.match(e.purpose,/have lunch and talk honestly/i));
ok('stagnation is measured',()=>assert.ok(e.stagnationScore>=4));
ok('stagnation asks for small or clear progression',()=>assert.notEqual(e.progressionNeed,'none'));
ok('environment policy bans wallpaper',()=>assert.match(e.environmentPolicy,/not to decorate silence/i));
ok('initiative policy forbids surprise events',()=>assert.match(e.initiativePolicy,/Do not manufacture a surprise event/i));
ok('no protagonist orbit policy exists',()=>assert.match(e.noProtagonistOrbitPolicy,/world continues around the user/i));
ok('story time is evidence based',()=>assert.match(e.timePolicy,/Message count is not elapsed time/i));
ok('scene memory carries props',()=>assert.ok(e.sceneMemory.objects.some(x=>/fries/i.test(x))));

const re=deriveSceneIntelligenceDynamicWorld({...base,latestUserMessage:'Three days later, at the library'});
ok('re-entry detected',()=>assert.equal(re.reentryDetected,true));
ok('re-entry policy resets transient choreography',()=>assert.match(re.reentryPolicy,/Reset transient posture\/prop choreography/i));

const close=deriveSceneIntelligenceDynamicWorld({...base,latestUserMessage:'Yeah whatever *I grab my bag and leave*'});
ok('explicit exit makes closure due',()=>assert.equal(close.closureDue,true));
ok('explicit exit allows closure',()=>assert.equal(close.closureAllowed,true));

const silence=deriveSceneIntelligenceDynamicWorld({...base,latestUserMessage:'*I look out the window*'});
ok('action-only quiet beat allows silence',()=>assert.equal(silence.meaningfulSilenceAllowed,true));

ok('decorative tray filler detected',()=>assert.ok(sceneIntelligenceIssues({reply:'A student waiter dropped a tray with a sharp clatter.',engine:e,latestUserMessage:'Hmm'}).includes('decorative_environment_filler')));
ok('consequential food service can pass',()=>assert.ok(!sceneIntelligenceIssues({reply:'The server brought the food they had already ordered, so Alex moved the menu aside.',engine:e,latestUserMessage:'Hmm'}).includes('decorative_environment_filler')));
ok('closing teaser hook detected',()=>assert.ok(sceneIntelligenceIssues({reply:'Just as you reached the door, his phone buzzed.',engine:close,latestUserMessage:'I leave'}).includes('forced_scene_extension')));
ok('new scene transient menu leak detected',()=>assert.ok(sceneIntelligenceIssues({reply:'He was still holding the same menu when you walked into the library.',engine:re,latestUserMessage:'Three days later'}).includes('reentry_transient_state_leak')));
ok('unearned world collision detected',()=>assert.ok(sceneIntelligenceIssues({reply:'My teammate texted that practice got moved.',engine:{...e,worldCollisionEligible:false},latestUserMessage:'Okay'}).includes('unearned_world_collision')));
ok('earned collision policy is explicit',()=>{
 const x=deriveSceneIntelligenceDynamicWorld({...base,socialGravity:{relevantDomains:['racing'],manifestationDue:true,lifeContinuityDue:true},intelligenceState:{...base.intelligenceState,unfinished_business:['rival owes Roman an answer']}}); assert.equal(x.worldCollisionEligible,true); assert.match(x.worldCollisionPolicy,/allowed only if an already-established/i);
});
ok('stagnant menu loop detected',()=>assert.ok(sceneIntelligenceIssues({reply:'I looked down at the menu again and moved the coffee on the table.',engine:{...e,stagnationScore:8,stagnationNatural:false},latestUserMessage:'Hmm',recentReplies:['I looked at the menu.','I moved the coffee on the table.']}).includes('scene_stagnation_loop')));
ok('quiet monologue overwrite detected',()=>assert.ok(sceneIntelligenceIssues({reply:'I watched you for a long moment because I realized something was clearly wrong with the whole day and started explaining everything I had been thinking about since morning, trying to fill the silence with a long careful speech that kept going even though you had only looked out the window and had not asked me anything at all.',engine:{...silence,meaningfulSilenceAllowed:true},latestUserMessage:'*I look out the window*'}).includes('silence_overwritten')));
ok('environment wallpaper overload detected',()=>assert.ok(sceneIntelligenceIssues({reply:'Rain tapped the window while music hummed under the room lights and traffic buzzed outside.',engine:e,latestUserMessage:'Okay'}).includes('environment_wallpaper_overload')));

ok('sanitizer removes decorative tray filler',()=>assert.ok(!/tray/i.test(sanitizeSceneIntelligenceReply('A waiter dropped a tray. "Okay."',['decorative_environment_filler'],e))));
ok('sanitizer removes closing teaser',()=>assert.ok(!/phone buzzed/i.test(sanitizeSceneIntelligenceReply('"Bye." Just as you reached the door, his phone buzzed.',['forced_scene_extension'],close))));
ok('sanitizer removes unearned professor collision',()=>assert.ok(!/professor/i.test(sanitizeSceneIntelligenceReply('My professor texted me that class got moved. "Sure."',['unearned_world_collision'],e))));
ok('hard repair list includes scene failures',()=>assert.match(edge,/"decorative_environment_filler"[\s\S]{0,500}"environment_wallpaper_overload"/));
ok('repair sanitizer is wired',()=>assert.match(edge,/sanitizeSceneIntelligenceReply\(reply, issues/));
ok('prompt explicitly allows meaningful silence',()=>assert.match(edge,/MEANINGFUL SILENCE/));
ok('prompt explicitly forbids teaser closure',()=>assert.match(edge,/Never attach “just as you reached the door/));
ok('prompt explicitly separates story time from message count',()=>assert.match(edge,/STORY TIME ≠ MESSAGE COUNT/));
ok('prompt explicitly enforces location-specific life',()=>assert.match(edge,/LOCATION-SPECIFIC LIFE/));
ok('prompt explicitly enforces no protagonist orbit',()=>assert.match(edge,/NO PROTAGONIST ORBIT/));
ok('Scene Intelligence Lab edge action exists',()=>assert.match(edge,/action === "scene_intelligence_lab"/));
ok('Scene Intelligence Lab handler exists',()=>assert.match(edge,/handleSceneIntelligenceLab/));
const diagnostics=fs.readFileSync(new URL('../src/pages/Diagnostics.jsx',import.meta.url),'utf8');
ok('Scene Intelligence Lab UI exists',()=>assert.match(diagnostics,/Scene Intelligence Lab/));
ok('Scene Lab checks living-world dimensions',()=>assert.match(edge,/scene purpose persists[\s\S]{0,1400}no protagonist-orbit bubble/i));

if(!process.exitCode) console.log(`\n${pass}/${pass} Scene Intelligence + Dynamic World checks passed.`);
