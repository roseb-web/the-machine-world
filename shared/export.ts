// Builds the whole player wiki from the vault.
// Pure logic: no Obsidian or GitHub code here, so it can be tested on its own.

import { extractPlayerNote, renderPlayerNote, YamlTools } from "./extract";
import type { GameDate } from "./calendar";

export interface VaultNote {
  path: string; // vault path, e.g. "4. People/NPCs/Pell.md"
  text: string;
}

export interface SectionRule {
  folder: string; // vault folder prefix, e.g. "4. People/NPCs"
  section: string; // wiki section, e.g. "people". Empty string = site root.
}

export interface ExportOptions {
  sections: SectionRule[];
  defaultSection: string;
  playerPagesFolder: string; // notes here are published whole
  sectionTitles?: Record<string, string>; // e.g. { people: "People" }, used for the section's own page
  gameDate?: GameDate | null; // today's in-game date, shown on the home page
  // Finds the vault path a link points to (Obsidian's own resolver in the plugin).
  resolveLink: (link: string, fromPath: string) => string | null;
  yaml: YamlTools;
}

export interface ExportFile {
  path: string; // path inside the Quartz content folder
  text?: string; // markdown or JSON
  copyFrom?: string; // vault path of a binary file (image) to copy
}

export interface ExportResult {
  files: ExportFile[];
  published: { from: string; to: string; title: string }[];
}

// Properties that hold an image path or a list of them.
const IMAGE_PROPERTIES = ["photo", "banner", "player_sigil", "player_handouts"];

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sectionFor(path: string, rules: SectionRule[], fallback: string): string {
  let best: SectionRule | null = null;
  for (const r of rules) {
    if (path.startsWith(r.folder + "/") && (!best || r.folder.length > best.folder.length)) best = r;
  }
  return best ? best.section : fallback;
}

function baseName(path: string): string {
  return (path.split("/").pop() ?? path).replace(/\.md$/i, "");
}

// First pass result for one note.
interface Prepared {
  from: string;
  to: string; // content path without ".md", e.g. "people/pell"
  title: string;
  markdown: string;
}

function prepare(note: VaultNote, opts: ExportOptions): Prepared | null {
  const wholePage = note.path.startsWith(opts.playerPagesFolder + "/");
  let markdown: string;
  let title: string;
  let section: string | null = null;

  if (wholePage) {
    // Player Pages are published as written, with a title added.
    title = baseName(note.path);
    markdown = note.text.match(/^---\r?\n/) ? note.text : `---\ntitle: ${JSON.stringify(title)}\n---\n\n${note.text}`;
    section = "";
  } else {
    const extracted = extractPlayerNote(note.path, note.text, opts.yaml);
    if (!extracted) return null;
    title = extracted.title;
    const override = extracted.properties["wiki_section"];
    if (typeof override === "string") section = override;
    markdown = renderPlayerNote(extracted, opts.yaml);
  }

  if (section === null) section = sectionFor(note.path, opts.sections, opts.defaultSection);
  const slug = slugify(title) || slugify(baseName(note.path));
  // A Player Pages note called "Home" becomes the site's front page.
  const to = wholePage && slug === "home" ? "index" : section ? `${section}/${slug}` : slug;
  return { from: note.path, to, title, markdown };
}

