import test from 'node:test';import assert from 'node:assert/strict';import {reviewScene,originPositionIssues} from './review-scene.mjs';
test('persisted door anchor reaches the reviewer instead of an empty position map',()=>{
 const scene={body_states:[{name:'Chase Beaumont',anchor:'door'},{name:'Adrian',anchor:'island'}],object_states:[{name:'cup',state:'on counter'}]};
 const result=reviewScene(scene,{id:'chase',name:'Chase Beaumont'});assert.equal(result.positions.chase,'door');assert.equal(result.positions.adrian,undefined);assert.deepEqual(result.objects,scene.object_states);assert.deepEqual(result.present,[]);result.objects[0].state='elsewhere';assert.equal(scene.object_states[0].state,'on counter');
});
test('existing explicit positions and presence survive without manufacturing co-location',()=>{
 assert.deepEqual(reviewScene({location:'kitchen',present:['chase'],positions:{chase:'entrance'}},{id:'chase',name:'Chase'}),{location:'kitchen',present:['chase'],positions:{chase:'entrance'},objects:[]});
 assert.deepEqual(reviewScene(undefined,{id:'chase',name:'Chase'}).present,[]);
});
test('the observed abandoned island cannot replace a confirmed door position',()=>{
 const scene={positions:{chase:'door'}};const lead={id:'chase',name:'Chase Beaumont'};
 assert.equal(originPositionIssues(scene,lead,'Chase watches you walk off before he abandons the island and follows through the crowd.').length,1);
 assert.equal(originPositionIssues(scene,lead,'Chase stays by the island.').length,1);
 assert.deepEqual(originPositionIssues(scene,lead,'Chase leaves the doorway and crosses toward the sink.'),[]);
 assert.deepEqual(originPositionIssues(scene,lead,'Chase walks to the island, then leaves the island to find a quiet corner.'),[]);
 assert.deepEqual(originPositionIssues({},lead,'Chase leaves the island.'),[]);
});
