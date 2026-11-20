// The home page's "Previously on…", "Coming up" and "New since Session N" boxes.
//
// Previously on and Coming up are worked out from what's being published.
// "New since" compares each Publish with the last one, using a small log kept in the
// repo (wiki-changes.json, outside the content folder). Only published pages are in it.

import type { CalendarExport } from "./events";

interface YamlTools {
  parse: (text: string) => unknown;
  stringify: (value: unknown) => string;
}
interface File {
  path: string;
  text?: string;
}

const FRONT = /^---\r?\n([\s\S]*?)\r?\n---/;
const propsOf = (text: string, yaml: YamlTools) => {
  const m = text.match(FRONT);
  return (m ? ((yaml.parse(m[1]) ?? {}) as Record<string, unknown>) : {}) as Record<string, unknown>;
};
const bodyOf = (text: string) => text.replace(FRONT, "");
export function setProps(f: File, add: Record<string, unknown>, yaml: YamlTools) {
  if (!f.text) return;
  const m = f.text.match(FRONT);
  const props = { ...propsOf(f.text, yaml), ...add };
  f.text = `---\n${yaml.stringify(props).trimEnd()}\n---` + f.text.slice(m ? m[0].length : 0);
}

// Wiki links and bold/italics as plain text, for short summaries
const plain = (s: string) =>
  s
    .replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, "$1")
    .replace(/\[\[([^\]]*)\]\]/g, (_a, t: string) => t.split("/").pop()!)
    .replace(/\*\*|__/g, "")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1$2")
    .trim();

// ---- Previously on… ----
export interface LastSession {
  to: string;
  session: string; // e.g. "Session 5"
  title?: string; // e.g. "Pell's list"
  date?: string;
  lead?: string;
  points: string[];
}

const pagePath = (f: File) => f.path.replace(/\.md$/, "");

// The newest published session recap: a page in the party category with an fc-date
export function latestSession(files: File[], yaml: YamlTools): LastSession | null {
  let best: { f: File; props: Record<string, unknown>; date: string } | null = null;
  for (const f of files) {
    if (!f.text || !f.path.endsWith(".md")) continue;
    const props = propsOf(f.text, yaml);
    if (String(props["fc-category"] ?? "").toLowerCase() !== "party" || typeof props["fc-date"] !== "string") continue;
    const date = String(props["fc-date"]);
    const num = (s: unknown) => Number(String(s ?? "").match(/\d+/)?.[0] ?? 0);
    if (!best || date > best.date || (date === best.date && num(props.title) > num(best.props.title))) best = { f, props, date };
  }
  if (!best) return null;
  const lines = bodyOf(best.f.text!).split(/\r?\n/).map((l) => l.trim());
  const lead = lines.find((l) => l && !l.startsWith("#") && !l.startsWith("-") && !l.startsWith(">") && !l.startsWith("!"));
  const points = lines.filter((l) => /^[-*] /.test(l)).slice(0, 2).map((l) => plain(l.slice(2)));
  const dates = best.props.mw_dates;
  return {
    to: pagePath(best.f),
    session: String(best.props.title ?? pagePath(best.f)),
    ...(typeof best.props.player_title === "string" ? { title: best.props.player_title } : {}),
    ...(Array.isArray(dates) && dates.length ? { date: String(dates[0]) } : {}),
    ...(lead ? { lead: plain(lead) } : {}),
    points,
  };
}

// ---- Coming up ----
export interface ComingUp {
  name: string;
  kind: string; // "Festival", "Star sign"
  date: string; // "21 Orrimel"
  days: number; // 0 = today
}

// The next yearly events (festivals, star signs...) after today, nearest first
export function comingUp(cal: CalendarExport, count = 3): ComingUp[] {
  const lens = cal.monthLengths?.length ? cal.monthLengths : cal.months.map(() => 30);
  const yearLen = lens.reduce((a, b) => a + b, 0);
  const dayOf = (month: number, day: number) => lens.slice(0, month).reduce((a, b) => a + b, 0) + day;
  const today = dayOf(cal.today.month, cal.today.day);
  const kinds = new Map(cal.categories.map((c) => [c.id, c.name.replace(/s$/, "")]));
  return cal.events
    .filter((e) => e.date.year === null)
    .map((e) => ({
      name: e.name.replace(/^Star sign:\s*/i, "").replace(/\s*\((the [^)]+)\)$/i, ", $1"),
      kind: kinds.get(e.category) ?? "",
      date: `${e.date.day} ${cal.months[e.date.month] ?? ""}`,
      days: (dayOf(e.date.month, e.date.day) - today + yearLen) % yearLen,
    }))
    .sort((a, b) => a.days - b.days || a.name.localeCompare(b.name))
    .slice(0, count);
}

