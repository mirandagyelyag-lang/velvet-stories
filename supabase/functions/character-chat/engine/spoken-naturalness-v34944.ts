export function buildSpokenNaturalnessV34944({ latestUserMessage = "", character = {} } = {}) {
  const latest = String(latestUserMessage || "").trim();
  return `SPOKEN NATURALNESS 3.49.44 · MICRO-POLISH ONLY
- TARGET-AWARE DIALOGUE 3.49.43 is frozen. Preserve its semantic answer. This pass may simplify wording; it must NEVER change what question is being answered or invent a new motive.
- Write speech, not prose disguised as dialogue. Prefer the vocabulary and sentence shape this person would reach for in real time.
- Do not make every answer complete, balanced, elegant, quotable, or maximally precise. Real speech can be slightly uneven, plain, clipped, self-correcting, or end before every implication is explained.
- Use contractions when natural. Prefer ordinary words over formal substitutes when both mean the same thing.
- FORMALITY CHECK: words such as “significantly”, “considerably”, “nevertheless”, “therefore”, “spectacle”, “tolerable”, “circumstances”, “regarding”, “apparently” need a real character/context reason. Do not use them merely to sound intelligent, aloof, wealthy, dry, or sophisticated.
- CONNECTOR CHECK: avoid packaging a casual reply as thesis + “besides/however/therefore” + second polished clause. One sufficient reason is often enough.
- EXPLANATION CHECK: once the social question has actually been answered, stop. Do not append a second reason just to make the response feel finished.
- PERSONALITY survives through selection, rhythm and omission. Do not decorate an ordinary answer with a clever sting solely to prove who the character is.
- Do not deliberately add filler words, stutters, slang, sentence fragments, or contractions as fake-human texture. Naturalness is not noise.
- A short polished line such as “I didn't think I needed an invitation.” can be perfectly natural when it fits the moment. Do NOT flatten every character into generic casual speech.
- BAD OVERWRITTEN SHAPE: “I enjoy the spectacle. Besides, I was thirsty, and the company here is significantly more tolerable than what I was dealing with ten minutes ago.” It is over-composed for a casual turn: abstract opener, formal connector, formal comparison, and unnecessary completion.
- Preserve specificity when it matters. Simplify wording, not meaning.
LATEST USER TURN: ${latest.slice(0,900) || "none"}\nCHARACTER: ${String(character?.name || "character").slice(0,120)}`;
}

export function spokenNaturalnessV34944Issues(reply = "", latestUserMessage = "") {
  const text = String(reply || "").trim();
  const issues = [];
  const dialogue = text.replace(/^[\s“”"']+|[\s“”"']+$/g, "");
  const formal = dialogue.match(/\b(?:significantly|considerably|nevertheless|therefore|regarding|circumstances)\b/gi) || [];
  if (formal.length >= 1 && dialogue.split(/\s+/).length <= 55) issues.push("spoken_naturalness_formal_register");
  if (/\bi enjoy the spectacle\b/i.test(dialogue) && /\b(?:besides|however)\b/i.test(dialogue)) issues.push("spoken_naturalness_composed_thesis");
  if (/\bcompany here is significantly more tolerable\b/i.test(dialogue)) issues.push("spoken_naturalness_overwritten_comparison");
  if (/\bi enjoy the spectacle\.\s*besides,?\s*i was thirsty\b/i.test(dialogue)) issues.push("spoken_naturalness_answer_overcompletion");
  return [...new Set(issues)];
}
