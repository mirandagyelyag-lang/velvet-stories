import { Fragment } from "react";

function RoleplayText({ content = "" }) {
  const paragraphs = splitParagraphs(String(content));

  return (
    <span className="roleplay-text">
      {paragraphs.map((paragraph, paragraphIndex) => {
        const beats = splitParagraphIntoBeats(paragraph);

        return (
          <span
            key={`${paragraphIndex}-${paragraph.slice(0, 18)}`}
            className="roleplay-text__paragraph"
          >
            {beats.map((beat, beatIndex) => (
              <span
                key={`${paragraphIndex}-${beatIndex}-${beat.text.slice(0, 18)}`}
                className={`roleplay-text__beat roleplay-text__beat--${beat.type}`}
              >
                {renderInline(beat.text, `${paragraphIndex}-${beatIndex}`)}
              </span>
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

function splitParagraphIntoBeats(paragraph = "") {
  const text = String(paragraph || "");
  const beats = [];
  let cursor = 0;

  while (cursor < text.length) {
    const dialogue = findNextDialogueRange(text, cursor);

    if (!dialogue) {
      pushBeat(beats, "narration", text.slice(cursor));
      break;
    }

    if (dialogue.start > cursor) {
      pushBeat(beats, "narration", text.slice(cursor, dialogue.start));
    }

    pushBeat(beats, "dialogue", text.slice(dialogue.start, dialogue.end));
    cursor = dialogue.end;
  }

  if (!beats.length) pushBeat(beats, "narration", text);
  return beats;
}

function findNextDialogueRange(text, from = 0) {
  const quotePairs = [
    { open: "«", close: "»" },
    { open: "“", close: "”" },
    { open: '"', close: '"' },
  ];

  let winner = null;

  for (const pair of quotePairs) {
    const start = text.indexOf(pair.open, from);
    if (start === -1) continue;

    const contentStart = start + pair.open.length;
    const close = text.indexOf(pair.close, contentStart);
    if (close === -1 || close === contentStart) continue;

    const candidate = {
      start,
      end: close + pair.close.length,
    };

    if (!winner || candidate.start < winner.start) winner = candidate;
  }

  return winner;
}

function pushBeat(beats, type, value) {
  const text = String(value || "").trim();
  if (!text) return;

  beats.push({ type, text });
}

function renderInline(text, keyPrefix) {
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
        key={`${keyPrefix}-${tokenIndex}`}
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
