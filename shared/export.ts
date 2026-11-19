// Builds the whole player wiki from the vault.
// Pure logic: no Obsidian or GitHub code here, so it can be tested on its own.

import { extractPlayerNote, renderPlayerNote, YamlTools } from "./extract";
import type { GameDate } from "./calendar";
import { readMap, MapData } from "./maps";
import { calendarExport, dateCard } from "./events";
import { boardKey, MoodPin } from "./pinterest";

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
  // Pins fetched from Pinterest, by boardKey (see shared/pinterest.ts)
  moodboards?: Record<string, MoodPin[]>;
  // Calendarium's settings, for the Calendar (and Timeline) pages
  calendar?: {
    data: unknown;
    publicCategories: string[]; // e.g. ["festival", "stars", "party"]
    publishTimeline: boolean; // the Timeline page stays hidden until the party knows enough history
  };
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

function ruleFor(path: string, rules: SectionRule[]): SectionRule | null {
  let best: SectionRule | null = null;
  for (const r of rules) {
    if (path.startsWith(r.folder + "/") && (!best || r.folder.length > best.folder.length)) best = r;
  }
  return best;
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
  section: string; // e.g. "places"; "" for the site root
  slug: string; // e.g. "the-banked-fire"
  props: Record<string, unknown>; // the note's own properties (player_in is read from here)
  folders: string[]; // vault folders between the section's folder and the note
}

function prepare(note: VaultNote, opts: ExportOptions): Prepared | null {
  const wholePage = note.path.startsWith(opts.playerPagesFolder + "/");
  let markdown: string;
  let title: string;
  let section: string | null = null;
  let props: Record<string, unknown> = {};

  if (wholePage) {
    // Player Pages are published as written, with a title added.
    title = baseName(note.path);
    const fm = note.text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fm) {
      markdown = `---\ntitle: ${JSON.stringify(title)}\n---\n\n${note.text}`;
    } else {
      // Keep the note's own properties, and add a title if it hasn't got one.
      props = (opts.yaml.parse(fm[1]) ?? {}) as Record<string, unknown>;
      if (typeof props.title !== "string") props.title = title;
      markdown = `---\n${opts.yaml.stringify(props).trimEnd()}\n---` + note.text.slice(fm[0].length);
    }
    section = "";
  } else {
    const extracted = extractPlayerNote(note.path, note.text, opts.yaml);
    if (!extracted) return null;
    title = extracted.title;
    props = extracted.properties;
    const override = extracted.properties["wiki_section"];
    if (typeof override === "string") section = override;
    markdown = renderPlayerNote(extracted, opts.yaml);
  }

  const rule = wholePage ? null : ruleFor(note.path, opts.sections);
  if (section === null) section = rule ? rule.section : opts.defaultSection;
  const folders = rule ? note.path.slice(rule.folder.length + 1).split("/").slice(0, -1) : [];
  const slug = slugify(title) || slugify(baseName(note.path));
  // A Player Pages note called "Home" becomes the site's front page.
  const to = wholePage && slug === "home" ? "index" : section ? `${section}/${slug}` : slug;
  return { from: note.path, to, title, markdown, section, slug, props: wholePage ? {} : props, folders };
}

const LINK = /^\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]*))?\]\]$/;

