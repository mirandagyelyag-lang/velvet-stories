import test from 'node:test';
import assert from 'node:assert/strict';
import {createSession, runTurn as runCheckedTurn} from './core.mjs';
import {modelAdapter} from './model-adapter.mjs';

const profile = {id: 'chase', name: 'Chase Beaumont', language: 'en', role: 'Campus Heartthrob', voice: 'Casual, dry, playful; confident without deciding for the user', facts: ['Owns a car'], unknown: ['Academic major', 'Sports team', 'NPC private routines']};
const fresh = () => createSession({profile, scene: {location: 'campus patio', present: ['user', 'chase'], positions: {user: 'beside the wall', chase: 'three paces away'}, objects: []}});
const pass = async () => ({accepted: true, issues: []});
// Scripted provenance only for orchestration tests; real adapters always audit.
const runTurn = options => runCheckedTurn({provenance:pass,...options});
const reject = reason => ({accepted: false, issues: [{code: 'fixture-failure', reason}]});
const message = (id, content) => ({id, content});
const writer = prose => async () => ({prose, scenePatch: {}});

test('repeated prose is repaired before any provenance call or commit', async () => {
  const session = fresh();
  const old = 'Chase stays by the kitchen island, watching the doorway before turning back to the conversation beside him.';
  session.history = [{id:'old',role:'assistant',content:old}];
  let authored=0, audited=0, committed=0;
  const result=await runTurn({session,message:message('repeat','I am still by the doorway.'),author:async({contract,repair})=>{
    assert.match(contract.quality.progression,/Lack of user awareness/);
    if(authored++===0)return {prose:old,scenePatch:{}};
    assert.equal(repair.verdict.issues[0].code,'repeated_turn');
    return {prose:'Chase puts down his drink and heads into the quieter hall.',scenePatch:{characterPosition:'hall'}};
  },provenance:async()=>{audited++;return {accepted:true,issues:[]};},reviewer:pass,commit:async()=>{committed++;}});
  assert.equal(result.status,'accepted');
  assert.equal(authored,2);assert.equal(audited,1);assert.equal(committed,1);
  assert.equal(result.session.scene.positions.chase,'hall');
});

test('a repeated rejected draft cannot be saved or resurrected', async()=>{
  const session=fresh();
  const old='Chase stays by the kitchen island, watching the doorway before turning back to the conversation beside him.';
  session.history=[{id:'old',role:'assistant',content:old}];
  let commits=0;
  const result=await runTurn({session,message:message('repeat','I wait.'),author:writer(old),reviewer:pass,commit:async()=>{commits++;}});
  assert.equal(result.status,'rejected');assert.equal(commits,0);assert.deepEqual(result.session,session);
});

test('multi-turn: a correction with No/but preserves the full message and voice context', async () => {
  let session = fresh();
  let firstContract;
  const first = await runTurn({session, message: message('a', 'You should spend time with your friend.'), author: async ({contract}) => { firstContract = contract; return {prose: '“Tempting. Are you trying to get rid of me?”', scenePatch: {}}; }, reviewer: pass});
  assert.equal(firstContract.profile.voice, profile.voice);
  session = first.session;
  const second = await runTurn({session, message: message('b', '*I laugh* No, but you should study.'), author: async ({contract}) => {
    assert.equal(contract.latestUserMessage.content, '*I laugh* No, but you should study.');
    assert.equal(contract.recentConversation.length, 2);
    return {prose: '“You sound alarmingly pleased about that suggestion.”', scenePatch: {}};
  }, reviewer: pass});
  assert.equal(second.session.history.length, 4);
  assert(!second.reply.includes('Fine'));
  assert.equal(second.session.evidence.length, 0);
});

test('multi-turn: completed interior transition remains inside on the next turn', async () => {
  const input = fresh();
  const content = 'Thanks. We are both inside the apartment now.';
  const first = await runTurn({session: input, message: message('enter', content), events: [{type: 'scene', source: 'user', messageId: 'enter', quote: content, patch: {location: 'apartment interior', positions: {user: 'inside', chase: 'inside'}}}], author: writer('Chase sets his keys on the table.'), reviewer: pass});
  let calls = 0;
  const second = await runTurn({session: first.session, message: message('next', 'What did you want to show me?'), author: async ({contract, repair}) => {
    assert.equal(contract.scene.location, 'apartment interior');
    if (calls++ === 0) return {prose: '“Come inside.”', scenePatch: {}};
    assert.equal(repair.verdict.issues[0].code, 'duplicate-entry');
    return {prose: 'Chase opens the drawer beside him. “This.”', scenePatch: {}};
  }, reviewer: async ({draft}) => draft.prose.includes('Come inside') ? {accepted: false, issues: [{code: 'duplicate-entry', reason: 'Both characters are already inside, per enter.'}]} : {accepted: true, issues: []}});
  assert.equal(calls, 2);
  assert.equal(second.session.scene.location, 'apartment interior');
  assert(!second.session.history.some(row => row.content === '“Come inside.”'));
  assert.equal(input.scene.location, 'campus patio');
});

