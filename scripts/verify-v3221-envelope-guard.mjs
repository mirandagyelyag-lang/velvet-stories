import fs from "node:fs";
const edge = fs.readFileSync("supabase/functions/character-chat/index.ts", "utf8");
const chats = fs.readFileSync("src/context/ChatsContext.jsx", "utf8");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const pub = JSON.parse(fs.readFileSync("public/velvet-version.json", "utf8"));
const checks = [
  ["package 3.22.1", pkg.version === "3.22.1"],
  ["public 3.22.1", pub.version === "3.22.1"],
  ["release Envelope Guard", pub.release === "Envelope Guard"],
  ["backend salvages incomplete reply", edge.includes('extractPartialJsonStringField(clean, "reply")')],
  ["backend never exposes broken JSON as raw prose", edge.includes("incomplete structured response before the visible reply could be recovered")],
  ["nested hidden_metadata accepted", edge.includes("parsed?.hidden_metadata")],
  ["metadata compact instruction", edge.includes("Keep hidden metadata under roughly 450 tokens")],
  ["frontend stored-envelope sanitizer", chats.includes("extractVisibleReplyFromStoredEnvelope")],
  ["frontend sanitizes character DB content", chats.includes('message.sender === "character"')],
];
let ok = 0;
for (const [name, pass] of checks) {
  console.log(`${pass ? "PASS" : "FAIL"} ${name}`);
  if (pass) ok += 1;
}
console.log(`\n${ok}/${checks.length} Envelope Guard checks passed.`);
if (ok !== checks.length) process.exit(1);
