import {CHASE_APPROVED_OPENING} from '../supabase/functions/character-chat/engine/instant-story-identity.js';
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {instantStoryProseValidation} from '../supabase/functions/character-chat/engine/instant-story-prose.js';
const source=fs.readFileSync(new URL('../src/context/CharactersContext.jsx',import.meta.url),'utf8');
const checks=source.slice(source.indexOf('      const leakedTemplate'),source.indexOf('      const usedSceneSeed'));
const base=CHASE_APPROVED_OPENING;
function validate(opening){const {wordCount,complete}=instantStoryProseValidation(opening);const ctx={opening,wordCount,complete,variationKey:'test',console:{warn(){}},rejectedOpening:(error,code)=>Object.assign(new Error(error),{code})};return vm.runInNewContext(`(()=>{${checks};return opening})()`,ctx);}
assert.equal(validate('Under a flickering neon sign, '+base),'Under a flickering neon sign, '+base);
assert.equal(validate(base),base);
assert.throws(()=>validate('What happens next depends on what you choose to say. '+base),e=>e.code==='generic_provider_opening');
assert.throws(()=>validate('Short.'),e=>e.code==='incomplete_provider_opening');
assert.throws(()=>validate(''),e=>e.code==='empty_provider_opening');
console.log('PASS: approved and completed backend stories delivered; stock phrase is advisory; leaked template, empty and incomplete responses blocked.');