// Sorts pages into folders, e.g. places/the-marrowlands/thornwick/the-banked-fire.
// - A note with player_in sits inside that place: "[[Thornwick]]", or plain text like "The Varrow Lands".
// - Other notes use their vault folders, but only when those folders match a published place.
//   So a folder name like a secret faction never reaches the site.
// - A page with pages inside it becomes its folder's own page (".../thornwick/index").
// Returns the folders that need a page of their own, with their titles.
function nest(prepared: Prepared[], opts: ExportOptions): Map<string, string> {
  const byVaultPath = new Map(prepared.map((p) => [p.from, p]));
  const rel = new Map<Prepared, string>(); // path inside the section, e.g. "the-marrowlands/thornwick"
  const titles = new Map<string, string>(); // folder path inside a section -> title
  const visiting = new Set<Prepared>();

  function relOf(p: Prepared): string {
    const known = rel.get(p);
    if (known !== undefined) return known;
    let parentRel = "";
    const pin = p.props["player_in"];
    if (typeof pin === "string" && pin.trim() && !visiting.has(p)) {
      visiting.add(p);
      const m = pin.trim().match(LINK);
      const target = m ? opts.resolveLink(m[1], p.from) : null;
      const parent = target ? byVaultPath.get(target) : undefined;
      if (parent && parent !== p && parent.to !== "index") {
        parentRel = relOf(parent);
        titles.set(parentRel, parent.title);
      } else {
        // Not a published page: plain text, like any unpublished link.
        const text = m ? (m[2] ?? m[1].split("/").pop()!) : pin.trim();
        parentRel = slugify(text);
        if (parentRel && !titles.has(parentRel)) titles.set(parentRel, text);
      }
      visiting.delete(p);
    }
    const r = parentRel ? `${parentRel}/${p.slug}` : p.slug;
    rel.set(p, r);
    return r;
  }

  const nestable = prepared.filter((p) => p.section && p.to !== "index");
  // Pass 1: player_in
  for (const p of nestable) if (typeof p.props["player_in"] === "string") relOf(p);
  for (const [p, r] of rel) if (!titles.has(r)) titles.set(r, p.title);
  // Pass 2: vault folders, when they match a known place
  for (const p of nestable) {
    if (rel.has(p)) continue;
    const folder = p.folders.map(slugify).join("/");
    rel.set(p, folder && titles.has(folder) ? `${folder}/${p.slug}` : p.slug);
  }

  const full = (p: Prepared) => `${p.section}/${rel.get(p)}`;
  const pagePaths = new Set(nestable.map(full));
  const hasChildren = (path: string) => [...pagePaths].some((x) => x.startsWith(path + "/"));
  const folderPages = new Map<string, string>();
  for (const p of nestable) {
    const path = full(p);
    p.to = hasChildren(path) ? `${path}/index` : path;
    // Every folder above it, inside its section, needs a page (for the menu and breadcrumbs).
    const parts = rel.get(p)!.split("/").slice(0, -1);
    for (let i = 1; i <= parts.length; i++) {
      const sub = parts.slice(0, i).join("/");
      const folder = `${p.section}/${sub}`;
      if (!pagePaths.has(folder)) folderPages.set(folder, titles.get(sub) ?? sub.split("/").pop()!.replace(/-/g, " "));
    }
  }
  return folderPages;
}

