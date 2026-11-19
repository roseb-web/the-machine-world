// Draws a horizontal timeline you can drag and zoom. Plain DOM, no framework, so the wiki's
// Timeline page and the Obsidian timeline view both use it.
//
// - Long events (with an end, or ongoing) are bars above the line, stacked in lanes.
// - Other events sit below the line as cards. Events too close to read merge into a numbered
//   cluster; clicking it zooms in. Events on the same date share one card.
// - Before 1 YC (BL) is squeezed into about 30% of the width, so recent history has room.
//   A break mark shows where the scale changes. Each side on its own is evenly spaced.
// - A strip along the bottom shows the whole of history, with a box for what's in view.
// - Clicking an event shows a pop-up first; the pop-up links to the page.

import type { CalendarExport, Day, WikiEvent } from "./events";

export interface TimelineEvent extends WikiEvent {
  href?: string; // link to its page (wiki)
  openable?: boolean; // Obsidian: has a note that onOpen can open
  private?: boolean; // Obsidian only: would not be published
  detail?: string; // Obsidian only: the event's description, shown in the pop-up
  publicName?: string; // Obsidian only: the name the party sees, if it's different
}

export interface TimelineOptions {
  linkClass?: string; // e.g. "internal" so Quartz shows hover previews
  onOpen?: (e: TimelineEvent) => void; // Obsidian: open the note instead of following a link
  startHidden?: string[]; // category names (any case) whose filter starts switched off
}

type Ev = TimelineEvent & { date: Day; p: number; pEnd?: number };

const BREAK = 1; // 1 YC: the first lamp
const BL_SHARE = 0.3; // share of the width for BL when the view covers all of history
const MIN_SPAN = 0.4; // closest zoom, in years
const LANE_H = 26;
const LANE_GAP = 5;

export const yearLabel = (y: number) => (y >= 1 ? `${y} YC` : `${Math.abs(y)} BL`);

