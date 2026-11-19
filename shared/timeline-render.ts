// Draws a vertical timeline into an element. Plain DOM, no framework, so the wiki and the
// Obsidian timeline view both use it. Years only. Long events are bars, single events are dots.

import type { CalendarExport, WikiEvent } from "./events";

export interface TimelineEvent extends WikiEvent {
  href?: string; // link to its page
  private?: boolean; // Obsidian only: would not be published
}

export interface TimelineOptions {
  linkClass?: string; // e.g. "internal" so Quartz shows hover previews
  onOpen?: (e: TimelineEvent) => void; // Obsidian: open the note instead of following a link
  startHidden?: string[]; // category names (any case) whose filter starts switched off
}

const yearLabel = (y: number) => (y >= 1 ? `${y} YC` : `${Math.abs(y)} BL`);

export function renderTimeline(root: HTMLElement, cal: CalendarExport & { events: TimelineEvent[] }, opts: TimelineOptions = {}) {
  root.innerHTML = "";
  const doc = root.ownerDocument;
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
    const n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };

  const dated = cal.events.filter((e) => e.date.year !== null) as (TimelineEvent & { date: { year: number } })[];
  const cats = cal.categories.filter((c) => dated.some((e) => e.category === c.id));
  const off = new Set((opts.startHidden ?? []).map((n) => n.toLowerCase()));
  const hidden = new Set<string>(cats.filter((c) => off.has(c.name.toLowerCase())).map((c) => c.id));

  const filters = el("div", "mw-tl-filters");
  for (const c of cats) {
    const on = !hidden.has(c.id);
    const b = el("button", `mw-tl-filter${on ? " mw-on" : ""}`, c.name);
    b.type = "button";
    b.dataset.cat = c.name.toLowerCase();
    b.setAttribute("aria-pressed", String(on));
    b.addEventListener("click", () => {
      if (hidden.has(c.id)) hidden.delete(c.id);
      else hidden.add(c.id);
      b.classList.toggle("mw-on", !hidden.has(c.id));
      b.setAttribute("aria-pressed", String(!hidden.has(c.id)));
      draw();
    });
    filters.appendChild(b);
  }
  if (cats.length > 1) root.appendChild(filters);
  const list = el("div", "mw-tl");
  root.appendChild(list);

  function draw() {
    list.innerHTML = "";
    const today = cal.today.year;
    const shown = dated.filter((e) => !hidden.has(e.category)).sort((a, b) => a.date.year - b.date.year || a.name.localeCompare(b.name));
    if (!shown.length) {
      list.appendChild(el("p", "mw-tl-empty", "Nothing to show yet."));
      return;
    }
    // Long events get a lane each, reused once they've ended
    const ranges = shown.filter((e) => e.end || e.ongoing);
    const lanes: number[] = []; // end year of whatever is in each lane
    const laneOf = new Map<TimelineEvent & { date: { year: number } }, number>();
    for (const r of ranges) {
      const endY = r.end ? r.end.year : today;
      let lane = lanes.findIndex((end) => end < r.date.year);
      if (lane < 0) lane = lanes.length;
      lanes[lane] = endY;
      laneOf.set(r, lane);
    }
    list.style.setProperty("--lanes", String(Math.max(1, lanes.length)));

    const rows: { year: number; e?: TimelineEvent; today?: boolean }[] = shown.map((e) => ({ year: e.date.year, e }));
    // "Today" goes after everything up to this year (the DM view in Obsidian can have later events)
    const at = rows.findIndex((r) => r.year > today);
    rows.splice(at < 0 ? rows.length : at, 0, { year: today, today: true });

    for (const row of rows) {
      const r = el("div", `mw-tl-row${row.today ? " mw-tl-today" : ""}${row.e?.private ? " mw-tl-private" : ""}`);
      const when = el("div", "mw-tl-year", row.today ? yearLabel(today) : yearLabel(row.year));
      const bars = el("div", "mw-tl-bars");
      for (const [range, lane] of laneOf) {
        const endY = range.end ? range.end.year : today;
        if (row.year < range.date.year || row.year > endY) continue;
        if (!row.today && !row.e) continue;
        if (row.today && range.end && range.end.year < today) continue;
        const seg = el("span", "mw-tl-seg");
        seg.style.gridColumn = String(lane + 1);
        seg.dataset.cat = (cal.categories.find((c) => c.id === range.category)?.name ?? "").toLowerCase();
        if (row.e === range) seg.classList.add("mw-tl-seg-start");
        bars.appendChild(seg);
      }
      const dot = el("span", row.today ? "mw-tl-dot mw-tl-dot-today" : row.e && (row.e.end || row.e.ongoing) ? "" : "mw-tl-dot");
      if (row.e) dot.dataset.cat = (cal.categories.find((c) => c.id === row.e!.category)?.name ?? "").toLowerCase();
      const what = el("div", "mw-tl-what");
      if (row.today) what.textContent = "Today";
      else if (row.e) {
        const e = row.e;
        if (e.href || opts.onOpen) {
          const a = el("a", opts.linkClass ?? "", e.name);
          if (e.href) a.setAttribute("href", e.href);
          if (opts.onOpen) a.addEventListener("click", (ev) => { ev.preventDefault(); opts.onOpen!(e); });
          what.appendChild(a);
        } else what.appendChild(el("span", "", e.name));
        if (e.end) what.appendChild(el("span", "mw-tl-span", ` · until ${yearLabel(e.end.year)}`));
        else if (e.ongoing) what.appendChild(el("span", "mw-tl-span", " · ongoing"));
        if (e.private) what.appendChild(el("span", "mw-tl-flag", "not published"));
      }
      r.append(when, bars, dot, what);
      list.appendChild(r);
    }
  }
  draw();
}
