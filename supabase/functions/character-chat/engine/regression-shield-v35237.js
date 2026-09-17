// Velvet v3.52.37 · Regression Shield
// This does not add a new writing style. It composes existing final barriers in a
// stable order, re-checks cross-effects, and makes the result idempotent.

import { enforceFinalDelegatedChoiceBarrier } from "./final-turn-barrier-v35223.js";
import { enforceSceneMomentumBarrierV35236, sceneMomentumBarrierV35236Issues } from "./scene-momentum-barrier-v35236.js";

const list = (value) => Array.isArray(value) ? value : [];
const unique = (value) => [...new Set(list(value).filter(Boolean))];

function delegatedIssues(result = {}) {
  return unique(result?.issues || []);
}

export function finalizeRegressionSafeTurnV35237({
  reply = "",
  latestUserMessage = "",
  recentUserMessages = [],
  recentCharacterReplies = [],
  character = {},
} = {}) {
  const original = String(reply || "").trim();
  let candidate = original;
  const trace = [];

  // Pass 1: settle explicit delegated choices first.
  const choice1 = enforceFinalDelegatedChoiceBarrier({
    reply: candidate, latestUserMessage, recentUserMessages, recentCharacterReplies, character,
  });
  candidate = String(choice1.reply || candidate).trim();
  if (choice1.replaced) trace.push(...unique(choice1.originalIssues || []));

  // Pass 2: preserve the last physical state / pacing.
  const scene1 = enforceSceneMomentumBarrierV35236({
    reply: candidate, latestUserMessage, recentUserMessages, recentCharacterReplies, character,
  });
  candidate = String(scene1.reply || candidate).trim();
  if (scene1.replaced) trace.push(...unique(scene1.originalIssues || []));

  // A scene fallback must never reintroduce “your call” after the user delegated a
  // decision. Re-run the choice barrier once, then scene continuity once more.
  const choice2 = enforceFinalDelegatedChoiceBarrier({
    reply: candidate, latestUserMessage, recentUserMessages, recentCharacterReplies, character,
  });
  candidate = String(choice2.reply || candidate).trim();
  if (choice2.replaced) trace.push(...unique(choice2.originalIssues || []));

  const scene2 = enforceSceneMomentumBarrierV35236({
    reply: candidate, latestUserMessage, recentUserMessages, recentCharacterReplies, character,
  });
  candidate = String(scene2.reply || candidate).trim();
  if (scene2.replaced) trace.push(...unique(scene2.originalIssues || []));

  const sceneIssues = sceneMomentumBarrierV35236Issues({
    reply: candidate, latestUserMessage, recentCharacterReplies,
  });
  const remaining = unique([
    ...delegatedIssues(choice2),
    ...delegatedIssues(scene2),
    ...sceneIssues,
  ]);

  return {
    reply: candidate,
    replaced: candidate !== original,
    originalIssues: unique(trace),
    issues: remaining,
  };
}
