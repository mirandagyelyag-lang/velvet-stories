import assert from "node:assert/strict";
import {buildPacket,screenOpening} from "./core.mjs";
assert.deepEqual(buildPacket({name:"Chase"},"x","party"),buildPacket({name:"Chase"},"x","party"));
assert.throws(()=>buildPacket({},"x","unknown"));
for(const text of ["He caught your eye. You look like you are waiting.","You’re quiet.","His eyes track your movement."]) assert.ok(screenOpening(text).includes("possible_invented_user_state"));
assert.deepEqual(screenOpening('Chase said to you, “You could help.”'),[]);
console.log("Comparison packet and agency-screen regression checks passed.");