test('multi-turn: explicit user facts persist, assistant speculation never becomes evidence', async () => {
  const first = await runTurn({session: fresh(), message: message('fact', 'I have plans tonight.'), events: [{type: 'fact', source: 'user', messageId: 'fact', quote: 'I have plans tonight.', fact: 'The user has plans tonight.'}], author: writer('“I thought you might.”'), reviewer: pass});
  const second = await runTurn({session: first.session, message: message('follow', 'Why?'), author: async ({contract}) => {
    assert.equal(contract.confirmedFacts.length, 1);
    assert.equal(contract.confirmedFacts[0].messageId, 'fact');
    assert(!contract.confirmedFacts.some(row => row.fact.includes('thought')));
    return {prose: '“It was a guess.”', scenePatch: {}};
  }, reviewer: pass});
  assert.equal(second.session.evidence.length, 1);
});

test('multi-turn: known crisis wording and its follow-up bypass fictional authors', async () => {
  let calls = 0;
  const author = async () => { calls++; throw new Error('Fiction must not run'); };
  const first = await runTurn({session: fresh(), message: message('support', 'I took pills to die'), author, reviewer: pass});
  assert.equal(first.status, 'support');
  assert(first.reply.includes('When did you take the pills'));
  const second = await runTurn({session: first.session, message: message('followup', 'What now?'), author, reviewer: pass});
  assert.equal(second.status, 'support');
  assert.equal(calls, 0);
  const third = await runTurn({session: second.session, message: message('safe', 'I received medical care and I am safe now.'), author: writer('“Thank you for telling me. How are you feeling today?”'), reviewer: pass});
  assert.equal(third.status, 'accepted');
});

test('rejection never revives an earlier draft and does not commit history or scene', async () => {
  const session = fresh();
  let commits = 0;
  const result = await runTurn({session, message: message('x', 'Hello.'), author: async () => ({prose: '“You are coming with me.”', scenePatch: {characterPosition: 'parking lot'}}), reviewer: async () => reject('Invented acceptance'), commit: async () => { commits++; }});
  assert.equal(result.status, 'rejected');
  assert.equal(result.attempts.length, 2);
  assert.deepEqual(result.session, session);
  assert.equal(commits, 0);
});

test('only accepted prose and its matching character position commit once', async () => {
  let n = 0;
  const commits = [];
  const result = await runTurn({session: fresh(), message: message('x', 'Hello.'), author: async () => n++ === 0 ? {prose: 'He whispers from across the fountain.', scenePatch: {characterPosition: 'across fountain'}} : {prose: 'Chase stops beside you. “Hi.”', scenePatch: {characterPosition: 'beside user'}}, reviewer: async ({draft, nextScene}) => {
    if (draft.prose.includes('fountain')) return reject('No hearing bridge');
    assert.equal(nextScene.positions.chase, 'beside user');
    return {accepted: true, issues: []};
  }, commit: async row => commits.push(row)});
  assert.equal(commits.length, 1);
  assert.equal(commits[0].expectedRevision, 0);
  assert.equal(result.session.scene.positions.user, 'beside the wall');
  assert.equal(result.reply, commits[0].nextSession.history.at(-1).content);
});

for (const scenario of [
  {name: 'invented academic or athletic biography', bad: '“My coach wants me at practice.”'},
  {name: 'invented user opinion', bad: '“You were going to call it garbage anyway.”'},
  {name: 'invented user history or debt', bad: '“You owe me for our bet yesterday.”'},
  {name: 'invented NPC private knowledge', bad: '“Adrian spends four hours reviewing game footage.”'},
  {name: 'user availability and accepted invitation', bad: '“You have no plans, so you are coming with me.”'},
]) test(`reviewer evidence reaches repair: ${scenario.name}`, async () => {
  let n = 0;
  const result = await runTurn({session: fresh(), message: message('x', 'Hi.'), author: async ({repair}) => {
    if (!n++) return {prose: scenario.bad, scenePatch: {}};
    assert.equal(repair.verdict.issues[0].reason, scenario.name);
    return {prose: 'Chase glances at the poster. “I owe the band an apology. One song was good.”', scenePatch: {}};
  }, reviewer: async ({draft}) => draft.prose === scenario.bad ? reject(scenario.name) : {accepted: true, issues: []}});
  assert.equal(result.status, 'accepted');
  assert(!result.session.history.some(row => row.content === scenario.bad));
});