export function renderTimeline(root: HTMLElement, cal: CalendarExport & { events: TimelineEvent[] }, opts: TimelineOptions = {}) {
  const host = root as HTMLElement & { _mwTlCleanup?: () => void };
  host._mwTlCleanup?.();
  root.innerHTML = "";
  const doc = root.ownerDocument;
  const win = doc.defaultView ?? window;
  injectStyle(doc);

  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
    const n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };

  // ---- Dates as numbers: year + fraction of the year ----
  const lens = cal.monthLengths?.length ? cal.monthLengths : cal.months.map(() => 30);
  const yearLen = lens.reduce((a, b) => a + b, 0);
  const before = (m: number) => lens.slice(0, m).reduce((a, b) => a + b, 0);
  const pos = (d: Day) => d.year + (before(d.month) + d.day - 1) / yearLen;
  const todayP = pos(cal.today);
  const yearOnly = (d: Day) => d.month === 0 && d.day === 1;
  const dateText = (d: Day) => (yearOnly(d) ? yearLabel(d.year) : `${d.day} ${cal.months[d.month] ?? ""} ${yearLabel(d.year)}`);

  const events: Ev[] = cal.events
    .filter((e): e is TimelineEvent & { date: Day } => e.date.year !== null)
    .map((e) => ({ ...e, p: pos(e.date), pEnd: e.end ? pos(e.end) : e.ongoing ? todayP : undefined }));
  const catName = new Map(cal.categories.map((c) => [c.id, c.name]));
  const catColor = new Map(cal.categories.map((c) => [c.id, c.color]));
  const cats = cal.categories.filter((c) => events.some((e) => e.category === c.id));
  const off = new Set((opts.startHidden ?? []).map((n) => n.toLowerCase()));
  const hidden = new Set<string>(cats.filter((c) => off.has(c.name.toLowerCase())).map((c) => c.id));
  const tagCat = (n: HTMLElement, id: string) => {
    n.dataset.cat = (catName.get(id) ?? "").toLowerCase();
    const c = catColor.get(id);
    if (c) n.style.setProperty("--cat-own", c);
  };

  // ---- The squeezed scale: u is "drawing distance", p is the date ----
  const allP = events.flatMap((e) => (e.pEnd !== undefined ? [e.p, e.pEnd] : [e.p])).concat(todayP);
  let minP = Math.min(...allP);
  let maxP = Math.max(...allP);
  if (maxP - minP < 10) minP = maxP - 10;
  const warped = minP < BREAK && maxP > BREAK;
  const k = warped ? Math.min(1, ((BL_SHARE / (1 - BL_SHARE)) * (maxP - BREAK)) / (BREAK - minP)) : 1;
  const U = (p: number) => (p >= BREAK ? p - BREAK : (p - BREAK) * k);
  const P = (u: number) => (u >= 0 ? u + BREAK : u / k + BREAK);
  // A little room at each end, measured on the drawn line
  const padU = (U(maxP) - U(minP)) * 0.03;
  const uMin = U(minP) - padU;
  const uMax = U(maxP) + padU;
  minP = P(uMin);
  maxP = P(uMax);
  let u0 = uMin;
  let u1 = uMax;

  // ---- The frame ----
  const wrap = el("div", "mw-tl2");
  const bar = el("div", "mw-tl2-toolbar");
  const btn = (text: string, title: string) => {
    const b = el("button", "mw-tl2-btn", text);
    b.type = "button";
    b.title = title;
    b.setAttribute("aria-label", title);
    return b;
  };
  const zoomOut = btn("−", "Zoom out");
  const zoomIn = btn("+", "Zoom in");
  const showAll = btn("All", "Show all of history");
  const toToday = btn("Today", "Go to today");
  const label = el("span", "mw-tl2-range");
  const hint = el("span", "mw-tl2-hint", "Drag to move · pinch or Ctrl + scroll to zoom");
  const shortNote = el("span", "mw-tl2-note");
  const filters = el("div", "mw-tl2-filters");
  for (const c of cats) {
    const b = el("button", `mw-tl2-chip${hidden.has(c.id) ? "" : " mw-on"}`);
    b.type = "button";
    tagCat(b, c.id);
    b.append(el("i"), doc.createTextNode(c.name));
    b.setAttribute("aria-pressed", String(!hidden.has(c.id)));
    b.addEventListener("click", () => {
      if (hidden.has(c.id)) hidden.delete(c.id);
      else hidden.add(c.id);
      b.classList.toggle("mw-on", !hidden.has(c.id));
      b.setAttribute("aria-pressed", String(!hidden.has(c.id)));
      draw();
    });
    filters.appendChild(b);
  }
  bar.append(zoomOut, zoomIn, showAll, toToday, label, shortNote, hint);
  if (cats.length > 1) bar.appendChild(filters);

  const stage = el("div", "mw-tl2-stage");
  stage.tabIndex = 0;
  stage.setAttribute("role", "application");
  stage.setAttribute("aria-label", "Timeline. Arrow keys move, plus and minus zoom.");
  const strip = el("div", "mw-tl2-strip");
  const pop = el("div", "mw-tl2-pop");
  pop.hidden = true;
  wrap.append(bar, stage, strip, pop);
  root.appendChild(wrap);

  if (!events.length) {
    stage.appendChild(el("p", "mw-tl2-empty", "Nothing to show yet."));
    return;
  }

  // ---- Drawing ----
  const PADX = 28; // room at each side, so dots and clusters at the ends aren't cut off
  const width = () => stage.clientWidth || 800;
  const inner = () => Math.max(100, width() - PADX * 2);
  const X = (p: number) => PADX + ((U(p) - u0) / (u1 - u0)) * inner();

  function ticks(): { p: number; text: string }[] {
    const W = width();
    const out: { p: number; text: string }[] = [];
    const sides: [number, number][] = [];
    const a = P(u0);
    const b = P(u1);
    if (warped && a < BREAK && b > BREAK) sides.push([a, BREAK], [BREAK, b]);
    else sides.push([a, b]);
    for (const [s, e] of sides) {
      const px = X(e) - X(s);
      const perYear = px / Math.max(1e-9, e - s);
      if (perYear > 700) {
        // Months
        for (let y = Math.floor(s); y <= e; y++)
          for (let m = 0; m < lens.length; m++) {
            const p = y + before(m) / yearLen;
            if (p >= s && p <= e) out.push({ p, text: m === 0 ? yearLabel(y) : cal.months[m] });
          }
        continue;
      }
      const want = Math.max(1, px / 95);
      const step = [1000, 500, 200, 100, 50, 20, 10, 5, 2, 1].reverse().find((st) => (e - s) / st <= want) ?? 1000;
      for (let t = Math.ceil(s / step) * step; t <= e; t += step) {
        if (warped && t !== BREAK && Math.abs(X(t) - X(BREAK)) < 46) continue;
        out.push({ p: t, text: yearLabel(t) });
      }
    }
    return out.filter((t) => X(t.p) > -40 && X(t.p) < W + 40);
  }

  // Height: while you drag or zoom it only grows (so it doesn't jump about);
  // once you stop, it eases to fit what's in view.
  let stageH = 0;
  let holding = false;
  let settle = 0;
  const hold = () => {
    holding = true;
    win.clearTimeout(settle);
  };
  const release = (delay = 300) => {
    win.clearTimeout(settle);
    settle = win.setTimeout(() => {
      holding = false;
      draw();
    }, delay);
  };

  function draw() {
    closePop();
    stage.innerHTML = "";
    const W = width();
    const shown = events.filter((e) => !hidden.has(e.category));
    label.textContent = `${yearLabel(Math.floor(P(u0)))} to ${yearLabel(Math.floor(P(u1)))}`;
    zoomIn.disabled = P(u1) - P(u0) <= MIN_SPAN * 1.01 && (!warped || u0 >= 0 || u1 <= 0);
    zoomOut.disabled = u0 <= uMin + 1e-6 && u1 >= uMax - 1e-6;
    showAll.disabled = zoomOut.disabled;

    const top = el("div", "mw-tl2-top");
    stage.appendChild(top);

    // Bars, in lanes
    const ranges = shown.filter((e) => e.pEnd !== undefined).sort((a, b) => a.p - b.p || b.pEnd! - b.p - (a.pEnd! - a.p));
    const lanes: number[] = [];
    let tooShort = 0;
    const barsEl = el("div", "mw-tl2-bars");
    for (const r of ranges) {
      const x1 = X(r.p);
      const x2 = X(r.pEnd!);
      if (x2 < 0 || x1 > W) continue;
      if (x2 - x1 < 40) {
        tooShort++;
        continue;
      }
      let lane = lanes.findIndex((end) => x1 > end + 6);
      if (lane < 0) lane = lanes.length;
      lanes[lane] = x2;
      const b = el("button", `mw-tl2-bar${r.private ? " mw-private" : ""}`);
      b.type = "button";
      tagCat(b, r.category);
      const cl = Math.max(x1, -8);
      const cr = Math.min(x2, W + 8);
      b.style.cssText = `left:${cl}px;width:${cr - cl}px;top:${lane * (LANE_H + LANE_GAP)}px`;
      b.classList.toggle("mw-cut-left", x1 < -8);
      b.classList.toggle("mw-cut-right", x2 > W + 8);
      b.appendChild(el("span", "", r.name));
      b.addEventListener("click", (ev) => openPop([r], ev));
      barsEl.appendChild(b);
    }
    barsEl.style.height = `${Math.max(1, lanes.length) * (LANE_H + LANE_GAP)}px`;
    stage.appendChild(barsEl);
    shortNote.textContent = tooShort ? `+${tooShort} shorter ${tooShort === 1 ? "era" : "eras"}: zoom in to see ${tooShort === 1 ? "it" : "them"}` : "";

    // The line
    const axis = el("div", "mw-tl2-axis");
    stage.appendChild(axis);
    for (const t of ticks()) {
      const tk = el("span", "mw-tl2-tick", t.text);
      tk.style.left = `${X(t.p)}px`;
      axis.appendChild(tk);
    }
    if (warped && X(BREAK) > 0 && X(BREAK) < W) {
      const br = el("span", "mw-tl2-break");
      br.style.left = `${X(BREAK)}px`;
      br.title = "The scale changes here: before 1 YC is squeezed";
      axis.appendChild(br);
    }

    // Events below the line: group the ones too close to read
    const points = shown.filter((e) => e.pEnd === undefined && X(e.p) > -30 && X(e.p) < W + 30).sort((a, b) => a.p - b.p);
    const groups: Ev[][] = [];
    for (const e of points) {
      const g = groups[groups.length - 1];
      if (g && X(e.p) - X(g[0].p) < 34) g.push(e);
      else groups.push([e]);
    }
    const below = el("div", "mw-tl2-below");
    stage.appendChild(below);
    const placed: { x: number; y: number; w: number; h: number }[] = [];
    const place = (x: number, w: number, h: number) => {
      let y = 0;
      for (;;) {
        const hit = placed.find((r) => x < r.x + r.w + 8 && x + w + 8 > r.x && y < r.y + r.h + 8 && y + h + 8 > r.y);
        if (!hit) break;
        y = hit.y + hit.h + 8;
      }
      placed.push({ x, y, w, h });
      return y;
    };
    const canZoom = P(u1) - P(u0) > MIN_SPAN * 1.01;
    let stems = "";
    for (const g of groups) {
      const sameDate = g.every((e) => e.p === g[0].p);
      const gx = (X(g[0].p) + X(g[g.length - 1].p)) / 2;
      if (g.length > 1 && !sameDate && canZoom) {
        // A cluster
        const size = Math.min(44, 26 + g.length * 1.5);
        const c = el("button", "mw-tl2-cluster", String(g.length));
        c.type = "button";
        tagCat(c, g[0].category);
        c.style.cssText = `left:${gx}px;width:${size}px;height:${size}px`;
        const a = yearLabel(g[0].date.year);
        const b = yearLabel(g[g.length - 1].date.year);
        c.title = `${g.length} events, ${a === b ? a : `${a} to ${b}`}. Click to zoom in.`;
        c.addEventListener("click", () => {
          const lo = U(g[0].p);
          const hi = U(g[g.length - 1].p);
          const pad = Math.max((hi - lo) * 0.35, U(Math.min(P(hi) + 0.5, maxP)) - hi);
          animateTo(lo - pad, hi + pad);
        });
        axis.appendChild(c);
        const text = a === b ? a : `${a} – ${b}`;
        const w = text.length * 6.2 + 8;
        const y = place(gx - w / 2, w, 14);
        const lab = el("span", "mw-tl2-clabel", text);
        lab.style.cssText = `left:${gx}px;top:${y}px`;
        below.appendChild(lab);
        continue;
      }
      // A card: one event, or several on the same date
      const dot = el("span", "mw-tl2-dot");
      tagCat(dot, g[0].category);
      dot.style.left = `${gx}px`;
      axis.appendChild(dot);
      const MAX = 4;
      const lines = g.slice(0, MAX);
      const longest = Math.max(...lines.map((e) => Math.min(e.name.length, 40)), 8);
      const w = Math.min(260, longest * 6.6 + 30);
      const h = 24 + lines.length * 18 + (g.length > MAX ? 18 : 0);
      const x = Math.max(0, Math.min(gx - 12, W - w));
      const y = place(x, w, h);
      const card = el("div", "mw-tl2-card");
      tagCat(card, g[0].category);
      card.style.cssText = `left:${x}px;top:${y}px;width:${w}px`;
      card.appendChild(el("span", "mw-tl2-date", dateText(g[0].date)));
      for (const e of lines) {
        const b = el("button", `mw-tl2-ev${e.private ? " mw-private" : ""}`, e.name);
        b.type = "button";
        tagCat(b, e.category);
        b.addEventListener("click", (ev) => openPop([e], ev));
        card.appendChild(b);
      }
      if (g.length > MAX) {
        const more = el("button", "mw-tl2-more", `+${g.length - MAX} more`);
        more.type = "button";
        more.addEventListener("click", (ev) => openPop(g, ev));
        card.appendChild(more);
      }
      below.appendChild(card);
      stems += `<line x1="${gx}" x2="${gx}" y1="0" y2="${y + 2}" />`;
    }
    const belowH = Math.max(40, ...placed.map((r) => r.y + r.h)) + 16;
    below.style.height = `${belowH}px`;
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = doc.createElementNS(svgNS, "svg");
    svg.setAttribute("class", "mw-tl2-stems");
    svg.setAttribute("width", String(W));
    svg.setAttribute("height", String(belowH));
    svg.innerHTML = stems;
    below.prepend(svg);

    const need = 26 + barsEl.offsetHeight + 64 + belowH;
    stageH = holding ? Math.max(stageH, need) : need;
    stage.style.height = `${stageH}px`;

    // Today and the break, from top to bottom
    const tx = X(todayP);
    if (tx >= 0 && tx <= W) {
      const line = el("div", "mw-tl2-today");
      line.style.left = `${tx}px`;
      line.appendChild(el("span", "", "Today"));
      stage.appendChild(line);
    }
    if (warped && X(BREAK) > 0 && X(BREAK) < W) {
      const line = el("div", "mw-tl2-breakline");
      line.style.left = `${X(BREAK)}px`;
      line.appendChild(el("span", "", "BL │ YC"));
      line.lastElementChild!.appendChild(el("em", "", " · the scale changes here"));
      stage.appendChild(line);
    }
    drawStrip();
  }

  // ---- The overview strip ----
  const SX = (p: number, W: number) => ((U(p) - uMin) / (uMax - uMin)) * W;
  function drawStrip() {
    strip.innerHTML = "";
    const W = strip.clientWidth || width();
    for (const e of events) {
      if (hidden.has(e.category)) continue;
      const m = el("span", e.pEnd !== undefined ? "mw-tl2-sbar" : "mw-tl2-stick");
      tagCat(m, e.category);
      if (e.pEnd !== undefined) m.style.cssText = `left:${SX(e.p, W)}px;width:${Math.max(2, SX(e.pEnd, W) - SX(e.p, W))}px`;
      else m.style.left = `${SX(e.p, W)}px`;
      strip.appendChild(m);
    }
    const box = el("span", "mw-tl2-window");
    const a = ((u0 - uMin) / (uMax - uMin)) * W;
    const b = ((u1 - uMin) / (uMax - uMin)) * W;
    box.style.cssText = `left:${a}px;width:${Math.max(10, b - a)}px`;
    strip.appendChild(box);
    const l = el("span", "mw-tl2-send mw-l", yearLabel(Math.ceil(minP)));
    const r = el("span", "mw-tl2-send mw-r", yearLabel(Math.floor(maxP)));
    strip.append(l, r);
  }

  // ---- Moving and zooming ----
  function setView(a: number, b: number) {
    const full = uMax - uMin;
    let span = Math.min(full, Math.max(b - a, minSpanAt((a + b) / 2)));
    if (b - a > full) span = full;
    let mid = (a + b) / 2;
    mid = Math.max(uMin + span / 2, Math.min(uMax - span / 2, mid));
    u0 = mid - span / 2;
    u1 = mid + span / 2;
  }
  const minSpanAt = (u: number) => (u < 0 ? MIN_SPAN * k : MIN_SPAN);
  let anim = 0;
  function animateTo(a: number, b: number) {
    const s0 = u0;
    const s1 = u1;
    const start = performance.now();
    cancelAnimationFrame(anim);
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 260);
      const e = 1 - Math.pow(1 - t, 3);
      setView(s0 + (a - s0) * e, s1 + (b - s1) * e);
      draw();
      if (t < 1) anim = requestAnimationFrame(step);
      else release(150);
    };
    hold();
    anim = requestAnimationFrame(step);
  }
  const zoomAt = (factor: number, frac = 0.5, smooth = false) => {
    const at = u0 + (u1 - u0) * frac;
    const a = at - (at - u0) * factor;
    const b = at + (u1 - at) * factor;
    if (smooth) animateTo(a, b);
    else {
      setView(a, b);
      draw();
    }
  };
  zoomIn.addEventListener("click", () => zoomAt(0.5, 0.5, true));
  zoomOut.addEventListener("click", () => zoomAt(2, 0.5, true));
  showAll.addEventListener("click", () => animateTo(uMin, uMax));
  toToday.addEventListener("click", () => {
    const span = Math.min(uMax - uMin, 30);
    const t = U(todayP);
    animateTo(t - span * 0.8, t + span * 0.2);
  });

  // Drag to move; two fingers to pinch
  const pts = new Map<number, { x: number; y: number }>();
  let dragFrom: { x: number; u0: number; u1: number } | null = null;
  let pinchFrom: { d: number; mid: number; u0: number; u1: number } | null = null;
  let moved = false;
  const rel = (x: number) => x - stage.getBoundingClientRect().left - PADX;
  stage.addEventListener("pointerdown", (ev) => {
    if (ev.button !== 0) return;
    pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    moved = false;
    if (pts.size === 1) dragFrom = { x: ev.clientX, u0, u1 };
    if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      pinchFrom = { d: Math.abs(a.x - b.x) || 1, mid: rel((a.x + b.x) / 2), u0, u1 };
      dragFrom = null;
    }
  });
  stage.addEventListener("pointermove", (ev) => {
    if (!pts.has(ev.pointerId)) return;
    pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    const W = inner();
    if (pinchFrom && pts.size === 2) {
      const [a, b] = [...pts.values()];
      const d = Math.abs(a.x - b.x) || 1;
      const f = pinchFrom.d / d;
      const at = pinchFrom.u0 + ((pinchFrom.u1 - pinchFrom.u0) * pinchFrom.mid) / W;
      setView(at - (at - pinchFrom.u0) * f, at + (pinchFrom.u1 - at) * f);
      moved = true;
      hold();
      draw();
    } else if (dragFrom) {
      const dx = ev.clientX - dragFrom.x;
      if (!moved && Math.abs(dx) < 5) return;
      if (!moved) stage.setPointerCapture(ev.pointerId);
      moved = true;
      hold();
      stage.classList.add("mw-dragging");
      const du = (-dx / W) * (dragFrom.u1 - dragFrom.u0);
      setView(dragFrom.u0 + du, dragFrom.u1 + du);
      draw();
    }
  });
  const end = (ev: PointerEvent) => {
    pts.delete(ev.pointerId);
    if (pts.size < 2) pinchFrom = null;
    if (pts.size === 0) {
      dragFrom = null;
      stage.classList.remove("mw-dragging");
      if (holding) release();
    }
  };
  stage.addEventListener("pointerup", end);
  stage.addEventListener("pointercancel", end);
  // A drag shouldn't count as a click on whatever it ended over
  stage.addEventListener(
    "click",
    (ev) => {
      if (moved) {
        ev.stopPropagation();
        ev.preventDefault();
        moved = false;
      }
    },
    true,
  );
  stage.addEventListener(
    "wheel",
    (ev) => {
      if (ev.ctrlKey || ev.metaKey) {
        ev.preventDefault();
        hold();
        zoomAt(Math.exp(ev.deltaY * 0.01), Math.max(0, Math.min(1, rel(ev.clientX) / inner())));
        release();
      } else if (Math.abs(ev.deltaX) > Math.abs(ev.deltaY) || ev.shiftKey) {
        ev.preventDefault();
        const d = ev.shiftKey && !ev.deltaX ? ev.deltaY : ev.deltaX;
        const du = (d / inner()) * (u1 - u0);
        setView(u0 + du, u1 + du);
        hold();
        draw();
        release();
      }
    },
    { passive: false },
  );
  stage.addEventListener("keydown", (ev) => {
    const du = (u1 - u0) * 0.15;
    if (ev.key === "ArrowLeft") setView(u0 - du, u1 - du);
    else if (ev.key === "ArrowRight") setView(u0 + du, u1 + du);
    else if (ev.key === "+" || ev.key === "=") return zoomAt(0.5, 0.5, true);
    else if (ev.key === "-" || ev.key === "_") return zoomAt(2, 0.5, true);
    else if (ev.key === "Escape") return closePop();
    else return;
    ev.preventDefault();
    hold();
    draw();
    release(500);
  });

  // The strip: click or drag to move the view
  let stripDrag = false;
  const stripTo = (clientX: number) => {
    const r = strip.getBoundingClientRect();
    const at = uMin + ((clientX - r.left) / r.width) * (uMax - uMin);
    const span = u1 - u0;
    setView(at - span / 2, at + span / 2);
    hold();
    draw();
  };
  strip.addEventListener("pointerdown", (ev) => {
    stripDrag = true;
    strip.setPointerCapture(ev.pointerId);
    stripTo(ev.clientX);
  });
  strip.addEventListener("pointermove", (ev) => stripDrag && stripTo(ev.clientX));
  strip.addEventListener("pointerup", () => {
    stripDrag = false;
    release();
  });

  // ---- The pop-up ----
  function closePop() {
    pop.hidden = true;
    pop.innerHTML = "";
  }
  function openPop(list: Ev[], ev: MouseEvent) {
    closePop();
    pop.hidden = false;
    const x = el("button", "mw-tl2-x", "✕");
    x.type = "button";
    x.setAttribute("aria-label", "Close");
    x.addEventListener("click", closePop);
    pop.appendChild(x);
    for (const e of list) {
      const box = el("div", "mw-tl2-pitem");
      const meta = el("div", "mw-tl2-meta");
      const when =
        e.pEnd !== undefined
          ? `${dateText(e.date)} – ${e.end ? dateText(e.end) : "now"}`
          : dateText(e.date);
      meta.appendChild(el("span", "", when));
      const chip = el("span", "mw-tl2-pcat", catName.get(e.category) ?? "");
      tagCat(chip, e.category);
      if (chip.textContent) meta.appendChild(chip);
      box.appendChild(meta);
      box.appendChild(el("div", "mw-tl2-ptitle", e.name));
      if (e.info) box.appendChild(el("p", "mw-tl2-pinfo", e.info));
      if (e.detail) box.appendChild(el("p", "mw-tl2-pdetail", e.detail));
      if (e.private) box.appendChild(el("p", "mw-tl2-pprivate", "Not on the wiki"));
      else if (e.publicName && e.publicName !== e.name) box.appendChild(el("p", "mw-tl2-pprivate", `On the wiki as: ${e.publicName}`));
      if (e.href) {
        const a = el("a", `mw-tl2-open ${opts.linkClass ?? ""}`, "Open page →");
        a.href = e.href;
        box.appendChild(a);
      } else if (opts.onOpen && e.openable) {
        const a = el("button", "mw-tl2-open", "Open note →");
        a.type = "button";
        a.addEventListener("click", () => opts.onOpen!(e));
        box.appendChild(a);
      }
      pop.appendChild(box);
    }
    // Next to what was clicked, kept inside the timeline
    const wr = wrap.getBoundingClientRect();
    const tr = (ev.currentTarget as HTMLElement | null)?.getBoundingClientRect();
    const px = (tr ? tr.left : ev.clientX) - wr.left;
    const py = (tr ? tr.bottom : ev.clientY) - wr.top + 6;
    pop.style.left = `${Math.max(8, Math.min(px, wr.width - 300))}px`;
    pop.style.top = `${py}px`;
    const below = py + pop.offsetHeight - wr.height;
    if (below > 0 && tr) pop.style.top = `${Math.max(8, tr.top - wr.top - pop.offsetHeight - 6)}px`;
  }
  const outside = (ev: MouseEvent) => {
    if (!pop.hidden && !pop.contains(ev.target as Node) && !(ev.target as HTMLElement).closest?.(".mw-tl2-bar, .mw-tl2-ev, .mw-tl2-more"))
      closePop();
  };
  doc.addEventListener("click", outside);

  // Redraw when the space changes size
  let lastW = 0;
  const ro = new (win as typeof window).ResizeObserver(() => {
    const w = width();
    if (Math.abs(w - lastW) > 1) {
      lastW = w;
      draw();
    }
  });
  ro.observe(stage);
  host._mwTlCleanup = () => {
    ro.disconnect();
    doc.removeEventListener("click", outside);
    cancelAnimationFrame(anim);
  };
  draw();
}

