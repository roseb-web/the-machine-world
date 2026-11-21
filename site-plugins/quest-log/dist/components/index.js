// src/components/QuestLog.tsx
import { pathToRoot as pathToRoot2, resolveRelative as resolveRelative2 } from "@quartz-community/utils";

// src/components/QuestLog.css
var QuestLog_default = `.mw-quest-log {
  margin-top: 2rem;
}

/* Main quests: a featured card */
.mw-quest-log a.mw-quest-main-card {
  display: block;
  padding: 1rem 1.2rem;
  margin-bottom: 0.8rem;
  border: 1px solid var(--lightgray);
  border-left: 3px solid var(--secondary);
  border-radius: 0 10px 10px 0;
  background: none;
  color: inherit;
  text-decoration: none;
  font-weight: normal;
  transition: border-color 0.2s ease;
}

.mw-quest-log a.mw-quest-main-card:hover {
  border-color: var(--secondary);
}

.mw-quest-main-title {
  display: block;
  margin: 0.4rem 0 0.2rem;
  font-family: var(--headerFont);
  font-size: 1.35rem;
  font-weight: 600;
  color: var(--dark);
}

.mw-quest-summary {
  display: block;
  font-size: 0.95rem;
  color: var(--darkgray);
}

/* Other quests: compact rows */
.mw-quest-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.mw-quest-list li {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin: 0;
  padding: 0.45rem 0.2rem;
}

.mw-quest-list li + li {
  border-top: 1px solid var(--lightgray);
}

.mw-quest-type {
  flex-shrink: 0;
  min-width: 4.2rem;
  text-align: center;
  font-size: 0.72rem;
  font-weight: 500;
  padding: 0.05rem 0.6rem;
  border-radius: 6px;
  background: var(--lightgray);
  color: var(--darkgray);
}

.mw-quest-main-card .mw-quest-type {
  min-width: 0;
}

.mw-quest-main { background: color-mix(in srgb, #a46b0a 22%, transparent); color: #6e4706; }
.mw-quest-personal { background: color-mix(in srgb, #6b6a3a 22%, transparent); color: #4a4926; }
.mw-quest-faction { background: color-mix(in srgb, #8a4a5a 20%, transparent); color: #6a3040; }

:root[saved-theme="dark"] .mw-quest-main { color: #e5bb68; }
:root[saved-theme="dark"] .mw-quest-personal { color: #b8b67e; }
:root[saved-theme="dark"] .mw-quest-faction { color: #d99aaa; }

.mw-quest-log a.mw-quest-title {
  background: none;
  padding: 0;
  font-weight: 500;
  color: var(--dark);
  text-decoration: none;
}

.mw-quest-log a.mw-quest-title:hover {
  color: var(--secondary);
}

/* Home page boxes: Previously on, New since, Coming up */
.mw-home {
  margin: 2rem 0 0.5rem;
}

a.mw-home-prev {
  display: block;
  padding: 4px;
  border: 1.5px solid var(--secondary);
  border-radius: 10px;
  color: var(--darkgray);
  font-weight: 400;
  text-decoration: none;
  background: none;
}

a.mw-home-prev:hover .mw-home-more {
  text-decoration: underline;
}

.mw-home-prev-inner {
  display: block;
  padding: 0.9rem 1.2rem;
  border: 1px solid color-mix(in srgb, var(--secondary) 35%, transparent);
  border-radius: 6px;
}

.mw-home-kicker {
  display: flex;
  flex-wrap: wrap;
  gap: 0.2rem 1rem;
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--secondary);
}

.mw-home-prev-date {
  margin-left: auto;
  letter-spacing: normal;
  text-transform: none;
  color: var(--gray);
}

.mw-home-prev-title {
  display: block;
  margin: 0.2rem 0 0.4rem;
  font-family: var(--headerFont);
  font-size: 1.5rem;
  color: var(--dark);
}

.mw-home-prev-lead {
  display: block;
}

.mw-home-prev ul {
  margin: 0.4rem 0 0.5rem;
}

.mw-home-more,
.mw-home-link {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--secondary);
}

.mw-home-boxes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1.1rem;
  margin-top: 1.2rem;
}

.mw-home-box {
  padding: 0.8rem 1.1rem 0.9rem;
  border: 1px solid var(--lightgray);
  border-radius: 10px;
}

.mw-home-box h3 {
  margin: 0 0 0.5rem;
  font-size: 1.05rem;
  color: var(--secondary);
}

ul.mw-home-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.mw-home-list li {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  margin: 0;
  padding: 0.4rem 0;
  border-top: 1px solid var(--lightgray);
}

.mw-home-list li:first-child {
  border-top: none;
}

.mw-home-list small {
  margin-left: auto;
  font-size: 0.75rem;
  color: var(--gray);
  white-space: nowrap;
}

.mw-home-tag {
  flex: none;
  width: 4.4rem;
  padding: 0.05rem 0;
  border-radius: 999px;
  font-size: 0.7rem;
  text-align: center;
}

.mw-home-new {
  background: color-mix(in srgb, #4e6b5a 18%, var(--light));
  color: #3c5a3a;
}

.mw-home-updated {
  background: color-mix(in srgb, var(--secondary) 18%, var(--light));
  color: color-mix(in srgb, var(--secondary) 70%, var(--darkgray));
}

.mw-home-all summary {
  margin-top: 0.3rem;
  font-size: 0.8rem;
  color: var(--gray);
  cursor: pointer;
}

li.mw-home-soon {
  align-items: center;
}

.mw-home-soon small {
  display: block;
  margin: 0;
}

.mw-home-days {
  flex: none;
  width: 3.2rem;
  padding: 0.2rem 0;
  border-radius: 8px;
  background: color-mix(in srgb, var(--secondary) 12%, var(--light));
  color: var(--dark);
  font-size: 0.7rem;
  line-height: 1.15;
  text-align: center;
}

.mw-home-days b {
  display: block;
  font-size: 1.1rem;
}

.mw-home-link {
  display: inline-block;
  margin-top: 0.4rem;
  background: none;
  padding: 0;
}

.mw-home-list a.internal,
a.internal.mw-home-link {
  padding: 0;
  background: none;
  font-weight: 400;
  color: var(--dark);
  text-decoration: none;
}

.mw-home-list a.internal:hover {
  color: var(--secondary);
  text-decoration: underline;
}

a.internal.mw-home-link {
  font-weight: 600;
  color: var(--secondary);
}

/* ---- The quest log page ---- */
.mw-ql-lead { color: var(--gray); margin: 0 0 1rem; }
.mw-ql-filters { display: flex; flex-wrap: wrap; align-items: center; gap: 0.6rem; margin-bottom: 0.5rem; }
.mw-ql-types { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.mw-ql-filter { font: inherit; font-size: 0.8rem; padding: 0.15rem 0.8rem; border-radius: 999px; border: 1px solid var(--lightgray); background: transparent; color: var(--darkgray); cursor: pointer; }
.mw-ql-filter:hover { border-color: var(--secondary); }
.mw-ql-filter.mw-on { background: color-mix(in srgb, var(--secondary) 16%, transparent); border-color: var(--secondary); color: var(--dark); }
.mw-ql-section h2 { display: flex; align-items: baseline; gap: 0.5rem; margin: 1.6rem 0 0.7rem; }
.mw-ql-count { font-family: var(--bodyFont); font-size: 0.8rem; font-weight: 400; color: var(--gray); }
.mw-ql-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr)); gap: 0.8rem; }
a.mw-ql-card { display: flex; flex-direction: column; gap: 0.25rem; padding: 0.8rem 1rem; border: 1px solid var(--lightgray); border-radius: 10px; background: var(--light); color: var(--darkgray); text-decoration: none; transition: border-color 0.15s ease, transform 0.15s ease; }
a.mw-ql-card:hover { border-color: var(--secondary); transform: translateY(-1px); }
a.mw-ql-card[hidden] { display: none; }
.mw-ql-card .mw-quest-type { align-self: flex-start; }
.mw-ql-main { grid-column: 1 / -1; border: 1.5px solid var(--secondary) !important; }
.mw-ql-title { font-family: var(--headerFont); font-size: 1.15rem; color: var(--dark); line-height: 1.25; }
.mw-ql-main .mw-ql-title { font-size: 1.35rem; }
.mw-ql-summary { font-size: 0.88rem; line-height: 1.45; color: var(--darkgray); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.mw-ql-meta { margin-top: auto; padding-top: 0.3rem; font-size: 0.75rem; color: var(--gray); }
.mw-ql-not-started a.mw-ql-card { border-style: dashed; background: transparent; }
.mw-ql-list { list-style: none; padding: 0; margin: 0; }
.mw-ql-list li { display: flex; align-items: center; gap: 0.8rem; padding: 0.45rem 0; border-bottom: 1px solid var(--lightgray); }
.mw-ql-list li[hidden] { display: none; }
.mw-ql-list a { flex: 1; }
.mw-ql-when { font-size: 0.78rem; color: var(--gray); }
.mw-ql-status { flex: none; min-width: 5.5rem; text-align: center; font-size: 0.72rem; padding: 0.05rem 0.6rem; border-radius: 999px; }
.mw-ql-completed { background: color-mix(in srgb, #5d7a2e 20%, transparent); color: #3f5a1c; }
.mw-ql-failed { background: color-mix(in srgb, #a33a2a 17%, transparent); color: #8a2f22; }
.mw-ql-missed { background: var(--lightgray); color: var(--darkgray); }
.mw-ql-none { color: var(--gray); font-style: italic; }
/* Quartz gives links a highlight and bold text: not wanted on cards and list rows */
.mw-ql a.internal { background: none; padding: 0; font-weight: inherit; }
.mw-ql a.mw-ql-card { padding: 0.8rem 1rem; background: var(--light); }
.mw-ql .mw-ql-not-started a.mw-ql-card { background: transparent; }
.mw-ql-summary, .mw-ql-meta { font-weight: 400; }
.mw-ql-list a.internal { font-weight: 500; color: var(--dark); }
.mw-ql-list a.internal:hover { color: var(--secondary); }
/* The quest log replaces Quartz's dated list of the folder's pages */
body:has(.mw-ql) .page-listing,
body:has(.mw-ql) .center > hr {
  display: none;
}

/* Connected to: the search box, its grouped list, and the chosen chip */
.mw-ql-pick { position: relative; margin-left: auto; }
.mw-ql-search { font: inherit; font-size: 0.85rem; width: 14rem; max-width: 60vw; padding: 0.25rem 0.7rem; border: 1px solid var(--lightgray); border-radius: 999px; background: var(--light); color: var(--darkgray); }
.mw-ql-search:focus { outline: none; border-color: var(--secondary); }
.mw-ql-search[hidden], .mw-ql-chip[hidden], .mw-ql-menu[hidden] { display: none; }
.mw-ql-menu { position: absolute; right: 0; top: calc(100% + 4px); z-index: 20; width: 17rem; max-height: 22rem; overflow-y: auto; padding: 0.3rem 0; border: 1px solid var(--lightgray); border-radius: 10px; background: var(--light); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12); }
.mw-ql-group { padding: 0.45rem 0.8rem 0.15rem; font-size: 0.68rem; letter-spacing: 0.06em; text-transform: uppercase; color: var(--gray); }
.mw-ql-opt { display: flex; align-items: center; gap: 0.5rem; padding: 0.3rem 0.8rem; font-size: 0.88rem; cursor: pointer; color: var(--darkgray); }
.mw-ql-opt.mw-on, .mw-ql-opt:hover { background: color-mix(in srgb, var(--secondary) 12%, transparent); }
.mw-ql-opt > span:not(.mw-conn-icon) { flex: 1; }
.mw-ql-opt .mw-conn-icon, .mw-ql-chip .mw-conn-icon { flex: none; width: 1.35rem; height: 1.35rem; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 0.75rem; background: var(--lightgray); color: var(--secondary); }
.mw-ql-opt small { font-size: 0.72rem; color: var(--gray); }
.mw-ql-opt img, .mw-ql-chip img { width: 1.35rem; height: 1.35rem; border-radius: 50%; object-fit: cover; object-position: top; margin: 0; }
.mw-ql-chip { display: inline-flex; align-items: center; gap: 0.4rem; font: inherit; font-size: 0.85rem; padding: 0.1rem 0.7rem 0.1rem 0.2rem; border-radius: 999px; border: 1px solid var(--secondary); background: color-mix(in srgb, var(--secondary) 16%, transparent); color: var(--dark); cursor: pointer; }
.mw-ql-card .mw-connected { margin: 0.3rem 0 0; }
@media (max-width: 600px) { .mw-ql-pick { margin-left: 0; } .mw-ql-menu { left: 0; right: auto; } }
`;