test('no prose is returned when the atomic commit fails', async () => {
  const session = fresh();
  await assert.rejects(runTurn({session, message: message('x', 'Hi.'), author: writer('“Hi.”'), reviewer: pass, commit: async () => { throw new Error('Revision conflict'); }}), /Revision conflict/);
  assert.equal(session.revision, 0);
  assert.equal(session.history.length, 0);
});

test('bad reviewer output cannot accidentally accept prose', async () => {
  await assert.rejects(runTurn({session: fresh(), message: message('x', 'Hi.'), author: writer('“Hi.”'), reviewer: async () => ({accepted: true, issues: [{code: 'agency', reason: 'Unresolved'}]})}), /unresolved/);
});

test('a broken event extractor cannot prevent the safety route', async () => {
  const result = await runTurn({session: fresh(), message: message('s', 'I want to die'), events: [{source: 'assistant', type: 'invalid'}], author: async () => { throw new Error('Must not run'); }, reviewer: pass});
  assert.equal(result.status, 'support');
  assert.equal(result.session.evidence.length, 0);
});

test('an ingestion disclosure does not manufacture family anger', async () => {
  const result = await runTurn({session: fresh(), message: message('s', 'I took pills to die'), author: writer('unused'), reviewer: pass});
  assert.equal(result.status, 'support');
  assert(!/facing anger|family|dad|father/i.test(result.reply));
});

test('assistant cannot supply user evidence', async () => {
  await assert.rejects(runTurn({session: fresh(), message: message('x', 'Hi.'), events: [{source: 'assistant', type: 'fact', quote: 'Hi.', messageId: 'x', fact: 'The user owes money'}], author: writer('“Hi.”'), reviewer: pass}), /provenance/);
});

test('fabricated evidence excerpt is rejected', async () => {
  await assert.rejects(runTurn({session: fresh(), message: message('x', 'Hi.'), events: [{source: 'user', type: 'fact', quote: 'I owe money.', messageId: 'x', fact: 'The user owes money'}], author: writer('“Hi.”'), reviewer: pass}), /excerpt/);
});

test('author cannot move the user through a state patch', async () => {
  await assert.rejects(runTurn({session: fresh(), message: message('x', 'Hi.'), author: async () => ({prose: '“Hi.”', scenePatch: {positions: {user: 'car'}}}), reviewer: pass}), /Only character position/);
});

test('cancellation does not call the model or commit', async () => {
  const controller = new AbortController(); controller.abort();
  await assert.rejects(runTurn({session: fresh(), message: message('x', 'Hi.'), signal: controller.signal, author: async () => { throw new Error('Must not run'); }, reviewer: pass}), {name: 'AbortError'});
});

test('replaying an accepted user message cannot create a duplicate turn', async () => {
  const first = await runTurn({session: fresh(), message: message('x', 'Hi.'), author: writer('“Hi.”'), reviewer: pass});
  await assert.rejects(runTurn({session: first.session, message: message('x', 'Hi.'), author: writer('“Hi.”'), reviewer: pass}), /Duplicate/);
});

test('model failures and malformed JSON propagate without stock fiction', async () => {
  const adapter = modelAdapter({endpoint: 'https://example.invalid/chat', model: 'test', apiKey: 'test-only', fetchImpl: async () => ({ok: false, status: 429})});
  await assert.rejects(runTurn({session: fresh(), message: message('x', 'Hi.'), ...adapter}), /429/);
  const malformed = modelAdapter({endpoint: 'https://example.invalid/chat', model: 'test', apiKey: 'test-only', fetchImpl: async () => ({ok: true, json: async () => ({choices: [{message: {content: 'Not JSON'}}]})})});
  await assert.rejects(runTurn({session: fresh(), message: message('x', 'Hi.'), ...malformed}), SyntaxError);
});

