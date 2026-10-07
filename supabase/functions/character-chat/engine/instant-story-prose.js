// Shared by the Edge handler and frontend so a successful opening has the same
// visible prose/completeness contract at both sides of the HTTP boundary.
export function normalizeInstantStoryProse(value = "") {
  return String(value || "").trim()
    .replace(/(^|\s)\*\*([^*]+)\*\*(?=$|[\s.,!?…])/g, "$1$2")
    .replace(/(^|\s)\*([^*]+)\*(?=$|[\s.,!?…])/g, "$1$2")
    .trim();
}

export function instantStoryProseValidation(value = "") {
  const opening = normalizeInstantStoryProse(value);
  const wordCount = opening.split(/\s+/).filter(Boolean).length;
  const complete = /[.!?…]["'”’)]?$/.test(opening) && !/[’'][A-Za-z]{0,2}$/.test(opening);
  return { opening, wordCount, complete, valid: wordCount >= 55 && complete };
}
