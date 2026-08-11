import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");
const edge = read("supabase/functions/character-chat/index.ts");
const chat = read("src/pages/Chat.jsx");
const chatsContext = read("src/context/ChatsContext.jsx");
const privateCancellationMigration = read("supabase/migrations/202608100002_generation_requests_private.sql");

const checks = [];
function check(label, condition) {
  checks.push({ label, condition: Boolean(condition) });
}

const edgeLines = edge.split("\n").length;
const helperStart = edge.indexOf("// PURE_NARRATIVE_HELPERS_START");
const helperEnd = edge.indexOf("// PURE_NARRATIVE_HELPERS_END");
let helpers = null;
try {
  if (helperStart >= 0 && helperEnd > helperStart) {
    helpers = new Function(
      `${edge.slice(helperStart, helperEnd)}\nreturn { normalizeText, isSilentContinueText, looksLikeQuestion, classifyTurnIntent, stripDialogue, controlsUserPOV, hasUnclosedDialogue, isLowInformationGenericReply, replySimilarity, validateNarrativeReply, detectResponseLanguage };`,
    )();
  }
} catch (error) {
  console.error("Could not load pure narrative helpers:", error);
}

check("single project tree", !existsSync(resolve(root, "velvet-stories")));
check("single narrative Edge Function", !existsSync(resolve(root, "supabase/functions/swift-task")));
check("new engine stays under sixteen hundred lines", edgeLines < 1600);
check("old fallback architecture is gone",
  !edge.includes("buildCanonNeutralEditorialFallback") &&
  !edge.includes("buildTenderEmotionalFallback") &&
  !edge.includes("repairConversationProgression") &&
  !edge.includes("repairNaturalVoice") &&
  !edge.includes("repairUserPOVViolation"));
