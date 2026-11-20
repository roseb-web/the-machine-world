// Builds the whole player wiki from the vault.
// Pure logic: no Obsidian or GitHub code here, so it can be tested on its own.

import { extractPlayerNote, LockSlot, PlayerNote, renderPlayerNote, YamlTools } from "./extract";
import { readSections, withoutNested } from "./sections";
import type { LockedSection } from "./audiences";
import type { GameDate } from "./calendar";
import { readMap, MapData } from "./maps";
import { calendarExport, dateCard } from "./events";
import { Eras, NO_ERAS, SecondCalendar, yearText } from "./eras";
import { boardKey, MoodPin } from "./pinterest";
import { comingUp, latestSession, setProps } from "./home";
import { cleanTies, dropLoners, GROUP_TYPES, groupId, groupName, parseRelation, WebData, WebGroup, WebPerson, WebTie } from "./web";

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
  galleryFolder?: string; // one note per picture of player art; becomes the Gallery page
  groupTypesNote?: string; // vault path of the note listing each group under its type (people web colours)
  sectionTitles?: Record<string, string>; // e.g. { people: "People" }, used for the section's own page
  gameDate?: GameDate | null; // today's in-game date, shown on the home page
  worldName?: string; // e.g. "Eldmoor": the home page says "Welcome to Eldmoor"
  eras?: Eras; // how years are written, e.g. "100 YC" and "540 BL"
  secondCalendar?: SecondCalendar; // another set of month names (optional)
  // Audiences with a password: their sections are published locked. "tam" -> "Tam", "dm" -> "DM".
  // An audience not listed here has its sections left out entirely.
  audiences?: Record<string, string>;
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
  // Sections for one player or the DM, still readable: the plugin locks them before anything is sent.
  // Pages only hold empty markers for them.
  locked: { page: string; sections: LockedSection[] }[];
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
  player?: PlayerNote; // the player-safe note (not for Player Pages)
  folders: string[]; // vault folders between the section's folder and the note
}