// ---- Styles: one copy for the wiki and Obsidian. Colours come from the host's theme. ----
function injectStyle(doc: Document) {
  if (doc.getElementById("mw-tl2-style")) return;
  const s = doc.createElement("style");
  s.id = "mw-tl2-style";
  s.textContent = TIMELINE_CSS;
  doc.head.appendChild(s);
}

export const TIMELINE_CSS = `
.mw-tl2 {
  --tl-text: var(--darkgray, var(--text-normal, #2b2724));
  --tl-muted: var(--gray, var(--text-muted, #a39a90));
  --tl-line: var(--lightgray, var(--background-modifier-border, #e2d9cc));
  --tl-accent: var(--secondary, var(--interactive-accent, #a46b0a));
  --tl-bg: var(--light, var(--background-primary, #fbf8f3));
  --tl-head: var(--dark, var(--text-normal, #5a2e1e));
  --tl-today: #2f6f5e;
  position: relative;
  color: var(--tl-text);
  font-size: 0.85rem;
  border-top: 1px solid var(--tl-line);
  border-bottom: 1px solid var(--tl-line);
  background: color-mix(in srgb, var(--tl-accent) 3%, var(--tl-bg));
  user-select: none;
  -webkit-user-select: none;
}
.mw-tl2 [data-cat] { --cat: var(--cat-own, var(--tl-muted)); }
.mw-tl2 [data-cat="festivals"] { --cat: #a46b0a; }
.mw-tl2 [data-cat="star signs"] { --cat: #5b6b8f; }
.mw-tl2 [data-cat="the party"] { --cat: #4e6b5a; }
.mw-tl2 [data-cat="history"] { --cat: #8a5a44; }
.mw-tl2 [data-cat="eras"] { --cat: #b08a52; }
.mw-tl2 [data-cat="wars"] { --cat: #9b3b2e; }
.mw-tl2-toolbar {
  display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem 0.6rem;
  padding: 0.6rem 1rem; border-bottom: 1px solid var(--tl-line);
}
.mw-tl2 button { font: inherit; color: inherit; cursor: pointer; box-shadow: none; height: auto; }
.mw-tl2-ev, .mw-tl2-more, .mw-tl2-open, .mw-tl2-x { background: none !important; box-shadow: none !important; }
.mw-tl2-btn {
  min-width: 2rem; padding: 0.2rem 0.6rem; border: 1px solid var(--tl-line); border-radius: 6px;
  background: var(--tl-bg); color: var(--tl-head) !important; line-height: 1.4;
}
.mw-tl2-btn:disabled { opacity: 0.4; cursor: default; }
.mw-tl2-range { color: var(--tl-muted); margin-left: 0.3rem; }
.mw-tl2-hint { color: var(--tl-muted); font-size: 0.75rem; font-style: italic; }
.mw-tl2-filters { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-left: auto; }
.mw-tl2-chip {
  display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.15rem 0.6rem;
  border: 1px solid var(--cat); border-radius: 999px; background: var(--tl-bg);
  color: var(--cat) !important; font-size: 0.78rem; opacity: 0.45;
}
.mw-tl2-chip.mw-on { opacity: 1; }
.mw-tl2-chip i { width: 8px; height: 8px; border-radius: 50%; background: var(--cat); }
.mw-tl2-stage {
  position: relative; overflow: hidden; padding: 0; cursor: grab; touch-action: pan-y; outline: none;
  transition: height 0.35s ease;
}
@media (prefers-reduced-motion: reduce) { .mw-tl2-stage { transition: none; } }
.mw-tl2-stage:focus-visible { box-shadow: inset 0 0 0 2px var(--tl-accent); }
.mw-tl2-stage.mw-dragging { cursor: grabbing; }
.mw-tl2-top { height: 26px; position: relative; }
.mw-tl2-note { font-size: 0.75rem; font-style: italic; color: var(--tl-muted); }
.mw-tl2-note:empty { display: none; }
.mw-tl2-breakline em { font-style: normal; }
.mw-tl2-bars { position: relative; }
.mw-tl2-bar {
  position: absolute; height: ${LANE_H}px; padding: 0 0.5rem; border-radius: 5px; text-align: left;
  border: 1px solid color-mix(in srgb, var(--cat) 70%, transparent);
  background: color-mix(in srgb, var(--cat) 22%, var(--tl-bg));
  overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-size: 0.78rem; line-height: ${LANE_H - 2}px;
}
.mw-tl2-bar span { display: block; overflow: hidden; text-overflow: ellipsis; }
.mw-tl2-bar.mw-cut-left { border-left-style: dashed; border-top-left-radius: 0; border-bottom-left-radius: 0; }
.mw-tl2-bar.mw-cut-right { border-right-style: dashed; border-top-right-radius: 0; border-bottom-right-radius: 0; }
.mw-tl2-bar:hover, .mw-tl2-ev:hover { filter: brightness(0.97); text-decoration: underline; }
.mw-tl2-axis { position: relative; height: 64px; }
.mw-tl2-axis::before {
  content: ""; position: absolute; left: 0; right: 0; top: 44px; border-top: 1.5px solid color-mix(in srgb, var(--tl-text) 45%, transparent);
}
.mw-tl2-tick {
  position: absolute; top: 0; transform: translateX(-50%); font-size: 0.72rem; color: var(--tl-muted); white-space: nowrap;
}
.mw-tl2-tick::after {
  content: ""; position: absolute; left: 50%; top: 39px; height: 10px; border-left: 1px solid color-mix(in srgb, var(--tl-text) 45%, transparent);
}
.mw-tl2-break {
  position: absolute; top: 37px; width: 14px; height: 14px; transform: translateX(-50%);
  background: linear-gradient(115deg, transparent 38%, var(--tl-muted) 39% 46%, transparent 47% 55%, var(--tl-muted) 56% 63%, transparent 64%),
    color-mix(in srgb, var(--tl-accent) 3%, var(--tl-bg));
}
.mw-tl2-dot {
  position: absolute; top: 39px; width: 11px; height: 11px; margin-left: -5.5px; border-radius: 50%;
  background: var(--cat); box-shadow: 0 0 0 2px var(--tl-bg); z-index: 2;
}
.mw-tl2-cluster {
  position: absolute; top: 44px; transform: translate(-50%, -50%); border-radius: 50%; z-index: 3;
  border: 2px solid var(--cat); background: var(--tl-bg); color: var(--tl-head) !important;
  font-weight: 700; font-size: 0.82rem; padding: 0; display: flex; align-items: center; justify-content: center;
}
.mw-tl2-cluster:hover { background: color-mix(in srgb, var(--cat) 12%, var(--tl-bg)); }
.mw-tl2-below { position: relative; }
.mw-tl2-stems { position: absolute; left: 0; top: 0; overflow: visible; }
.mw-tl2-stems line { stroke: color-mix(in srgb, var(--tl-text) 22%, transparent); }
.mw-tl2-clabel { position: absolute; transform: translateX(-50%); font-size: 0.72rem; color: var(--tl-muted); white-space: nowrap; }
.mw-tl2-card {
  position: absolute; box-sizing: border-box; padding: 0.35rem 0.6rem 0.4rem 0.75rem;
  background: var(--tl-bg); border: 1px solid color-mix(in srgb, var(--cat) 45%, transparent);
  border-left: 3px solid var(--cat); border-radius: 6px; z-index: 2;
}
.mw-tl2-date { display: block; font-size: 0.68rem; font-weight: 600; color: var(--tl-muted); letter-spacing: 0.03em; }
.mw-tl2-ev, .mw-tl2-more {
  display: block; width: 100%; padding: 0; border: 0; background: none; text-align: left;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 0.8rem; line-height: 18px;
}
.mw-tl2-more { color: var(--tl-accent) !important; font-size: 0.75rem; }
.mw-private { font-style: italic; opacity: 0.8; }
.mw-tl2-today, .mw-tl2-breakline { position: absolute; top: 0; bottom: 0; pointer-events: none; z-index: 0; }
.mw-tl2-bars, .mw-tl2-below, .mw-tl2-axis { z-index: 1; }
.mw-tl2-today { border-left: 2px solid var(--tl-today); }
.mw-tl2-today span {
  position: absolute; top: 4px; left: 0; transform: translateX(-50%); padding: 0 0.5rem; border-radius: 999px;
  background: var(--tl-today); color: #fff; font-size: 0.7rem; font-weight: 600; line-height: 18px;
}
.mw-tl2-breakline { border-left: 1.5px dashed color-mix(in srgb, var(--tl-accent) 55%, transparent); }
.mw-tl2-breakline span { position: absolute; top: 6px; left: 6px; font-size: 0.7rem; color: var(--tl-accent); white-space: nowrap; }
.mw-tl2-strip {
  position: relative; height: 30px; margin: 0.4rem 1rem 1.4rem; border-radius: 6px; cursor: pointer; touch-action: none;
  background: color-mix(in srgb, var(--tl-accent) 9%, var(--tl-bg));
}
.mw-tl2-sbar { position: absolute; top: 5px; height: 4px; background: var(--cat); opacity: 0.55; border-radius: 2px; }
.mw-tl2-stick { position: absolute; top: 12px; width: 2px; height: 12px; margin-left: -1px; background: var(--cat); opacity: 0.75; }
.mw-tl2-window {
  position: absolute; top: -3px; bottom: -3px; border: 1.5px solid var(--tl-accent); border-radius: 5px;
  background: color-mix(in srgb, var(--tl-accent) 10%, transparent);
}
.mw-tl2-send { position: absolute; top: 100%; margin-top: 2px; font-size: 0.68rem; color: var(--tl-muted); }
.mw-tl2-send.mw-l { left: 0; }
.mw-tl2-send.mw-r { right: 0; }
.mw-tl2-pop {
  position: absolute; z-index: 20; width: 280px; max-height: 360px; overflow: auto; box-sizing: border-box;
  padding: 0.8rem 1rem; background: var(--tl-bg); border: 1.5px solid var(--tl-accent); border-radius: 10px;
  box-shadow: 0 8px 22px rgba(60, 35, 20, 0.18); user-select: text; -webkit-user-select: text;
}
.mw-tl2-pop[hidden] { display: none; }
.mw-tl2-x { position: absolute; top: 0.4rem; right: 0.5rem; border: 0; background: none; color: var(--tl-muted) !important; }
.mw-tl2-pitem + .mw-tl2-pitem { margin-top: 0.7rem; padding-top: 0.7rem; border-top: 1px solid var(--tl-line); }
.mw-tl2-meta { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; font-size: 0.72rem; font-weight: 600; color: var(--tl-muted); padding-right: 1.2rem; }
.mw-tl2-pcat { color: var(--cat); text-transform: uppercase; letter-spacing: 0.06em; }
.mw-tl2-ptitle { margin: 0.25rem 0 0.2rem; font-size: 1rem; line-height: 1.3; color: var(--tl-head); font-family: var(--headerFont, inherit); }
.mw-tl2-pinfo { margin: 0.3rem 0; font-size: 0.85rem; }
.mw-tl2-pdetail { margin: 0.4rem 0; padding-left: 0.6rem; border-left: 2px solid var(--tl-line); font-size: 0.8rem; color: var(--tl-muted); white-space: pre-wrap; }
.mw-tl2-pprivate { margin: 0.3rem 0; font-size: 0.75rem; font-style: italic; color: var(--tl-muted); }
.mw-tl2-open { display: inline-block; margin-top: 0.4rem; padding: 0; border: 0; background: none; font-weight: 600; font-size: 0.82rem; color: var(--tl-accent) !important; }
.mw-tl2-empty { padding: 2rem 1rem; color: var(--tl-muted); }
@media (max-width: 800px) {
  .mw-tl2-hint, .mw-tl2-breakline em { display: none; }
  .mw-tl2-toolbar { padding: 0.5rem 0.6rem; }
  .mw-tl2-filters { margin-left: 0; width: 100%; }
  .mw-tl2-strip { margin: 0.4rem 0.6rem 1.4rem; }
}
`;
