import test from 'node:test';
import assert from 'node:assert/strict';
import { insertMessageOnce, queuedMessageId, replyForTurn, saveDraft } from '../src/utils/chatReliability.js';
import { captureChatAnchor, persistChatAnchor, restoreChatAnchor } from '../src/utils/chatMobileV3499.js';
const memoryStorage = () => {
  const data = new Map();
  return { getItem: k => data.get(k) ?? null, setItem: (k,v) => data.set(k,v), removeItem: k => data.delete(k) };
};
test('drafts stay isolated and clearing one story does not erase another', () => {
  const store = memoryStorage();
  saveDraft(store,'a',{message:'First draft',replyTo:{id:'quote'},directorNote:'Slow down'});
  saveDraft(store,'b',{message:'Second draft'});
  assert.equal(store.getItem('velvet_draft_a'),'First draft');
  assert.equal(store.getItem('velvet_draft_b'),'Second draft');
  saveDraft(store,'a',{message:''});
  assert.equal(store.getItem('velvet_reply_draft_a'),null);
  assert.equal(store.getItem('velvet_director_note_a'),null);
  assert.equal(store.getItem('velvet_draft_b'),'Second draft');
});
test('storage failures do not pretend the draft was saved', () => {
  assert.equal(saveDraft({setItem(){throw Error('quota');}}, 'a', {message:'Still in composer'}),false);
});
test('a lost acknowledgement is reconciled under the same id without overwriting a saved message', async () => {
  const rows = new Map(); let loseAcknowledgement = true;
  const client = {from(){let payload; const filters = {}; let inserting = false; return {
    insert(value){payload=value; inserting=true; return this;}, select(){return this;},
    eq(key,value){filters[key]=value;return this;}, async single(){
      if(inserting){
        if(rows.has(payload.id)) return {error:{code:'23505'}};
        rows.set(payload.id,payload);
        if(loseAcknowledgement){loseAcknowledgement=false;throw Error('network response lost');}
        return {data:payload};
      }
      return {data:[...rows.values()].find(row=>Object.entries(filters).every(([key,value])=>row[key]===value))};
    }
  };}};
  const localId='pending-11111111-1111-4111-8111-111111111111';
  const payload={id:queuedMessageId({localId}),user_id:'owner',conversation_id:'story',content:'Hello'};
  await assert.rejects(insertMessageOnce(client,payload),/network/);
  const saved=await insertMessageOnce(client,payload);
  assert.equal(saved.content,'Hello'); assert.equal(rows.size,1);
  assert.equal(queuedMessageId({localId}),payload.id);
});
test('retry recovers only the matching turn and rejects missing or superseded turns', () => {
  const user={id:'u',sender:'user'}, reply={id:'r',sender:'character'};
  assert.equal(replyForTurn([user,reply],'u'),reply);
  assert.equal(replyForTurn([user],'u'),null);
  assert.throws(()=>replyForTurn([user,{id:'new',sender:'user'},reply],'u'),/moved on/);
  assert.throws(()=>replyForTurn([reply],'missing'),/confirm/);
});
test('reading anchor restores the same message offset after layout changes and keeps stories separate', () => {
  globalThis.localStorage=memoryStorage(); globalThis.sessionStorage=memoryStorage();
  let top=400, anchorTop=-20;
  const node={getAttribute:()=> 'message-10',getBoundingClientRect:()=>({top:anchorTop,bottom:180})};
  const container={get scrollTop(){return top;},scrollHeight:1800,clientHeight:500,
    getBoundingClientRect:()=>({top:0}),querySelectorAll:()=>[node],querySelector:()=>node,
    scrollTo:({top:value})=>{top=value;}};
  assert.equal(captureChatAnchor(container).mode,'reading');
  persistChatAnchor('a',container);
  top=0;anchorTop=550;
  assert.equal(restoreChatAnchor('b',container),false);
  assert.equal(restoreChatAnchor('a',container),true);
  assert.equal(top,570);
});
