// Draws the people web. Plain DOM and SVG, laid out with d3-force.
//
// Two views:
// - Groups: people joined to their groups. Line colour = the group's type. Pick groups to
//   see only those; other groups their people belong to show faintly.
// - Relationships: people joined to each other. Line style = the tie's type.
//   Shared groups pull people together too (unseen), so clusters form by themselves.
//
// It's laid out once and then holds still. Dragging someone moves their connections with
// them for a moment, then it settles and stops. People stay where you put them (saved).

import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, Simulation, SimulationNodeDatum } from "d3-force";
import { GROUP_TYPES, TIE_STYLES, TieStyle, WebData, WebGroup, WebPerson, WebTie } from "./web";

export interface WebOptions {
  onOpen?: (target: { kind: "person"; person: WebPerson } | { kind: "group"; group: WebGroup }) => void;
  hrefOf?: (open: string) => string; // wiki: turns `open` into a link
  linkClass?: string;
  wheelZoom?: "plain" | "ctrl"; // Obsidian: plain scroll zooms. Wiki: Ctrl/pinch, so the page still scrolls
  storage?: { get: (key: string) => unknown; set: (key: string, value: unknown) => void };
  styles?: Record<string, TieStyle>;
  playerToggle?: { on: boolean; set: (on: boolean) => void };
}

type View = "groups" | "relationships";

interface Node extends SimulationNodeDatum {
  id: string;
  kind: "person" | "group" | "anchor";
  r: number;
  person?: WebPerson;
  group?: WebGroup;
  w?: number; // group pills: width
  faint?: boolean; // a group shown only because someone picked is also in it
}
interface Link {
  source: string | Node;
  target: string | Node;
  kind: "member" | "tie" | "hidden";
  tie?: WebTie;
  color?: string;
  faint?: boolean;
}

