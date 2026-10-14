import test from 'node:test';
import assert from 'node:assert/strict';
import {deriveRelationshipLivingMemoryV35380 as derive, buildRelationshipLivingMemoryV35380 as prompt} from '../supabase/functions/character-chat/engine/relationship-living-memory-v35380.js';

test('mentions, invitations, hypotheticals and refusals never become completed intimacy',()=>{
  for(const line of ['Kiss me?', 'He did not kiss you.', 'He almost kissed you.', 'We could kiss.', 'No me besó.', 'Quisiera un abrazo.', 'What does love mean?', 'I want to tell you I love you.']) {
    assert.equal(derive({latestUserMessage:line}).milestones.length,0,line);
  }
});
test('enacted bilingual milestones retain their source',()=>{
  for(const line of ['He kissed you.', 'Te besó.', 'He took your hand.', 'Me abrazó.', '“I love you.”']) {
    const state=derive({reply:line,messageId:'m1'});
    assert.equal(state.milestones.length,1,line);
    assert.equal(state.milestones[0].message_id,'m1');
  }
});
test('ordinary replies and private longing do not accumulate mutual progress',()=>{
  let state=derive({});const original={...state.scores};
  for(let i=0;i<100;i++)state=derive({previous:state,latestUserMessage:'No, the book is blue.',reply:'Stay for the lecture; he thinks about a kiss.',mindUpdate:{private_intention:'wants closeness'},behaviorUpdate:{relationship_trust:'unchanged',relationship_attraction:'longing'}});
  assert.deepEqual(state.scores,original);
  assert.equal(state.milestones.length,0);
});
test('regeneration and duplicate message do not duplicate milestones',()=>{
  const state=derive({reply:'He kissed you.',messageId:'m1'});
  assert.equal(derive({previous:state,reply:'He kissed you.',messageId:'m1'}).milestones.length,1);
  const regenerated=derive({previous:state,reply:'He kissed you.',messageId:'m2',isRegeneration:true});
  assert.equal(regenerated.milestones.length,1);
  assert.deepEqual(regenerated.scores,state.scores);
});
test('current geometry overrides an old intimate scene and hypothetical kiss',()=>{
  const state=derive({latestUserMessage:'We could kiss.',scene:{proximity:'separated'},previous:{proximity:{level:'intimate'}}});
  assert.equal(state.proximity.level,'separated');
  const p=prompt({scene:{proximity:'separated'},intelligenceState:{relationship_living_memory_v35380:{proximity:{level:'intimate'}}}});
  assert.match(p,/current proximity = separated/);
});
test('current profile and pending conversational beat survive generic chemistry routing',()=>{
  const p=prompt({character:{name:'Nathan',personality:'warm teasing',emotional_dna:{emotional_promise:'Contained forbidden attraction'}},recentCharacterReplies:['Would you like to stay?'],scene:{location:'balcony'},relationshipState:{stage:'friends'}});
  assert.match(p,/Contained forbidden attraction/);
  assert.match(p,/PREVIOUS CHARACTER BEAT: Would you like to stay\?/);
  assert.match(p,/balcony/);
  assert.match(p,/pending questions/);
});