// Matches [[target]], [[target|alias]], [[target#heading]], and ![[embeds]].
const WIKILINK = /(!?)\[\[([^\]|#]*)(#[^\]|]*)?(?:\|([^\]]*))?\]\]/g;

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|avif)$/i;

export function exportWiki(notes: VaultNote[], opts: ExportOptions): ExportResult {
  const prepared = notes.map((n) => prepare(n, opts)).filter((p): p is Prepared => p !== null);
  const byVaultPath = new Map(prepared.map((p) => [p.from, p]));
  const images = new Map<string, string>(); // vault path -> content path

  function imageTarget(vaultPath: string): string {
    if (!images.has(vaultPath)) {
      // Lower-case, dashed names: the same names Quartz gives files, so paths always match.
      const file = vaultPath.split("/").pop() ?? vaultPath;
      const dot = file.lastIndexOf(".");
      const name = slugify(file.slice(0, dot)) || "image";
      images.set(vaultPath, `assets/${name}${file.slice(dot).toLowerCase()}`);
    }
    return images.get(vaultPath)!;
  }

  function rewriteLinks(markdown: string, fromPath: string): string {
    return markdown.replace(WIKILINK, (_all, bang: string, target: string, _heading, alias?: string) => {
      const resolved = target ? opts.resolveLink(target, fromPath) : null;

      // Images: copy them, and keep the embed.
      if (bang && resolved && IMAGE_EXT.test(resolved)) {
        const dest = imageTarget(resolved);
        return `![[${dest}${alias ? "|" + alias : ""}]]`;
      }

      const page = resolved ? byVaultPath.get(resolved) : undefined;
      if (!page) {
        // Not published: plain text, so nothing leaks (not even that a page exists).
        if (bang) return "";
        return alias ?? target;
      }
      // Headings come from the vault note and won't exist on the wiki, so they're dropped.
      // Display text: the alias if given, otherwise the name the party knows.
      return `[[${page.to}|${alias ?? page.title}]]`;
    });
  }

  function rewriteImageProperties(markdown: string, fromPath: string): string {
    const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) return markdown;
    const props = (opts.yaml.parse(match[1]) ?? {}) as Record<string, unknown>;
    let changed = false;
    const fix = (value: unknown): unknown => {
      if (typeof value !== "string") return value;
      const link = value.replace(/^!?\[\[|\]\]$/g, "");
      const resolved = opts.resolveLink(link, fromPath);
      if (!resolved || !IMAGE_EXT.test(resolved)) return null;
      changed = true;
      return imageTarget(resolved);
    };
    for (const key of IMAGE_PROPERTIES) {
      if (!(key in props)) continue;
      const v = props[key];
      props[key] = Array.isArray(v) ? v.map(fix).filter((x) => x !== null) : fix(v);
      changed = true;
    }
    // Links inside properties (e.g. player_seen: "[[Thornwick]]") follow the same rules.
    for (const [key, v] of Object.entries(props)) {
      if (typeof v === "string" && v.includes("[[")) {
        props[key] = rewriteLinks(v, fromPath);
        changed = true;
      }
    }
    if (!changed) return markdown;
    const front = opts.yaml.stringify(props).trimEnd();
    return `---\n${front}\n---` + markdown.slice(match[0].length);
  }

  const files: ExportFile[] = [];
  for (const p of prepared) {
    // Properties first, then the body (kept apart so links aren't rewritten twice).
    const withProps = rewriteImageProperties(p.markdown, p.from);
    const front = withProps.match(/^---\r?\n[\s\S]*?\r?\n---/)?.[0] ?? "";
    const body = rewriteLinks(withProps.slice(front.length), p.from);
    let header = front;
    if (p.to === "index" && opts.gameDate) {
      // The home page gets today's in-game date in its properties.
      const props = (header ? opts.yaml.parse(header.replace(/^---\r?\n|\r?\n---$/g, "")) : {}) as Record<string, unknown>;
      props.game_date = opts.gameDate;
      header = `---\n${opts.yaml.stringify(props ?? {}).trimEnd()}\n---`;
    }
    files.push({ path: `${p.to}.md`, text: header + body });
  }
  for (const [vaultPath, contentPath] of images) files.push({ path: contentPath, copyFrom: vaultPath });

  // Each section with pages gets its own page, so menus and breadcrumbs show "People", not "people".
  const sections = new Set(prepared.map((p) => p.to.split("/").slice(0, -1).join("/")).filter(Boolean));
  for (const section of sections) {
    const title = opts.sectionTitles?.[section];
    if (title) files.push({ path: `${section}/index.md`, text: `---\ntitle: ${JSON.stringify(title)}\n---\n` });
  }

  return {
    files,
    published: prepared.map((p) => ({ from: p.from, to: p.to, title: p.title })),
  };
}
