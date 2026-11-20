// The note's parts, in order, for the Wiki preview's "Show hidden": what's published and what isn't.
// The publishing rules themselves are in extract.ts. This only labels the parts for the preview.

export type Part =
  | { kind: "player"; title: string; text: string; hasHidden: boolean; content: boolean } // a [!player] callout (published)
  | { kind: "callout"; type: string; title: string; text: string } // any other callout (never published)
  | { kind: "text"; text: string } // normal text (never published)
  | { kind: "comment"; text: string }; // %% comments %% (never published)

const START = /^>\s*\[!(\w[\w-]*)(?:\|([^\]]*))?\][+-]?\s*(.*)$/i;

export function noteParts(note: string): Part[] {
  let body = note.replace(/\r\n/g, "\n");
  const fm = body.match(/^---\n[\s\S]*?\n---\n?/);
  if (fm) body = body.slice(fm[0].length);
  const parts: Part[] = [];
  const text: string[] = [];
  const flush = () => {
    // Comments come out as their own parts; the rest is normal text
    const joined = text.join("\n");
    text.length = 0;
    let last = 0;
    for (const m of joined.matchAll(/%%([\s\S]*?)%%/g)) {
      const before = joined.slice(last, m.index).trim();
      if (before) parts.push({ kind: "text", text: before });
      if (m[1].trim()) parts.push({ kind: "comment", text: m[1].trim() });
      last = m.index! + m[0].length;
    }
    const rest = joined.slice(last).trim();
    if (rest) parts.push({ kind: "text", text: rest });
  };
  const lines = body.split("\n");
  let inCode = false;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*(```|~~~)/.test(lines[i])) inCode = !inCode;
    const m = inCode ? null : lines[i].match(START);
    if (!m) {
      text.push(lines[i]);
      continue;
    }
    flush();
    const inner: string[] = [];
    let j = i + 1;
    while (j < lines.length && lines[j].startsWith(">")) inner.push(lines[j++].replace(/^> ?/, ""));
    const content = inner.join("\n").trim();
    const title = m[3].trim();
    if (m[1].toLowerCase() === "player") parts.push({ kind: "player", title, text: content, hasHidden: /^>\s*\[!/im.test(content), content: (m[2] ?? "").trim().toLowerCase() === "content" });
    else parts.push({ kind: "callout", type: m[1].toLowerCase(), title, text: content });
    i = j - 1;
  }
  flush();
  return parts;
}

// Links in player text, and whether each will work on the wiki
export function linksIn(markdown: string): { target: string; shown: string; embed: boolean }[] {
  return [...markdown.matchAll(/(!?)\[\[([^\]|#]*)(?:#[^\]|]*)?(?:\|([^\]]*))?\]\]/g)].map((m) => ({
    target: m[2].trim(),
    shown: (m[3] ?? m[2]).trim(),
    embed: m[1] === "!",
  }));
}

// Names the party doesn't know, used in player text: "Rowan" when they know her as "The Grey Lady".
// `secret` maps a note's own name to the name the party knows (from player_name).
export function secretNames(markdown: string, secret: Map<string, string>): { name: string; known: string }[] {
  const out: { name: string; known: string }[] = [];
  const plain = markdown.replace(/\[\[[^\]]*\|([^\]]*)\]\]/g, "$1"); // a link's shown text counts, its target doesn't
  for (const [name, known] of secret) {
    if (name.toLowerCase() === known.toLowerCase()) continue;
    const re = new RegExp(`(^|[^\\p{L}\\p{N}])${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=$|[^\\p{L}\\p{N}])`, "u");
    if (re.test(plain)) out.push({ name, known });
  }
  return out;
}