check("no deterministic narrative fallback exists",
  !/function\s+\w*Fallback\s*\(/.test(edge) &&
  !edge.includes("Final save integrity used a safe fallback"));
check("one generation one validation one optional repair",
  edge.includes("let result = await generateRoleplay({") &&
  edge.includes("let validationIssues = validateNarrativeReply(") &&
  edge.includes("result = await repairRoleplayOnce({") &&
  edge.includes("repaired candidate still invalid"));
check("invalid repair becomes an error rather than fake prose",
  edge.includes("Velvet rejected a weak or incomplete response before showing it. Regenerate once more.") &&
  !edge.includes('`"Okay,"') &&
  !edge.includes('`"Yeah,"'));
check("model returns reply and continuity in one request",
  edge.includes('required: ["turn_reading", "canon_claims", "reply", "continuity_note"]') &&
  edge.includes("responseMimeType: \"application/json\"") &&
  edge.includes("continuityNote: result.continuity_note"));
check("the same request plans latest-turn meaning and audits canon",
  edge.includes("turn_reading: one sentence stating the literal social meaning") &&
  edge.includes("canon_claims: a list of every off-screen or historical factual claim") &&
  edge.includes('canon_claims: { type: "array", items: { type: "string" } }'));
check("no background story-model calls consume extra quota",
  !edge.includes("updateStoryStateInBackground") &&
  !edge.includes("updateConversationSummaryInBackground") &&
  !edge.includes("extractMemoriesInBackground"));
check("Gemini primary and fallback are configurable",
  edge.includes('Deno.env.get("GEMINI_MODEL") || "gemini-3.6-flash"') &&
  edge.includes('Deno.env.get("GEMINI_FALLBACK_MODEL") || "gemini-3.5-flash-lite"'));
check("free quota exhaustion is explicit",
  edge.includes('throw new Error("The free AI limit was reached. Try again later.")'));
check("structured runtime logging covers generation rejection and save",
  edge.includes('console.log("[character-chat] generation started"') &&
  edge.includes('console.warn("[character-chat] candidate rejected"') &&
  edge.includes('console.log("[character-chat] response saved"'));

check("pure narrative helper API loads", helpers);
check("compact silence is recognized", helpers?.isSilentContinueText("...") && helpers?.isSilentContinueText("[SILENT_CONTINUE]"));
check("ordinary text is not silence", helpers && !helpers.isSilentContinueText("Okay."));
check("question without punctuation is recognized",
  helpers?.looksLikeQuestion("Nothing much, what about you i haven't seen you all week"));
check("ordinary statement is not a question",
  helpers && !helpers.looksLikeQuestion("Nothing much, I've just been studying all week"));

const reassuranceTurn = helpers?.classifyTurnIntent("It's okay", [
  { sender: "character", content: `"I should've checked in."` },
  { sender: "user", content: "It's okay" },
]);
check("It's okay is a reassurance turn", reassuranceTurn?.kind === "reassurance");
check("fine is a reassurance turn", helpers?.classifyTurnIntent("Fine.", []).kind === "reassurance");
check("I missed you is an affection turn",
  helpers?.classifyTurnIntent("I haven't seen you all week. I missed you", []).kind === "affection");
check("ten-year loyalty is indirect affection",
  helpers?.classifyTurnIntent("If I hated you, I wouldn't be by your side for ten years, dumbass", []).kind === "affection");
check("Spanish indirect loyalty is affection",
  helpers?.classifyTurnIntent("Si te odiara no estaría a tu lado después de diez años, idiota", []).kind === "affection");
check("direct text is recognized",
  helpers?.classifyTurnIntent("I text you: I'll return the umbrella tomorrow", []).kind === "digital_message");
check("user exit is recognized",
  helpers?.classifyTurnIntent("I'll take a shower *I walk to the bathroom*", []).kind === "user_exit");
check("time skip is recognized",
  helpers?.classifyTurnIntent("[Time skip — next day]", []).kind === "time_skip");

const twoSilentMessages = [
  { sender: "character", content: "Rowan waited." },
  { sender: "user", content: "." },
  { sender: "character", content: "Chloe looked at him." },
  { sender: "user", content: ".." },
];
check("two consecutive dots retain a silent streak of two",
  helpers?.classifyTurnIntent("..", twoSilentMessages).silentCount === 2);

check("English input selects English",
  helpers?.detectResponseLanguage("Nothing much, what about you?", "") === "English");
check("Spanish input selects Spanish",
  helpers?.detectResponseLanguage("Nada, sólo estaba estudiando, ¿y tú qué hiciste?", "") === "Spanish");
check("silence inherits the character language",
  helpers?.detectResponseLanguage(".", "No te preocupes, estoy aquí.") === "Spanish");

const weakOkayReply = `"Yeah," Rowan said, taking the words seriously. "I understand."`;
const weakOkayIssues = helpers?.validateNarrativeReply(weakOkayReply, {
  characterName: "Rowan",
  userName: "Toni",
  latestUserMessage: "It's okay",
  turnIntent: reassuranceTurn,
  finishReason: "STOP",
  rejectedResponses: [],
}) || [];
check("the exact reported I understand reply is rejected",
  weakOkayIssues.includes("generic_acknowledgment") && weakOkayIssues.includes("underdeveloped_social_beat"));

const listeningReply = `"Okay," Rowan said. "I'm listening."`;
check("Okay I'm listening is rejected",
  helpers?.validateNarrativeReply(listeningReply, {
    userName: "Toni",
    latestUserMessage: "It's okay",
    turnIntent: reassuranceTurn,
  }).includes("generic_acknowledgment"));

const groundedReassuranceReply = `The easy forgiveness should have let Rowan off the hook. Instead, his grip shifted on the umbrella, guilt lingering where the joke usually came first.\n\n"Still," he said, quieter now. "I should've checked in." A crooked smile touched his mouth. "Let me make it up to you. Coffee after class—no disappearing this time."`;
check("a grounded complete reassurance beat is accepted",
  helpers?.validateNarrativeReply(groundedReassuranceReply, {
    characterName: "Rowan",
    userName: "Toni",
    latestUserMessage: "It's okay",
    turnIntent: reassuranceTurn,
    finishReason: "STOP",
    rejectedResponses: [],
  }).length === 0);

const affectionTurn = helpers?.classifyTurnIntent("I missed you", []);
const weakAffection = `Rowan smiled. "I missed you too."`;
check("a tiny affection answer lacks emotional impact",
  helpers?.validateNarrativeReply(weakAffection, {
    characterName: "Rowan",
    userName: "Toni",
    latestUserMessage: "I missed you",
    turnIntent: affectionTurn,
  }).includes("missing_emotional_impact"));

const groundedAffection = `The admission caught Rowan cleanly. For one unguarded second, relief warmed his face before he looked back toward the rain, pretending the umbrella needed his attention. He had missed you enough to resent how easily three words could undo him.\n\n"Yeah?" His teasing returned, softer around the edges. "Good. Would've been embarrassing if I was the only one."`;
check("private impact plus restrained dialogue satisfies affection",
  helpers?.validateNarrativeReply(groundedAffection, {
    characterName: "Rowan",
    userName: "Toni",
    latestUserMessage: "I missed you",
    turnIntent: affectionTurn,
    finishReason: "STOP",
    rejectedResponses: [],
  }).length === 0);

check("unfinished dialogue is rejected",
  helpers?.validateNarrativeReply(`Rowan glanced over. "I was going to tell you`, {
    turnIntent: { kind: "ordinary" },
  }).includes("unfinished_reply"));
check("MAX_TOKENS is rejected even with punctuation",
  helpers?.validateNarrativeReply(`Rowan looked over. "I mean it."`, {
    turnIntent: { kind: "ordinary" },
    finishReason: "MAX_TOKENS",
  }).includes("truncated_by_model"));
check("system validator language is never shown",
  helpers?.validateNarrativeReply("Velvet could not continue. Try the continuation again.", {
    turnIntent: { kind: "ordinary" },
  }).includes("exposes_system_language"));
check("invented user thoughts are rejected",
  helpers?.validateNarrativeReply(`You realized he was right. Rowan smiled. "See?"`, {
    userName: "Toni",
    latestUserMessage: "Whatever.",
    turnIntent: { kind: "ordinary" },
  }).includes("controls_user_pov"));

const rejectedTake = `Rowan shifted the umbrella over your shoulder. "I should have called." The apology sat awkwardly between you.`;
const copiedTake = `Rowan shifted the umbrella above your shoulder. "I should have called you." The apology remained awkwardly between you.`;
check("regeneration rejects a semantic near-copy",
  helpers?.validateNarrativeReply(copiedTake, {
    latestUserMessage: "It's okay",
    turnIntent: reassuranceTurn,
    rejectedResponses: [rejectedTake],
  }).includes("too_similar_to_rejected_take"));

check("latest user turn is the final authoritative prompt block",
  edge.includes("AUTHORITATIVE LATEST USER TURN") &&
  edge.lastIndexOf("AUTHORITATIVE LATEST USER TURN") > edge.lastIndexOf("IMMEDIATE CONTINUITY") &&
  edge.includes("Write the response to that exact turn now."));
check("It's okay receives an explicit social instruction",
  edge.includes("show what that does to ${character.name}") &&
  edge.includes("Do not respond as a counselor acknowledging information"));
check("affection must affect the character before outward dialogue",
  edge.includes("show the private impact appropriate to the profile before ${character.name}'s outward answer"));
check("guardedness is not cruelty",
  edge.includes("does not mean cruel, contemptuous, robotic or therapeutic"));
check("unsupported off-screen facts are prohibited at generation time",
  edge.includes("Never invent off-screen messages, visits, habits, schedules, relatives' actions, debts, exact durations or shared history"));
check("two silent turns route focus back to the character",
  edge.includes("After two consecutive silent turns, return the meaningful focus to ${character.name}"));
check("post-exit camera follows the character",
  edge.includes("Follow ${character.name}'s immediate reaction"));
check("direct text cannot be buried under NPC banter",
  edge.includes("show its effect and normally include ${character.name}'s written reply before NPC banter"));
check("rejected regeneration prose is absent from the main prompt",
  edge.includes("The rejected take is intentionally absent") &&
  !edge.includes("REJECTED RESPONSE VARIANTS"));
check("branch anchor is checked against the client",
  edge.includes("expectedUserMessageId") &&
  chatsContext.includes("expectedUserMessageId,"));
check("regeneration hides the rejected response before network work",
  chatsContext.indexOf("Hide the rejected take before any network await") < chatsContext.indexOf("const requestController = new AbortController()"));
check("compact silent sentinel remains in the UI",
  chat.includes('const SILENT_CONTINUE_MESSAGE = "[SILENT_CONTINUE]"'));
check("one or more dots become silence",
  chat.includes('/^[.…。]+$/u.test(cleanMessage)'));
check("cancellation rows remain server-private",
  privateCancellationMigration.includes("revoke all on table public.generation_requests from anon, authenticated") &&
  privateCancellationMigration.includes("grant select, insert, update, delete on table public.generation_requests to service_role"));

let failures = 0;
for (const item of checks) {
  if (!item.condition) failures += 1;
  console.log(`${item.condition ? "PASS" : "FAIL"}  ${item.label}`);
}

if (failures) {
  console.error(`\n${failures} story-engine verification check(s) failed.`);
  process.exit(1);
}

console.log(`\n${checks.length} story-engine checks passed.`);