function prepare(note: VaultNote, opts: ExportOptions): Prepared | null {
  const wholePage = note.path.startsWith(opts.playerPagesFolder + "/");
  let markdown: string;
  let title: string;
  let section: string | null = null;
  let props: Record<string, unknown> = {};
  let player: PlayerNote | undefined;

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
    player = extracted;
  }

  const rule = wholePage ? null : ruleFor(note.path, opts.sections);
  if (section === null) section = rule ? rule.section : opts.defaultSection;
  const folders = rule ? note.path.slice(rule.folder.length + 1).split("/").slice(0, -1) : [];
  const slug = slugify(title) || slugify(baseName(note.path));
  // A Player Pages note called "Home" becomes the site's front page.
  const to = wholePage && slug === "home" ? "index" : section ? `${section}/${slug}` : slug;
  return { from: note.path, to, title, markdown, section, slug, props: wholePage ? {} : props, folders, ...(player ? { player } : {}) };
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

  // Inside a table row, the "|" in [[page|name]] would start a new column, so it's written "\|".
  // (Obsidian notes may already write it that way: "[[Varrow\|the city]]".)
  function rewriteLinks(markdown: string, fromPath: string): string {
    return markdown
      .split("\n")
      .map((line) => {
        if (!/^\s*(>\s*)*\|/.test(line)) return rewriteLine(line, fromPath, "|");
        const fixed = line.replace(/\[\[([^\]]*?)\\\|/g, "[[$1|"); // "\|" -> "|" so the link can be read
        return rewriteLine(fixed, fromPath, "\\|");
      })
      .join("\n");
  }

  function rewriteLine(markdown: string, fromPath: string, bar: string): string {
    return markdown.replace(WIKILINK, (_all, bang: string, target: string, _heading, alias?: string) => {
      const resolved = target ? opts.resolveLink(target, fromPath) : null;

      // Images: copy them, and keep the embed.
      if (bang && resolved && IMAGE_EXT.test(resolved)) {
        const dest = imageTarget(resolved);
        return `![[${dest}${alias ? bar + alias : ""}]]`;
      }

      const page = resolved ? byVaultPath.get(resolved) : undefined;
      if (!page) {
        // Not published: plain text, so nothing leaks (not even that a page exists).
        if (bang) return "";
        return alias ?? target;
      }
      // Headings come from the vault note and won't exist on the wiki, so they're dropped.
      // Display text: the alias if given, otherwise the name the party knows.
      return `[[${page.to}${bar}${alias ?? page.title}]]`;
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
    // Groups and relations are only for the people web, which reads them from the note itself
    // (and leaves out anyone who isn't published). They never go in the page's own file.
    for (const key of ["player_groups", "player_relations"]) {
      if (key in props) {
        delete props[key];
        changed = true;
      }
    }
    // Links inside properties (e.g. player_seen: "[[Thornwick]]"), and inside lists, follow the same rules.
    for (const [key, v] of Object.entries(props)) {
      if (typeof v === "string" && v.includes("[[")) {
        props[key] = rewriteLinks(v, fromPath);
        changed = true;
      } else if (Array.isArray(v) && v.some((x) => typeof x === "string" && x.includes("[["))) {
        props[key] = v.map((x) => (typeof x === "string" && x.includes("[[") ? rewriteLinks(x, fromPath) : x));
        changed = true;
      }
    }
    if (!changed) return markdown;
    const front = opts.yaml.stringify(props).trimEnd();
    return `---\n${front}\n---` + markdown.slice(match[0].length);
  }

  const notesByPath = new Map(notes.map((n) => [n.path, n]));

  // Player Pages can embed map notes: ![[World map - Places|World map]].
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

  // Locked sections: links point at wiki pages, written as Markdown links the browser can follow
  // once it has opened them ("wiki:people/pell"). Links to pages not on the wiki become plain text.
  function lockedMarkdown(md: string, fromPath: string): string {
    return md.replace(WIKILINK, (_all, bang: string, target: string, _heading, alias?: string) => {
      const resolved = target ? opts.resolveLink(target, fromPath) : null;
      if (bang && resolved && IMAGE_EXT.test(resolved)) return `![${alias ?? ""}](wiki:${imageTarget(resolved)})`;
      const page = resolved ? byVaultPath.get(resolved) : undefined;
      if (bang) return "";
      return page ? `[${alias ?? page.title}](wiki:${page.to})` : (alias ?? target);
    });
  }
  const locked: ExportResult["locked"] = [];

  const files: ExportFile[] = [];
  for (const p of prepared) {
    let source = p.markdown;
    // Sections for one player or the DM: an empty marker where each goes, the text kept aside to be locked
    if (p.player && opts.audiences && Object.keys(opts.audiences).length) {
      const note = (notesByPath.get(p.from)?.text ?? "").replace(/%%[\s\S]*?%%/g, "");
      const all = readSections(note);
      const slots: LockSlot[] = [];
      const sections: LockedSection[] = [];
      const seen = { overview: 0, content: 0, known: 0 };
      for (const sec of all) {
        if (sec.vis === "everyone") {
          seen[sec.kind]++;
          continue;
        }
        if (!(sec.vis in opts.audiences)) continue;
        const id = sections.length;
        sections.push({ id, aud: sec.vis, name: opts.audiences[sec.vis], kind: sec.kind, title: sec.title, md: lockedMarkdown(withoutNested(sec.text), p.from) });
        slots.push({ id, kind: sec.kind, after: seen[sec.kind] });
      }
      if (sections.length) {
        // The first Overview for everyone is the page's Overview; any more go under "What we know"
        source = renderPlayerNote(p.player, opts.yaml, slots.map((l) => (l.kind === "known" ? { ...l, after: Math.min(l.after, p.player!.entries.length) } : l)));
        locked.push({ page: p.to, sections });
      }
    }
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
    if (p.to === "index") {
      // The home page gets its welcome heading and today's in-game date in its properties.
      const props = (header ? opts.yaml.parse(header.replace(/^---\r?\n|\r?\n---$/g, "")) : {}) as Record<string, unknown>;
      props.mw_welcome = opts.worldName ? `Welcome to ${opts.worldName}` : "Welcome";
      if (opts.gameDate) props.game_date = opts.gameDate;
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
  // Gallery: one note per picture in the gallery folder. Their properties are published as they are.
  if (opts.galleryFolder) {
    const items = gallery(notes, opts, byVaultPath, imageTarget);
    if (items.length && !files.some((f) => f.path === "gallery.md"))
      files.push({
        path: "gallery.md",
        text: `---\n${opts.yaml.stringify({ title: "Gallery", mw_gallery: items }).trimEnd()}\n---\n\nArt by the party. Click a picture to see it full size.\n`,
      });
  }

  // People web: published people with player_groups or player_relations
  const web = peopleWeb(prepared, notes, opts, byVaultPath, imageTarget);
  if (web.people.length && !files.some((f) => f.path === "people-web.md"))
    files.push({
      path: "people-web.md",
      text: `---\n${opts.yaml.stringify({ title: "People web", mw_web: web }).trimEnd()}\n---\n\nWho the party has met, and who they're tied to. Click anyone for more.\n`,
    });

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
  let upcoming: ReturnType<typeof comingUp> = [];
  if (opts.calendar) {
    const cal = calendarExport(opts.calendar.data, {
      publicCategories: opts.calendar.publicCategories,
      eras: opts.eras,
      second: opts.secondCalendar,
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
      const year = yearText(t.year, opts.eras ?? NO_ERAS);
      upcoming = comingUp(cal);
      page("calendar", "Calendar", { mw_calendar: cal }, `Today is **${t.day} ${cal.months[t.month]}, ${year}**. Hover over a day to see its other names.`);
      if (opts.calendar.publishTimeline)
        page("timeline", "Timeline", { mw_calendar: cal, mw_timeline: true }, `What the party knows of ${opts.worldName ? `${opts.worldName}'s` : "the world's"} history. Drag to move along it, and zoom in to see more. Click an event for more.`);

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

  // Home page: the newest session recap, and what's coming up in the calendar
  const homePage = files.find((f) => f.path === "index.md" && f.text);
  if (homePage) {
    const last = latestSession(files, opts.yaml);
    setProps(homePage, { ...(last ? { mw_last_session: last } : {}), ...(upcoming.length ? { mw_coming_up: upcoming } : {}) }, opts.yaml);
  }

  return {
    files,
    published: prepared.map((p) => ({ from: p.from, to: p.to, title: p.title })),
    locked,
  };
}

// ---- Gallery ----
export interface GalleryRef {
  name: string;
  to?: string; // the wiki page, if it's published
}
export interface GalleryItem {
  img: string;
  description?: string;
  artist?: string;
  date?: string; // YYYY-MM-DD, real-world
  sessions: GalleryRef[];
  characters: GalleryRef[];
}

function gallery(
  notes: VaultNote[],
  opts: ExportOptions,
  byVaultPath: Map<string, { to: string; title: string }>,
  imageTarget: (vaultPath: string) => string,
): GalleryItem[] {
  const folder = opts.galleryFolder!.replace(/\/+$/, "") + "/";
  const items: GalleryItem[] = [];
  const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
  // A link or plain name. Unpublished pages show as text: their alias if given, otherwise the name written.
  const refs = (v: unknown, from: string): GalleryRef[] =>
    (Array.isArray(v) ? v : v === undefined || v === null ? [] : [v])
      .map((x) => String(x).trim())
      .filter(Boolean)
      .map((x) => {
        const m = x.match(/^\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]$/);
        if (!m) return { name: x };
        const resolved = opts.resolveLink(m[1], from);
        const page = resolved ? byVaultPath.get(resolved) : undefined;
        return page ? { name: m[2] ?? page.title, to: page.to } : { name: m[2] ?? m[1].split("/").pop()! };
      });
  for (const n of notes) {
    if (!n.path.startsWith(folder) || !n.path.endsWith(".md")) continue;
    const m = n.text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const props = (m ? opts.yaml.parse(m[1]) ?? {} : {}) as Record<string, unknown>;
    // The picture: the `image` property, or else the first picture embedded in the note
    const raw = text(props.image) ?? n.text.slice(m ? m[0].length : 0).match(/!\[\[([^\]]+)\]\]/)?.[1];
    const link = raw?.replace(/^!?\[\[|\]\]$/g, "").split("|")[0];
    const resolved = link ? opts.resolveLink(link, n.path) : null;
    if (!resolved || !/\.(png|jpe?g|gif|webp|svg|avif)$/i.test(resolved)) continue;
    const d = props.date as unknown;
    const date = d instanceof Date ? d.toISOString().slice(0, 10) : text(d)?.slice(0, 10);
    items.push({
      img: imageTarget(resolved),
      ...(text(props.description) ? { description: text(props.description) } : {}),
      ...(text(props.artist) ? { artist: text(props.artist) } : {}),
      ...(date ? { date } : {}),
      sessions: refs(props.session, n.path),
      characters: refs(props.character, n.path),
    });
  }
  return items.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "") || (a.description ?? "").localeCompare(b.description ?? ""));
}

// The people web's data. Only published people are in it, and only what their player_groups
// and player_relations say (never the DM's own groups and relations).
// Someone is one of the party if "The party" is in their player_groups.
function peopleWeb(
  prepared: Prepared[],
  notes: VaultNote[],
  opts: ExportOptions,
  byVaultPath: Map<string, Prepared>,
  imageTarget: (vaultPath: string) => string,
): WebData {
  const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : v === undefined || v === null || v === "" ? [] : [v]);
  const frontOf = (text: string) => {
    const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    return (m ? opts.yaml.parse(m[1]) ?? {} : {}) as Record<string, unknown>;
  };
  // Group types, from the groups note
  const types = new Map<string, string>();
  const typesNote = opts.groupTypesNote ? notes.find((n) => n.path === opts.groupTypesNote) : undefined;
  if (typesNote) {
    const fm = frontOf(typesNote.text);
    for (const type of Object.keys(GROUP_TYPES))
      for (const raw of list(fm[type])) {
        const name = groupName(raw);
        if (name) types.set(groupId(name), type);
      }
  }
  const notesByPath = new Map(notes.map((n) => [n.path, n]));
  const people: WebPerson[] = [];
  const groups = new Map<string, WebGroup>();
  const raw: { from: Prepared; rel: unknown }[] = [];
  for (const p of prepared) {
    // Player Pages are published whole, so all their properties are public
    const props = p.from.startsWith(opts.playerPagesFolder + "/") ? frontOf(notesByPath.get(p.from)?.text ?? "") : p.props;
    const gs = list(props.player_groups);
    const rs = list(props.player_relations);
    if (!gs.length && !rs.length) continue;
    const ids: string[] = [];
    for (const g of gs) {
      const name = groupName(g);
      if (!name) continue;
      const id = groupId(name);
      if (!groups.has(id)) {
        // A linked group gets a link only if its page is published
        const link = String(g).match(/^\[\[([^\]|#]+)/)?.[1];
        const resolved = link ? opts.resolveLink(link, p.from) : null;
        const page = resolved ? byVaultPath.get(resolved) : undefined;
        groups.set(id, {
          id,
          name,
          ...(id === "the party" ? { party: true } : {}),
          ...(types.has(id) ? { type: types.get(id) } : {}),
          ...(page ? { open: page.to } : {}),
        });
      }
      if (!ids.includes(id)) ids.push(id);
    }
    const photoLink = typeof props.photo === "string" ? props.photo.replace(/^!?\[\[|\]\]$/g, "").split("|")[0] : "";
    const photo = photoLink ? opts.resolveLink(photoLink, p.from) : null;
    people.push({
      id: p.to,
      name: p.title,
      ...(typeof props.player_title === "string" ? { title: props.player_title } : {}),
      ...(photo && IMAGE_EXT.test(photo) ? { photo: imageTarget(photo) } : {}),
      ...(ids.includes("the party") ? { pc: true } : {}),
      groups: ids,
      open: p.to,
    });
    for (const r of rs) raw.push({ from: p, rel: r });
  }
  const ties: WebTie[] = [];
  for (const { from, rel } of raw) {
    const r = parseRelation(rel);
    if (!r) continue;
    const resolved = opts.resolveLink(r.target, from.from);
    const page = resolved ? byVaultPath.get(resolved) : undefined;
    if (page) ties.push({ a: from.to, b: page.to, type: r.type, ...(r.strength ? { strength: r.strength } : {}) });
  }
  return dropLoners({ people, groups: [...groups.values()], ties: cleanTies(ties, people) });
}
