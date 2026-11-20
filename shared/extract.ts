// Turns one vault note into its player-safe version.
// Only [!player] callouts and allow-listed properties get through.
// Everything else (generic text, DM callouts, normal properties) is dropped.

export interface YamlTools {
  parse: (text: string) => unknown;
  stringify: (value: unknown) => string;
}

export interface PlayerNote {
  title: string;
  properties: Record<string, unknown>;
  overview: string | null;
  content: { label: string; body: string }[]; // "> [!player|content]" callouts: the page's main text
  entries: { label: string; body: string }[];
}

// Properties the wiki is allowed to read. Anything not listed here is dropped.
const ALLOWED_EXACT = new Set([
  "photo",
  "banner",
  "banner_focus",
  "spotify",
  "pinterest",
  "wiki_section",
  "quest",
  "quest_status",
  "pinned",
  "fc-date",
  "fc-category",
]);
const ALLOWED_PREFIXES = ["player_", "affinity_"];

export function isAllowedProperty(key: string): boolean {
  return ALLOWED_EXACT.has(key) || ALLOWED_PREFIXES.some((p) => key.startsWith(p));
}

// Splits "---\nyaml\n---\nbody" into its two parts.
function splitFrontmatter(text: string): { yaml: string; body: string } {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { yaml: "", body: text };
  return { yaml: match[1], body: text.slice(match[0].length) };
}

// Removes Obsidian comments: %% like this %%
function stripComments(text: string): string {
  return text.replace(/%%[\s\S]*?%%/g, "");
}

// Matches the first line of a callout, e.g. "> [!player]- Session 5" or "> [!player|content] The stars".
// Only the type "player" is published as is. "player-tam" (one player) and "dm" are published locked (audiences.ts).
const CALLOUT_START = /^>\s*\[!(\w[\w-]*)(?:\|([^\]]*))?\][+-]?\s*(.*)$/i;

// Inside a player callout, removes any nested callout that isn't a player one
// (for example a DM callout someone put inside by mistake).
function stripNestedCallouts(lines: string[]): string[] {
  const out: string[] = [];
  let skipping = false;
  for (const line of lines) {
    const nested = line.match(/^>\s*\[!(\w[\w-]*)\]/i);
    if (nested) {
      skipping = nested[1].toLowerCase() !== "player";
      if (!skipping) continue; // drop the nested player header, keep its text
      continue;
    }
    if (skipping) {
      if (line.startsWith(">")) continue;
      skipping = false;
    }
    out.push(line);
  }
  return out;
}

// Finds every [!player] callout in the body.
function findPlayerCallouts(body: string): { title: string; text: string; content: boolean }[] {
  const lines = body.split(/\r?\n/);
  const found: { title: string; text: string; content: boolean }[] = [];
  let inCode = false;
  for (let i = 0; i < lines.length; i++) {
    // Skip code blocks: a callout written inside one is an example, not content.
    if (/^\s*(```|~~~)/.test(lines[i])) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;
    const start = lines[i].match(CALLOUT_START);
    if (!start || start[1].toLowerCase() !== "player") continue;
    const content: string[] = [];
    let j = i + 1;
    while (j < lines.length && lines[j].startsWith(">")) {
      content.push(lines[j].replace(/^> ?/, ""));
      j++;
    }
    const cleaned = stripNestedCallouts(content).join("\n").trim();
    found.push({ title: start[3].trim(), text: cleaned, content: (start[2] ?? "").trim().toLowerCase() === "content" });
    i = j - 1;
  }
  return found;
}

function fileNameToTitle(path: string): string {
  const name = path.split("/").pop() ?? path;
  return name.replace(/\.md$/i, "");
}

// The main job. Returns null if the note has nothing for players.
export function extractPlayerNote(
  path: string,
  text: string,
  yaml: YamlTools,
): PlayerNote | null {
  const { yaml: rawYaml, body } = splitFrontmatter(text);
  const callouts = findPlayerCallouts(stripComments(body));
  if (callouts.length === 0) return null;

  const all = (rawYaml ? yaml.parse(rawYaml) : {}) as Record<string, unknown> | null;
  const properties: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(all ?? {})) {
    if (isAllowedProperty(key)) properties[key] = value;
  }

  let overview: string | null = null;
  const entries: { label: string; body: string }[] = [];
  const content: { label: string; body: string }[] = [];
  for (const c of callouts) {
    if (c.content) content.push({ label: c.title, body: c.text });
    else if (c.title.toLowerCase() === "overview" && overview === null) overview = c.text;
    else entries.push({ label: c.title, body: c.text });
  }

  const title =
    typeof properties["player_name"] === "string"
      ? (properties["player_name"] as string)
      : fileNameToTitle(path);

  return { title, properties, overview, content, entries };
}

// Where a locked section goes: its kind, and how many of everyone's sections of that kind come before it
export interface LockSlot {
  id: number;
  kind: "overview" | "content" | "known";
  after: number;
}

// An empty marker: the wiki puts the unlocked section here for those who can see it
const marker = (l: LockSlot, heading = false) => `<div class="mw-lock" data-mw-lock="${l.id}"${heading ? ' data-mw-heading="known"' : ""}></div>`;

// Writes the player-safe note back out as markdown for Quartz.
export function renderPlayerNote(note: PlayerNote, yaml: YamlTools, locks: LockSlot[] = []): string {
  const at = (kind: LockSlot["kind"], after: number) => locks.filter((l) => l.kind === kind && l.after === after).map((l) => marker(l));
  const front = yaml.stringify({ title: note.title, ...note.properties }).trimEnd();
  const parts: string[] = [`---\n${front}\n---`];
  if (note.overview) parts.push(`## Overview\n\n${note.overview}`);
  parts.push(...locks.filter((l) => l.kind === "overview").map((l) => marker(l)));
  // Content: the page's own text, with its own headings, between the Overview and "What we know"
  parts.push(...at("content", 0));
  note.content.forEach((c, i) => {
    parts.push(c.label ? `## ${c.label}\n\n${c.body}` : c.body);
    parts.push(...at("content", i + 1));
  });
  if (note.entries.length > 0) {
    const items: string[] = [...at("known", 0)];
    note.entries.forEach((e, i) => {
      items.push(e.label ? `### ${e.label}\n\n${e.body}` : e.body);
      items.push(...at("known", i + 1));
    });
    parts.push(`## What we know\n\n${items.join("\n\n")}`);
  } else {
    // No "What we know" for everyone: the wiki adds the heading when it unlocks one of these
    parts.push(...locks.filter((l) => l.kind === "known").map((l) => marker(l, true)));
  }
  return parts.join("\n\n") + "\n";
}
