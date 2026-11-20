// The wiki sections of a note, for editing in the Wiki preview tab.
//
// A wiki section is a callout of one of these types:
//   > [!player]- Session 4            everyone (published)
//   > [!player-tam]- Session 5       one player (published locked: see audiences.ts)
//   > [!dm]- The truth                the DM view only (not published yet)
// Its kind:
//   title "Overview"                  the Overview
//   [!player|content]                 Content: the page's own text, with the title as its heading
//   anything else                     an entry under "What we know", with the title as its heading
//
// Your other callouts (like [!danger] DM only) are never touched.
// Saving moves the sections to the bottom of the note, folded, in the order given.
// A section with another callout inside it can't be edited safely, so it stays where it is.

export type Kind = "overview" | "content" | "known";

export interface WikiSection {
  kind: Kind;
  title: string; // the heading (not used for the Overview)
  text: string;
  vis: string; // "everyone", "dm", or a player's name in lower case ("tam")
  simple: boolean; // false: another callout is inside it, so it's shown but not editable
}

interface Found extends WikiSection {
  start: number;
  end: number; // the line after the callout
}

const START = /^>\s*\[!(player(?:-[\w-]+)?|dm)(?:\|([^\]]*))?\]([+-]?)\s*(.*)$/i;

function find(lines: string[]): Found[] {
  const out: Found[] = [];
  let i = 0;
  if (lines[0]?.trim() === "---") {
    i = 1;
    while (i < lines.length && lines[i].trim() !== "---") i++;
    i++;
  }
  let inCode = false;
  for (; i < lines.length; i++) {
    if (/^\s*(```|~~~)/.test(lines[i])) inCode = !inCode;
    const m = inCode ? null : lines[i].match(START);
    if (!m) continue;
    let j = i + 1;
    while (j < lines.length && lines[j].startsWith(">")) j++;
    const body = lines.slice(i + 1, j).map((l) => l.replace(/^> ?/, ""));
    const type = m[1].toLowerCase();
    const meta = (m[2] ?? "").trim().toLowerCase();
    const title = m[4].trim();
    out.push({
      kind: meta === "content" ? "content" : title.toLowerCase() === "overview" ? "overview" : "known",
      title: meta !== "content" && title.toLowerCase() === "overview" ? "" : title,
      text: body.join("\n").trim(),
      vis: type === "player" ? "everyone" : type === "dm" ? "dm" : type.slice(7),
      simple: !body.some((l) => /^>|\[!/.test(l)),
      start: i,
      end: j,
    });
    i = j - 1;
  }
  return out;
}

export function readSections(note: string): WikiSection[] {
  return find(note.replace(/\r\n/g, "\n").split("\n")).map(({ start: _s, end: _e, ...s }) => s);
}

// "> [!player-tam|content]- The letter" and its lines
export function sectionLines(s: WikiSection): string[] {
  const type = s.vis === "everyone" ? "player" : s.vis === "dm" ? "dm" : `player-${s.vis}`;
  const head = `> [!${type}${s.kind === "content" ? "|content" : ""}]-${s.kind === "overview" ? " Overview" : s.title.trim() ? ` ${s.title.trim()}` : ""}`;
  const body = s.text.replace(/\r\n/g, "\n").trim().split("\n").map((l) => (l.trim() ? `> ${l}` : ">"));
  return [head, ...(s.text.trim() ? body : [])];
}

// The note with its editable wiki sections replaced by `sections`, at the bottom, folded.
// Sections that aren't simple are left where they are and aren't part of `sections`.
export function writeSections(note: string, sections: WikiSection[]): string {
  const crlf = note.includes("\r\n");
  const lines = note.replace(/\r\n/g, "\n").split("\n");
  const editable = find(lines).filter((f) => f.simple);
  // Take the old ones out, from the bottom up so line numbers stay right
  for (const f of [...editable].reverse()) {
    let { start, end } = f;
    // Don't leave two blank lines behind
    if (lines[end]?.trim() === "" && (start === 0 || lines[start - 1]?.trim() === "")) end++;
    lines.splice(start, end - start);
  }
  while (lines.length && lines[lines.length - 1].trim() === "") lines.pop();
  const blocks = sections.filter((s) => s.text.trim() || s.title.trim()).map((s) => sectionLines(s).join("\n"));
  const out = lines.join("\n") + (blocks.length ? `${lines.length ? "\n\n" : ""}${blocks.join("\n\n")}` : "") + "\n";
  return crlf ? out.replace(/\n/g, "\r\n") : out;
}

// A section's text without any other callout inside it (publishing leaves those out)
export function withoutNested(text: string): string {
  const out: string[] = [];
  let skipping = false;
  for (const line of text.split("\n")) {
    const nested = line.match(/^>\s*\[!(\w[\w-]*)/i);
    if (nested) {
      skipping = nested[1].toLowerCase() !== "player";
      continue;
    }
    if (skipping && line.startsWith(">")) continue;
    skipping = false;
    out.push(line);
  }
  return out.join("\n");
}
