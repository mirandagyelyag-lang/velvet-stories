export function buildAdaptiveReplyHint(rawMessage = "") {
  const text = String(rawMessage || "").trim();
  if (!text || /^\[SILENT_|^\[RETURN_MAIN_POV/.test(text)) return "Keep this beat compact and action-led. Do not invent dialogue, actions, feelings or decisions for the user.";
  const words = text.split(/\s+/).filter(Boolean).length;
  if (words <= 5) return "Match the small conversational scale of the user's turn. Prefer a concise, natural response unless the scene genuinely needs one concrete action.";
  if (words <= 22) return "Use a natural medium-short reply. Prioritize audible dialogue and one or two grounded actions over explanatory narration.";
  if (words >= 90) return "Respond fully to the important parts without mirroring the user's length. Keep the character specific, selective and dialogue-forward.";
  return "Use a natural medium reply whose length follows the scene, not a fixed template. Avoid padding and repeated emotional explanation.";
}
export function mergeDirectorHints(explicit = "", adaptive = "") {
  const a = String(explicit || "").trim();
  const b = String(adaptive || "").trim();
  if (a && b) return `${a}\n\nAdaptive reply guidance: ${b}`;
  return a || b;
}
