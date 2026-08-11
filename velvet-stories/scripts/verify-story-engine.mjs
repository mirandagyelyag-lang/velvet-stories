import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");
const edge = read("supabase/functions/character-chat/index.ts");
const chat = read("src/pages/Chat.jsx");
const chatsContext = read("src/context/ChatsContext.jsx");
const main = read("src/main.jsx");
const mobileStyles = read("src/styles/mobile-v71.css");
const privateCancellationMigration = read("supabase/migrations/202608100002_generation_requests_private.sql");

const checks = [];
function check(label, condition) {
  checks.push({ label, condition: Boolean(condition) });
}

check("single project tree", !existsSync(resolve(root, "velvet-stories")));
check("single narrative Edge Function", !existsSync(resolve(root, "supabase/functions/swift-task")));
check(
  "no loose story-engine patches",
  [
    "character-chat-v5-emotional-follow.ts",
    "character-chat-v6-grounded-dialogue.ts",
    "character-chat-v7-name-validation.ts",
    "ChatsContext-v8-hide-on-regenerate.jsx",
  ].every((path) => !existsSync(resolve(root, path))),
);
check("compact silent sentinel in UI", chat.includes('const SILENT_CONTINUE_MESSAGE = "[SILENT_CONTINUE]"'));
check("one or more dots become silence", chat.includes('/^[.…。]+$/u.test(cleanMessage)'));
check("legacy silent messages stay hidden", chat.includes('content.includes("Treat this as silence from the user")'));
check("backend recognizes compact silence", edge.includes("function isSilentContinueText(value)"));
check("silent history is compacted", edge.includes('return "[SILENT_CONTINUE]"'));
check("recent history is not duplicated", edge.includes("messages.slice(-18, -6)"));
check("two silent turns return to main character", edge.includes("normalizedSilentContinueStreak >= 2"));
check("post-exit reaction follows main character", edge.includes("follow_main_character_after_exit"));
check("unsupported logistics are rejected", edge.includes("inventsUnsupportedLogistics(candidate, groundingFacts)"));
check("invented third-party intimacy is rejected", edge.includes("inventsUnsupportedThirdPartyIntimacy(candidate, groundingFacts)"));
check("safe repair fallback avoids brittle false errors", edge.includes("if (safeFallback) return safeFallback"));
check("Gemini model is configurable", edge.includes('Deno.env.get("GEMINI_MODEL")'));
check(
  "cancellation rows are private to the Edge Function",
  privateCancellationMigration.includes("revoke all on table public.generation_requests from anon, authenticated") &&
    privateCancellationMigration.includes("to service_role"),
);
check("mobile UI stylesheet is loaded", main.includes('mobile-v71.css'));
check("mobile navigation keeps three columns", mobileStyles.includes("grid-template-columns: repeat(3"));

const diversityPosition = edge.indexOf("// Regeneration diversity guard");
const voiceRepairPosition = edge.indexOf("// The natural-voice repair must never reintroduce user control.");
const finalRoutePosition = edge.indexOf("// Route enforcement is deliberately LAST.");
const emptyReplyPosition = edge.indexOf("if (!generatedReply)", finalRoutePosition);
check(
  "camera/voice enforcement is the final rewrite stage",
  diversityPosition >= 0 &&
    voiceRepairPosition > diversityPosition &&
    finalRoutePosition > voiceRepairPosition &&
    emptyReplyPosition > finalRoutePosition,
);

const immediateHidePosition = chatsContext.indexOf("// Hide the rejected take before any network await.");
const revisionPosition = chatsContext.indexOf("await bumpStoryRevision(characterId);", immediateHidePosition);
const filterPosition = chatsContext.indexOf("item.id !== options.regenerateMessageId", immediateHidePosition);
check(
  "regeneration hides the rejected response before network work",
  immediateHidePosition >= 0 && filterPosition > immediateHidePosition && revisionPosition > filterPosition,
);

const failed = checks.filter((item) => !item.condition);
for (const item of checks) {
  console.log(`${item.condition ? "PASS" : "FAIL"}  ${item.label}`);
}

if (failed.length) {
  console.error(`\n${failed.length} story-engine verification check(s) failed.`);
  process.exit(1);
}

console.log(`\n${checks.length} story-engine checks passed.`);
