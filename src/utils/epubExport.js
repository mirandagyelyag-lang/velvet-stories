function crc32Table() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ c >>> 1 : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
}
const CRC_TABLE = crc32Table();
function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ c >>> 8;
  return (c ^ 0xffffffff) >>> 0;
}
function u16(n) {
  return [n & 255, n >>> 8 & 255];
}
function u32(n) {
  return [n & 255, n >>> 8 & 255, n >>> 16 & 255, n >>> 24 & 255];
}
function concat(parts) {
  const size = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}
function zipStored(files) {
  const enc = new TextEncoder();
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const file of files) {
    const name = enc.encode(file.name);
    const data = typeof file.data === "string" ? enc.encode(file.data) : file.data;
    const crc = crc32(data);
    const local = new Uint8Array([...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0), ...name, ...data]);
    locals.push(local);
    const central = new Uint8Array([...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset), ...name]);
    centrals.push(central);
    offset += local.length;
  }
  const centralBytes = concat(centrals);
  const end = new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(centralBytes.length), ...u32(offset), ...u16(0)]);
  return concat([...locals, centralBytes, end]);
}
function esc(value) {
  return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function safeFile(value) {
  return String(value || "Velvet Story").replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim().slice(0, 80) || "Velvet Story";
}
export function downloadStoryEpub({
  title,
  characterName,
  messages = []
}) {
  const cleanMessages = messages.filter(m => !m?.isStreaming && String(m?.content || "").trim());
  const body = cleanMessages.map(m => `<section class="msg ${m.sender === "character" ? "character" : "user"}"><h2>${esc(m.sender === "character" ? characterName : "You")}</h2><p>${esc(m.content).replace(/\n/g, "<br/>")}</p></section>`).join("\n");
  const id = `velvet-${Date.now()}`;
  const story = `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml"><head><title>${esc(title)}</title><meta charset="utf-8"/><style>body{font-family:serif;line-height:1.55;margin:5%;color:#21171b}.msg{margin:0 0 1.35em}.msg h2{font-size:.75em;letter-spacing:.08em;text-transform:uppercase;margin:0 0 .25em;color:#76505e}.msg p{margin:0;white-space:normal}.user{margin-left:8%}.character{margin-right:8%}</style></head><body><h1>${esc(title)}</h1>${body}</body></html>`;
  const nav = `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Navigation</title></head><body><nav epub:type="toc"><ol><li><a href="story.xhtml">${esc(title)}</a></li></ol></nav></body></html>`;
  const opf = `<?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="bookid">${id}</dc:identifier><dc:title>${esc(title)}</dc:title><dc:language>en</dc:language><dc:creator>Velvet Stories</dc:creator><meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d{3}Z$/, "Z")}</meta></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="story" href="story.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="story"/></spine></package>`;
  const container = `<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="EPUB/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`;
  const zip = zipStored([{
    name: "mimetype",
    data: "application/epub+zip"
  }, {
    name: "META-INF/container.xml",
    data: container
  }, {
    name: "EPUB/content.opf",
    data: opf
  }, {
    name: "EPUB/nav.xhtml",
    data: nav
  }, {
    name: "EPUB/story.xhtml",
    data: story
  }]);
  const url = URL.createObjectURL(new Blob([zip], {
    type: "application/epub+zip"
  }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeFile(title)}.epub`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
}
