export function instantStoryLooksComplete(opening: unknown, finishReason: unknown = "") {
  const text = String(opening || "").trim();
  const words = text.split(/\s+/).filter(Boolean);
  const finish = String(finishReason || "").toUpperCase();

  if (!text || words.length < 30) return false;
  if (["MAX_TOKENS", "SAFETY", "RECITATION", "BLOCKLIST", "PROHIBITED_CONTENT", "MALFORMED_FUNCTION_CALL"].includes(finish)) return false;
  if (/[’'][A-Za-z]{0,2}$/.test(text)) return false;
  if (/[,:;\-–—]$/.test(text)) return false;
  if (!/[.!?…][\"'”’)]?$/.test(text)) return false;

  const straightQuotes = (text.match(/\"/g) || []).length;
  const openCurlyQuotes = (text.match(/“/g) || []).length;
  const closeCurlyQuotes = (text.match(/”/g) || []).length;
  if (straightQuotes % 2 !== 0 || openCurlyQuotes !== closeCurlyQuotes) return false;

  return true;
}
