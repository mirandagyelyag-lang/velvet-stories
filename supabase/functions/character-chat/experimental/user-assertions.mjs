// These high-confidence assertions must not disappear from a model's inventory
// or be exempted as a new opinion merely because the lead says them aloud.
// This is a coverage floor, not an exhaustive natural-language parser.
export function requiredUserAssertions(prose) {
  const patterns = [
    /\byou\s+(?:always|never|keep(?=\s+\w+ing\b)|kept(?=\s+\w+ing\b)|usually|constantly|tend to|have a habit of)\b[^.!?\n”"]*/giu,
    /\b(?:watching|watched|seeing|seen)\s+you\s+(?:let|letting|do|doing|give|giving|waste|wasting|hide|hiding|avoid|avoiding)\b[^.!?\n”"]*/giu,
    /\byou(?:'re|’re| are)\s+(?:hiding|avoiding|pretending|jealous|scared|afraid)\b[^.!?\n”"]*/giu,
    /\b(?:siempre|nunca)\s+(?:haces|dejas|te escondes|evitas|vuelves|terminas)\b[^.!?\n”"]*/giu,
    /\b(?:verte|vi que|he visto que)\s+(?:dejas|dejando|evitas|evitando|haces|haciendo)\b[^.!?\n”"]*/giu,
  ];
  const excerpts = new Set();
  for (const pattern of patterns) for (const match of prose.matchAll(pattern)) {
    // A genuine question or conditional does not establish the proposition.
    const boundary = Math.max(prose.lastIndexOf('.', match.index - 1), prose.lastIndexOf('?', match.index - 1), prose.lastIndexOf('\n', match.index - 1), prose.lastIndexOf('“', match.index - 1));
    const prefix = prose.slice(boundary + 1, match.index);
    const tail = prose.slice(match.index + match[0].length);
    if (/^\s*\?/.test(tail) || /\b(?:if|whether|perhaps|maybe|si|quizás|tal vez)\b/i.test(prefix)) continue;
    excerpts.add(match[0].trim());
  }
  return [...excerpts].map((excerpt, i) => ({id:`required-user-${i}`, kind:'user_fact', excerpt, proposition:`The prose asserts this about the user: ${excerpt}`, citations:[]}));
}
