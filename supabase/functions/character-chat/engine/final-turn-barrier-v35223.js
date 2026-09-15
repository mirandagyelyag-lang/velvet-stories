import { immediateTurnContinuityIssues } from "./immediate-turn-continuity-v35213.js";
import { buildGroundedLastResortReply, establishedAttractionOpportunityIssues } from "./established-attraction-opportunity-v35219.js";

const FINAL_DELEGATED_CHOICE_ISSUES = new Set([
  "delegated_choice_returned",
  "trusted_choice_attraction_flattened",
]);

function relevantIssues({ reply = "", latestUserMessage = "", recentUserMessages = [], recentCharacterReplies = [], character = {} } = {}) {
  const continuity = immediateTurnContinuityIssues(reply, latestUserMessage, recentCharacterReplies, character);
  const attraction = establishedAttractionOpportunityIssues({ reply, latestUserMessage, recentUserMessages, recentCharacterReplies, character });
  return [...new Set([...continuity, ...attraction])].filter((issue) => FINAL_DELEGATED_CHOICE_ISSUES.has(issue));
}

export function finalDelegatedChoiceBarrierIssues(options = {}) {
  return relevantIssues(options);
}

export function enforceFinalDelegatedChoiceBarrier({ reply = "", latestUserMessage = "", recentUserMessages = [], recentCharacterReplies = [], character = {} } = {}) {
  const originalReply = String(reply || "").trim();
  const issues = relevantIssues({ reply: originalReply, latestUserMessage, recentUserMessages, recentCharacterReplies, character });
  if (!issues.length) return { reply: originalReply, replaced: false, issues: [] };

  // The invalid candidate itself may contain the only concrete grounded options
  // (e.g. "the diner or the vending machine"). Include it as the newest grounded
  // character utterance so the deterministic rescue can COMMIT to one of those
  // options rather than inventing a destination or handing the choice back again.
  const groundedReplies = [...(Array.isArray(recentCharacterReplies) ? recentCharacterReplies : []), originalReply].filter(Boolean);
  const rescuedReply = buildGroundedLastResortReply({
    character,
    latestUserMessage,
    recentCharacterReplies: groundedReplies,
    issues,
  });
  const rescueIssues = relevantIssues({ reply: rescuedReply, latestUserMessage, recentUserMessages, recentCharacterReplies, character });

  return {
    reply: String(rescuedReply || "").trim(),
    replaced: true,
    issues: rescueIssues,
    originalIssues: issues,
  };
}