test('semantic review derives rejection from failed dimensions instead of an accepted label', async () => {
  const checks=Object.fromEntries(['responsiveness','care','identity','agency','continuity','canon','presentation'].map(name=>[name,{passed:true,evidence:'No violation in this fixture.'}]));
  checks.care={passed:false,evidence:'The reply reproaches the user after medical care.'};
  const adapter=modelAdapter({endpoint:'https://example.invalid/chat',model:'test',apiKey:'test-only',fetchImpl:async()=>({ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({accepted:true,checks})}}]})})});
  const verdict=await adapter.reviewer({contract:{},draft:{prose:'test'},nextScene:{}});
  assert.equal(verdict.accepted,false);
  assert.equal(verdict.issues[0].code,'semantic_care');
});

test('semantic review cannot silently omit responsiveness or care', async () => {
  const adapter=modelAdapter({endpoint:'https://example.invalid/chat',model:'test',apiKey:'test-only',fetchImpl:async()=>({ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({accepted:true,issues:[]})}}]})})});
  await assert.rejects(adapter.reviewer({contract:{},draft:{prose:'test'},nextScene:{}}),/Incomplete semantic review/);
});

test('ordinary generation cannot omit the source-audit gate', async () => {
  await assert.rejects(runCheckedTurn({session:fresh(),message:message('x','Hi.'),author:writer('“Hi.”'),reviewer:pass}),/provenance auditor required/);
});

test('unsupported history is repaired before semantic approval and never saved', async () => {
  let authors=0,reviews=0;
  const result=await runTurn({session:fresh(),message:message('x','What did you want to show me?'),author:async({repair})=>{
    if(!authors++)return {prose:'“The notebook you left yesterday.”',scenePatch:{}};
    assert.equal(repair.verdict.issues[0].code,'provenance_missing_source');
    return {prose:'Chase says, “I had no grand reveal planned. I just wanted to talk.”',scenePatch:{}};
  },provenance:async({draft})=>draft.prose.includes('notebook')?{accepted:false,issues:[{code:'provenance_missing_source',reason:'No user source establishes a notebook left yesterday.'}]}:{accepted:true,issues:[]},reviewer:async()=>{reviews++;return {accepted:true,issues:[]};}});
  assert.equal(reviews,1);
  assert.equal(result.attempts.length,2);
  assert(!result.session.history.some(row=>row.content.includes('notebook')));
});

test('both factual passes request a strict output schema', async () => {
  const requests=[];
  const adapter=modelAdapter({endpoint:'https://example.invalid/chat',model:'test',apiKey:'test-only',fetchImpl:async(_url,options)=>{
    requests.push(JSON.parse(options.body));
    return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(requests.length===1?{claims:[]}:{results:[],missingClaims:[]})}}]})};
  }});
  const result=await adapter.provenance({contract:{sources:[],profile:{name:'Chase'}},draft:{prose:'Chase waits.'}});
  assert.equal(result.accepted,true);
  assert.equal(requests.length,2);
  assert(requests.every(row=>row.response_format.type==='json_schema'&&row.response_format.json_schema.strict));
});

test('structured author output preserves an unchanged scene without a null-position patch', async () => {
  let request;
  const adapter=modelAdapter({endpoint:'https://example.invalid/chat',model:'test',apiKey:'test-only',fetchImpl:async(_url,options)=>{
    request=JSON.parse(options.body);
    return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({move:{kind:'listen',focus:'user'},prose:'Chase says, “I’m listening.”',scenePatch:{characterPosition:null}})}}]})};
  }});
  const draft=await adapter.author({contract:{},repair:null});
  assert.equal(request.response_format.type,'json_schema');
  assert.deepEqual(draft.scenePatch,{});
});

test('a factual repair drops the rejected draft instead of preserving its invented setup',async()=>{
  let payload;
  const adapter=modelAdapter({endpoint:'https://example.invalid/chat',model:'test',apiKey:'test-only',fetchImpl:async(_url,options)=>{
    payload=JSON.parse(JSON.parse(options.body).messages[1].content);
    return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({move:{kind:'answer',focus:'present intention'},prose:'Chase says, “I wanted to talk.”',scenePatch:{characterPosition:null}})}}]})};
  }});
  await adapter.author({contract:{},repair:{draft:{prose:'The notebook you left yesterday.'},verdict:{accepted:false,issues:[{code:'provenance_missing_source',reason:'No prior user source.'}]},provenance:{claims:[]}}});
  assert.equal(payload.repair.strategy,'RESET_UNSUPPORTED_PREMISE');
  assert(!('draft' in payload.repair));
  assert(payload.repair.requirements.includes('Absence of evidence is not evidence of the opposite'));
});
