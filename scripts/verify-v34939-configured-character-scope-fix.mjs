import fs from "node:fs";
const index = fs.readFileSync("supabase/functions/character-chat/index.ts", "utf8");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const checks = [
  [/^3\.49\.(?:39|[4-9]\d|\d{3,})$/.test(pkg.version), "package version retains v3.49.39+ scope fix"],
  [index.includes("const configuredCharacter = applyConversationControls"), "request scope still defines configuredCharacter"],
  [!index.includes("character: configuredCharacter, relationship: loaded.relationship || loaded.conversation"), "prompt builder no longer leaks request-scope configuredCharacter/loaded"],
  [index.includes("character,\n    relationship: conversation.relationship_state || conversation.relationship || {}"), "relationship attachment uses prompt-local character/conversation"],
  [index.includes('latestUserMessage: latestUserRecord?.content || ""'), "relationship attachment uses prompt-local latest user record"],
  [index.includes("recentCharacterReplies: recentCharacterRepliesForVoice"), "relationship attachment uses prompt-local recent replies"],
];
let fail=0; for (const [ok,name] of checks){ console.log(`${ok?'PASS':'FAIL'} ${name}`); if(!ok) fail++; }
if(fail) process.exit(1); console.log(`v3.49.39 scope regression: ${checks.length}/${checks.length} PASS`);