const PARTY = "#b8860b";
const OTHER = "#8b7d70";
const TYPE_ORDER = ["location", "government", "religion", "collective"];

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
  const button = (cls: string, text: string, click: () => void) => {
    const b = el("button", cls, text);
    b.type = "button";
    b.addEventListener("click", click);
    return b;
  };
  const styles = { ...TIE_STYLES, ...(opts.styles ?? {}) };
  const styleOf = (t: string) => styles[t] ?? styles.knows;

  // ---- Data ----
  const people = data.people;
  const byId = new Map(people.map((p) => [p.id, p]));
  const groups = new Map(data.groups.map((g) => [g.id, g]));
  const typeOf = (g: WebGroup) => (g.party ? "the party" : g.type && GROUP_TYPES[g.type] ? g.type : "other");
  const colorOf = (g: WebGroup) => (g.party ? PARTY : GROUP_TYPES[g.type ?? ""] ?? OTHER);
  const membersOf = (gid: string) => people.filter((p) => p.groups.includes(gid));
  const degree = new Map<string, number>();
  for (const t of data.ties) for (const id of [t.a, t.b]) degree.set(id, (degree.get(id) ?? 0) + 1);
  for (const p of people) degree.set(p.id, (degree.get(p.id) ?? 0) + p.groups.length);
  const tied = new Set(data.ties.flatMap((t) => [t.a, t.b]));
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

  let view: View = store("view") === "relationships" ? "relationships" : "groups";
  const picked = new Set<string>(((store("picked") as string[]) ?? []).filter((g) => groups.has(g)));
  let selected: string | null = null;

  // ---- Frame ----
  const wrap = el("div", "mw-web");
  const bar = el("div", "mw-web-bar");
  const tabs = el("div", "mw-web-tabs");
  for (const [v, text] of [["groups", "Groups"], ["relationships", "Relationships"]] as const) {
    const b = button("mw-web-tab", text, () => setView(v));
    b.dataset.v = v;
    tabs.appendChild(b);
  }
  bar.appendChild(tabs);
  if (opts.playerToggle) {
    const b = button(`mw-web-chip${opts.playerToggle.on ? " mw-on" : ""}`, "Show the party", () => opts.playerToggle!.set(!opts.playerToggle!.on));
    b.title = "Only what the wiki shows";
    bar.appendChild(b);
  }
  const search = el("input", "mw-web-search") as HTMLInputElement;
  search.type = "search";
  search.placeholder = "Find someone…";
  const list = el("datalist");
  list.id = `mw-web-names-${Math.random().toString(36).slice(2)}`;
  for (const p of [...people].sort((a, b) => a.name.localeCompare(b.name))) list.appendChild(Object.assign(el("option"), { value: p.name }));
  search.setAttribute("list", list.id);
  const settings = el("div", "mw-web-settings");
  settings.hidden = true;
  const gear = button("mw-web-chip mw-web-gear", "⚙", () => (settings.hidden = !settings.hidden));
  gear.title = "Layout settings";
  bar.append(search, list, gear);

  const picker = el("div", "mw-web-picker");
  // On phones the group buttons fold away behind this
  const pickToggle = button("mw-web-chip mw-web-pick-toggle", "Choose groups ▾", () => wrap.classList.toggle("mw-pick-open"));
  bar.insertBefore(pickToggle, search);

  const slider = (label: string, key: "spacing" | "pull" | "spread") => {
    const row = el("label", "mw-web-slider");
    row.append(el("span", "", label));
    const r = el("input") as HTMLInputElement;
    r.type = "range";
    r.min = "0.4";
    r.max = "2";
    r.step = "0.05";
    r.value = String(forces[key]);
    r.addEventListener("change", () => {
      forces[key] = Number(r.value);
      store("forces", forces);
      store(`pos:${sceneKey()}`, null);
      build();
    });
    row.append(r);
    return row;
  };
  settings.append(
    slider("Spacing", "spacing"),
    slider("Pull together", "pull"),
    slider("Spread out", "spread"),
    button("mw-web-chip", "Reset layout", () => {
      store(`pos:${sceneKey()}`, null);
      build();
    }),
  );

  const body = el("div", "mw-web-body");
  const stage = el("div", "mw-web-stage");
  const svg = sv("svg", { class: "mw-web-svg" }) as SVGSVGElement;
  stage.appendChild(svg);
  const legend = el("div", "mw-web-legend");
  stage.append(settings, legend);
  const panel = el("aside", "mw-web-panel");
  body.append(stage, panel);
  wrap.append(bar, picker, body);
  root.appendChild(wrap);

  const defs = sv("defs", {}, svg);
  const clip = sv("clipPath", { id: "mw-web-clip", clipPathUnits: "objectBoundingBox" }, defs);
  sv("circle", { cx: 0.5, cy: 0.5, r: 0.5 }, clip);
  const viewG = sv("g", {}, svg);
  const gLinks = sv("g", {}, viewG);
  const gNodes = sv("g", {}, viewG);

  const sceneKey = () => (view === "groups" ? `groups:${[...picked].sort().join(",")}` : "relationships");
  function setView(v: View) {
    view = v;
    store("view", v);
    selected = null;
    build();
  }
  function setPicked(ids: string[]) {
    picked.clear();
    for (const id of ids) picked.add(id);
    store("picked", [...picked]);
    view = "groups";
    store("view", view);
    build();
  }

  // The group buttons, sorted by type
  function fillPicker() {
    picker.innerHTML = "";
    picker.hidden = view !== "groups";
    pickToggle.hidden = view !== "groups";
    pickToggle.textContent = picked.size ? `Groups: ${picked.size} chosen ▾` : "Choose groups ▾";
    const all = [...groups.values()].filter((g) => membersOf(g.id).length);
    const kinds = [...new Set(all.map(typeOf))].sort((a, b) => (TYPE_ORDER.indexOf(a) + 1 || 9) - (TYPE_ORDER.indexOf(b) + 1 || 9));
    picker.appendChild(button(`mw-web-gchip${picked.size ? "" : " mw-on"}`, "All groups", () => setPicked([])));
    for (const kind of kinds) {
      const row = el("span", "mw-web-gkind");
      row.appendChild(el("span", "mw-web-gkind-name", kind));
      for (const g of all.filter((x) => typeOf(x) === kind).sort((a, b) => a.name.localeCompare(b.name))) {
        const b = button(`mw-web-gchip${picked.has(g.id) ? " mw-on" : ""}`, g.name, () =>
          setPicked(picked.has(g.id) ? [...picked].filter((x) => x !== g.id) : [...picked, g.id]),
        );
        b.style.setProperty("--c", colorOf(g));
        row.appendChild(b);
      }
      picker.appendChild(row);
    }
  }

  search.addEventListener("change", () => {
    const p = people.find((x) => x.name.toLowerCase() === search.value.trim().toLowerCase());
    search.value = "";
    if (p) goTo(p.id);
  });
  // Shows someone, switching to all groups if they aren't in this view
  function goTo(id: string) {
    if (!nodes.some((n) => n.person?.id === id)) {
      picked.clear();
      store("picked", []);
      view = "groups";
      build();
    }
    select(id, true);
  }

  // ---- The scene ----
  let nodes: Node[] = [];
  let links: Link[] = [];
  let sim: Simulation<Node, undefined> | null = null;
  const nodeEls = new Map<string, SVGGElement>();
  const linkEls: { link: Link; el: SVGElement; label?: SVGElement; arrow?: SVGElement }[] = [];

  const personNode = (p: WebPerson): Node => ({ id: "p:" + p.id, kind: "person", person: p, r: 20 + Math.min(9, (degree.get(p.id) ?? 0) * 1.2) });
  const groupNode = (g: WebGroup, faint: boolean): Node => {
    const w = Math.max(70, g.name.length * 7.2 + 26);
    return { id: "g:" + g.id, kind: "group", group: g, r: w / 2, w, faint };
  };

  function scene() {
    const N = new Map<string, Node>();
    const L: Link[] = [];
    const add = (n: Node) => N.get(n.id) ?? (N.set(n.id, n), n);
    if (view === "groups") {
      const chosen = picked.size ? picked : new Set(groups.keys());
      const shown = people.filter((p) => p.groups.some((g) => chosen.has(g)));
      for (const p of shown) add(personNode(p));
      for (const p of shown)
        for (const gid of p.groups) {
          const g = groups.get(gid);
          if (!g) continue;
          const faint = !chosen.has(gid);
          add(groupNode(g, faint));
          L.push({ source: "p:" + p.id, target: "g:" + gid, kind: "member", color: colorOf(g), faint });
        }
    } else {
      for (const p of people) if (tied.has(p.id)) add(personNode(p));
      for (const t of data.ties) L.push({ source: "p:" + t.a, target: "p:" + t.b, kind: "tie", tie: t });
      // Unseen pull from shared groups, so people who belong together sit near each other
      for (const g of groups.values()) {
        const ms = membersOf(g.id).filter((m) => tied.has(m.id));
        if (ms.length < 2) continue;
        add({ id: "a:" + g.id, kind: "anchor", group: g, r: 1 });
        for (const m of ms) L.push({ source: "p:" + m.id, target: "a:" + g.id, kind: "hidden" });
      }
    }
    return { N: [...N.values()], L };
  }

  // ---- Layout ----
  function layout() {
    const saved = store(`pos:${sceneKey()}`) as Record<string, [number, number]> | null;
    let seed = 1;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5) * 400;
    for (const n of nodes) {
      const s = saved?.[n.id];
      n.x = s ? s[0] : rnd();
      n.y = s ? s[1] : rnd();
      if (s) {
        n.fx = s[0];
        n.fy = s[1];
      }
    }
    sim?.stop();
    sim = forceSimulation<Node>(nodes)
      .force(
        "link",
        forceLink<Node, Link>(links)
          .id((d) => d.id)
          .distance((l) => {
            if (l.kind === "hidden") return 40 * forces.spacing;
            const base = l.kind === "member" ? 85 : 140;
            const k = l.tie?.strength === "close" ? 0.7 : l.tie?.strength === "loose" ? 1.4 : 1;
            return (base * k + (l.source as Node).r * 0.3 + (l.target as Node).r * 0.3) * forces.spacing;
          })
          .strength((l) =>
            (l.kind === "hidden" ? 0.25 : l.kind === "member" ? (l.faint ? 0.15 : 0.45) : l.tie?.strength === "close" ? 0.45 : l.tie?.strength === "loose" ? 0.08 : 0.18) * forces.pull,
          ),
      )
      .force("charge", forceManyBody<Node>().strength((d) => (d.kind === "anchor" ? -40 : d.kind === "group" ? -600 : -380) * forces.spread))
      .force("collide", forceCollide<Node>((d) => (d.kind === "anchor" ? 0 : d.kind === "group" ? d.r * 0.75 : d.r) + 18))
      .force("x", forceX<Node>(0).strength(0.06))
      .force("y", forceY<Node>(0).strength(0.07))
      .stop();
    // Settle it all now, without animating
    if (!saved || nodes.some((n) => !saved[n.id])) for (let i = 0; i < 400; i++) sim.tick();
    for (const n of nodes) {
      n.fx = null;
      n.fy = null;
    }
    sim.on("tick", place);
  }

  // ---- Drawing ----
  function build() {
    fillPicker();
    for (const b of Array.from(tabs.children) as HTMLElement[]) b.classList.toggle("mw-on", b.dataset.v === view);
    const { N, L } = scene();
    nodes = N;
    links = L;
    gLinks.innerHTML = "";
    gNodes.innerHTML = "";
    nodeEls.clear();
    linkEls.length = 0;
    layout();
    drawLinks();
    drawNodes();
    drawLegend();
    place();
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
      if (l.kind === "hidden") continue;
      if (l.kind === "member") {
        const e = sv("line", { class: `mw-web-member${l.faint ? " mw-faint" : ""}`, stroke: l.color ?? OTHER }, gLinks);
        linkEls.push({ link: l, el: e });
        continue;
      }
      const st = styleOf(l.tie!.type);
      const grp = sv("g", { class: `mw-web-tie${l.tie!.type === "knows" ? " mw-web-knows" : ""}` }, gLinks);
      const w = (st.width ?? 1.6) * (l.tie!.strength === "close" ? 1.5 : l.tie!.strength === "loose" ? 0.7 : 1);
      sv("path", { class: "mw-web-line", fill: "none", stroke: st.color, "stroke-width": st.double ? w * 2.6 : w, "stroke-dasharray": st.dash ?? "", "stroke-linecap": "round" }, grp);
      if (st.double) sv("path", { class: "mw-web-line mw-web-gap", fill: "none", "stroke-width": w * 0.9 }, grp);
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

  function drawNodes() {
    for (const n of nodes) {
      if (n.kind === "anchor") continue;
      const g = sv("g", { class: `mw-web-node mw-web-${n.kind}${n.faint ? " mw-faint" : ""}`, tabindex: 0 }, gNodes) as SVGGElement;
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
      } else {
        const c = colorOf(n.group!);
        sv("rect", { x: -n.w! / 2, y: -14, width: n.w!, height: 28, rx: 14, class: "mw-web-pill", stroke: c }, g);
        const t = sv("text", { class: "mw-web-pill-text", "text-anchor": "middle", dy: "0.35em", fill: c }, g);
        t.textContent = n.group!.name;
      }
      nodeEls.set(n.id, g);
      g.addEventListener("pointerenter", () => hover(n.id));
      g.addEventListener("pointerleave", () => hover(null));
      g.addEventListener("click", (ev) => {
        if (dragMoved) return;
        ev.stopPropagation();
        if (n.kind === "group") selectGroup(n.group!.id);
        else select(n.person!.id);
      });
      g.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter") g.dispatchEvent(new MouseEvent("click"));
      });
      g.addEventListener("pointerdown", (ev) => startDrag(ev, n));
    }
  }

  function drawLegend() {
    legend.innerHTML = "";
    const key = (color: string, text: string, dash = "", width = 2.5) => {
      const item = el("span", "mw-web-key");
      const s = sv("svg", { width: 26, height: 10 });
      sv("line", { x1: 1, y1: 5, x2: 25, y2: 5, stroke: color, "stroke-width": width, "stroke-dasharray": dash }, s);
      item.append(s, doc.createTextNode(text));
      legend.appendChild(item);
    };
    if (view === "groups") {
      const kinds = new Set(nodes.filter((n) => n.kind === "group" && !n.faint).map((n) => typeOf(n.group!)));
      for (const t of [...TYPE_ORDER, "the party", "other"]) if (kinds.has(t)) key(t === "the party" ? PARTY : GROUP_TYPES[t] ?? OTHER, t);
    } else {
      const used = new Set(data.ties.map((t) => t.type));
      for (const t of Object.keys(styles)) if (used.has(t)) key(styleOf(t).color, t, styleOf(t).dash ?? "", Math.min(3, styleOf(t).width ?? 1.6));
    }
    legend.hidden = !legend.childNodes.length;
  }

  // Positions on screen, every tick
  function place() {
    for (const n of nodes) nodeEls.get(n.id)?.setAttribute("transform", `translate(${n.x!.toFixed(1)},${n.y!.toFixed(1)})`);
    for (const { link, el: e, label, arrow } of linkEls) {
      const a = link.source as Node;
      const b = link.target as Node;
      if (link.kind === "member") {
        e.setAttribute("x1", String(a.x));
        e.setAttribute("y1", String(a.y));
        e.setAttribute("x2", String(b.x));
        e.setAttribute("y2", String(b.y));
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
      for (const p of Array.from(e.querySelectorAll(".mw-web-line"))) p.setAttribute("d", d);
      const tx = (mx + cx) / 2;
      const ty = (my + cy) / 2;
      if (arrow) arrow.setAttribute("transform", `translate(${tx},${ty}) rotate(${(Math.atan2(dy, dx) * 180) / Math.PI})`);
      if (label) {
        label.setAttribute("x", String(tx));
        label.setAttribute("y", String(ty - 7));
      }
    }
  }

  // ---- Focus ----
  const neighbours = (id: string) => {
    const out = new Set([id]);
    for (const l of links) {
      if (l.kind === "hidden") continue;
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
  // Leaving someone waits a moment, so moving between people doesn't flash everything back
  let hoverTimer = 0;
  function hover(id: string | null) {
    win.clearTimeout(hoverTimer);
    const go = () => light(id ?? (selected ? "p:" + selected : null));
    if (id) go();
    else hoverTimer = win.setTimeout(go, 120);
  }

  function panelStart() {
    panel.innerHTML = "";
    panel.classList.add("mw-open");
    const close = button("mw-web-x", "✕", () => {
      selected = null;
      light(null);
      showIntro();
    });
    close.setAttribute("aria-label", "Close");
    panel.appendChild(close);
  }
  const section = (title: string) => {
    panel.appendChild(el("h4", "", title));
    const ul = el("ul");
    panel.appendChild(ul);
    return ul;
  };

  function select(personId: string, centre = false) {
    selected = personId;
    const n = nodes.find((x) => x.person?.id === personId);
    light(n?.id ?? null);
    if (n && centre) centreOn(n);
    const p = byId.get(personId)!;
    panelStart();
    if (p.photo) panel.appendChild(Object.assign(el("img", "mw-web-photo"), { src: p.photo, alt: "" }));
    panel.appendChild(el("h3", p.pc ? "mw-web-pc-name" : "", p.name));
    if (p.title) panel.appendChild(el("p", "mw-web-sub", p.title));
    const gs = p.groups.map((g) => groups.get(g)).filter((g): g is WebGroup => !!g);
    if (gs.length) {
      const ul = section("Groups");
      for (const g of gs) {
        const li = el("li");
        const b = button("mw-web-link", g.name, () => setPicked([g.id]));
        b.style.color = colorOf(g);
        li.append(b, el("span", "mw-web-tag-plain", typeOf(g)));
        ul.appendChild(li);
      }
    }
    const ties = data.ties.filter((t) => t.a === p.id || t.b === p.id);
    if (ties.length) {
      const ul = section("Ties");
      for (const t of ties.sort((x, y) => (x.type === "knows" ? 1 : 0) - (y.type === "knows" ? 1 : 0))) {
        const other = byId.get(t.a === p.id ? t.b : t.a)!;
        const li = el("li");
        li.appendChild(button("mw-web-link", other.name, () => goTo(other.id)));
        const st = styleOf(t.type);
        // "works for" and "owes" point one way: say which
        const dir = st.arrow && t.a !== p.id ? " (them)" : "";
        const tag = el("span", "mw-web-tag", t.type + (t.strength ? `, ${t.strength}` : "") + dir);
        tag.style.color = st.color;
        tag.style.borderColor = st.color;
        li.appendChild(tag);
        ul.appendChild(li);
      }
    }
    openLink(p.open, () => opts.onOpen?.({ kind: "person", person: p }));
  }

  function selectGroup(gid: string) {
    const g = groups.get(gid)!;
    selected = null;
    light("g:" + gid);
    panelStart();
    const h = el("h3", "", g.name);
    h.style.color = colorOf(g);
    panel.appendChild(h);
    const ms = membersOf(gid);
    panel.appendChild(el("p", "mw-web-sub", `${typeOf(g)} · ${ms.length} ${ms.length === 1 ? "person" : "people"}`));
    const ul = el("ul");
    for (const m of ms.sort((a, b) => a.name.localeCompare(b.name))) {
      const li = el("li");
      li.appendChild(button("mw-web-link", m.name, () => goTo(m.id)));
      ul.appendChild(li);
    }
    panel.appendChild(ul);
    if (!(picked.size === 1 && picked.has(gid))) panel.appendChild(button("mw-web-open", "Show only this group →", () => setPicked([gid])));
    panel.appendChild(el("br"));
    openLink(g.open, () => opts.onOpen?.({ kind: "group", group: g }));
  }

  function openLink(open: string | undefined, click: () => void) {
    if (!open) return;
    if (opts.hrefOf) {
      const a = el("a", `mw-web-open ${opts.linkClass ?? ""}`, "Open page →");
      a.href = opts.hrefOf(open);
      panel.appendChild(a);
    } else if (opts.onOpen) panel.appendChild(button("mw-web-open", "Open note →", click));
  }

  function showIntro() {
    panel.classList.remove("mw-open");
    panel.innerHTML = "";
    panel.appendChild(
      el(
        "p",
        "mw-web-hint",
        view === "groups"
          ? "People joined to their groups. Pick groups above to see just those. Click anyone or any group for details."
          : "People joined to each other. Click someone to see their ties. Drag people to move them: they stay where you put them.",
      ),
    );
  }

  // ---- Moving around: pan, zoom, drag people ----
  let k = 1;
  let tx = 0;
  let ty = 0;
  const apply = () => {
    viewG.setAttribute("transform", `translate(${tx},${ty}) scale(${k})`);
    svg.classList.toggle("mw-web-far", k < 0.55);
  };
  function fit() {
    const vis = nodes.filter((n) => n.kind !== "anchor");
    if (!vis.length) return;
    const W = stage.clientWidth || 800;
    const H = stage.clientHeight || 600;
    const x0 = Math.min(...vis.map((n) => n.x! - n.r - 40));
    const x1 = Math.max(...vis.map((n) => n.x! + n.r + 40));
    const y0 = Math.min(...vis.map((n) => n.y! - n.r - 40));
    const y1 = Math.max(...vis.map((n) => n.y! + n.r + 50));
    k = Math.min(1.3, Math.max(0.2, Math.min(W / (x1 - x0), H / (y1 - y0))));
    tx = W / 2 - ((x0 + x1) / 2) * k;
    ty = H / 2 - ((y0 + y1) / 2) * k;
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
    drag = { n, x: ev.clientX, y: ev.clientY };
  }
  // Nodes get pointerdown first (they're inside the stage), so a drag is already set here
  stage.addEventListener("pointerdown", (ev) => {
    pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    dragMoved = false;
    if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), k };
      drag = null;
      pan = null;
      return;
    }
    if (!drag && ev.button === 0) pan = { x: ev.clientX, y: ev.clientY, tx, ty };
  });
  stage.addEventListener("pointermove", (ev) => {
    if (pts.has(ev.pointerId)) pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (pinch && pts.size === 2) {
      const [a, b] = [...pts.values()];
      const r = stage.getBoundingClientRect();
      zoomAt((pinch.k * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.d / k, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
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
        store(`pos:${sceneKey()}`, all);
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

  let lastSize = "";
  const ro = new (win as typeof window).ResizeObserver(() => {
    const size = `${stage.clientWidth}x${stage.clientHeight}`;
    if (size !== lastSize && !dragMoved) fit();
    lastSize = size;
  });
  ro.observe(stage);
  host._mwWebCleanup = () => {
    ro.disconnect();
    sim?.stop();
  };

  build();
}

function injectStyle(doc: Document) {
  doc.getElementById("mw-web-style")?.remove();
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
.mw-web-search { margin-left: auto; width: 12rem; font: inherit; color: var(--w-text); background: var(--w-bg); border: 1px solid var(--w-line); border-radius: 6px; padding: 0.25rem 0.5rem; }
.mw-web-tabs { display: inline-flex; border: 1px solid var(--w-line); border-radius: 8px; overflow: hidden; }
.mw-web-tab { padding: 0.3rem 0.9rem !important; border: 0 !important; border-radius: 0 !important; background: var(--w-bg) !important; color: var(--w-muted) !important; }
.mw-web-tab.mw-on { background: var(--w-accent) !important; color: var(--w-bg) !important; }
.mw-web-chip { padding: 0.15rem 0.7rem !important; border: 1px solid var(--w-line) !important; border-radius: 999px !important; background: var(--w-bg) !important; color: var(--w-muted) !important; }
.mw-web-chip.mw-on { border-color: var(--w-accent) !important; color: var(--w-accent) !important; }
.mw-web-gear { padding: 0.15rem 0.55rem !important; }
.mw-web-picker { display: flex; flex-wrap: wrap; gap: 0.35rem 1rem; align-items: center; padding: 0.5rem 0.8rem; border-bottom: 1px solid var(--w-line); font-size: 0.78rem; }
.mw-web-picker[hidden], .mw-web-pick-toggle[hidden] { display: none; }
.mw-web-pick-toggle { display: none; }
.mw-web-gkind { display: inline-flex; flex-wrap: wrap; gap: 0.3rem; align-items: center; }
.mw-web-gkind-name { color: var(--w-muted); text-transform: uppercase; letter-spacing: 0.06em; font-size: 0.66rem; margin-right: 0.2rem; }
.mw-web-gchip { padding: 0.1rem 0.6rem !important; border: 1px solid var(--c, var(--w-line)) !important; border-radius: 999px !important; background: var(--w-bg) !important; color: var(--c, var(--w-muted)) !important; }
.mw-web-gchip.mw-on { background: var(--c, var(--w-accent)) !important; color: var(--w-bg) !important; }
.mw-web-body { position: relative; display: flex; flex: 1; min-height: 0; }
.mw-web-stage { position: relative; flex: 1; min-width: 0; cursor: grab; touch-action: none; background: color-mix(in srgb, var(--w-accent) 3%, var(--w-bg)); }
.mw-web-stage.mw-panning { cursor: grabbing; }
.mw-web-svg { display: block; width: 100%; height: 100%; }
.mw-web-member { stroke-width: 2.2; opacity: 0.55; }
.mw-web-member.mw-faint { opacity: 0.25; stroke-dasharray: 4 4; stroke-width: 1.4; }
.mw-web-knows { opacity: 0.5; }
.mw-web-tie-label { font-size: 11px; paint-order: stroke; stroke: var(--w-bg); stroke-width: 4px; }
.mw-web-gap { stroke: var(--w-bg); }
.mw-web-node { cursor: pointer; outline: none; }
.mw-web-node.mw-faint { opacity: 0.45; }
.mw-web-disc { fill: var(--w-bg); }
.mw-web-ring { fill: none; stroke: color-mix(in srgb, var(--w-text) 25%, transparent); stroke-width: 1.5; }
.mw-web-pc .mw-web-ring { stroke: ${PARTY}; stroke-width: 2.5; }
.mw-web-ring2 { fill: none; stroke: ${PARTY}; stroke-width: 1.5; }
.mw-web-initial { font-size: 18px; fill: var(--w-muted); }
.mw-web-name { font-size: 13px; fill: var(--w-text); paint-order: stroke; stroke: var(--w-bg); stroke-width: 4px; }
.mw-web-pc .mw-web-name { fill: ${PARTY}; font-weight: 600; }
.mw-web-pill { fill: var(--w-bg); stroke-width: 2; }
.mw-web-pill-text { font-size: 12.5px; font-weight: 600; }
.mw-web-node:hover .mw-web-ring, .mw-web-node:focus-visible .mw-web-ring { stroke: var(--w-accent); stroke-width: 2.5; }
.mw-web-node, .mw-web-member, .mw-web-tie { transition: opacity 0.35s ease; }
.mw-web-focus .mw-web-node:not(.mw-on) { opacity: 0.3; }
.mw-web-focus .mw-web-node.mw-on { opacity: 1; }
.mw-web-focus .mw-web-member:not(.mw-on), .mw-web-focus .mw-web-tie:not(.mw-on) { opacity: 0.14; }
.mw-web-focus .mw-web-member.mw-on, .mw-web-focus .mw-web-tie.mw-on { opacity: 1; }
.mw-web-far .mw-web-name, .mw-web-far .mw-web-tie-label { display: none; }
.mw-web-far .mw-web-node:hover .mw-web-name, .mw-web-far .mw-web-node.mw-on .mw-web-name { display: inline; }
.mw-web-legend { position: absolute; left: 0.6rem; bottom: 0.5rem; display: flex; flex-wrap: wrap; gap: 0.3rem 0.8rem; padding: 0.3rem 0.6rem; border-radius: 8px; background: color-mix(in srgb, var(--w-bg) 85%, transparent); font-size: 0.72rem; color: var(--w-muted); pointer-events: none; }
.mw-web-legend[hidden] { display: none; }
.mw-web-key { display: inline-flex; align-items: center; gap: 0.3rem; }
.mw-web-settings { position: absolute; top: 0.5rem; right: 0.5rem; z-index: 5; width: 14rem; padding: 0.7rem 0.8rem; border: 1px solid var(--w-line); border-radius: 10px; background: var(--w-bg); box-shadow: 0 6px 18px rgba(0,0,0,0.12); font-size: 0.8rem; }
.mw-web-settings[hidden] { display: none; }
.mw-web-slider { display: flex; flex-direction: column; margin-bottom: 0.5rem; color: var(--w-muted); }
.mw-web-slider input { width: 100%; }
.mw-web-panel { position: relative; width: 210px; padding: 0.9rem; overflow: hidden auto; border-left: 1px solid var(--w-line); transition: width 0.2s; font-size: 0.88rem; user-select: text; -webkit-user-select: text; }
.mw-web-panel.mw-open { width: 270px; }
.mw-web-hint { color: var(--w-muted); font-size: 0.8rem; line-height: 1.5; }
.mw-web-x { position: absolute; top: 1.2rem; right: 1.2rem; z-index: 1; width: 1.7rem; border: 0 !important; border-radius: 50% !important; background: color-mix(in srgb, var(--w-bg) 85%, transparent) !important; color: var(--w-text) !important; }
.mw-web-photo { width: 100%; height: 160px; object-fit: cover; object-position: top; border-radius: 8px; margin: 0 !important; }
.mw-web-panel h3 { margin: 0.6rem 2rem 0.1rem 0; font-size: 1.25rem; font-weight: 400; color: var(--w-head); font-family: var(--headerFont, inherit); }
.mw-web-pc-name { color: ${PARTY} !important; }
.mw-web-sub { margin: 0 0 0.5rem; color: var(--w-muted); font-size: 0.8rem; }
.mw-web-panel h4 { margin: 0.8rem 0 0.25rem; font-size: 0.68rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--w-muted); }
.mw-web-panel ul { margin: 0; padding: 0; list-style: none; }
.mw-web-panel li { display: flex; align-items: center; gap: 0.4rem; padding: 0.12rem 0; }
.mw-web-link { padding: 0 !important; border: 0 !important; background: none !important; color: var(--w-text); text-align: left; }
.mw-web-link:hover { text-decoration: underline; }
.mw-web-tag { font-size: 0.68rem; padding: 0 0.45rem; border: 1px solid; border-radius: 999px; }
.mw-web-tag-plain { font-size: 0.7rem; color: var(--w-muted); }
.mw-web-open { display: inline-block; margin-top: 0.9rem; padding: 0 !important; border: 0 !important; background: none !important; color: var(--w-accent) !important; font-weight: 600; font-size: 0.85rem; text-decoration: none; }
@media (max-width: 700px) {
  .mw-web-search { width: 100%; margin-left: 0; order: 9; }
  .mw-web-pick-toggle:not([hidden]) { display: inline-block; }
  .mw-web:not(.mw-pick-open) .mw-web-picker { display: none; }
  .mw-web-picker { max-height: 40vh; overflow-y: auto; }
  .mw-web-body { flex-direction: column; }
  .mw-web-panel, .mw-web-panel.mw-open { width: auto; max-height: 45%; border-left: 0; border-top: 1px solid var(--w-line); }
  .mw-web-panel:not(.mw-open) { display: none; }
}
`;
