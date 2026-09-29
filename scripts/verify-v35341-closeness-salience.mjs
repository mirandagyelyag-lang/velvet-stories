import assert from "node:assert/strict";
import { narrativeDirectorIssuesV35334, buildNarrativeDirectorV35334 } from "../supabase/functions/character-chat/engine/narrative-director-v35334.js";

const alex={name:"Alexander Bennett"};

const first=narrativeDirectorIssuesV35334({
  reply:'"Can\'t argue with that logic," Alex said, matching his stride to yours. "Though if we\'re stopping for popcorn, someone needs to hold the line on extra butter."',
  latestUserMessage:'Do you mind if we cross arms? *I cross my arm with yours*',
  character:alex,
});
assert.ok(first.includes("physical_action_answered_as_argument"));
assert.ok(first.includes("alexander_relationship_beat_flattened"));

const second=narrativeDirectorIssuesV35334({
  reply:'"Fine, enjoy your cinema sacrilege," Alex muttered, taking a half-step back before catching up to Dominic and Carter near the doors.',
  latestUserMessage:'Oh shut up *I let go from your arm*',
  character:alex,
});
assert.ok(second.includes("closeness_withdrawal_erased_into_npc_switch"));

const good=narrativeDirectorIssuesV35334({
  reply:'Alex looked down at where your arms had linked, caught off guard for half a beat before his expression softened. "Yeah," he said, quieter than before. "I don\'t mind."',
  latestUserMessage:'Do you mind if we cross arms? *I cross my arm with yours*',
  character:alex,
});
assert.ok(!good.includes("physical_action_answered_as_argument"));
assert.ok(!good.includes("alexander_relationship_beat_flattened"));

const directive=buildNarrativeDirectorV35334({character:alex,latestUserMessage:'*I let go from your arm*'});
assert.match(directive,/USER-INITIATED CLOSENESS IS HIGH-SALIENCE/);
assert.match(directive,/WITHDRAWAL LEAVES RESIDUE/);
assert.match(directive,/ALEXANDER:/);

console.log("PASS  physical closeness cannot be answered as canned logic");
console.log("PASS  Alexander cannot divert closeness into generic movie-food banter");
console.log("PASS  withdrawing closeness cannot vanish into an NPC switch");
console.log("\n3 closeness-salience regression groups passed.");
