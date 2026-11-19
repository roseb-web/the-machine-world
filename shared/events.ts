// Calendar and timeline data for the wiki, from Calendarium's settings and from notes with fc-date.
// What's published (see Wiki Scope, "Which events are published"):
// - An event shows if its category is public (festivals, star signs, the party),
//   or if its description has #player in it. Nothing else: event names are often DM notes.
// - Event names only. Calendarium's descriptions are DM text and never leave the vault.
// - A linked note that is published gives the event a link and the page a date card.
// - Nothing dated after today (no spoilers). A long event still going loses its end date.

export interface Day {
  year: number;
  month: number; // 0-based
  day: number;
}

export interface WikiEvent {
  name: string;
  category: string; // category id
  date: Day | { year: null; month: number; day: number }; // year null = every year
  end?: Day;
  ongoing?: boolean; // a long event that hasn't ended yet
  page?: string; // published page it links to
}

export interface CalendarExport {
  months: string[];
  monthLengths: number[];
  concordMonths: string[];
  weekdays: string[];
  firstWeekDay: number;
  seasons: string[];
  today: Day;
  moon?: { cycle: number; offset: number };
  categories: { id: string; name: string; color?: string }[];
  events: WikiEvent[];
}

export const CONCORD_MONTHS = ["Primus", "Secundus", "Tertius", "Quartus", "Quintus", "Sextus", "Septimus", "Octavus", "Nonus", "Decimus"];
export const SEASONS = ["Spring", "Summer", "Autumn", "Winter"];

interface RawEvent {
  name?: string;
  description?: string | null;
  category?: string | null;
  note?: string | null;
  type?: string;
  date?: { year: number | null | (number | null)[]; month: number; day: number };
  end?: { year: number; month: number; day: number };
}

interface RawCalendar {
  current?: Day;
  static?: {
    months?: { name: string; length: number }[];
    weekdays?: { name: string }[];
    firstWeekDay?: number;
    moons?: { cycle: number; offset: number }[];
  };
  categories?: { id: string; name: string; color?: string }[];
  events?: RawEvent[];
}

export interface EventOptions {
  publicCategories: string[]; // category ids, e.g. ["festival", "stars", "party"]
  published: (vaultPath: string) => { to: string; title: string } | undefined;
  noteEvents: { vaultPath: string; fcDate: string; fcEnd?: string; category?: string }[]; // notes with fc-date
}

// "#player" anywhere in the description publishes an event outside the public categories
export const isMarked = (ev: { description?: string | null }) => /(^|\s)#player\b/i.test(ev.description ?? "");

const key = (d: { year: number; month: number; day: number }) => d.year * 10000 + d.month * 100 + d.day;

// "100-07-03" (Calendarium's note format, month counted from 1) -> { year: 100, month: 6, day: 3 }
export function parseFcDate(value: string): Day | null {
  const m = String(value).trim().match(/^(-?\d+)-(\d{1,2})-(\d{1,2})$/);
  return m ? { year: Number(m[1]), month: Number(m[2]) - 1, day: Number(m[3]) } : null;
}

export function calendarExport(raw: unknown, opts: EventOptions): CalendarExport | null {
  const cal = (raw as { calendars?: RawCalendar[] })?.calendars?.[0];
  const st = cal?.static;
  if (!cal?.current || !st?.months?.length || !st.weekdays?.length) return null;
  const today = cal.current;
  const pub = new Set(opts.publicCategories);
  const events: WikiEvent[] = [];

  const add = (name: string, category: string, date: WikiEvent["date"], end: Day | undefined, page?: string) => {
    if (!name) return;
    const recurring = date.year === null;
    if (!recurring && key(date as Day) > key(today)) return; // future: never published
    const e: WikiEvent = { name, category, date, ...(page ? { page } : {}) };
    if (end && !recurring) {
      if (key(end) > key(today)) e.ongoing = true; // still going: no end date
      else e.end = end;
    }
    events.push(e);
  };

  for (const ev of cal.events ?? []) {
    if (!ev.date || !ev.name) continue;
    const category = ev.category ?? "";
    const page = ev.note ? opts.published(ev.note) : undefined;
    if (!pub.has(category) && !isMarked(ev)) continue;
    const y = ev.date.year;
    const year = Array.isArray(y) ? null : y;
    const recurring = ev.type === "Recurring" || year === null;
    const date = recurring ? { year: null, month: ev.date.month, day: ev.date.day } : { year: year as number, month: ev.date.month, day: ev.date.day };
    add(ev.name, category, date, ev.end ?? undefined, page?.to);
  }

  // Notes with fc-date: their own page, under their own name
  for (const n of opts.noteEvents) {
    const page = opts.published(n.vaultPath);
    const date = parseFcDate(n.fcDate);
    if (!page || !date) continue;
    add(page.title, n.category ?? "", date, n.fcEnd ? parseFcDate(n.fcEnd) ?? undefined : undefined, page.to);
  }

  const used = new Set(events.map((e) => e.category));
  const moon = st.moons?.[0];
  return {
    months: st.months.map((m) => m.name),
    monthLengths: st.months.map((m) => m.length),
    concordMonths: CONCORD_MONTHS,
    weekdays: st.weekdays.map((w) => w.name),
    firstWeekDay: st.firstWeekDay ?? 0,
    seasons: SEASONS,
    today: { year: today.year, month: today.month, day: today.day },
    ...(moon ? { moon: { cycle: moon.cycle, offset: moon.offset } } : {}),
    categories: (cal.categories ?? []).filter((c) => used.has(c.id)).map((c) => ({ id: c.id, name: c.name, ...(c.color ? { color: c.color } : {}) })),
    events,
  };
}

// "540 BL", "100 YC"
export function yearLabel(year: number): string {
  return year >= 1 ? `${year} YC` : `${Math.abs(year)} BL`;
}

// What a page's date card says, e.g. "1 Orrimel, every year · in 28 days" or "540 BL – ongoing"
export function dateCard(e: WikiEvent, cal: CalendarExport): string {
  const before = (m: number) => cal.monthLengths.slice(0, m).reduce((a, b) => a + b, 0);
  const yearLen = before(cal.months.length);
  const dayNo = (d: { year: number; month: number; day: number }) => d.year * yearLen + before(d.month) + d.day;
  const t = cal.today;
  if (e.date.year === null) {
    const base = `${e.date.day} ${cal.months[e.date.month]}, every year`;
    let next = dayNo({ year: t.year, month: e.date.month, day: e.date.day }) - dayNo(t);
    if (next < 0) next += yearLen;
    return next === 0 ? `${base} · today` : `${base} · in ${next} day${next === 1 ? "" : "s"}`;
  }
  const d = e.date as Day;
  const start = d.month === 0 && d.day === 1 ? yearLabel(d.year) : `${d.day} ${cal.months[d.month]}, ${yearLabel(d.year)}`;
  if (e.ongoing) return `${start} – ongoing`;
  if (e.end) return `${start} – ${e.end.month === 0 && e.end.day === 1 ? yearLabel(e.end.year) : `${e.end.day} ${cal.months[e.end.month]}, ${yearLabel(e.end.year)}`}`;
  return start;
}
