import { Fragment } from "react";

function RoleplayText({ content = "" }) {
  const paragraphs = splitParagraphs(String(content));

  return (
    <span className="roleplay-text">
      {paragraphs.map((paragraph, paragraphIndex) => {
        const isDialogueLed = startsLikeDialogue(paragraph);
        const lines = paragraph.split("\n");

        return (
          <span
            key={`${paragraphIndex}-${paragraph.slice(0, 18)}`}
            className={`roleplay-text__paragraph${isDialogueLed ? " roleplay-text__paragraph--dialogue" : " roleplay-text__paragraph--narration"}`}
          >
            {lines.map((line, lineIndex) => (
              <Fragment key={`${paragraphIndex}-${lineIndex}-${line.slice(0, 12)}`}>
                {line.startsWith("> ") ? (
                  <span className="roleplay-text__quote">
                    {renderInline(line.slice(2), lineIndex)}
                  </span>
                ) : (
                  renderInline(line, lineIndex)
                )}
                {lineIndex < lines.length - 1 && <br />}
              </Fragment>
            ))}
          </span>
        );
      })}
    </span>
  );
}

function splitParagraphs(value) {
  const clean = String(value || "").replace(/\r\n/g, "\n").trim();
  if (!clean) return [""];
  return clean.split(/\n\s*\n+/g).filter((item) => item.trim().length > 0);
}

function startsLikeDialogue(value = "") {
  const text = String(value).trim();
  return /^(?:[—–-]\s*)?(?:[«“\"])/u.test(text);
}

function renderInline(text, lineIndex) {
  const tokens = [];
  let cursor = 0;
  let tokenIndex = 0;

  while (cursor < text.length) {
    const match = findNextToken(text, cursor);

    if (!match) {
      tokens.push(text.slice(cursor));
      break;
    }

    if (match.start > cursor) tokens.push(text.slice(cursor, match.start));

    tokens.push(
      <span
        key={`${lineIndex}-${tokenIndex}`}
        className={`roleplay-text__${match.type}`}
      >
        {match.content}
      </span>
    );

    tokenIndex += 1;
    cursor = match.end;
  }

  return tokens;
}

function findNextToken(text, from) {
  const definitions = [
    { type: "strong-emphasis", open: "***", close: "***" },
    { type: "bold", open: "**", close: "**" },
    { type: "thought-marked", open: "*/", close: "/*" },
    { type: "thought", open: "//", close: "//" },
    { type: "instruction", open: "[", close: "]" },
    { type: "narration", open: "*", close: "*" },
    { type: "thought", open: "/", close: "/" },
    { type: "strike", open: "~~", close: "~~" },
    { type: "dialogue", open: "«", close: "»", preserveMarkers: true },
    { type: "dialogue", open: "“", close: "”", preserveMarkers: true },
    { type: "dialogue", open: '"', close: '"', preserveMarkers: true },
  ];

  let winner = null;

  for (const definition of definitions) {
    const start = text.indexOf(definition.open, from);
    if (start === -1) continue;

    const contentStart = start + definition.open.length;
    const close = text.indexOf(definition.close, contentStart);
    if (close === -1 || close === contentStart) continue;

    if (definition.type === "thought") {
      const before = text[start - 1] || " ";
      const after = text[close + 1] || " ";
      if (/\w/.test(before) || /\w/.test(after)) continue;
    }

    const inner = text.slice(contentStart, close);
    const candidate = {
      type: definition.type,
      start,
      end: close + definition.close.length,
      content: definition.preserveMarkers
        ? `${definition.open}${inner}${definition.close}`
        : inner,
    };

    if (!winner || candidate.start < winner.start) winner = candidate;
  }

  return winner;
}

export default RoleplayText;
