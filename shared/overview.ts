// Reads and writes a note's "> [!player] Overview" callout, for the note form.
// Only the Overview callout's own lines are ever changed. Everything else in the note stays as it is.

const HEADER = /^>\s*\[!player\][+-]?\s*overview\s*$/i;

export interface Overview {
  text: string; // the callout's text, without the "> " in front
  start: number; // line of the "> [!player] Overview" header
  end: number; // line after the last line of the callout
  simple: boolean; // false if it holds something the form can't edit safely (another callout inside)
}

// The note's Overview callout, if it has one (frontmatter and code blocks are skipped)
export function findOverview(note: string): Overview | null {
  const lines = note.split("\n");
  let i = 0;
  if (lines[0]?.trim() === "---") {
    i = 1;
    while (i < lines.length && lines[i].trim() !== "---") i++;
    i++;
  }
  let inCode = false;
  for (; i < lines.length; i++) {
    if (/^\s*(```|~~~)/.test(lines[i])) inCode = !inCode;
    if (inCode || !HEADER.test(lines[i].replace(/\r$/, ""))) continue;
    let j = i + 1;
    while (j < lines.length && lines[j].startsWith(">")) j++;
    const body = lines.slice(i + 1, j).map((l) => l.replace(/\r$/, "").replace(/^> ?/, ""));
    return { text: body.join("\n").trim(), start: i, end: j, simple: !body.some((l) => /^>|\[!/.test(l)) };
  }
  return null;
}

// Counts the note's player callouts (any title)
export function playerCallouts(note: string): number {
  return note.split("\n").filter((l) => /^>\s*\[!player\]/i.test(l)).length;
}

// The note with its Overview set to `text`.
// - It has one: its lines are replaced (or the callout removed, if `text` is empty).
// - It hasn't: one is added at the top, just under the properties.
export function setOverview(note: string, text: string): string {
  const crlf = note.includes("\r\n");
  const lines = note.replace(/\r\n/g, "\n").split("\n");
  const clean = text.replace(/\r\n/g, "\n").trim();
  const block = clean ? ["> [!player] Overview", ...clean.split("\n").map((l) => (l.trim() ? `> ${l}` : ">"))] : [];
  const found = findOverview(lines.join("\n"));
  let out: string[];
  if (found) {
    if (!found.simple) throw new Error("This Overview has another callout inside it, so it can only be changed in the note itself.");
    out = [...lines.slice(0, found.start), ...block, ...lines.slice(found.end)];
    // Removing it: don't leave two blank lines behind
    if (!block.length && out[found.start - 1]?.trim() === "" && out[found.start]?.trim() === "") out.splice(found.start, 1);
  } else {
    if (!block.length) return note;
    let at = 0;
    if (lines[0]?.trim() === "---") {
      at = 1;
      while (at < lines.length && lines[at].trim() !== "---") at++;
      at++;
    }
    out = [...lines.slice(0, at), ...(at > 0 ? [""] : []), ...block, "", ...lines.slice(at).filter((l, i) => !(i === 0 && l.trim() === ""))];
  }
  const joined = out.join("\n");
  return crlf ? joined.replace(/\n/g, "\r\n") : joined;
}
