// src/components/QuestLog.tsx
import { resolveRelative } from "@quartz-community/utils";

// src/components/QuestLog.css
var QuestLog_default = '.mw-quest-log {\n  margin-top: 2rem;\n}\n\n/* Main quests: a featured card */\n.mw-quest-log a.mw-quest-main-card {\n  display: block;\n  padding: 1rem 1.2rem;\n  margin-bottom: 0.8rem;\n  border: 1px solid var(--lightgray);\n  border-left: 3px solid var(--secondary);\n  border-radius: 0 10px 10px 0;\n  background: none;\n  color: inherit;\n  text-decoration: none;\n  font-weight: normal;\n  transition: border-color 0.2s ease;\n}\n\n.mw-quest-log a.mw-quest-main-card:hover {\n  border-color: var(--secondary);\n}\n\n.mw-quest-main-title {\n  display: block;\n  margin: 0.4rem 0 0.2rem;\n  font-family: var(--headerFont);\n  font-size: 1.35rem;\n  font-weight: 600;\n  color: var(--dark);\n}\n\n.mw-quest-summary {\n  display: block;\n  font-size: 0.95rem;\n  color: var(--darkgray);\n}\n\n/* Other quests: compact rows */\n.mw-quest-list {\n  list-style: none;\n  margin: 0;\n  padding: 0;\n}\n\n.mw-quest-list li {\n  display: flex;\n  align-items: center;\n  gap: 0.8rem;\n  margin: 0;\n  padding: 0.45rem 0.2rem;\n}\n\n.mw-quest-list li + li {\n  border-top: 1px solid var(--lightgray);\n}\n\n.mw-quest-type {\n  flex-shrink: 0;\n  min-width: 4.2rem;\n  text-align: center;\n  font-size: 0.72rem;\n  font-weight: 500;\n  padding: 0.05rem 0.6rem;\n  border-radius: 6px;\n  background: var(--lightgray);\n  color: var(--darkgray);\n}\n\n.mw-quest-main-card .mw-quest-type {\n  min-width: 0;\n}\n\n.mw-quest-main { background: color-mix(in srgb, #a46b0a 22%, transparent); color: #6e4706; }\n.mw-quest-personal { background: color-mix(in srgb, #6b6a3a 22%, transparent); color: #4a4926; }\n.mw-quest-faction { background: color-mix(in srgb, #8a4a5a 20%, transparent); color: #6a3040; }\n\n:root[saved-theme="dark"] .mw-quest-main { color: #e5bb68; }\n:root[saved-theme="dark"] .mw-quest-personal { color: #b8b67e; }\n:root[saved-theme="dark"] .mw-quest-faction { color: #d99aaa; }\n\n.mw-quest-log a.mw-quest-title {\n  background: none;\n  padding: 0;\n  font-weight: 500;\n  color: var(--dark);\n  text-decoration: none;\n}\n\n.mw-quest-log a.mw-quest-title:hover {\n  color: var(--secondary);\n}\n\n/* Home page boxes: Previously on, New since, Coming up */\n.mw-home {\n  margin: 2rem 0 0.5rem;\n}\n\na.mw-home-prev {\n  display: block;\n  padding: 4px;\n  border: 1.5px solid var(--secondary);\n  border-radius: 10px;\n  color: var(--darkgray);\n  font-weight: 400;\n  text-decoration: none;\n  background: none;\n}\n\na.mw-home-prev:hover .mw-home-more {\n  text-decoration: underline;\n}\n\n.mw-home-prev-inner {\n  display: block;\n  padding: 0.9rem 1.2rem;\n  border: 1px solid color-mix(in srgb, var(--secondary) 35%, transparent);\n  border-radius: 6px;\n}\n\n.mw-home-kicker {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 0.2rem 1rem;\n  font-size: 0.75rem;\n  letter-spacing: 0.1em;\n  text-transform: uppercase;\n  color: var(--secondary);\n}\n\n.mw-home-prev-date {\n  margin-left: auto;\n  letter-spacing: normal;\n  text-transform: none;\n  color: var(--gray);\n}\n\n.mw-home-prev-title {\n  display: block;\n  margin: 0.2rem 0 0.4rem;\n  font-family: var(--headerFont);\n  font-size: 1.5rem;\n  color: var(--dark);\n}\n\n.mw-home-prev-lead {\n  display: block;\n}\n\n.mw-home-prev ul {\n  margin: 0.4rem 0 0.5rem;\n}\n\n.mw-home-more,\n.mw-home-link {\n  font-size: 0.85rem;\n  font-weight: 600;\n  color: var(--secondary);\n}\n\n.mw-home-boxes {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));\n  gap: 1.1rem;\n  margin-top: 1.2rem;\n}\n\n.mw-home-box {\n  padding: 0.8rem 1.1rem 0.9rem;\n  border: 1px solid var(--lightgray);\n  border-radius: 10px;\n}\n\n.mw-home-box h3 {\n  margin: 0 0 0.5rem;\n  font-size: 1.05rem;\n  color: var(--secondary);\n}\n\nul.mw-home-list {\n  margin: 0;\n  padding: 0;\n  list-style: none;\n}\n\n.mw-home-list li {\n  display: flex;\n  align-items: baseline;\n  gap: 0.6rem;\n  margin: 0;\n  padding: 0.4rem 0;\n  border-top: 1px solid var(--lightgray);\n}\n\n.mw-home-list li:first-child {\n  border-top: none;\n}\n\n.mw-home-list small {\n  margin-left: auto;\n  font-size: 0.75rem;\n  color: var(--gray);\n  white-space: nowrap;\n}\n\n.mw-home-tag {\n  flex: none;\n  width: 4.4rem;\n  padding: 0.05rem 0;\n  border-radius: 999px;\n  font-size: 0.7rem;\n  text-align: center;\n}\n\n.mw-home-new {\n  background: color-mix(in srgb, #4e6b5a 18%, var(--light));\n  color: #3c5a3a;\n}\n\n.mw-home-updated {\n  background: color-mix(in srgb, var(--secondary) 18%, var(--light));\n  color: color-mix(in srgb, var(--secondary) 70%, var(--darkgray));\n}\n\n.mw-home-all summary {\n  margin-top: 0.3rem;\n  font-size: 0.8rem;\n  color: var(--gray);\n  cursor: pointer;\n}\n\nli.mw-home-soon {\n  align-items: center;\n}\n\n.mw-home-soon small {\n  display: block;\n  margin: 0;\n}\n\n.mw-home-days {\n  flex: none;\n  width: 3.2rem;\n  padding: 0.2rem 0;\n  border-radius: 8px;\n  background: color-mix(in srgb, var(--secondary) 12%, var(--light));\n  color: var(--dark);\n  font-size: 0.7rem;\n  line-height: 1.15;\n  text-align: center;\n}\n\n.mw-home-days b {\n  display: block;\n  font-size: 1.1rem;\n}\n\n.mw-home-link {\n  display: inline-block;\n  margin-top: 0.4rem;\n  background: none;\n  padding: 0;\n}\n\n.mw-home-list a.internal,\na.internal.mw-home-link {\n  padding: 0;\n  background: none;\n  font-weight: 400;\n  color: var(--dark);\n  text-decoration: none;\n}\n\n.mw-home-list a.internal:hover {\n  color: var(--secondary);\n  text-decoration: underline;\n}\n\na.internal.mw-home-link {\n  font-weight: 600;\n  color: var(--secondary);\n}\n';