// ../page-header/src/components/header.tsx
import { pathToRoot, resolveRelative } from "@quartz-community/utils";
import { Fragment, jsx, jsxs } from "preact/jsx-runtime";
function connectedOf(fm) {
  const v = fm.player_connected;
  return (Array.isArray(v) ? v : []).filter(
    (x) => !!x && typeof x === "object" && typeof x.to === "string" && typeof x.title === "string"
  );
}
var KIND_ICON = { faction: "\u2691", place: "\u2316", page: "\u2022" };
function ConnectedChips({ items, slug, links = true }) {
  const root = pathToRoot(slug);
  const inner = (c) => /* @__PURE__ */ jsxs(Fragment, { children: [
    c.img ? /* @__PURE__ */ jsx("img", { src: `${root}/${c.img}`, alt: "" }) : /* @__PURE__ */ jsx("span", { class: "mw-conn-icon", children: KIND_ICON[c.kind] ?? c.title.charAt(0) }),
    c.title
  ] });
  return /* @__PURE__ */ jsx("div", { class: "mw-connected", children: items.map(
    (c) => links ? /* @__PURE__ */ jsx("a", { href: resolveRelative(slug, c.to), class: `internal mw-conn mw-conn-${c.kind}`, children: inner(c) }) : /* @__PURE__ */ jsx("span", { class: `mw-conn mw-conn-${c.kind}`, children: inner(c) })
  ) });
}