// ---- New since Session N ----
interface Item {
  to: string;
  title: string;
}
interface LogEntry {
  date: string; // real date of the Publish, YYYY-MM-DD
  added: Item[];
  updated: Item[];
}
export interface ChangeState {
  v: 1;
  pages: Record<string, string>; // page -> fingerprint
  log: LogEntry[];
}
export interface ChangeItem extends Item {
  kind: "new" | "updated";
  section: string;
}

// Pages that are content, not made by the wiki itself
const tracked = (f: File, yaml: YamlTools) => {
  if (!f.text || !f.path.endsWith(".md")) return false;
  if (["index.md", "calendar.md", "timeline.md", "maps.md", "privacy.md"].includes(f.path)) return false;
  return propsOf(f.text, yaml).mw_folder !== true;
};

// What a page says, ignoring things the wiki adds by itself (date cards, moodboards, maps...)
function fingerprint(text: string, yaml: YamlTools): string {
  const props = propsOf(text, yaml);
  for (const k of Object.keys(props)) if (k.startsWith("mw_")) delete props[k];
  // Markers for locked sections don't count: players would see "changed" with nothing new for them
  const s = JSON.stringify(props) + "\n" + bodyOf(text).replace(/\n*<div class="mw-lock"[^>]*><\/div>\n*/g, "\n\n").trim();
  let h = 2166136261; // FNV-1a
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16) + ":" + s.length;
}

// Compares this Publish with the last one. Returns the new log, and the list for the home page.
export function trackChanges(
  files: File[],
  previous: string | null,
  today: string,
  yaml: YamlTools,
): { state: string; since: string | null; items: ChangeItem[] } {
  let prev: ChangeState | null = null;
  try {
    const p = previous ? (JSON.parse(previous) as ChangeState) : null;
    if (p && p.v === 1 && p.pages && Array.isArray(p.log)) prev = p;
  } catch {
    prev = null;
  }
  const titleOf = new Map<string, string>();
  const pages: Record<string, string> = {};
  for (const f of files) {
    if (!tracked(f, yaml)) continue;
    const to = pagePath(f);
    pages[to] = fingerprint(f.text!, yaml);
    titleOf.set(to, String(propsOf(f.text!, yaml).title ?? to));
  }
  const log = prev ? [...prev.log] : [];
  if (prev) {
    const added: Item[] = [];
    const updated: Item[] = [];
    for (const [to, fp] of Object.entries(pages)) {
      if (!(to in prev.pages)) added.push({ to, title: titleOf.get(to)! });
      else if (prev.pages[to] !== fp) updated.push({ to, title: titleOf.get(to)! });
    }
    if (added.length || updated.length) log.push({ date: today, added, updated });
  }
  // The first Publish only notes what's there: nothing is "new" yet.
  const state: ChangeState = { v: 1, pages, log: log.slice(-40) };

  // Since the Publish that first added the newest session recap
  const last = latestSession(files, yaml);
  const start = last ? findLastIndex(state.log, (e) => e.added.some((a) => a.to === last.to)) : -1;
  const window = start >= 0 ? state.log.slice(start) : state.log.slice(-5);
  const seen = new Map<string, ChangeItem>();
  const sectionTitle = (to: string) => {
    const top = to.split("/")[0];
    const folder = files.find((f) => f.path === `${top}/index.md` && f.text);
    const t = folder ? propsOf(folder.text!, yaml).title : undefined;
    return typeof t === "string" ? t : top.charAt(0).toUpperCase() + top.slice(1);
  };
  for (let i = window.length - 1; i >= 0; i--) {
    const e = window[i];
    for (const [list, kind] of [[e.added, "new"], [e.updated, "updated"]] as const)
      for (const it of list) {
        if (!(it.to in pages) || it.to === last?.to) continue; // gone since, or the recap itself
        const had = seen.get(it.to);
        if (!had) seen.set(it.to, { to: it.to, title: titleOf.get(it.to) ?? it.title, kind, section: sectionTitle(it.to) });
        else if (kind === "new") had.kind = "new";
      }
  }
  return { state: JSON.stringify(state), since: start >= 0 && last ? last.session : null, items: [...seen.values()] };
}

function findLastIndex<T>(list: T[], test: (x: T) => boolean): number {
  for (let i = list.length - 1; i >= 0; i--) if (test(list[i])) return i;
  return -1;
}