// src/components/QuestLog.tsx
import { Fragment, jsx, jsxs } from "preact/jsx-runtime";
var ORDER = ["main", "personal", "faction", "side"];
var LABELS = { main: "Main", personal: "Personal", faction: "Faction", side: "Side" };
var SHOWN = 5;
function HomeBoxes({ fm, go }) {
  const last = fm.mw_last_session;
  const changes = fm.mw_changes;
  const upcoming = fm.mw_coming_up ?? [];
  const items = changes?.items ?? [];
  const row = (c) => /* @__PURE__ */ jsxs("li", { class: "mw-home-change", children: [
    /* @__PURE__ */ jsx("span", { class: `mw-home-tag mw-home-${c.kind}`, children: c.kind === "new" ? "New" : "Updated" }),
    /* @__PURE__ */ jsx("a", { href: go(c.to), class: "internal", children: c.title }),
    /* @__PURE__ */ jsx("small", { children: c.section })
  ] });
  if (!last && !items.length && !upcoming.length) return null;
  return /* @__PURE__ */ jsxs("div", { class: "mw-home", children: [
    last && /* @__PURE__ */ jsx("a", { href: go(last.to), class: "internal mw-home-prev", children: /* @__PURE__ */ jsxs("span", { class: "mw-home-prev-inner", children: [
      /* @__PURE__ */ jsxs("span", { class: "mw-home-kicker", children: [
        "Previously on\u2026 \xB7 ",
        last.session,
        last.date && /* @__PURE__ */ jsx("span", { class: "mw-home-prev-date", children: last.date })
      ] }),
      /* @__PURE__ */ jsx("span", { class: "mw-home-prev-title", children: last.title ?? last.session }),
      last.lead && /* @__PURE__ */ jsx("span", { class: "mw-home-prev-lead", children: last.lead }),
      last.points && last.points.length > 0 && /* @__PURE__ */ jsx("ul", { children: last.points.map((p) => /* @__PURE__ */ jsx("li", { children: p })) }),
      /* @__PURE__ */ jsx("span", { class: "mw-home-more", children: "Read the whole recap \u2192" })
    ] }) }),
    (items.length > 0 || upcoming.length > 0) && /* @__PURE__ */ jsxs("div", { class: "mw-home-boxes", children: [
      items.length > 0 && /* @__PURE__ */ jsxs("section", { class: "mw-home-box", children: [
        /* @__PURE__ */ jsx("h3", { children: changes?.since ? `New since ${changes.since}` : "Recently updated" }),
        /* @__PURE__ */ jsx("ul", { class: "mw-home-list", children: items.slice(0, SHOWN).map(row) }),
        items.length > SHOWN && /* @__PURE__ */ jsxs("details", { class: "mw-home-all", children: [
          /* @__PURE__ */ jsxs("summary", { children: [
            "Show all (",
            items.length,
            ")"
          ] }),
          /* @__PURE__ */ jsx("ul", { class: "mw-home-list", children: items.slice(SHOWN).map(row) })
        ] })
      ] }),
      upcoming.length > 0 && /* @__PURE__ */ jsxs("section", { class: "mw-home-box", children: [
        /* @__PURE__ */ jsx("h3", { children: "Coming up" }),
        /* @__PURE__ */ jsx("ul", { class: "mw-home-list", children: upcoming.map((u) => /* @__PURE__ */ jsxs("li", { class: "mw-home-soon", children: [
          /* @__PURE__ */ jsx("span", { class: "mw-home-days", children: u.days === 0 ? /* @__PURE__ */ jsx("b", { children: "Today" }) : /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsx("b", { children: u.days }),
            u.days === 1 ? "day" : "days"
          ] }) }),
          /* @__PURE__ */ jsxs("span", { children: [
            u.name,
            /* @__PURE__ */ jsxs("small", { children: [
              u.kind,
              " \xB7 ",
              u.date
            ] })
          ] })
        ] })) }),
        /* @__PURE__ */ jsx("a", { href: go("calendar"), class: "internal mw-home-link", children: "Full calendar \u2192" })
      ] })
    ] })
  ] });
}
var QuestLog_default2 = (() => {
  const QuestLog = ({ fileData, allFiles }) => {
    const slug = String(fileData.slug ?? "");
    if (slug !== "index") return null;
    const fm0 = fileData.frontmatter ?? {};
    const go = (to) => resolveRelative(slug, to);
    const home = /* @__PURE__ */ jsx(HomeBoxes, { fm: fm0, go });
    const quests = allFiles.map((f) => ({ f, fm: f.frontmatter ?? {} })).filter(({ fm }) => fm.pinned === true && fm.quest_status === "active" && typeof fm.quest === "string").sort((a, b) => ORDER.indexOf(String(a.fm.quest)) - ORDER.indexOf(String(b.fm.quest)));
    if (quests.length === 0) return home;
    const link = (f) => resolveRelative(slug, String(f.slug));
    const titleOf = (f, fm) => String(fm.title ?? f.slug);
    const main = quests.filter(({ fm }) => fm.quest === "main");
    const others = quests.filter(({ fm }) => fm.quest !== "main");
    return /* @__PURE__ */ jsxs(Fragment, { children: [
      home,
      /* @__PURE__ */ jsxs("section", { class: "mw-quest-log", children: [
        /* @__PURE__ */ jsx("h2", { children: "Active quests" }),
        main.map(({ f, fm }) => {
          const summary = typeof f.description === "string" ? f.description.replace(/^Overview\s+/, "") : "";
          return /* @__PURE__ */ jsxs("a", { href: link(f), class: "internal mw-quest-main-card", children: [
            /* @__PURE__ */ jsx("span", { class: "mw-quest-type mw-quest-main", children: "Main quest" }),
            /* @__PURE__ */ jsx("span", { class: "mw-quest-main-title", children: titleOf(f, fm) }),
            summary && /* @__PURE__ */ jsx("span", { class: "mw-quest-summary", children: summary })
          ] });
        }),
        others.length > 0 && /* @__PURE__ */ jsx("ul", { class: "mw-quest-list", children: others.map(({ f, fm }) => {
          const type = String(fm.quest);
          return /* @__PURE__ */ jsxs("li", { children: [
            /* @__PURE__ */ jsx("span", { class: `mw-quest-type mw-quest-${type}`, children: LABELS[type] ?? type }),
            /* @__PURE__ */ jsx("a", { href: link(f), class: "internal mw-quest-title", children: titleOf(f, fm) })
          ] });
        }) })
      ] })
    ] });
  };
  QuestLog.css = QuestLog_default;
  return QuestLog;
});
export {
  QuestLog_default2 as QuestLog
};
