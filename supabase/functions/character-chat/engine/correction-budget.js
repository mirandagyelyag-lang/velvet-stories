// Exhausting an optional correction budget is a normal state, never a chat error.
export function createCorrectionBudget(limit = 1) {
  let used = 0;
  return {
    get available() { return used < limit; },
    async run(generate) {
      if (used >= limit) return null;
      used += 1; // Reserve before awaiting, including failed provider attempts.
      return await generate();
    },
  };
}

// These findings guide generation but cannot invalidate otherwise grounded prose.
// Canon, user agency, answer ownership, completeness and novelty remain mandatory.
const editorialFindings = new Set([
  'micro_turn_padding', 'repeated_low_signal_mannerism',
  'human_cognition_response_weight', 'naturalness_score_low',
  'compulsory_followup_question', 'silent_continue_prop_loop',
  'individual_psyche_repeated_opening', 'profile_social_ecosystem_missing',
  'response_weight_mismatch', 'embodied_state_ignored',
  'story_brain_stagnation_not_broken', 'recent_line_echo',
]);
export const isEditorialAdvisory = issue => editorialFindings.has(issue);
