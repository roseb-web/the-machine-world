// Draws the people web. Plain DOM and SVG, laid out with d3-force.
//
// - It's laid out once and then holds still. Dragging someone moves their connections with
//   them for a moment, then it settles and stops. People stay where you put them (saved).
// - Views: an overview where each group is one bubble (for lots of people), everyone,
//   one place, or one group opened out.
// - People join their groups with thin lines; personal ties are curved, styled by type.
// - Places are soft shaded areas, not lines.
// - Hover or click someone: everyone unconnected fades, and a panel shows their details.

import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, Simulation, SimulationNodeDatum } from "d3-force";
import { groupId, TIE_STYLES, TieStyle, WebData, WebGroup, WebPerson, WebTie } from "./web";

export interface WebOptions {
  onOpen?: (target: { kind: "person"; person: WebPerson } | { kind: "group"; group: WebGroup }) => void;
  hrefOf?: (open: string) => string; // wiki: turns `open` into a link
  linkClass?: string;
  wheelZoom?: "plain" | "ctrl"; // Obsidian: plain scroll zooms. Wiki: Ctrl/pinch, so the page still scrolls
  storage?: { get: (key: string) => unknown; set: (key: string, value: unknown) => void };
  styles?: Record<string, TieStyle>;
  playerToggle?: { on: boolean; set: (on: boolean) => void };
  overviewFrom?: number; // start in the overview once there are this many people (default 35)
  start?: string; // a place to start in
}

type Mode = { kind: "overview" } | { kind: "everyone" } | { kind: "area"; name: string } | { kind: "group"; id: string };

interface Node extends SimulationNodeDatum {
  id: string;
  kind: "person" | "group" | "bubble";
  r: number;
  person?: WebPerson;
  group?: WebGroup;
  members?: WebPerson[];
  area?: string;
  w?: number; // group pills: width
}
interface Link {
  source: string | Node;
  target: string | Node;
  kind: "member" | "tie" | "agg";
  tie?: WebTie;
  count?: number;
  color?: string;
}

const PALETTE = ["#4f6d8f", "#7a5c99", "#8a6d3b", "#5f7a5a", "#8f4f4f", "#4f7f86", "#86643f", "#6b5a8f", "#7d6a52", "#5a6f8f", "#94603f", "#5f6f6a"];
const PARTY = "#b8860b";
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

