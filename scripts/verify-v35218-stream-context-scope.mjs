import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const edge = readFileSync(new URL("../supabase/functions/character-chat/index.ts", import.meta.url), "utf8");
const callStart = edge.indexOf("return streamRoleplayV19({");
const callEnd = edge.indexOf("});", callStart);
const streamStart = edge.indexOf("async function streamRoleplayV19({");
const signatureEnd = edge.indexOf("}) {", streamStart);
const streamBody = edge.slice(streamStart, edge.indexOf("function memoryTokenSet", streamStart));

assert.ok(callStart >= 0 && callEnd > callStart, "streamRoleplayV19 call must exist");
assert.match(edge.slice(callStart, callEnd), /\n\s+messages,/);
assert.match(edge.slice(streamStart, signatureEnd), /\n\s+messages,/);
assert.match(streamBody, /buildCompactLiveRecoveryPrompt\(\{[\s\S]*?messages,[\s\S]*?latestUserMessage/);

const declaredInputs = new Set(
  edge.slice(streamStart, signatureEnd)
    .split(",")
    .map((name) => name.trim().split("=")[0].trim())
    .filter(Boolean),
);
assert.ok(declaredInputs.has("messages"), "messages must be a declared stream input");

// Additional boundary and recovery regression assertions.
assert.ok(streamStart >= 0 && signatureEnd > streamStart, "stream function signature must exist");
assert.ok(streamBody.length > 100, "stream body must not be empty");
assert.match(edge.slice(callStart, callEnd), /messages/, "call must pass history");
assert.match(streamBody, /latestUserMessage/, "stream must retain latest user turn");

console.log("PASS  request history is passed into the live stream");
console.log("PASS  the live stream declares messages in its scope");
console.log("PASS  compact recovery receives the scoped history");
console.log("\nRegression assertions passed.");