// src/components/QuestLog.tsx
import { Fragment as Fragment2, jsx as jsx2, jsxs as jsxs2 } from "preact/jsx-runtime";
var ORDER = ["main", "personal", "faction", "side"];
var LABELS = { main: "Main", personal: "Personal", faction: "Faction", side: "Side" };
var SHOWN = 5;
function HomeBoxes({ fm, go }) {
  const last = fm.mw_last_session;
  const changes = fm.mw_changes;
  const upcoming = fm.mw_coming_up ?? [];
  const items = changes?.items ?? [];
  const row = (c) => /* @__PURE__ */ jsxs2("li", { class: "mw-home-change", children: [
    /* @__PURE__ */ jsx2("span", { class: `mw-home-tag mw-home-${c.kind}`, children: c.kind === "new" ? "New" : "Updated" }),
    /* @__PURE__ */ jsx2("a", { href: go(c.to), class: "internal", children: c.title }),
    /* @__PURE__ */ jsx2("small", { children: c.section })
  ] });
  if (!last && !items.length && !upcoming.length) return null;
  return /* @__PURE__ */ jsxs2("div", { class: "mw-home", children: [
    last && /* @__PURE__ */ jsx2("a", { href: go(last.to), class: "internal mw-home-prev", children: /* @__PURE__ */ jsxs2("span", { class: "mw-home-prev-inner", children: [
      /* @__PURE__ */ jsxs2("span", { class: "mw-home-kicker", children: [
        "Previously on\u2026 \xB7 ",
        last.session,
        last.date && /* @__PURE__ */ jsx2("span", { class: "mw-home-prev-date", children: last.date })
      ] }),
      /* @__PURE__ */ jsx2("span", { class: "mw-home-prev-title", children: last.title ?? last.session }),
      last.lead && /* @__PURE__ */ jsx2("span", { class: "mw-home-prev-lead", children: last.lead }),
      last.points && last.points.length > 0 && /* @__PURE__ */ jsx2("ul", { children: last.points.map((p) => /* @__PURE__ */ jsx2("li", { children: p })) }),
      /* @__PURE__ */ jsx2("span", { class: "mw-home-more", children: "Read the whole recap \u2192" })
    ] }) }),
    (items.length > 0 || upcoming.length > 0) && /* @__PURE__ */ jsxs2("div", { class: "mw-home-boxes", children: [
      items.length > 0 && /* @__PURE__ */ jsxs2("section", { class: "mw-home-box", children: [
        /* @__PURE__ */ jsx2("h3", { children: changes?.since ? `New since ${changes.since}` : "Recently updated" }),
        /* @__PURE__ */ jsx2("ul", { class: "mw-home-list", children: items.slice(0, SHOWN).map(row) }),
        items.length > SHOWN && /* @__PURE__ */ jsxs2("details", { class: "mw-home-all", children: [
          /* @__PURE__ */ jsxs2("summary", { children: [
            "Show all (",
            items.length,
            ")"
          ] }),
          /* @__PURE__ */ jsx2("ul", { class: "mw-home-list", children: items.slice(SHOWN).map(row) })
        ] })
      ] }),
      upcoming.length > 0 && /* @__PURE__ */ jsxs2("section", { class: "mw-home-box", children: [
        /* @__PURE__ */ jsx2("h3", { children: "Coming up" }),
        /* @__PURE__ */ jsx2("ul", { class: "mw-home-list", children: upcoming.map((u) => /* @__PURE__ */ jsxs2("li", { class: "mw-home-soon", children: [
          /* @__PURE__ */ jsx2("span", { class: "mw-home-days", children: u.days === 0 ? /* @__PURE__ */ jsx2("b", { children: "Today" }) : /* @__PURE__ */ jsxs2(Fragment2, { children: [
            /* @__PURE__ */ jsx2("b", { children: u.days }),
            u.days === 1 ? "day" : "days"
          ] }) }),
          /* @__PURE__ */ jsxs2("span", { children: [
            u.name,
            /* @__PURE__ */ jsxs2("small", { children: [
              u.kind,
              " \xB7 ",
              u.date
            ] })
          ] })
        ] })) }),
        /* @__PURE__ */ jsx2("a", { href: go("calendar"), class: "internal mw-home-link", children: "Full calendar \u2192" })
      ] })
    ] })
  ] });
}
var STATUS_LABELS = { "not started": "Not started", active: "Active", completed: "Completed", failed: "Failed", missed: "Missed" };
var statusOf = (fm) => {
  const s = typeof fm.quest_status === "string" ? fm.quest_status.trim().toLowerCase().replace(/[-_]+/g, " ") : "";
  return s || "active";
};
var sessionNum = (v) => Number(String(v ?? "").match(/\d+/)?.[0] ?? 0);
function QuestLanding({ slug, allFiles }) {
  const inside = slug.slice(0, -"index".length);
  const quests = allFiles.filter((f) => {
    const s = String(f.slug ?? "");
    return s.startsWith(inside) && s !== slug && typeof f.frontmatter?.quest === "string";
  }).map((f) => ({ f, fm: f.frontmatter ?? {} }));
  if (!quests.length) return null;
  const go = (f) => resolveRelative2(slug, String(f.slug));
  const title = (q) => String(q.fm.title ?? q.f.slug);
  const type = (q) => String(q.fm.quest).toLowerCase();
  const byType = (a, b) => (ORDER.indexOf(type(a)) + 99) % 99 - (ORDER.indexOf(type(b)) + 99) % 99 || title(a).localeCompare(title(b));
  const active = quests.filter((q) => statusOf(q.fm) === "active").sort(byType);
  const notStarted = quests.filter((q) => statusOf(q.fm) === "not started").sort(byType);
  const finished = quests.filter((q) => !["active", "not started"].includes(statusOf(q.fm))).sort((a, b) => sessionNum(b.fm.mw_quest_last) - sessionNum(a.fm.mw_quest_last) || title(a).localeCompare(title(b)));
  const types = ORDER.filter((t) => quests.some((q) => type(q) === t));
  const picks = /* @__PURE__ */ new Map();
  for (const q of quests)
    for (const c of connectedOf(q.fm)) {
      if (!picks.has(c.to)) picks.set(c.to, { ...c, n: 0 });
      if (c.home && c.group && !picks.has(c.home)) picks.set(c.home, { to: c.home, title: c.group, kind: "place", n: 0 });
    }
  const folderOf = (to) => to.replace(/\/index$/, "");
  const within = (to, place) => !!to && (to === place || folderOf(to).startsWith(folderOf(place) + "/"));
  const matchesOf = (q) => {
    const conn = connectedOf(q.fm);
    const keys = new Set(conn.map((c) => c.to));
    for (const p of picks.values())
      if (p.kind === "place" && conn.some((c) => c.kind === "place" && within(c.to, p.to) || within(c.home, p.to))) keys.add(p.to);
    return [...keys];
  };
  const matches = new Map(quests.map((q) => [q, matchesOf(q)]));
  for (const keys of matches.values()) for (const k of keys) if (picks.has(k)) picks.get(k).n++;
  const groupOf = (p) => p.kind === "party" ? "Party" : p.kind === "person" ? p.group ? `People \xB7 ${p.group}` : "People" : p.kind === "faction" ? "Factions" : p.kind === "place" ? "Places" : "Other";
  const rank = (g) => g === "Party" ? 0 : g.startsWith("People") ? 1 : g === "Factions" ? 2 : g === "Places" ? 3 : 4;
  const pickList = [...picks.values()].map((p) => ({ to: p.to, title: p.title, kind: p.kind, img: p.img, n: p.n, group: groupOf(p) })).sort((a, b) => rank(a.group) - rank(b.group) || a.group.localeCompare(b.group) || a.title.localeCompare(b.title));
  const card = (q, when) => {
    const t = type(q);
    const main = t === "main" && statusOf(q.fm) === "active";
    const summary = typeof q.f.description === "string" ? q.f.description.replace(/^Overview\s+/, "").split(/\s+What we know\b/)[0] : "";
    const handouts = Array.isArray(q.fm.player_handouts) ? q.fm.player_handouts.length : 0;
    const meta = [when, handouts ? `${handouts} handout${handouts === 1 ? "" : "s"}` : ""].filter(Boolean).join(" \xB7 ");
    return /* @__PURE__ */ jsxs2("a", { href: go(q.f), class: `internal mw-ql-card ${main ? "mw-ql-main" : ""}`, "data-type": t, "data-match": matches.get(q).join("|"), children: [
      /* @__PURE__ */ jsx2("span", { class: `mw-quest-type mw-quest-${t}`, children: main ? "Main quest" : LABELS[t] ?? t }),
      /* @__PURE__ */ jsx2("span", { class: "mw-ql-title", children: title(q) }),
      summary && /* @__PURE__ */ jsx2("span", { class: "mw-ql-summary", children: summary }),
      connectedOf(q.fm).length > 0 && /* @__PURE__ */ jsx2(ConnectedChips, { items: connectedOf(q.fm), slug, links: false }),
      meta && /* @__PURE__ */ jsx2("span", { class: "mw-ql-meta", children: meta })
    ] });
  };
  const section = (name, cls, items, body) => items.length > 0 && /* @__PURE__ */ jsxs2("section", { class: `mw-ql-section ${cls}`, children: [
    /* @__PURE__ */ jsxs2("h2", { children: [
      name,
      " ",
      /* @__PURE__ */ jsx2("span", { class: "mw-ql-count", children: items.length })
    ] }),
    body
  ] });
  return /* @__PURE__ */ jsxs2("div", { class: "mw-ql", children: [
    /* @__PURE__ */ jsx2("p", { class: "mw-ql-lead", children: "What the party has taken on, heard about, and left behind." }),
    (types.length > 1 || pickList.length > 0) && /* @__PURE__ */ jsxs2("div", { class: "mw-ql-filters", children: [
      types.length > 1 && /* @__PURE__ */ jsxs2("div", { class: "mw-ql-types", role: "group", "aria-label": "Show quests of type", children: [
        /* @__PURE__ */ jsx2("button", { class: "mw-ql-filter mw-on", "data-type": "", children: "All" }),
        types.map((t) => /* @__PURE__ */ jsx2("button", { class: "mw-ql-filter", "data-type": t, children: LABELS[t] }))
      ] }),
      pickList.length > 0 && /* @__PURE__ */ jsxs2("div", { class: "mw-ql-pick", "data-picks": JSON.stringify(pickList), "data-root": pathToRoot2(slug), children: [
        /* @__PURE__ */ jsx2("input", { type: "search", class: "mw-ql-search", placeholder: "Connected to\u2026", "aria-label": "Show quests connected to a person, place or faction", autocomplete: "off" }),
        /* @__PURE__ */ jsx2("div", { class: "mw-ql-menu", role: "listbox", hidden: true }),
        /* @__PURE__ */ jsx2("button", { class: "mw-ql-chip", hidden: true })
      ] })
    ] }),
    section("Active", "mw-ql-active", active, /* @__PURE__ */ jsx2("div", { class: "mw-ql-grid", children: active.map((q) => card(q, q.fm.mw_quest_last ? `Updated ${q.fm.mw_quest_last}` : void 0)) })),
    section("Not started", "mw-ql-not-started", notStarted, /* @__PURE__ */ jsx2("div", { class: "mw-ql-grid", children: notStarted.map((q) => card(q, q.fm.mw_quest_first ? `Heard about in ${q.fm.mw_quest_first}` : void 0)) })),
    section(
      "Finished",
      "mw-ql-finished",
      finished,
      /* @__PURE__ */ jsx2("ul", { class: "mw-ql-list", children: finished.map((q) => {
        const s = statusOf(q.fm);
        return /* @__PURE__ */ jsxs2("li", { "data-type": type(q), "data-match": matches.get(q).join("|"), children: [
          /* @__PURE__ */ jsx2("span", { class: `mw-ql-status mw-ql-${s.replace(/\s+/g, "-")}`, children: STATUS_LABELS[s] ?? s }),
          /* @__PURE__ */ jsx2("a", { href: go(q.f), class: "internal", children: title(q) }),
          /* @__PURE__ */ jsx2("span", { class: "mw-ql-when", children: String(q.fm.mw_quest_last ?? "") })
        ] });
      }) })
    ),
    /* @__PURE__ */ jsx2("p", { class: "mw-ql-none", hidden: true, children: "No quests of this type yet." })
  ] });
}
var FILTER_SCRIPT = `
document.addEventListener("nav", () => {
  const log = document.querySelector(".mw-ql");
  if (!log) return;
  let type = "", pick = "";
  const apply = () => {
    log.querySelectorAll(".mw-ql-filter").forEach((b) => b.classList.toggle("mw-on", b.dataset.type === type));
    let any = false;
    log.querySelectorAll(".mw-ql-section").forEach((sec) => {
      let n = 0;
      sec.querySelectorAll("[data-match]").forEach((item) => {
        const on = (!type || item.dataset.type === type) && (!pick || item.dataset.match.split("|").includes(pick));
        item.hidden = !on;
        if (on) n++;
      });
      sec.hidden = n === 0;
      const count = sec.querySelector(".mw-ql-count");
      if (count) count.textContent = String(n);
      if (n) any = true;
    });
    log.querySelector(".mw-ql-none").hidden = any;
  };
  log.querySelectorAll(".mw-ql-filter").forEach((b) => b.addEventListener("click", () => { type = b.dataset.type; apply(); }));

  // Connected to: type to search, pick from the list (grouped), clear with the chip
  const box = log.querySelector(".mw-ql-pick");
  if (box) {
    const picks = JSON.parse(box.dataset.picks || "[]");
    const root = box.dataset.root || ".";
    const input = box.querySelector(".mw-ql-search");
    const menu = box.querySelector(".mw-ql-menu");
    const chip = box.querySelector(".mw-ql-chip");
    let active = 0, shown = [];
    const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
    const icon = (p) => p.img ? '<img src="' + esc(root + "/" + p.img) + '" alt="">' : '<span class="mw-conn-icon">' + ({ faction: "\u2691", place: "\u2316" }[p.kind] || esc(p.title.charAt(0))) + "</span>";
    const draw = () => {
      const q = input.value.trim().toLowerCase();
      shown = picks.filter((p) => !q || p.title.toLowerCase().includes(q) || p.group.toLowerCase().includes(q));
      active = Math.min(active, Math.max(shown.length - 1, 0));
      let html = "", last = "";
      shown.forEach((p, i) => {
        if (p.group !== last) { html += '<div class="mw-ql-group">' + esc(p.group) + "</div>"; last = p.group; }
        html += '<div class="mw-ql-opt mw-conn-' + p.kind + (i === active ? " mw-on" : "") + '" role="option" data-i="' + i + '">' + icon(p) + "<span>" + esc(p.title) + '</span><small>' + p.n + (p.n === 1 ? " quest" : " quests") + "</small></div>";
      });
      menu.innerHTML = html || '<div class="mw-ql-group">Nothing matches</div>';
      menu.hidden = false;
    };
    const choose = (p) => {
      pick = p.to;
      chip.innerHTML = icon(p) + "<span>" + esc(p.title) + "</span> \u2715";
      chip.setAttribute("aria-label", "Stop showing only quests connected to " + p.title);
      chip.hidden = false;
      input.hidden = true;
      menu.hidden = true;
      input.value = "";
      apply();
    };
    input.addEventListener("focus", draw);
    input.addEventListener("input", () => { active = 0; draw(); });
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { active = Math.min(active + 1, shown.length - 1); draw(); e.preventDefault(); }
      else if (e.key === "ArrowUp") { active = Math.max(active - 1, 0); draw(); e.preventDefault(); }
      else if (e.key === "Enter" && shown[active]) { choose(shown[active]); e.preventDefault(); }
      else if (e.key === "Escape") { menu.hidden = true; input.blur(); }
    });
    menu.addEventListener("mousedown", (e) => {
      const opt = e.target.closest(".mw-ql-opt");
      if (opt) { e.preventDefault(); choose(shown[Number(opt.dataset.i)]); }
    });
    input.addEventListener("blur", () => setTimeout(() => (menu.hidden = true), 100));
    chip.addEventListener("click", () => {
      pick = "";
      chip.hidden = true;
      input.hidden = false;
      input.focus();
      apply();
    });
  }
});
`;
var QuestLog_default2 = (() => {
  const QuestLog = ({ fileData, allFiles }) => {
    const slug = String(fileData.slug ?? "");
    const fm = fileData.frontmatter ?? {};
    if (fm.mw_folder === true && slug.endsWith("index")) return /* @__PURE__ */ jsx2(QuestLanding, { slug, allFiles });
    if (slug !== "index") return null;
    const fm0 = fileData.frontmatter ?? {};
    const go = (to) => resolveRelative2(slug, to);
    const home = /* @__PURE__ */ jsx2(HomeBoxes, { fm: fm0, go });
    const quests = allFiles.map((f) => ({ f, fm: f.frontmatter ?? {} })).filter(({ fm: fm2 }) => fm2.pinned === true && statusOf(fm2) === "active" && typeof fm2.quest === "string").sort((a, b) => ORDER.indexOf(String(a.fm.quest)) - ORDER.indexOf(String(b.fm.quest)));
    if (quests.length === 0) return home;
    const link = (f) => resolveRelative2(slug, String(f.slug));
    const titleOf = (f, fm2) => String(fm2.title ?? f.slug);
    const main = quests.filter(({ fm: fm2 }) => fm2.quest === "main");
    const others = quests.filter(({ fm: fm2 }) => fm2.quest !== "main");
    return /* @__PURE__ */ jsxs2(Fragment2, { children: [
      home,
      /* @__PURE__ */ jsxs2("section", { class: "mw-quest-log", children: [
        /* @__PURE__ */ jsx2("h2", { children: "Active quests" }),
        main.map(({ f, fm: fm2 }) => {
          const summary = typeof f.description === "string" ? f.description.replace(/^Overview\s+/, "") : "";
          return /* @__PURE__ */ jsxs2("a", { href: link(f), class: "internal mw-quest-main-card", children: [
            /* @__PURE__ */ jsx2("span", { class: "mw-quest-type mw-quest-main", children: "Main quest" }),
            /* @__PURE__ */ jsx2("span", { class: "mw-quest-main-title", children: titleOf(f, fm2) }),
            summary && /* @__PURE__ */ jsx2("span", { class: "mw-quest-summary", children: summary })
          ] });
        }),
        others.length > 0 && /* @__PURE__ */ jsx2("ul", { class: "mw-quest-list", children: others.map(({ f, fm: fm2 }) => {
          const type = String(fm2.quest);
          return /* @__PURE__ */ jsxs2("li", { children: [
            /* @__PURE__ */ jsx2("span", { class: `mw-quest-type mw-quest-${type}`, children: LABELS[type] ?? type }),
            /* @__PURE__ */ jsx2("a", { href: link(f), class: "internal mw-quest-title", children: titleOf(f, fm2) })
          ] });
        }) })
      ] })
    ] });
  };
  QuestLog.css = QuestLog_default;
  QuestLog.afterDOMLoaded = FILTER_SCRIPT;
  return QuestLog;
});
export {
  QuestLog_default2 as QuestLog
};
