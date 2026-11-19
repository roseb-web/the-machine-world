// Browser code for the Calendar and Timeline pages. Runs on every page change (Quartz "nav" event).
import { renderTimeline, TimelineEvent } from "../../../shared/timeline-render";
import type { CalendarExport } from "../../../shared/events";

type Cal = CalendarExport & { events: (TimelineEvent & { href?: string })[] };

const yearLabel = (y: number) => (y >= 1 ? `${y} YC` : `${Math.abs(y)} BL`);

function setup(root: HTMLElement) {
  const cal: Cal = JSON.parse(root.dataset.cal || "{}");
  if (root.dataset.mode === "timeline") {
    // Sessions crowd the timeline, so they start switched off (the calendar shows them)
    renderTimeline(root, cal, { linkClass: "internal", startHidden: ["the party"] });
    return;
  }

  const before = (m: number) => cal.monthLengths.slice(0, m).reduce((a, b) => a + b, 0);
  const yearLen = before(cal.months.length);
  const abs = (y: number, m: number, d: number) => y * yearLen + before(m) + d; // a day number, for comparing
  const t = cal.today;
  const todayNo = abs(t.year, t.month, t.day);
  const seasonOf = (m: number, d: number) => {
    const doy = before(m) + d;
    const len = yearLen / cal.seasons.length;
    const i = Math.min(cal.seasons.length - 1, Math.floor((doy - 1) / len));
    return `${cal.seasons[i]} ${doy - Math.round(i * len)}`;
  };
  const weekdayOf = (m: number, d: number) => cal.weekdays[(cal.firstWeekDay + before(m) + d - 1) % cal.weekdays.length];
  const moonOf = (y: number, m: number, d: number) => {
    if (!cal.moon) return "";
    const p = (((abs(y, m, d) - 1 + cal.moon.offset) % cal.moon.cycle) + cal.moon.cycle) % cal.moon.cycle;
    if (p === 0) return "New moon";
    if (p === Math.floor(cal.moon.cycle / 2)) return "Full moon";
    return "";
  };
  const catName = (id: string) => (cal.categories.find((c) => c.id === id)?.name ?? "").toLowerCase();
  const isStar = (id: string) => catName(id) === "star signs";

  // The star sign on a day: the latest sign that started on or before it
  const signs = cal.events.filter((e) => isStar(e.category) && e.date.year === null).sort((a, b) => before(a.date.month) + a.date.day - (before(b.date.month) + b.date.day));
  const signOn = (m: number, d: number) => {
    const doy = before(m) + d;
    let s = signs[signs.length - 1];
    for (const x of signs) if (before(x.date.month) + x.date.day <= doy) s = x;
    return s ? s.name.replace(/^Star sign:\s*/, "") : "";
  };

  let view = { year: t.year, month: t.month };
  root.innerHTML = "";
  const head = document.createElement("div");
  head.className = "mw-cal-head";
  const grid = document.createElement("div");
  grid.className = "mw-cal-grid";
  const extra = document.createElement("div");
  extra.className = "mw-cal-extra";
  root.append(head, grid, extra);

  const link = (e: { name: string; href?: string }, cls: string) => {
    const a = document.createElement(e.href ? "a" : "span");
    a.className = cls + (e.href ? " internal" : "");
    if (e.href) a.setAttribute("href", e.href);
    a.textContent = e.name;
    return a;
  };

  function draw() {
    const { year, month } = view;
    const len = cal.monthLengths[month];
    const first = abs(year, month, 1);
    const last = abs(year, month, len);

    // Header: month, year, Concord month, season, star sign, and the arrows
    head.innerHTML = "";
    const title = document.createElement("div");
    title.className = "mw-cal-title";
    title.innerHTML = `<span class="mw-cal-month"></span> <span class="mw-cal-year"></span>`;
    title.querySelector(".mw-cal-month")!.textContent = cal.months[month];
    title.querySelector(".mw-cal-year")!.textContent = yearLabel(year);
    const sub = document.createElement("div");
    sub.className = "mw-cal-sub";
    const isNow = year === t.year && month === t.month;
    const sign = signOn(month, isNow ? t.day : 1);
    sub.textContent = [`${cal.concordMonths[month] ?? ""} in the Concord's calendar`, seasonOf(month, 1).split(" ")[0], sign ? `Under the sign of ${sign.replace(/^.*\((.*)\).*$/, "$1")}` : ""]
      .filter(Boolean)
      .join(" · ");
    const nav = document.createElement("div");
    nav.className = "mw-cal-nav";
    const btn = (label: string, aria: string, fn: () => void) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      b.setAttribute("aria-label", aria);
      b.addEventListener("click", fn);
      nav.appendChild(b);
    };
    const prevM = (month + cal.months.length - 1) % cal.months.length;
    const nextM = (month + 1) % cal.months.length;
    btn(`‹ ${cal.months[prevM]}`, "Previous month", () => { view = month === 0 ? { year: year - 1, month: prevM } : { year, month: prevM }; draw(); });
    btn("Today", "Back to today", () => { view = { year: t.year, month: t.month }; draw(); });
    btn(`${cal.months[nextM]} ›`, "Next month", () => { view = nextM === 0 ? { year: year + 1, month: nextM } : { year, month: nextM }; draw(); });
    const top = document.createElement("div");
    top.className = "mw-cal-top";
    const left = document.createElement("div");
    left.append(title, sub);
    top.append(left, nav);
    head.appendChild(top);

    // Ongoing: long events that cover any of this month
    const ongoing = cal.events.filter((e) => {
      if (e.date.year === null || !(e.end || e.ongoing)) return false;
      const s = abs(e.date.year, e.date.month, e.date.day);
      const en = e.end ? abs(e.end.year, e.end.month, e.end.day) : todayNo;
      return s <= last && en >= first;
    });
    if (ongoing.length) {
      const strip = document.createElement("div");
      strip.className = "mw-cal-ongoing";
      strip.appendChild(Object.assign(document.createElement("span"), { className: "mw-cal-ongoing-label", textContent: "Ongoing" }));
      for (const e of ongoing) strip.appendChild(link(e, "mw-cal-ongoing-item"));
      head.appendChild(strip);
    }

    // The grid
    grid.innerHTML = "";
    for (const w of cal.weekdays) grid.appendChild(Object.assign(document.createElement("div"), { className: "mw-cal-wd", textContent: w }));
    const offset = (cal.firstWeekDay + before(month)) % cal.weekdays.length;
    for (let i = 0; i < offset; i++) grid.appendChild(Object.assign(document.createElement("div"), { className: "mw-cal-blank" }));
    for (let d = 1; d <= len; d++) {
      const no = abs(year, month, d);
      const cell = document.createElement("div");
      cell.className = "mw-cal-day" + (no === todayNo ? " mw-cal-today" : "") + (no < todayNo ? " mw-cal-past" : "");
      const moon = moonOf(year, month, d);
      cell.dataset.tip = `${weekdayOf(month, d)}, ${d} ${cal.months[month]} · ${d} ${cal.concordMonths[month]} · ${seasonOf(month, d)}${moon ? ` · ${moon}` : ""}`;
      cell.tabIndex = 0;
      const num = document.createElement("div");
      num.className = "mw-cal-num";
      num.textContent = String(d);
      if (moon) num.appendChild(Object.assign(document.createElement("span"), { className: `mw-cal-moon ${moon === "New moon" ? "mw-new" : "mw-full"}`, title: moon }));
      if (no === todayNo) num.appendChild(Object.assign(document.createElement("span"), { className: "mw-cal-today-tag", textContent: "today" }));
      cell.appendChild(num);
      for (const e of cal.events) {
        if (e.date.month !== month || e.date.day !== d) continue;
        if (e.date.year !== null && e.date.year !== year) continue;
        if (e.end || e.ongoing) continue; // long events are in the strip
        const label = link({ ...e, name: isStar(e.category) ? e.name.replace(/^Star sign:\s*/, "").replace(/\s*\(.*\)$/, "") : e.name }, "mw-cal-ev");
        label.dataset.cat = catName(e.category);
        cell.appendChild(label);
      }
      grid.appendChild(cell);
    }

    // Coming up: the next few yearly events from today
    extra.innerHTML = "";
    const upcoming = cal.events
      .filter((e) => e.date.year === null && !isStar(e.category))
      .map((e) => {
        let n = abs(t.year, e.date.month, e.date.day) - todayNo;
        if (n < 0) n += yearLen;
        return { e, n };
      })
      .sort((a, b) => a.n - b.n)
      .slice(0, 4);
    if (upcoming.length) {
      const box = document.createElement("div");
      box.className = "mw-cal-upcoming";
      box.appendChild(Object.assign(document.createElement("div"), { className: "mw-cal-box-title", textContent: "Coming up" }));
      const ul = document.createElement("ul");
      for (const { e, n } of upcoming) {
        const li = document.createElement("li");
        li.appendChild(link(e, ""));
        li.appendChild(Object.assign(document.createElement("span"), { className: "mw-cal-when", textContent: n === 0 ? "today" : `${e.date.day} ${cal.months[e.date.month]} · in ${n} day${n === 1 ? "" : "s"}` }));
        ul.appendChild(li);
      }
      box.appendChild(ul);
      extra.appendChild(box);
    }
    // Key
    const key = document.createElement("div");
    key.className = "mw-cal-key";
    for (const c of cal.categories) {
      const k = document.createElement("span");
      k.className = "mw-cal-key-item";
      k.dataset.cat = c.name.toLowerCase();
      k.textContent = c.name;
      key.appendChild(k);
    }
    extra.appendChild(key);
  }
  draw();
}

document.addEventListener("nav", () => {
  for (const root of document.querySelectorAll<HTMLElement>(".mw-cal")) {
    try {
      setup(root);
    } catch (e) {
      console.error("Calendar failed", e);
    }
  }
});