export function renderWeb(root: HTMLElement, data: WebData, opts: WebOptions = {}) {
  const host = root as HTMLElement & { _mwWebCleanup?: () => void };
  host._mwWebCleanup?.();
  root.innerHTML = "";
  const doc = root.ownerDocument;
  const win = doc.defaultView ?? window;
  injectStyle(doc);
  const SVG = "http://www.w3.org/2000/svg";
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
    const n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };
  const sv = (tag: string, attrs: Record<string, string | number> = {}, parent?: Element) => {
    const n = doc.createElementNS(SVG, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
    parent?.appendChild(n);
    return n;
  };
  const styles = { ...TIE_STYLES, ...(opts.styles ?? {}) };
  const styleOf = (t: string) => styles[t] ?? styles.knows;

  // ---- Data ----
  const people = data.people;
  const byId = new Map(people.map((p) => [p.id, p]));
  const groups = new Map(data.groups.map((g) => [g.id, g]));
  const colorOf = (g: WebGroup) => (g.party ? PARTY : PALETTE[hash(g.id) % PALETTE.length]);
  const membersOf = (gid: string) => people.filter((p) => p.groups.includes(gid));
  const degree = new Map<string, number>();
  for (const t of data.ties) for (const id of [t.a, t.b]) degree.set(id, (degree.get(id) ?? 0) + 1);
  for (const p of people) degree.set(p.id, (degree.get(p.id) ?? 0) + p.groups.length);
  const areas = [...new Set(people.map((p) => p.area).filter((a): a is string => !!a))].sort((a, b) => a.localeCompare(b));
  const store = (k: string, v?: unknown) => {
    try {
      if (v === undefined) return opts.storage?.get(k);
      opts.storage?.set(k, v);
    } catch {
      /* storage is optional */
    }
    return undefined;
  };
  const forces = { spacing: 1, pull: 1, spread: 1, ...((store("forces") as object) ?? {}) };

  let mode: Mode = opts.start && areas.includes(opts.start)
    ? { kind: "area", name: opts.start }
    : people.length >= (opts.overviewFrom ?? 35)
      ? { kind: "overview" }
      : { kind: "everyone" };
  let showGroups = true;
  let showTies = true;
  let selected: string | null = null;

  // ---- Frame ----
  const wrap = el("div", "mw-web");
  const bar = el("div", "mw-web-bar");
  const place = el("select", "mw-web-place");
  place.setAttribute("aria-label", "Show");
  const chip = (text: string, on: boolean, toggle: (on: boolean) => void) => {
    const b = el("button", `mw-web-chip${on ? " mw-on" : ""}`, text);
    b.type = "button";
    b.setAttribute("aria-pressed", String(on));
    b.addEventListener("click", () => {
      const now = !b.classList.contains("mw-on");
      b.classList.toggle("mw-on", now);
      b.setAttribute("aria-pressed", String(now));
      toggle(now);
    });
    return b;
  };
  const search = el("input", "mw-web-search") as HTMLInputElement;
  search.type = "search";
  search.placeholder = "Find someone…";
  const list = el("datalist");
  list.id = `mw-web-names-${Math.random().toString(36).slice(2)}`;
  for (const p of [...people].sort((a, b) => a.name.localeCompare(b.name))) list.appendChild(Object.assign(el("option"), { value: p.name }));
  search.setAttribute("list", list.id);
  const gear = el("button", "mw-web-chip mw-web-gear", "⚙");
  gear.type = "button";
  gear.title = "Layout settings";
  bar.append(place, chip("Groups", true, (on) => ((showGroups = on), build())), chip("Personal ties", true, (on) => ((showTies = on), build())));
  if (opts.playerToggle) bar.appendChild(chip("Show the party", opts.playerToggle.on, (on) => opts.playerToggle!.set(on)));
  bar.append(search, list, gear);

  const settings = el("div", "mw-web-settings");
  settings.hidden = true;
  const slider = (label: string, key: "spacing" | "pull" | "spread") => {
    const row = el("label", "mw-web-slider");
    row.append(el("span", "", label));
    const r = el("input") as HTMLInputElement;
    r.type = "range";
    r.min = "0.4";
    r.max = "2";
    r.step = "0.05";
    r.value = String(forces[key]);
    r.addEventListener("input", () => {
      forces[key] = Number(r.value);
      store("forces", forces);
      relayout();
    });
    row.append(r);
    return row;
  };
  const reset = el("button", "mw-web-chip", "Reset layout");
  reset.type = "button";
  reset.addEventListener("click", () => {
    store(`pos:${modeKey()}`, null);
    build(true);
  });
  settings.append(slider("Spacing", "spacing"), slider("Pull together", "pull"), slider("Spread out", "spread"), reset);
  gear.addEventListener("click", () => (settings.hidden = !settings.hidden));

  const body = el("div", "mw-web-body");
  const stage = el("div", "mw-web-stage");
  const svg = sv("svg", { class: "mw-web-svg" }) as SVGSVGElement;
  stage.appendChild(svg);
  const legend = el("div", "mw-web-legend");
  stage.append(settings, legend);
  const panel = el("aside", "mw-web-panel");
  body.append(stage, panel);
  wrap.append(bar, body);
  root.appendChild(wrap);

  const defs = sv("defs", {}, svg);
  const clip = sv("clipPath", { id: "mw-web-clip", clipPathUnits: "objectBoundingBox" }, defs);
  sv("circle", { cx: 0.5, cy: 0.5, r: 0.5 }, clip);
  const view = sv("g", { class: "mw-web-view" }, svg);
  const gAreas = sv("g", {}, view);
  const gLinks = sv("g", {}, view);
  const gNodes = sv("g", {}, view);

  // ---- Choosing what to show ----
  const modeKey = () => (mode.kind === "area" ? `area:${mode.name}` : mode.kind === "group" ? `group:${mode.id}` : mode.kind);
  function fillPlace() {
    place.innerHTML = "";
    const add = (value: string, text: string) => place.appendChild(Object.assign(el("option"), { value, textContent: text }));
    if (people.length > 12) add("overview", "Overview: groups");
    add("everyone", "Everyone");
    for (const a of areas) add(`area:${a}`, a);
    if (mode.kind === "group") add(`group:${mode.id}`, `Group: ${groups.get(mode.id)?.name ?? mode.id}`);
    place.value = modeKey();
  }
  place.addEventListener("change", () => {
    const v = place.value;
    mode = v === "overview" ? { kind: "overview" } : v === "everyone" ? { kind: "everyone" } : v.startsWith("area:") ? { kind: "area", name: v.slice(5) } : { kind: "group", id: v.slice(6) };
    selected = null;
    build(true);
  });
  search.addEventListener("change", () => {
    const p = people.find((x) => x.name.toLowerCase() === search.value.trim().toLowerCase());
    if (!p) return;
    if (!nodes.some((n) => n.person?.id === p.id)) {
      mode = p.area ? { kind: "area", name: p.area } : { kind: "everyone" };
      build(true);
    }
    select(p.id, true);
    search.value = "";
  });

  // ---- The scene ----
  let nodes: Node[] = [];
  let links: Link[] = [];
  let sim: Simulation<Node, undefined> | null = null;
  const nodeEls = new Map<string, SVGGElement>();
  const linkEls: { link: Link; el: SVGElement; label?: SVGElement; arrow?: SVGElement }[] = [];
  let areaEls: { name: string; path: SVGPathElement; label: SVGTextElement }[] = [];

  const personNode = (p: WebPerson): Node => ({ id: "p:" + p.id, kind: "person", person: p, r: 20 + Math.min(9, (degree.get(p.id) ?? 0) * 1.2), area: p.area });
  const groupNode = (g: WebGroup): Node => {
    const w = Math.max(70, g.name.length * 7.2 + 26);
    return { id: "g:" + g.id, kind: "group", group: g, r: w / 2, w };
  };

  function scene() {
    const N: Node[] = [];
    const L: Link[] = [];
    const add = (n: Node) => (N.some((x) => x.id === n.id) ? N.find((x) => x.id === n.id)! : (N.push(n), n));
    if (mode.kind === "overview") {
      // Each group is one bubble. A person counts in their first group; people with no group stand alone.
      const home = new Map<string, string>();
      for (const p of people) {
        const g = p.groups.find((x) => groups.has(x));
        if (g) home.set(p.id, "b:" + g);
        else {
          add(personNode(p));
          home.set(p.id, "p:" + p.id);
        }
      }
      for (const g of groups.values()) {
        const ms = membersOf(g.id);
        if (!ms.length) continue;
        const counts = new Map<string, number>();
        for (const m of ms) if (m.area) counts.set(m.area, (counts.get(m.area) ?? 0) + 1);
        const area = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
        add({ id: "b:" + g.id, kind: "bubble", group: g, members: ms, r: Math.max(32 + Math.min(40, ms.length * 2.6), g.name.length * 3.4 + 8), area });
      }
      if (showTies) {
        const agg = new Map<string, number>();
        for (const t of data.ties) {
          const a = home.get(t.a);
          const b = home.get(t.b);
          if (!a || !b || a === b) continue;
          const k = [a, b].sort().join("|");
          agg.set(k, (agg.get(k) ?? 0) + 1);
        }
        for (const [k, count] of agg) {
          const [a, b] = k.split("|");
          L.push({ source: a, target: b, kind: "agg", count });
        }
      }
    } else {
      const shown =
        mode.kind === "everyone"
          ? people
          : mode.kind === "area"
            ? people.filter((p) => p.area === (mode as { name: string }).name)
            : membersOf(mode.id);
      for (const p of shown) add(personNode(p));
      const ids = new Set(shown.map((p) => p.id));
      if (showGroups || mode.kind === "group")
        for (const p of shown)
          for (const gid of p.groups) {
            const g = groups.get(gid);
            if (!g) continue;
            if (!showGroups && !(mode.kind === "group" && gid === mode.id)) continue;
            add(groupNode(g));
            L.push({ source: "p:" + p.id, target: "g:" + gid, kind: "member", color: colorOf(g) });
          }
      if (showTies) for (const t of data.ties) if (ids.has(t.a) && ids.has(t.b)) L.push({ source: "p:" + t.a, target: "p:" + t.b, kind: "tie", tie: t });
    }
    return { N, L };
  }

  // ---- Layout ----
  function layout(fresh: boolean) {
    const saved = fresh && false ? null : (store(`pos:${modeKey()}`) as Record<string, [number, number]> | null);
    // Places sit around a circle, so each one's people gather together
    const sceneAreas = [...new Set(nodes.map((n) => n.area).filter((a): a is string => !!a))];
    // Bigger places get more room; the ring only grows as fast as it needs to
    const R = sceneAreas.length > 1 ? 90 + Math.sqrt(nodes.length) * 38 : 0;
    const centre = new Map(sceneAreas.map((a, i) => [a, [Math.cos((i / sceneAreas.length) * Math.PI * 2) * R, Math.sin((i / sceneAreas.length) * Math.PI * 2) * R]]));
    let seed = 1;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5) * 200;
    for (const n of nodes) {
      const s = saved?.[n.id];
      if (s) {
        n.x = s[0];
        n.y = s[1];
        n.fx = s[0];
        n.fy = s[1];
      } else {
        const c = (n.area && centre.get(n.area)) || [0, 0];
        n.x = c[0] + rnd();
        n.y = c[1] + rnd();
      }
    }
    sim?.stop();
    sim = forceSimulation<Node>(nodes)
      .force(
        "link",
        forceLink<Node, Link>(links as never)
          .id((d) => d.id)
          .distance((l) => {
            const base = l.kind === "member" ? 85 : l.kind === "agg" ? 220 : 140;
            const k = l.tie?.strength === "close" ? 0.7 : l.tie?.strength === "loose" ? 1.4 : 1;
            return (base * k + ((l.source as Node).r ?? 0) * 0.3 + ((l.target as Node).r ?? 0) * 0.3) * forces.spacing;
          })
          .strength((l) => (l.kind === "member" ? 0.45 : l.kind === "agg" ? 0.08 : l.tie?.strength === "close" ? 0.45 : l.tie?.strength === "loose" ? 0.08 : 0.18) * forces.pull),
      )
      .force("charge", forceManyBody<Node>().strength((d) => (d.kind === "bubble" ? -700 : d.kind === "group" ? -600 : -380) * forces.spread))
      .force("collide", forceCollide<Node>((d) => (d.kind === "group" ? d.r * 0.75 : d.r) + 18))
      .force("x", forceX<Node>((d) => (d.area && centre.get(d.area)?.[0]) || 0).strength((d) => (d.area && R ? 0.22 : 0.06)))
      .force("y", forceY<Node>((d) => (d.area && centre.get(d.area)?.[1]) || 0).strength((d) => (d.area && R ? 0.22 : 0.07)))
      .stop();
    // Settle it all now, without animating
    if (!saved || nodes.some((n) => !saved[n.id])) for (let i = 0; i < 400; i++) sim.tick();
    for (const n of nodes) {
      n.fx = null;
      n.fy = null;
    }
    sim.on("tick", place2);
  }

  function relayout() {
    for (const n of nodes) {
      n.fx = null;
      n.fy = null;
    }
    store(`pos:${modeKey()}`, null);
    layout(true);
    place2();
    fit();
  }

  // ---- Drawing ----
  function build(fresh = false) {
    fillPlace();
    const { N, L } = scene();
    nodes = N;
    links = L;
    gAreas.innerHTML = "";
    gLinks.innerHTML = "";
    gNodes.innerHTML = "";
    nodeEls.clear();
    linkEls.length = 0;
    layout(fresh);
    drawLinks();
    drawNodes();
    areaEls = [];
    {
      const names = [...new Set(nodes.map((n) => n.area).filter((a): a is string => !!a))];
      for (const name of names) {
        const path = sv("path", { class: "mw-web-area" }, gAreas) as SVGPathElement;
        const label = sv("text", { class: "mw-web-area-label", "text-anchor": "middle" }, gAreas) as SVGTextElement;
        label.textContent = name;
        label.addEventListener("click", () => {
          mode = { kind: "area", name };
          selected = null;
          build(true);
        });
        areaEls.push({ name, path, label });
      }
    }
    drawLegend();
    place2();
    fit();
    if (selected && nodes.some((n) => n.person?.id === selected)) select(selected);
    else {
      selected = null;
      light(null);
      showIntro();
    }
  }

  function drawLinks() {
    for (const l of links) {
      if (l.kind === "member") {
        const e = sv("line", { class: "mw-web-member", stroke: l.color ?? "#999" }, gLinks);
        linkEls.push({ link: l, el: e });
      } else if (l.kind === "agg") {
        const e = sv("line", { class: "mw-web-agg", "stroke-width": 1 + Math.min(8, l.count! * 1.2) }, gLinks);
        const label = sv("text", { class: "mw-web-agg-label", "text-anchor": "middle" }, gLinks);
        label.textContent = `${l.count} ${l.count === 1 ? "tie" : "ties"}`;
        linkEls.push({ link: l, el: e, label });
      } else {
        const st = styleOf(l.tie!.type);
        const grp = sv("g", { class: `mw-web-tie${l.tie!.type === "knows" ? " mw-web-knows" : ""}` }, gLinks);
        const w = (st.width ?? 1.6) * (l.tie!.strength === "close" ? 1.5 : l.tie!.strength === "loose" ? 0.7 : 1);
        sv("path", { fill: "none", stroke: st.color, "stroke-width": st.double ? w * 2.6 : w, "stroke-dasharray": st.dash ?? "", "stroke-linecap": "round" }, grp);
        if (st.double) sv("path", { fill: "none", class: "mw-web-gap", "stroke-width": w * 0.9 }, grp);
        let arrow: SVGElement | undefined;
        if (st.arrow) arrow = sv("path", { d: "M-6 -4.5 L5 0 L-6 4.5 Z", fill: st.color }, grp);
        let label: SVGElement | undefined;
        if (l.tie!.type !== "knows") {
          label = sv("text", { class: "mw-web-tie-label", fill: st.color, "text-anchor": "middle" }, grp);
          label.textContent = l.tie!.type;
        }
        linkEls.push({ link: l, el: grp, label, arrow });
      }
    }
  }

  function drawNodes() {
    for (const n of nodes) {
      const g = sv("g", { class: `mw-web-node mw-web-${n.kind}`, tabindex: 0 }, gNodes) as SVGGElement;
      g.dataset.id = n.id;
      if (n.kind === "person") {
        const p = n.person!;
        if (p.pc) g.classList.add("mw-web-pc");
        sv("circle", { r: n.r + 1, class: "mw-web-disc" }, g);
        if (p.photo)
          sv("image", { href: p.photo, x: -n.r, y: -n.r, width: n.r * 2, height: n.r * 2, preserveAspectRatio: "xMidYMin slice", "clip-path": "url(#mw-web-clip)" }, g);
        else {
          const t = sv("text", { class: "mw-web-initial", "text-anchor": "middle", dy: "0.35em" }, g);
          t.textContent = p.name.replace(/^the\s+/i, "").charAt(0).toUpperCase();
        }
        sv("circle", { r: n.r + 1, class: "mw-web-ring" }, g);
        if (p.pc) sv("circle", { r: n.r + 5, class: "mw-web-ring2" }, g);
        const t = sv("text", { class: "mw-web-name", "text-anchor": "middle", y: n.r + 16 }, g);
        t.textContent = p.name;
      } else if (n.kind === "group") {
        const c = colorOf(n.group!);
        sv("rect", { x: -n.w! / 2, y: -14, width: n.w!, height: 28, rx: 14, class: "mw-web-pill", stroke: c }, g);
        const t = sv("text", { class: "mw-web-pill-text", "text-anchor": "middle", dy: "0.35em", fill: c }, g);
        t.textContent = n.group!.name;
      } else {
        const c = colorOf(n.group!);
        sv("circle", { r: n.r, class: "mw-web-bubble-disc", stroke: c }, g);
        const pics = n.members!.filter((m) => m.photo).slice(0, 3);
        pics.forEach((m, i) => {
          const x = (i - (pics.length - 1) / 2) * 24;
          sv("circle", { cx: x, cy: -12, r: 14, class: "mw-web-disc" }, g);
          sv("image", { href: m.photo!, x: x - 13, y: -25, width: 26, height: 26, preserveAspectRatio: "xMidYMin slice", "clip-path": "url(#mw-web-clip)" }, g);
        });
        const t = sv("text", { class: "mw-web-bubble-name", "text-anchor": "middle", y: pics.length ? 17 : 0, fill: c }, g);
        t.textContent = n.group!.name;
        const t2 = sv("text", { class: "mw-web-bubble-count", "text-anchor": "middle", y: pics.length ? 32 : 15 }, g);
        t2.textContent = `${n.members!.length} ${n.members!.length === 1 ? "person" : "people"}`;
      }
      nodeEls.set(n.id, g);
      g.addEventListener("pointerenter", () => hover(n.id));
      g.addEventListener("pointerleave", () => hover(null));
      g.addEventListener("click", (ev) => {
        if (dragMoved) return;
        ev.stopPropagation();
        if (n.kind === "bubble") {
          mode = { kind: "group", id: n.group!.id };
          selected = null;
          build(true);
        } else if (n.kind === "group") selectGroup(n.group!.id);
        else select(n.person!.id);
      });
      g.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter") (g as unknown as HTMLElement).dispatchEvent(new MouseEvent("click"));
      });
      g.addEventListener("pointerdown", (ev) => startDrag(ev, n));
    }
  }

  function drawLegend() {
    legend.innerHTML = "";
    const used = new Set(links.filter((l) => l.kind === "tie").map((l) => l.tie!.type));
    for (const t of Object.keys(styles)) {
      if (!used.has(t)) continue;
      const st = styleOf(t);
      const item = el("span", "mw-web-key");
      const s = sv("svg", { width: 26, height: 10 });
      sv("line", { x1: 1, y1: 5, x2: 25, y2: 5, stroke: st.color, "stroke-width": Math.min(3, st.width ?? 1.6), "stroke-dasharray": st.dash ?? "" }, s);
      item.append(s, doc.createTextNode(t));
      legend.appendChild(item);
    }
    legend.hidden = !legend.childNodes.length;
  }

  // Positions on screen, every tick
  function place2() {
    for (const n of nodes) nodeEls.get(n.id)?.setAttribute("transform", `translate(${n.x!.toFixed(1)},${n.y!.toFixed(1)})`);
    for (const { link, el: e, label, arrow } of linkEls) {
      const a = link.source as Node;
      const b = link.target as Node;
      if (link.kind !== "tie") {
        e.setAttribute("x1", String(a.x));
        e.setAttribute("y1", String(a.y));
        e.setAttribute("x2", String(b.x));
        e.setAttribute("y2", String(b.y));
        if (label) {
          label.setAttribute("x", String((a.x! + b.x!) / 2));
          label.setAttribute("y", String((a.y! + b.y!) / 2 + 4));
        }
        continue;
      }
      // Ties curve a little, so two people with several ties don't hide each other's lines
      const mx = (a.x! + b.x!) / 2;
      const my = (a.y! + b.y!) / 2;
      const dx = b.x! - a.x!;
      const dy = b.y! - a.y!;
      const cx = mx - dy * 0.15;
      const cy = my + dx * 0.15;
      const d = `M${a.x} ${a.y} Q${cx} ${cy} ${b.x} ${b.y}`;
      for (const p of Array.from(e.querySelectorAll("path:not([d^='M-6'])"))) p.setAttribute("d", d);
      const tx = (mx + cx) / 2;
      const ty = (my + cy) / 2;
      if (arrow) arrow.setAttribute("transform", `translate(${tx},${ty}) rotate(${(Math.atan2(dy, dx) * 180) / Math.PI})`);
      if (label) {
        label.setAttribute("x", String(tx));
        label.setAttribute("y", String(ty - 7));
      }
    }
    // Place areas: a soft outline around everyone there
    for (const a of areaEls) {
      const ns = nodes.filter((n) => n.area === a.name && n.kind !== "group");
      if (!ns.length) continue;
      const pts: [number, number][] = [];
      for (const n of ns) for (let i = 0; i < 12; i++) pts.push([n.x! + Math.cos((i * Math.PI) / 6) * (n.r + 34), n.y! + Math.sin((i * Math.PI) / 6) * (n.r + 34)]);
      const h = hull(pts);
      a.path.setAttribute("d", "M" + h.map((p) => p.map((v) => v.toFixed(1)).join(" ")).join(" L") + " Z");
      const top = h.reduce((p, q) => (q[1] < p[1] ? q : p));
      a.label.setAttribute("x", String(ns.reduce((s, n) => s + n.x!, 0) / ns.length));
      a.label.setAttribute("y", String(top[1] - 8));
    }
  }

  // ---- Focus ----
  const neighbours = (id: string) => {
    const out = new Set([id]);
    for (const l of links) {
      const a = (l.source as Node).id;
      const b = (l.target as Node).id;
      if (a === id) out.add(b);
      if (b === id) out.add(a);
    }
    return out;
  };
  function light(id: string | null) {
    const near = id ? neighbours(id) : null;
    svg.classList.toggle("mw-web-focus", !!near);
    for (const [nid, g] of nodeEls) g.classList.toggle("mw-on", !!near?.has(nid));
    for (const { link, el: e } of linkEls) e.classList.toggle("mw-on", !!id && ((link.source as Node).id === id || (link.target as Node).id === id));
  }
  function hover(id: string | null) {
    light(id ?? (selected ? (nodes.find((n) => n.person?.id === selected)?.id ?? null) : null));
  }

  function select(personId: string, centre = false) {
    selected = personId;
    const n = nodes.find((x) => x.person?.id === personId);
    light(n?.id ?? null);
    if (n && centre) centreOn(n);
    const p = byId.get(personId)!;
    panel.innerHTML = "";
    panel.classList.add("mw-open");
    const close = el("button", "mw-web-x", "✕");
    close.type = "button";
    close.setAttribute("aria-label", "Close");
    close.addEventListener("click", () => {
      selected = null;
      light(null);
      showIntro();
    });
    panel.appendChild(close);
    if (p.photo) panel.appendChild(Object.assign(el("img", "mw-web-photo"), { src: p.photo, alt: "" }));
    panel.appendChild(el("h3", p.pc ? "mw-web-pc-name" : "", p.name));
    if (p.title) panel.appendChild(el("p", "mw-web-sub", p.title));
    const section = (title: string) => {
      panel.appendChild(el("h4", "", title));
      const ul = el("ul");
      panel.appendChild(ul);
      return ul;
    };
    const gs = p.groups.map((g) => groups.get(g)).filter((g): g is WebGroup => !!g);
    if (gs.length) {
      const ul = section("Groups");
      for (const g of gs) {
        const li = el("li");
        const b = el("button", "mw-web-link", g.name);
        b.type = "button";
        b.style.color = colorOf(g);
        b.addEventListener("click", () => {
          mode = { kind: "group", id: g.id };
          build(true);
        });
        li.appendChild(b);
        ul.appendChild(li);
      }
    }
    const ties = data.ties.filter((t) => t.a === p.id || t.b === p.id);
    if (ties.length) {
      const ul = section("Ties");
      for (const t of ties.sort((x, y) => (x.type === "knows" ? 1 : 0) - (y.type === "knows" ? 1 : 0))) {
        const other = byId.get(t.a === p.id ? t.b : t.a)!;
        const li = el("li");
        const b = el("button", "mw-web-link", other.name);
        b.type = "button";
        b.addEventListener("click", () => {
          if (!nodes.some((x) => x.person?.id === other.id)) {
            mode = other.area ? { kind: "area", name: other.area } : { kind: "everyone" };
            build(true);
          }
          select(other.id, true);
        });
        li.appendChild(b);
        const st = styleOf(t.type);
        // "works for" and "owes" point one way: say which
        const dir = st.arrow ? (t.a === p.id ? "" : " (them)") : "";
        const tag = el("span", "mw-web-tag", t.type + (t.strength === "close" ? ", close" : t.strength === "loose" ? ", loose" : "") + dir);
        tag.style.color = st.color;
        tag.style.borderColor = st.color;
        li.appendChild(tag);
        ul.appendChild(li);
      }
    }
    if (p.area) {
      const ul = section("Place");
      const li = el("li");
      const b = el("button", "mw-web-link mw-web-area-link", p.area);
      b.type = "button";
      b.addEventListener("click", () => {
        mode = { kind: "area", name: p.area! };
        build(true);
      });
      li.appendChild(b);
      ul.appendChild(li);
    }
    openLink(p.open, () => opts.onOpen?.({ kind: "person", person: p }), "Open note →");
  }

  function selectGroup(gid: string) {
    const g = groups.get(gid)!;
    selected = null;
    light("g:" + gid);
    panel.innerHTML = "";
    panel.classList.add("mw-open");
    const close = el("button", "mw-web-x", "✕");
    close.type = "button";
    close.addEventListener("click", () => {
      light(null);
      showIntro();
    });
    panel.appendChild(close);
    const h = el("h3", "", g.name);
    h.style.color = colorOf(g);
    panel.appendChild(h);
    const ms = membersOf(gid);
    panel.appendChild(el("p", "mw-web-sub", `${ms.length} ${ms.length === 1 ? "person" : "people"}`));
    const ul = el("ul");
    for (const m of ms.sort((a, b) => a.name.localeCompare(b.name))) {
      const li = el("li");
      const b = el("button", "mw-web-link", m.name);
      b.type = "button";
      b.addEventListener("click", () => select(m.id, true));
      li.appendChild(b);
      ul.appendChild(li);
    }
    panel.appendChild(ul);
    if (mode.kind !== "group" || mode.id !== gid) {
      const b = el("button", "mw-web-open", "Open out this group →");
      b.type = "button";
      b.addEventListener("click", () => {
        mode = { kind: "group", id: gid };
        build(true);
      });
      panel.appendChild(b);
    }
    openLink(g.open, () => opts.onOpen?.({ kind: "group", group: g }), "Open note →");
  }

  function openLink(open: string | undefined, click: () => void, text: string) {
    if (!open) return;
    if (opts.hrefOf) {
      const a = el("a", `mw-web-open ${opts.linkClass ?? ""}`, text.replace("note", "page"));
      a.href = opts.hrefOf(open);
      panel.appendChild(a);
    } else if (opts.onOpen) {
      const b = el("button", "mw-web-open", text);
      b.type = "button";
      b.addEventListener("click", click);
      panel.appendChild(b);
    }
  }

  function showIntro() {
    panel.classList.remove("mw-open");
    panel.innerHTML = "";
    panel.appendChild(
      el(
        "p",
        "mw-web-hint",
        mode.kind === "overview"
          ? "Each bubble is a group. Click one to open it out, or pick a place above."
          : "Click someone to see their groups and ties. Drag people to move them: they stay where you put them.",
      ),
    );
  }

  // ---- Moving around: pan, zoom, drag people ----
  let k = 1;
  let tx = 0;
  let ty = 0;
  const apply = () => {
    view.setAttribute("transform", `translate(${tx},${ty}) scale(${k})`);
    svg.classList.toggle("mw-web-far", k < 0.55);
  };
  function fit() {
    if (!nodes.length) return;
    const W = stage.clientWidth || 800;
    const H = stage.clientHeight || 600;
    const xs = nodes.flatMap((n) => [n.x! - n.r - 40, n.x! + n.r + 40]);
    const ys = nodes.flatMap((n) => [n.y! - n.r - 50, n.y! + n.r + 50]);
    const w = Math.max(...xs) - Math.min(...xs);
    const h = Math.max(...ys) - Math.min(...ys);
    k = Math.min(1.4, Math.max(0.2, Math.min(W / w, H / h)));
    tx = W / 2 - ((Math.max(...xs) + Math.min(...xs)) / 2) * k;
    ty = H / 2 - ((Math.max(...ys) + Math.min(...ys)) / 2) * k;
    apply();
  }
  function centreOn(n: Node) {
    const W = stage.clientWidth || 800;
    const H = stage.clientHeight || 600;
    k = Math.max(k, 0.9);
    tx = W / 2 - n.x! * k;
    ty = H / 2 - n.y! * k;
    apply();
  }
  const zoomAt = (f: number, cx: number, cy: number) => {
    const nk = Math.min(3, Math.max(0.15, k * f));
    tx = cx - ((cx - tx) * nk) / k;
    ty = cy - ((cy - ty) * nk) / k;
    k = nk;
    apply();
  };
  stage.addEventListener(
    "wheel",
    (ev) => {
      if (opts.wheelZoom !== "plain" && !ev.ctrlKey && !ev.metaKey) return;
      ev.preventDefault();
      const r = stage.getBoundingClientRect();
      zoomAt(Math.exp(-ev.deltaY * 0.0015), ev.clientX - r.left, ev.clientY - r.top);
    },
    { passive: false },
  );

  let dragMoved = false;
  let drag: { n: Node; x: number; y: number } | null = null;
  let pan: { x: number; y: number; tx: number; ty: number } | null = null;
  const pts = new Map<number, { x: number; y: number }>();
  let pinch: { d: number; k: number } | null = null;
  function startDrag(ev: PointerEvent, n: Node) {
    if (ev.button !== 0) return;
    ev.stopPropagation();
    drag = { n, x: ev.clientX, y: ev.clientY };
    dragMoved = false;
  }
  stage.addEventListener("pointerdown", (ev) => {
    pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), k };
      drag = null;
      pan = null;
      return;
    }
    if (!drag && ev.button === 0) pan = { x: ev.clientX, y: ev.clientY, tx, ty };
    dragMoved = false;
  });
  stage.addEventListener("pointermove", (ev) => {
    if (pts.has(ev.pointerId)) pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (pinch && pts.size === 2) {
      const [a, b] = [...pts.values()];
      const r = stage.getBoundingClientRect();
      const f = (pinch.k * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.d / k;
      zoomAt(f, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
      return;
    }
    if (drag) {
      const dx = ev.clientX - drag.x;
      const dy = ev.clientY - drag.y;
      if (!dragMoved && Math.hypot(dx, dy) < 4) return;
      if (!dragMoved) {
        dragMoved = true;
        stage.setPointerCapture(ev.pointerId);
        sim?.alphaTarget(0.25).restart();
      }
      drag.n.fx = drag.n.x! + dx / k;
      drag.n.fy = drag.n.y! + dy / k;
      drag.x = ev.clientX;
      drag.y = ev.clientY;
      drag.n.x = drag.n.fx;
      drag.n.y = drag.n.fy;
    } else if (pan) {
      const dx = ev.clientX - pan.x;
      const dy = ev.clientY - pan.y;
      if (!dragMoved && Math.hypot(dx, dy) < 4) return;
      dragMoved = true;
      stage.classList.add("mw-panning");
      tx = pan.tx + dx;
      ty = pan.ty + dy;
      apply();
    }
  });
  const end = (ev: PointerEvent) => {
    pts.delete(ev.pointerId);
    if (pts.size < 2) pinch = null;
    if (drag && dragMoved) {
      // Let it settle, then stop, keeping the dragged person where they were put
      sim?.alphaTarget(0);
      const n = drag.n;
      win.setTimeout(() => {
        sim?.stop();
        const all: Record<string, [number, number]> = {};
        for (const x of nodes) all[x.id] = [Math.round(x.x!), Math.round(x.y!)];
        store(`pos:${modeKey()}`, all);
        n.fx = null;
        n.fy = null;
      }, 900);
    }
    if (!drag && !dragMoved && ev.target === svg) {
      selected = null;
      light(null);
      showIntro();
    }
    drag = null;
    pan = null;
    stage.classList.remove("mw-panning");
    win.setTimeout(() => (dragMoved = false), 0);
  };
  stage.addEventListener("pointerup", end);
  stage.addEventListener("pointercancel", end);

  const ro = new (win as typeof window).ResizeObserver(() => {
    if (!dragMoved) fit();
  });
  ro.observe(stage);
  host._mwWebCleanup = () => {
    ro.disconnect();
    sim?.stop();
  };

  build();
}

function hull(pts: [number, number][]): [number, number][] {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo: [number, number][] = [];
  const up: [number, number][] = [];
  for (const q of p) {
    while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop();
    lo.push(q);
  }
  for (const q of p.reverse()) {
    while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop();
    up.push(q);
  }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}

function injectStyle(doc: Document) {
  if (doc.getElementById("mw-web-style")) return;
  const s = doc.createElement("style");
  s.id = "mw-web-style";
  s.textContent = WEB_CSS;
  doc.head.appendChild(s);
}

export const WEB_CSS = `
.mw-web {
  --w-text: var(--darkgray, var(--text-normal, #2b2724));
  --w-muted: var(--gray, var(--text-muted, #a39a90));
  --w-line: var(--lightgray, var(--background-modifier-border, #e2d9cc));
  --w-accent: var(--secondary, var(--interactive-accent, #a46b0a));
  --w-bg: var(--light, var(--background-primary, #fbf8f3));
  --w-head: var(--dark, var(--text-normal, #5a2e1e));
  display: flex; flex-direction: column; height: 100%; min-height: 520px; color: var(--w-text);
  border: 1px solid var(--w-line); border-radius: 10px; overflow: hidden; background: var(--w-bg);
  user-select: none; -webkit-user-select: none;
}
.mw-web button { font: inherit; cursor: pointer; box-shadow: none; height: auto; }
.mw-web-bar { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; padding: 0.55rem 0.8rem; border-bottom: 1px solid var(--w-line); font-size: 0.85rem; }
.mw-web-place, .mw-web-search { font: inherit; color: var(--w-text); background: var(--w-bg); border: 1px solid var(--w-line); border-radius: 6px; padding: 0.25rem 0.5rem; }
.mw-web-search { margin-left: auto; width: 12rem; }
.mw-web-chip { padding: 0.15rem 0.7rem !important; border: 1px solid var(--w-line) !important; border-radius: 999px !important; background: var(--w-bg) !important; color: var(--w-muted) !important; }
.mw-web-chip.mw-on { border-color: var(--w-accent) !important; color: var(--w-accent) !important; }
.mw-web-gear { padding: 0.15rem 0.55rem !important; }
.mw-web-body { position: relative; display: flex; flex: 1; min-height: 0; }
.mw-web-stage { position: relative; flex: 1; min-width: 0; cursor: grab; touch-action: none; background: color-mix(in srgb, var(--w-accent) 3%, var(--w-bg)); }
.mw-web-stage.mw-panning { cursor: grabbing; }
.mw-web-svg { display: block; width: 100%; height: 100%; }
.mw-web-area { fill: color-mix(in srgb, var(--w-accent) 9%, transparent); stroke: color-mix(in srgb, var(--w-accent) 28%, transparent); stroke-dasharray: 6 6; }
.mw-web-area-label { fill: color-mix(in srgb, var(--w-accent) 70%, var(--w-muted)); font-style: italic; font-size: 15px; cursor: pointer; }
.mw-web-member { stroke-width: 1.4; opacity: 0.45; }
.mw-web-knows { opacity: 0.5; }
.mw-web-tie.mw-on { opacity: 1; }
.mw-web-agg { stroke: var(--w-muted); opacity: 0.45; stroke-linecap: round; }
.mw-web-agg-label, .mw-web-tie-label { font-size: 11px; paint-order: stroke; stroke: var(--w-bg); stroke-width: 4px; }
.mw-web-agg-label { fill: var(--w-muted); }
.mw-web-gap { stroke: var(--w-bg); }
.mw-web-node { cursor: pointer; outline: none; }
.mw-web-disc { fill: var(--w-bg); }
.mw-web-ring { fill: none; stroke: color-mix(in srgb, var(--w-text) 25%, transparent); stroke-width: 1.5; }
.mw-web-pc .mw-web-ring { stroke: ${PARTY}; stroke-width: 2.5; }
.mw-web-ring2 { fill: none; stroke: ${PARTY}; stroke-width: 1.5; }
.mw-web-initial { font-size: 18px; fill: var(--w-muted); }
.mw-web-name { font-size: 13px; fill: var(--w-text); paint-order: stroke; stroke: var(--w-bg); stroke-width: 4px; }
.mw-web-pc .mw-web-name { fill: ${PARTY}; font-weight: 600; }
.mw-web-pill { fill: var(--w-bg); stroke-width: 2; }
.mw-web-pill-text, .mw-web-bubble-name { font-size: 12.5px; font-weight: 600; }
.mw-web-bubble-disc { fill: var(--w-bg); stroke-width: 2.2; }
.mw-web-bubble-count { font-size: 11.5px; fill: var(--w-muted); }
.mw-web-node:hover .mw-web-ring, .mw-web-node:focus-visible .mw-web-ring { stroke: var(--w-accent); stroke-width: 2.5; }
.mw-web-focus .mw-web-node:not(.mw-on) { opacity: 0.15; }
.mw-web-focus .mw-web-member:not(.mw-on), .mw-web-focus .mw-web-tie:not(.mw-on), .mw-web-focus .mw-web-agg { opacity: 0.06; }
.mw-web-focus .mw-web-member.mw-on { opacity: 0.9; }
.mw-web-far .mw-web-name, .mw-web-far .mw-web-tie-label { display: none; }
.mw-web-far .mw-web-node:hover .mw-web-name, .mw-web-far .mw-web-node.mw-on .mw-web-name { display: inline; }
.mw-web-legend { position: absolute; left: 0.6rem; bottom: 0.5rem; display: flex; flex-wrap: wrap; gap: 0.3rem 0.8rem; padding: 0.3rem 0.6rem; border-radius: 8px; background: color-mix(in srgb, var(--w-bg) 85%, transparent); font-size: 0.72rem; color: var(--w-muted); pointer-events: none; }
.mw-web-legend[hidden] { display: none; }
.mw-web-key { display: inline-flex; align-items: center; gap: 0.3rem; }
.mw-web-settings { position: absolute; top: 0.5rem; right: 0.5rem; z-index: 5; width: 14rem; padding: 0.7rem 0.8rem; border: 1px solid var(--w-line); border-radius: 10px; background: var(--w-bg); box-shadow: 0 6px 18px rgba(0,0,0,0.12); font-size: 0.8rem; }
.mw-web-settings[hidden] { display: none; }
.mw-web-slider { display: flex; flex-direction: column; margin-bottom: 0.5rem; color: var(--w-muted); }
.mw-web-slider input { width: 100%; }
.mw-web-panel { width: 0; overflow: hidden auto; border-left: 1px solid transparent; transition: width 0.2s; font-size: 0.88rem; user-select: text; -webkit-user-select: text; position: relative; }
.mw-web-panel.mw-open { width: 270px; border-left-color: var(--w-line); padding: 0.9rem; }
.mw-web-panel:not(.mw-open) { width: 210px; padding: 0.9rem; border-left-color: var(--w-line); }
.mw-web-hint { color: var(--w-muted); font-size: 0.8rem; line-height: 1.5; }
.mw-web-x { position: absolute; top: 1.2rem; right: 1.2rem; z-index: 1; width: 1.7rem; border: 0 !important; border-radius: 50% !important; background: color-mix(in srgb, var(--w-bg) 85%, transparent) !important; color: var(--w-text) !important; }
.mw-web-photo { width: 100%; height: 160px; object-fit: cover; object-position: top; border-radius: 8px; margin: 0 !important; }
.mw-web-panel h3 { margin: 0.6rem 0 0.1rem; font-size: 1.25rem; font-weight: 400; color: var(--w-head); font-family: var(--headerFont, inherit); }
.mw-web-pc-name { color: ${PARTY} !important; }
.mw-web-sub { margin: 0 0 0.5rem; color: var(--w-muted); font-size: 0.8rem; }
.mw-web-panel h4 { margin: 0.8rem 0 0.25rem; font-size: 0.68rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--w-muted); }
.mw-web-panel ul { margin: 0; padding: 0; list-style: none; }
.mw-web-panel li { display: flex; align-items: center; gap: 0.4rem; padding: 0.12rem 0; }
.mw-web-link { padding: 0 !important; border: 0 !important; background: none !important; color: var(--w-text); text-align: left; }
.mw-web-link:hover { text-decoration: underline; }
.mw-web-area-link { font-style: italic; }
.mw-web-tag { font-size: 0.68rem; padding: 0 0.45rem; border: 1px solid; border-radius: 999px; }
.mw-web-open { display: inline-block; margin-top: 0.9rem; padding: 0 !important; border: 0 !important; background: none !important; color: var(--w-accent) !important; font-weight: 600; font-size: 0.85rem; text-decoration: none; }
@media (max-width: 700px) {
  .mw-web-search { width: 100%; margin-left: 0; order: 9; }
  .mw-web-body { flex-direction: column; }
  .mw-web-panel, .mw-web-panel.mw-open, .mw-web-panel:not(.mw-open) { width: auto; max-height: 45%; border-left: 0; border-top: 1px solid var(--w-line); }
  .mw-web-panel:not(.mw-open) { display: none; }
}
`;
