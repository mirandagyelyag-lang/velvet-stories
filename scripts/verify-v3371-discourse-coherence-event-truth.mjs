import fs from 'node:fs';
import assert from 'node:assert/strict';
import { deriveDiscourseCoherenceEventTruth, discourseCoherenceIssues, sanitizeDiscourseCoherenceReply } from '../supabase/functions/character-chat/engine/discourse-coherence-event-truth.ts';

const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const meta=JSON.parse(fs.readFileSync(new URL('../public/velvet-version.json',import.meta.url),'utf8'));
const contract=fs.readFileSync(new URL('../supabase/functions/character-chat/engine/story-contract.ts',import.meta.url),'utf8');
const edge=fs.readFileSync(new URL('../supabase/functions/character-chat/index.ts',import.meta.url),'utf8');
let pass=0;
const ok=(name,fn)=>{ try{ fn(); console.log('PASS',name); pass++; }catch(e){ console.error('FAIL',name,'\n ',e.message); process.exitCode=1; } };

ok('version 3.37.1+ descendant',()=>assert.ok(/^3\.37\.[1-9]\d*$/.test(pkg.version)||/^3\.(?:3[8-9]|[4-9]\d)\./.test(pkg.version)));
ok('Discourse Coherence release preserved in descendant',()=>assert.match(`${meta.release} ${contract} ${edge}`,/Discourse Coherence \+ Event Truth/i));
ok('stability lab retains v3371',()=>assert.match(pkg.scripts['stability:lab'],/verify:v3371/));
ok('discourse engine imported by story contract',()=>assert.match(contract,/deriveDiscourseCoherenceEventTruth/));
ok('discourse validator imported by edge',()=>assert.match(edge,/discourseCoherenceIssues, sanitizeDiscourseCoherenceReply/));
ok('compact contract exposes discourse coherence',()=>assert.match(contract,/discourseCoherence: contract\.discourseCoherenceEventTruth/));
ok('turn order puts discourse before embodied salience',()=>assert.match(contract,/physical reality → DISCOURSE COHERENCE → EMBODIED SALIENCE/));
ok('system instruction carries v3.37.1',()=>assert.match(edge,/v3\.37\.1 DISCOURSE COHERENCE \+ EVENT TRUTH LOCK/));
ok('hard validation knows all discourse failures',()=>assert.match(edge,/"recent_line_echo"[\s\S]{0,450}"social_gravity_priority_intrusion"/));
ok('discourse sanitizer is wired',()=>assert.match(edge,/sanitizeDiscourseCoherenceReply\(reply, issues/));
ok('quality schema carries discourse booleans',()=>assert.match(edge,/discourse_coherence_ok[\s\S]{0,450}social_cadence_ok/));

const alexBeforeSleep=[
 {sender:'character',content:'"All yours. I\'m not fighting you for the basket."'},
 {sender:'user',content:'*i node, i was sleepy*'},
 {sender:'character',content:'I let the corner of the menu drop, looking across the table at you. "Good. I was worried you\'d try to claim them all for yourself and leave me with nothing but the ketchup bottle. Besides, I prefer the company over the fries anyway."'},
 {sender:'user',content:'Company in general or my company?'},
 {sender:'character',content:'"Both, obviously. But yours is the only one I\'m actually paying attention to."'},
 {sender:'user',content:'Good to know'},
 {sender:'character',content:'I look up from the page, leaning back against the booth. "Good to know you\'re keeping track."'},
 {sender:'user',content:'*i was getting sleepy*'},
];
const recentBeforeSleep=alexBeforeSleep.filter(x=>x.sender==='character').map(x=>x.content);
const sleepyEngine=deriveDiscourseCoherenceEventTruth({latestUserMessage:'*i was getting sleepy*',recentMessages:alexBeforeSleep,embodiedAwareness:{recognitionDue:true,salienceDebt:2}});
ok('embodied salience holds optional social gravity',()=>assert.equal(sleepyEngine.socialBeatHold,true));
ok('not fighting is not counted as a real conflict event',()=>assert.equal(sleepyEngine.conflictEvidence.length,0));
ok('ordinary sleepy turn is not misclassified as clarification',()=>assert.equal(sleepyEngine.clarificationDue,false));

const badSleepy='"You fading on me?" I tap my fingers twice against the wooden edge of the table as someone from a nearby table waves in passing. I give a quick nod back before looking across at you. "Relax. You\'re the one who started it."';
const sleepyIssues=discourseCoherenceIssues({reply:badSleepy,engine:sleepyEngine,latestUserMessage:'*i was getting sleepy*',recentCharacterReplies:recentBeforeSleep});
ok('Alex phantom started-it reference detected',()=>assert.ok(sleepyIssues.includes('unresolved_reference_claim')));
ok('forced nearby wave during salience detected',()=>assert.ok(sleepyIssues.includes('social_gravity_priority_intrusion')));
const sleepySanitized=sanitizeDiscourseCoherenceReply(badSleepy,sleepyIssues,sleepyEngine,recentBeforeSleep);
ok('sleepy sanitizer keeps relevant recognition',()=>assert.match(sleepySanitized,/You fading on me/i));
ok('sleepy sanitizer removes periodic social cameo',()=>assert.doesNotMatch(sleepySanitized,/nearby|waves? in passing|nod back/i));
ok('sleepy sanitizer removes phantom started-it line',()=>assert.doesNotMatch(sleepySanitized,/started it/i));

const alexClarification=[...alexBeforeSleep,{sender:'character',content:badSleepy},{sender:'user',content:'Started what?'}];
const recentClarification=alexClarification.filter(x=>x.sender==='character').map(x=>x.content);
const clarificationEngine=deriveDiscourseCoherenceEventTruth({latestUserMessage:'Started what?',recentMessages:alexClarification,embodiedAwareness:{recognitionDue:true,salienceDebt:2}});
ok('Started what is a clarification request',()=>assert.equal(clarificationEngine.clarificationKind,'started_what'));
ok('clarification keeps social gravity on hold',()=>assert.equal(clarificationEngine.socialBeatHold,true));
ok('clarification target points at prior started-it turn',()=>assert.match(clarificationEngine.clarificationTarget,/started it/i));

const badClarification='"You fading on me?" I let out a dry, quiet breath. "The whole argument about who gets the fries. Seriously?"';
const clarificationIssues=discourseCoherenceIssues({reply:badClarification,engine:clarificationEngine,latestUserMessage:'Started what?',recentCharacterReplies:recentClarification});
ok('exact recent line echo detected',()=>assert.ok(clarificationIssues.includes('recent_line_echo')));
ok('echo before clarification answer detected',()=>assert.ok(clarificationIssues.includes('clarification_echo_before_answer')));
ok('phantom fries argument detected',()=>assert.ok(clarificationIssues.includes('phantom_event_claim')));
const clarificationSanitized=sanitizeDiscourseCoherenceReply(badClarification,clarificationIssues,clarificationEngine,recentClarification);
ok('unsupported clarification gets safe truthful correction',()=>assert.equal(clarificationSanitized,'"Nothing specific. I worded that badly."'));

const supportedArgument=[
 {sender:'user',content:'Stop. We are literally arguing about the fries.'},
 {sender:'character',content:'"Fine. Then stop stealing them."'},
 {sender:'user',content:'What argument?'},
];
const supportedEngine=deriveDiscourseCoherenceEventTruth({latestUserMessage:'What argument?',recentMessages:supportedArgument});
ok('real argument evidence is retained',()=>assert.ok(supportedEngine.conflictEvidence.some(x=>/arguing about the fries/i.test(x))));
ok('grounded fries argument is allowed',()=>assert.ok(!discourseCoherenceIssues({reply:'"The argument about the fries."',engine:supportedEngine,latestUserMessage:'What argument?',recentCharacterReplies:['"Fine. Then stop stealing them."']}).includes('phantom_event_claim')));

const betMessages=[
 {sender:'user',content:'I bet you cannot finish those fries.'},
 {sender:'character',content:'"Deal."'},
 {sender:'user',content:'Why are we doing this again?'},
];
const betEngine=deriveDiscourseCoherenceEventTruth({latestUserMessage:'Why are we doing this again?',recentMessages:betMessages});
ok('supported explicit event exists in ledger',()=>assert.ok(betEngine.explicitEventEvidence.some(x=>/bet/i.test(x))));
ok('real prior event can support started-it language',()=>assert.ok(!discourseCoherenceIssues({reply:'"You started it with that bet."',engine:betEngine,latestUserMessage:'Why are we doing this again?',recentCharacterReplies:['"Deal."']}).includes('unresolved_reference_claim')));

const ordinaryEngine=deriveDiscourseCoherenceEventTruth({latestUserMessage:'Okay',recentMessages:[{sender:'character',content:'"Sure."'},{sender:'user',content:'Okay'}],embodiedAwareness:{recognitionDue:false,salienceDebt:0}});
ok('ordinary beat does not hold social gravity by quota',()=>assert.equal(ordinaryEngine.socialBeatHold,false));
ok('organic social beat remains possible outside priority hold',()=>assert.ok(!discourseCoherenceIssues({reply:'A classmate waved at Alex from the doorway.',engine:ordinaryEngine,latestUserMessage:'Okay',recentCharacterReplies:['"Sure."']}).includes('social_gravity_priority_intrusion')));
ok('different fresh question is not treated as echo',()=>assert.ok(!discourseCoherenceIssues({reply:'"You falling asleep over there?"',engine:sleepyEngine,latestUserMessage:'*i was getting sleepy*',recentCharacterReplies:['"You fading on me?"']}).includes('recent_line_echo')));
ok('prompt explicitly says banter is not retroactive argument',()=>assert.match(contract,/Banter is not retroactively an argument/));
ok('prompt says social gravity is not periodic quota',()=>assert.match(contract,/not a periodic quota/));
ok('repair directions cover phantom event truth',()=>assert.match(edge,/phantom_event_claim: "Remove the invented event label/));
ok('repair directions cover clarification priority',()=>assert.match(edge,/clarification_echo_before_answer: "The user asked for clarification/));

if(!process.exitCode) console.log(`\n${pass}/${pass} Discourse Coherence + Event Truth checks passed.`);