// Matches [[target]], [[target|alias]], [[target#heading]], and ![[embeds]].
const WIKILINK = /(!?)\[\[([^\]|#]*)(#[^\]|]*)?(?:\|([^\]]*))?\]\]/g;

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|avif)$/i;

export function exportWiki(notes: VaultNote[], opts: ExportOptions): ExportResult {
  const prepared = notes.map((n) => prepare(n, opts)).filter((p): p is Prepared => p !== null);
  const folderPages = nest(prepared, opts);
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
      const link = value.replace(/^!?\[\[|\]\]$/g, "").split("|")[0]; // drop a caption after |
      const resolved = opts.resolveLink(link, fromPath);
      if (!resolved || !IMAGE_EXT.test(resolved)) return null;
      changed = true;
      return imageTarget(resolved);
    };
    // Handout captions: the image's own name (with its spaces and apostrophes), kept for the page
    if (Array.isArray(props.player_handouts) || typeof props.player_handouts === "string") {
      const list = Array.isArray(props.player_handouts) ? props.player_handouts : [props.player_handouts];
      props.mw_handout_names = list.map((v) => {
        const link = String(v).replace(/^!?\[\[|\]\]$/g, "");
        const [target, alias] = link.split("|");
        const resolved = opts.resolveLink(target, fromPath);
        if (!resolved || !IMAGE_EXT.test(resolved)) return null; // skipped, like the image itself
        return alias ?? resolved.split("/").pop()!.replace(/\.[a-z0-9]+$/i, "");
      }).filter((n) => n !== null);
      changed = true;
    }
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

  const notesByPath = new Map(notes.map((n) => [n.path, n]));

  // Player Pages can embed map notes: ![[Vaharan - Places|Vaharan]].
  // The embed is replaced by safe map data in the page's properties (mw_maps).
  function extractMaps(markdown: string, fromPath: string): { markdown: string; maps: MapData[] } {
    const maps: MapData[] = [];
    const out = markdown.replace(/^[ \t]*!\[\[([^\]|#]+)(?:\|([^\]]*))?\]\][ \t]*$/gm, (line, target: string, alias?: string) => {
      const resolved = opts.resolveLink(target, fromPath);
      const note = resolved ? notesByPath.get(resolved) : undefined;
      if (!resolved || !note || !note.text.includes("```leaflet")) return line;
      const map = readMap(note.text, alias ?? baseName(resolved), {
        fromPath: resolved,
        partyMap:
          resolved.startsWith(opts.playerPagesFolder + "/") || /^---\r?\n[\s\S]*?^party_map:\s*true\s*$[\s\S]*?^---/m.test(note.text),
        resolveLink: opts.resolveLink,
        published: (vp) => byVaultPath.get(vp),
        image: imageTarget,
      });
      if (map) maps.push(map);
      return "";
    });
    return { markdown: out, maps };
  }

  const files: ExportFile[] = [];
  for (const p of prepared) {
    let source = p.markdown;
    let maps: MapData[] = [];
    if (p.from.startsWith(opts.playerPagesFolder + "/")) {
      const fm = source.match(/^---\r?\n[\s\S]*?\r?\n---/)?.[0] ?? "";
      const found = extractMaps(source.slice(fm.length), p.from);
      if (found.maps.length) {
        maps = found.maps;
        source = fm + found.markdown;
      }
    }
    // Properties first, then the body (kept apart so links aren't rewritten twice).
    const withProps = rewriteImageProperties(source, p.from);
    const front = withProps.match(/^---\r?\n[\s\S]*?\r?\n---/)?.[0] ?? "";
    const body = rewriteLinks(withProps.slice(front.length), p.from);
    let header = front;
    if (p.to === "index" && opts.gameDate) {
      // The home page gets today's in-game date in its properties.
      const props = (header ? opts.yaml.parse(header.replace(/^---\r?\n|\r?\n---$/g, "")) : {}) as Record<string, unknown>;
      props.game_date = opts.gameDate;
      header = `---\n${opts.yaml.stringify(props ?? {}).trimEnd()}\n---`;
    }
    // Moodboard: pins for the page's `pinterest` link
    const pinUrl = p.props["pinterest"];
    const mood = typeof pinUrl === "string" ? opts.moodboards?.[boardKey(pinUrl)] : undefined;
    if (mood?.length) {
      const props = (header ? opts.yaml.parse(header.replace(/^---\r?\n|\r?\n---$/g, "")) : {}) as Record<string, unknown>;
      props.mw_moodboard = mood;
      header = `---\n${opts.yaml.stringify(props ?? {}).trimEnd()}\n---`;
    }
    if (maps.length) {
      const props = (header ? opts.yaml.parse(header.replace(/^---\r?\n|\r?\n---$/g, "")) : {}) as Record<string, unknown>;
      props.mw_maps = maps;
      header = `---\n${opts.yaml.stringify(props ?? {}).trimEnd()}\n---`;
    }
    files.push({ path: `${p.to}.md`, text: header + body });
  }
  for (const [vaultPath, contentPath] of images) files.push({ path: contentPath, copyFrom: vaultPath });

  // Home page: if it names where the party is, it uses that place's banner.
  const home = files.find((f) => f.path === "index.md" && f.text);
  if (home?.text) {
    const m = home.text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const props = m ? ((opts.yaml.parse(m[1]) ?? {}) as Record<string, unknown>) : {};
    const loc = typeof props.party_location === "string" ? props.party_location.match(/^\[\[([^\]|]+)/) : null;
    const place = loc ? files.find((f) => f.path === `${loc[1]}.md` && f.text) : undefined;
    const pm = place?.text?.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const placeProps = pm ? ((opts.yaml.parse(pm[1]) ?? {}) as Record<string, unknown>) : {};
    if (typeof placeProps.banner === "string") {
      props.banner = placeProps.banner;
      if (placeProps.banner_focus) props.banner_focus = placeProps.banner_focus;
      home.text = `---\n${opts.yaml.stringify(props).trimEnd()}\n---` + home.text.slice(m ? m[0].length : 0);
    }
  }

  // Calendar and Timeline: built from Calendarium, plus published notes with fc-date
  if (opts.calendar) {
    const cal = calendarExport(opts.calendar.data, {
      publicCategories: opts.calendar.publicCategories,
      published: (vp) => byVaultPath.get(vp),
      noteEvents: prepared
        .filter((p) => typeof p.props["fc-date"] === "string")
        .map((p) => ({
          vaultPath: p.from,
          fcDate: String(p.props["fc-date"]),
          ...(typeof p.props["fc-end"] === "string" ? { fcEnd: String(p.props["fc-end"]) } : {}),
          ...(typeof p.props["fc-category"] === "string" ? { category: String(p.props["fc-category"]) } : {}),
        })),
    });
    if (cal) {
      const page = (slug: string, title: string, extra: Record<string, unknown>, body: string) => {
        if (files.some((f) => f.path === `${slug}.md`)) return; // a Player Pages note of that name wins
        files.push({ path: `${slug}.md`, text: `---\n${opts.yaml.stringify({ title, ...extra }).trimEnd()}\n---\n\n${body}\n` });
      };
      const t = cal.today;
      const year = t.year >= 1 ? `${t.year} YC` : `${Math.abs(t.year)} BL`;
      page("calendar", "Calendar", { mw_calendar: cal }, `Today is **${t.day} ${cal.months[t.month]}, ${year}**. Hover over a day to see its other names.`);
      if (opts.calendar.publishTimeline)
        page("timeline", "Timeline", { mw_calendar: cal, mw_timeline: true }, "What the party knows of Vaharan's history, in years. Long events are bars down the side. Click a category to hide or show it.");

      // Date cards: a page that an event links to shows when it happens
      for (const e of cal.events) {
        if (!e.page) continue;
        const f = files.find((x) => x.path === `${e.page}.md` && x.text);
        const m = f?.text?.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        if (!f || !m) continue;
        const props = (opts.yaml.parse(m[1]) ?? {}) as Record<string, unknown>;
        const cards = Array.isArray(props.mw_dates) ? (props.mw_dates as string[]) : [];
        const text = dateCard(e, cal);
        if (!cards.includes(text)) cards.push(text);
        props.mw_dates = cards;
        f.text = `---\n${opts.yaml.stringify(props).trimEnd()}\n---` + f.text!.slice(m[0].length);
      }
    }
  }

  // Each section and folder gets its own page, so menus and breadcrumbs show "People", not "people".
  // mw_folder marks these, so the menu treats them as folders, not pages.
  const folderPage = (path: string, title: string) =>
    files.push({ path: `${path}/index.md`, text: `---\ntitle: ${JSON.stringify(title)}\nmw_folder: true\n---\n` });
  const sections = new Set(prepared.map((p) => p.section).filter(Boolean));
  for (const section of sections) {
    const title = opts.sectionTitles?.[section];
    if (title) folderPage(section, title);
  }
  for (const [path, title] of folderPages) folderPage(path, title);

  return {
    files,
    published: prepared.map((p) => ({ from: p.from, to: p.to, title: p.title })),
  };
}
