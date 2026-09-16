function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function safeName(value = "Velvet Story") {
  return String(value || "Velvet Story").replace(/[<>:"/\\|?*\u0000-\u001f]/g, "").replace(/\s+/g, " ").trim().slice(0, 80) || "Velvet Story";
}
function htmlEscape(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
function plainForPdf(value = "") {
  return String(value).replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[—–]/g, "-").replace(/…/g, "...").normalize("NFKD").replace(/[^\x20-\x7E\n]/g, "");
}
function wrapText(text, width = 82) {
  const output = [];
  for (const raw of String(text || "").split(/\r?\n/)) {
    if (!raw.trim()) {
      output.push("");
      continue;
    }
    let line = "";
    for (const word of raw.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (next.length <= width) line = next;else {
        if (line) output.push(line);
        line = word;
      }
    }
    if (line) output.push(line);
  }
  return output;
}
function pdfEscape(value = "") {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}
function makePdf(pages) {
  const objects = [];
  const add = value => {
    objects.push(value);
    return objects.length;
  };
  const fontRegular = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const fontBold = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  const pagesId = add("");
  const pageIds = [];
  for (const pageLines of pages) {
    let y = 744;
    const commands = ["BT"];
    for (const item of pageLines) {
      const size = item.size || 11;
      const leading = item.leading || Math.max(14, size + 4);
      commands.push(`/${item.bold ? "F2" : "F1"} ${size} Tf`);
      commands.push(`1 0 0 1 ${item.x || 48} ${y} Tm`);
      commands.push(`(${pdfEscape(plainForPdf(item.text))}) Tj`);
      y -= leading;
    }
    commands.push("ET");
    const stream = commands.join("\n");
    const contentId = add(`<< /Length ${new TextEncoder().encode(stream).length} >>\nstream\n${stream}\nendstream`);
    const pageId = add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> >> /Contents ${contentId} 0 R >>`);
    pageIds.push(pageId);
  }
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;
  const catalogId = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 0; i < objects.length; i += 1) {
    offsets.push(new TextEncoder().encode(pdf).length);
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefOffset = new TextEncoder().encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Blob([pdf], {
    type: "application/pdf"
  });
}
function bookPages(story) {
  const title = story.coverTitle || story.title || story.characterName || "Velvet Story";
  const pages = [];
  let current = [{
    text: title,
    size: 22,
    bold: true,
    leading: 30
  }, {
    text: story.coverMood || "A Velvet Story",
    size: 11,
    leading: 20
  }, {
    text: `Featuring ${story.characterName || "your characters"}`,
    size: 10,
    leading: 18
  }, {
    text: `Exported ${new Date().toLocaleString()}`,
    size: 9,
    leading: 24
  }];
  const flush = () => {
    if (current.length) pages.push(current);
    current = [];
  };
  let used = 120;
  for (const message of story.messages || []) {
    const speaker = message.sender === "user" ? story.personaName || "You" : message.speakerName || story.characterName || "Character";
    const lines = wrapText(message.content, 78);
    const needed = 28 + lines.length * 14;
    if (used + needed > 670) {
      flush();
      used = 0;
    }
    current.push({
      text: speaker,
      size: 10,
      bold: true,
      leading: 16
    });
    for (const line of lines) current.push({
      text: line || " ",
      size: 10,
      leading: 14
    });
    current.push({
      text: " ",
      size: 5,
      leading: 8
    });
    used += needed;
  }
  flush();
  return pages.length ? pages : [[{
    text: title,
    size: 22,
    bold: true
  }]];
}
export function exportStoryBook(story, format = "pdf") {
  const title = safeName(story.coverTitle || story.title || story.characterName || "Velvet Story");
  const messages = story.messages || [];
  if (format === "pdf") {
    downloadBlob(makePdf(bookPages(story)), `${title}.pdf`);
    return;
  }
  if (format === "markdown") {
    const body = [`# ${story.coverTitle || story.title || "Velvet Story"}`, story.coverMood ? `*${story.coverMood}*` : "", "", `**Character:** ${story.characterName || ""}`, story.personaName ? `**Persona:** ${story.personaName}` : "", "", "---", "", ...messages.flatMap(message => [`### ${message.sender === "user" ? story.personaName || "You" : message.speakerName || story.characterName || "Character"}`, "", message.content, ""])].filter(line => line !== undefined).join("\n");
    downloadBlob(new Blob([body], {
      type: "text/markdown;charset=utf-8"
    }), `${title}.md`);
    return;
  }
  const articles = messages.map(message => {
    const speaker = message.sender === "user" ? story.personaName || "You" : message.speakerName || story.characterName || "Character";
    return `<article><h3>${htmlEscape(speaker)}</h3><div>${htmlEscape(message.content).replace(/\n/g, "<br>")}</div></article>`;
  }).join("\n");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${htmlEscape(title)}</title><style>
  body{max-width:760px;margin:0 auto;padding:64px 24px;font-family:Georgia,serif;background:#fffaf8;color:#2b2025;line-height:1.65}
  header{text-align:center;margin-bottom:56px}h1{font-size:3rem;margin:.2em 0}header p{color:#856a76;font-style:italic}
  article{margin:0 0 28px}article h3{font-size:.78rem;text-transform:uppercase;letter-spacing:.16em;color:#9b526e;margin:0 0 8px}
  @media print{body{padding:0}article{break-inside:avoid}}
  </style></head><body><header>${story.coverUrl ? `<img src="${htmlEscape(story.coverUrl)}" alt="" style="width:100%;max-height:420px;object-fit:cover;border-radius:24px">` : ""}<h1>${htmlEscape(story.coverTitle || story.title || "Velvet Story")}</h1>${story.coverMood ? `<p>${htmlEscape(story.coverMood)}</p>` : ""}</header>${articles}</body></html>`;
  downloadBlob(new Blob([html], {
    type: "text/html;charset=utf-8"
  }), `${title}.html`);
}
export function downloadStoryBackup(payload, filename = "velvet-story-backup.json") {
  downloadBlob(new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8"
  }), filename);
}
